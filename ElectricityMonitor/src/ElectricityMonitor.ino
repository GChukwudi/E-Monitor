#define ENABLE_DATABASE
#define ENABLE_USER_AUTH
#include <Arduino.h>
#include <WiFi.h>

#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <time.h>
#include <math.h>
#include <vector>
#include <esp_task_wdt.h>
#include <FirebaseJson.h>


// WiFi credentials
const char* ssid = "<SSID>";
const char* password = "<PASSWORD>";

// Firebase credentials
#define WEB_API_KEY "<WEB_API_KEY>"
#define DATABASE_URL "https://your-database-name.firebaseio.com/"

// Pin definitions
#define CURRENT_PIN 35
#define VOLTAGE_PIN 34
#define STATUS_LED 2
#define RELAY_PIN 21

// Unit identification
const String UNIT_ID = "unit_002";

String unitBasePath;
String historyHourlyBasePath;
String historyDailyBasePath;

const float COST_PER_KWH = 209.5;
const int ADC_CENTER = 2048;
const int ADC_MAX = 4095;
const float ADC_VOLTAGE = 3.3;
const String BUILDING_ID = "building_002";

// Calibration factors - UPDATE THESE AFTER CALIBRATION
float currentCalibrationFactor = 0.6767; // went with the lowest from my calibration on loads as most household appliances operate in the low-current range (0.1-2A)
float voltageCalibrationFactor = 268.8471;

// ACS712 30A sensitivity: 66mV per Ampere
const float ACS712_SENSITIVITY = 0.066;

// Set to true to run calibration
bool CALIBRATION_MODE = false;

// Firebase objects
WiFiClientSecure ssl_client;
using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);
RealtimeDatabase Database;
FirebaseApp app;
NoAuth noAuth;

volatile bool isFirebaseBusy = false;

struct HourlyData {
    float totalEnergy = 0;
    float totalPower = 0;
    float totalCurrent = 0;
    float peakPower = 0;
    int samples = 0;
    int currentHour = -1;  // Track which hour this data belongs to
};

HourlyData hourlyBuffer;

// Timing
unsigned long lastReading = 0;
unsigned long lastCreditCheck = 0;
const unsigned long READING_INTERVAL = 60000; // 1 minute
const unsigned long CREDIT_CHECK_INTERVAL = 60000;

// Time configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7200;
const int daylightOffset_sec = 0;

bool relayState = false;
float currentRemainingUnits = 0;

int consecutiveFirebaseErrors = 0;
const int MAX_FIREBASE_ERRORS = 5;

int getCurrentHour() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return -1;
    }
    return timeinfo.tm_hour;
}

String getCurrentDate() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "";
    }
    char dateBuff[20];
    strftime(dateBuff, sizeof(dateBuff), "%Y-%m-%d", &timeinfo);
    return String(dateBuff);
}

String getCurrentMonth() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "";
    }
    char monthBuff[10];
    strftime(monthBuff, sizeof(monthBuff), "%Y-%m", &timeinfo);
    return String(monthBuff);
}

String getFormattedTimestamp() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Failed to obtain time");
        return String(millis());
    }
    
    char timeStringBuff[50];
    strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(timeStringBuff);
}

void setup() {
    Serial.begin(115200);

    esp_task_wdt_config_t wdt_config = {
        .timeout_ms = 10000,
        .idle_core_mask = 0,
        .trigger_panic = true
    };
    esp_task_wdt_init(&wdt_config);
    esp_task_wdt_add(NULL);

    pinMode(STATUS_LED, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(STATUS_LED, LOW);
    digitalWrite(RELAY_PIN, LOW);

    Serial.printf("Initial RELAY_PIN output (wrote HIGH). digitalRead: %d\n", digitalRead(RELAY_PIN));
    
    analogSetWidth(12);
    analogSetAttenuation(ADC_11db);

    unitBasePath = "/buildings/building_002/units/" + UNIT_ID + "/";
    historyHourlyBasePath = unitBasePath + "history/hourly/";
    historyDailyBasePath = unitBasePath + "history/daily/";
    
    Serial.println("\n\n========================================");
    Serial.println("ESP32 Energy Monitor with Relay Control");
    Serial.println("========================================");
    Serial.println("Unit: " + UNIT_ID);
    Serial.println("========================================\n");
    
    if (CALIBRATION_MODE) {
        Serial.println("CALIBRATION MODE STARTED");
        Serial.println("Running calibration routine...\n");
        delay(2000);
        runFullCalibration();
        Serial.println("\n✓ Calibration complete!");
        Serial.println("Update the calibration factors in code and set CALIBRATION_MODE to false");
        while(1) { delay(1000); }
    }
    
    setupWiFi();
    setupFirebase();
    
    // Initialize hourly buffer with current hour
    hourlyBuffer.currentHour = getCurrentHour();
    Serial.printf("Initialized hourly tracking for hour: %d\n", hourlyBuffer.currentHour);
    
    digitalWrite(STATUS_LED, HIGH);
    Serial.println("System ready!");
}

void loop() {
    app.loop();
    esp_task_wdt_reset();

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️  WiFi disconnected! Reconnecting...");
        setupWiFi();
    }
    
    // Check credit every minute
    if (app.ready() && (millis() - lastCreditCheck >= CREDIT_CHECK_INTERVAL)) {
        checkCreditAndControlRelay();
        lastCreditCheck = millis();
    }
    
    // Read sensors every minute
    if (millis() - lastReading >= READING_INTERVAL) {
        if (app.ready()) {
            int currentHour = getCurrentHour();
            
            // FIXED: Check if hour has changed and we have data to save
            if (currentHour != -1 && hourlyBuffer.currentHour != -1) {
                if (currentHour != hourlyBuffer.currentHour && hourlyBuffer.samples > 0) {
                    // Hour has changed - save the previous hour's data
                    Serial.printf("\n🕐 Hour changed from %d to %d - saving previous hour data\n", 
                                  hourlyBuffer.currentHour, currentHour);
                    saveHourlyData();
                    
                    // Reset buffer for new hour
                    hourlyBuffer.totalEnergy = 0;
                    hourlyBuffer.totalPower = 0;
                    hourlyBuffer.totalCurrent = 0;
                    hourlyBuffer.peakPower = 0;
                    hourlyBuffer.samples = 0;
                    hourlyBuffer.currentHour = currentHour;
                    
                    Serial.printf("✓ Buffer reset for new hour: %d\n", currentHour);
                }
            } else if (currentHour != -1 && hourlyBuffer.currentHour == -1) {
                // First time getting valid hour after startup
                hourlyBuffer.currentHour = currentHour;
                Serial.printf("✓ Set initial hour tracking: %d\n", currentHour);
            }
            
            readAndSendData();
            lastReading = millis();
        } else {
            Serial.println("Firebase not ready yet...");
        }
    }
    
    delay(100);
}

void setupWiFi() {
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    }
    
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.println("Time synchronization started");

    digitalWrite(STATUS_LED, HIGH);
}

void setupFirebase() {
    Firebase.printf("Firebase Client v%s\n", FIREBASE_CLIENT_VERSION);
    
    ssl_client.setInsecure();
    
    Serial.println("Initializing Firebase...");
    
    initializeApp(aClient, app, getAuth(noAuth), asyncCB, "authTask");
    
    app.getApp<RealtimeDatabase>(Database);
    Database.url(DATABASE_URL);
    
    Serial.println("Firebase initialization started");

    delay(500);
    checkCreditAndControlRelay();
}

void asyncCB(AsyncResult &aResult) {
    if (aResult.isEvent()) {
        Firebase.printf("Event task: %s, msg: %s, code: %d\n", 
                       aResult.uid().c_str(), 
                       aResult.appEvent().message().c_str(), 
                       aResult.appEvent().code());
    }
    
    if (aResult.isError()) {
        Firebase.printf("Error task: %s, msg: %s, code: %d\n", 
                       aResult.uid().c_str(), 
                       aResult.error().message().c_str(), 
                       aResult.error().code());
    }
}

void creditCallback(AsyncResult &aResult) {
    isFirebaseBusy = false;
    
    if (aResult.available()) {
        RealtimeDatabaseResult &RTDB = aResult.to<RealtimeDatabaseResult>();
        if (RTDB.type() == realtime_database_data_type_float || 
            RTDB.type() == realtime_database_data_type_integer || 
            RTDB.type() == realtime_database_data_type_double) {
            currentRemainingUnits = RTDB.to<float>();
            Serial.printf("✓ Remaining units from Firebase: %.2f kWh\n", currentRemainingUnits);
            
            // Control relay based on credit
            bool shouldBeOn = (currentRemainingUnits > 0);

            if (shouldBeOn) {
                // Ensure hardware matches desired state
                digitalWrite(RELAY_PIN, LOW);
                if (!relayState) {
                    relayState = true;
                    Serial.println("✓ RELAY ON - Power flowing to unit");
                    for (int i = 0; i < 2; i++) {
                        digitalWrite(STATUS_LED, LOW);
                        delay(100);
                        digitalWrite(STATUS_LED, HIGH);
                        delay(100);
                    }
                }
            } else {
                digitalWrite(RELAY_PIN, HIGH);
                if (relayState) {
                    relayState = false;
                    Serial.println("✗ RELAY OFF - No credit! Power disconnected");
                    for (int i = 0; i < 3; i++) {
                        digitalWrite(STATUS_LED, LOW);
                        delay(500);
                        digitalWrite(STATUS_LED, HIGH);
                        delay(500);
                    }
                } else {
                    // For debugging - confirm we actively set the pin low
                    Serial.println("Relay forced OFF (no credit)");
                }
            }

            Serial.printf("Relay State: %s | Remaining: %.2f kWh\n",
                        relayState ? "ON" : "OFF",
                        currentRemainingUnits);
            
            // Serial.printf("Relay State: %s | Remaining: %.2f kWh\n", 
            //               relayState ? "ON" : "OFF", 
            //               currentRemainingUnits);
        } else {
            Serial.println("⚠️  Firebase returned unexpected data type");
        }
    }
    
    if (aResult.isError()) {
        Serial.printf("❌ Error reading credit: %s\n", aResult.error().message().c_str());
        Serial.println("   Retrying in next cycle...");
    }
}

void checkCreditAndControlRelay() {

     if (isFirebaseBusy) {
        Serial.println("⏳ Firebase busy, skipping credit check");
        return;
    }
    
    isFirebaseBusy = true;

    String path = unitBasePath + "remaining_units";
    Database.get(aClient, path.c_str(), creditCallback, "getCreditTask");
    
    delay(500);

    unsigned long startWait = millis();
    while (isFirebaseBusy && (millis() - startWait < 2000)) {
        app.loop();  // Process Firebase events
        delay(50);
    }
    
    if (isFirebaseBusy) {
        Serial.println("⚠️  Credit check timeout");
        isFirebaseBusy = false;
    }
}

float readVoltage() {
    float rawVoltage = readVoltageRaw();
    float actual_voltage = rawVoltage * voltageCalibrationFactor;
    
    Serial.printf("[DEBUG] Raw: %.4fV, Calibrated: %.2fV\n", rawVoltage, actual_voltage);
    return actual_voltage;
} 

float readCurrent() {
    float voltage = readCurrentRaw();
    float current = (voltage / ACS712_SENSITIVITY) * currentCalibrationFactor;
    
    Serial.printf("[DEBUG] Current sensor: %.4fV → %.3fA\n", voltage, current);
    return current;
}

void readAndSendData() {
    Serial.println("\n========== Reading Sensors ==========");
    
    float current = readCurrent();
    float voltage = readVoltage();
    float power = voltage * current;
    
    // Calculate energy consumed (kWh) for this reading interval
    float energyConsumed = (power * (READING_INTERVAL / 1000.0 / 3600.0)) / 1000.0; //investigate this 1000.0 division factor(ejay's notes)
    
    String timestamp = getFormattedTimestamp();
    
    Serial.printf("Current: %.3f A\n", current);
    Serial.printf("Voltage: %.2f V\n", voltage);
    Serial.printf("Power: %.2f W\n", power);
    Serial.printf("Energy (this interval): %.6f kWh\n", energyConsumed);

    // FIXED: Accumulate in hourly buffer regardless of relay state
    hourlyBuffer.totalEnergy += energyConsumed;
    hourlyBuffer.totalPower += power;
    hourlyBuffer.totalCurrent += current;
    if (power > hourlyBuffer.peakPower) {
        hourlyBuffer.peakPower = power;
    }
    hourlyBuffer.samples++;
    
    Serial.printf("📊 Hourly buffer - Hour: %d, Samples: %d, Total Energy: %.6f kWh\n", 
                  hourlyBuffer.currentHour, hourlyBuffer.samples, hourlyBuffer.totalEnergy);
    
    // Send realtime data to Firebase
    Database.set<float>(aClient, unitBasePath + "power", power, dataCallback, "setPower");
    delay(100);
    Database.set<String>(aClient, unitBasePath + "timestamp", timestamp, dataCallback, "setTimestamp");
    
    // Deduct energy only if relay ON
    if (relayState && currentRemainingUnits > 0) {
        float newRemainingUnits = currentRemainingUnits - energyConsumed;
        if (newRemainingUnits < 0) newRemainingUnits = 0;
        
        delay(150);
        Database.set<float>(aClient, unitBasePath + "remaining_units", newRemainingUnits, dataCallback, "setUnits");
        
        float newRemainingCredit = newRemainingUnits * COST_PER_KWH;
        delay(150);
        Database.set<float>(aClient, unitBasePath + "remaining_credit", newRemainingCredit, dataCallback, "setCredit");
        
        Serial.printf("Remaining: %.3f kWh (₦%.2f)\n", newRemainingUnits, newRemainingCredit);
    } else {
        Serial.println("⚠️  Relay OFF - Not deducting energy (but still tracking consumption)");
    }
    Serial.println("=====================================\n");
}

void saveHourlyData() {
    if (hourlyBuffer.samples == 0) {
        Serial.println("⚠️  No samples to save for hourly data");
        return;
    }
    
    String date = getCurrentDate();
    int hour = hourlyBuffer.currentHour;  // FIXED: Use the hour from buffer, not lastSavedHour
    
    if (date.isEmpty() || hour < 0) {
        Serial.println("⚠️  Invalid date or hour for saving");
        return;
    }
    
    // Calculate averages
    float avgPower = hourlyBuffer.totalPower / hourlyBuffer.samples;
    float avgCurrent = hourlyBuffer.totalCurrent / hourlyBuffer.samples;
    
    Serial.println("\n========== Saving Hourly Data ==========");
    Serial.printf("Date: %s, Hour: %02d:00\n", date.c_str(), hour);
    Serial.printf("Total Energy: %.6f kWh\n", hourlyBuffer.totalEnergy);
    Serial.printf("Avg Power: %.2f W\n", avgPower);
    Serial.printf("Peak Power: %.2f W\n", hourlyBuffer.peakPower);
    Serial.printf("Avg Current: %.3f A\n", avgCurrent);
    Serial.printf("Samples: %d\n", hourlyBuffer.samples);
    
    String hourlyPath = historyHourlyBasePath + date + "/";
    String hourStr = String(hour);
    
    // Save to Firebase with delay between writes to avoid overwhelming the connection
    Database.set<float>(aClient, hourlyPath + hourStr + "/energy", hourlyBuffer.totalEnergy, dataCallback, "hourlyEnergy");
    delay(150);
    Database.set<float>(aClient, hourlyPath + hourStr + "/avgPower", avgPower, dataCallback, "hourlyAvgPower");
    delay(150);
    Database.set<float>(aClient, hourlyPath + hourStr + "/peakPower", hourlyBuffer.peakPower, dataCallback, "hourlyPeakPower");
    delay(150);
    Database.set<float>(aClient, hourlyPath + hourStr + "/avgCurrent", avgCurrent, dataCallback, "hourlyAvgCurrent");
    delay(150);
    Database.set<int>(aClient, hourlyPath + hourStr + "/samples", hourlyBuffer.samples, dataCallback, "hourlySamples");
    delay(150);
    
    // Save timestamp of when this data was saved
    String timestamp = getFormattedTimestamp();
    Database.set<String>(aClient, hourlyPath + hourStr + "/savedAt", timestamp, dataCallback, "hourlySavedAt");
    
    // Also update daily aggregation
    updateDailyData(date, hourlyBuffer.totalEnergy, avgPower, hourlyBuffer.peakPower);
    
    Serial.println("✓ Hourly data saved to Firebase");
    Serial.println("=========================================\n");
}

void updateDailyData(String date, float hourlyEnergy, float hourlyAvgPower, float hourlyPeakPower) {
    String dailyPath = historyDailyBasePath + date + "/";
    
    // Instead of overwriting, we should be accumulating daily totals
    // For now, keeping your structure but with better naming
    Database.set<float>(aClient, dailyPath + "lastHourEnergy", hourlyEnergy, dataCallback, "dailyUpdate");
    delay(150);
    Database.set<float>(aClient, dailyPath + "lastHourAvgPower", hourlyAvgPower, dataCallback, "dailyUpdate");
    delay(150);
    Database.set<float>(aClient, dailyPath + "lastPeakPower", hourlyPeakPower, dataCallback, "dailyUpdate");
    delay(150);
    
    // Calculate cost
    float cost = hourlyEnergy * COST_PER_KWH;
    Database.set<float>(aClient, dailyPath + "lastHourCost", cost, dataCallback, "dailyUpdate");
    
    Serial.printf("✓ Updated daily aggregation for %s\n", date.c_str());
}

void forceSaveHourlyData() {
    if (hourlyBuffer.samples > 0) {
        Serial.println("\n⚡ Force saving current hourly data...");
        saveHourlyData();
        
        // Reset buffer
        int currentHour = getCurrentHour();
        hourlyBuffer.totalEnergy = 0;
        hourlyBuffer.totalPower = 0;
        hourlyBuffer.totalCurrent = 0;
        hourlyBuffer.peakPower = 0;
        hourlyBuffer.samples = 0;
        hourlyBuffer.currentHour = currentHour;
    } else {
        Serial.println("⚠️  No data to force save");
    }
}

void dataCallback(AsyncResult &aResult) {
    if (aResult.available()) {
        consecutiveFirebaseErrors = 0;
        // Quick LED blink on successful write
        digitalWrite(STATUS_LED, LOW);
        delay(50);
        digitalWrite(STATUS_LED, HIGH);
    }
    
    if (aResult.isError()) {
        consecutiveFirebaseErrors++;
        Serial.printf("Firebase error #%d: %s\n", consecutiveFirebaseErrors, aResult.error().message().c_str());

        if (consecutiveFirebaseErrors >= MAX_FIREBASE_ERRORS) {
            Serial.println("⚠️  Too many Firebase errors! Reinitializing...");
            setupFirebase();
            consecutiveFirebaseErrors = 0;
        }

        // LED error pattern
        for (int i = 0; i < 3; i++) {
            digitalWrite(STATUS_LED, LOW);
            delay(200);
            digitalWrite(STATUS_LED, HIGH);
            delay(200);
        }
    }
}

void calibrateCurrentWithClampMeter() {
    Serial.println("\n═══════════════════════════════════════");
    Serial.println("  CURRENT SENSOR CALIBRATION");
    Serial.println("═══════════════════════════════════════");
    Serial.println("Equipment needed:");
    Serial.println("  • Clamp meter (AC current measurement)");
    Serial.println("  • Extension cord with known loads");
    Serial.println("  • Various appliances");
    Serial.println("═══════════════════════════════════════\n");
    
    // Zero calibration
    Serial.println("STEP 1: Zero Calibration");
    Serial.println("-----------------------------------------");
    Serial.println("1. Extension cord plugged in BUT EMPTY");
    Serial.println("2. Clamp meter should read 0.00A");
    Serial.println("\nPress ENTER when ready...");
    waitForSerialInput();
    
    long zeroSum = 0;
    for(int i = 0; i < 2000; i++) {
        zeroSum += analogRead(CURRENT_PIN);
        delayMicroseconds(50);
    }
    float zeroPoint = zeroSum / 2000.0;
    Serial.printf("✓ Zero point: %.2f ADC counts\n\n", zeroPoint);
    
    // Test with low load
    Serial.println("STEP 2: Low Load Test (Phone charger)");
    Serial.println("-----------------------------------------");
    Serial.println("1. Plug in ONE phone charger (actively charging)");
    Serial.println("2. Read the ACTUAL current on clamp meter");
    Serial.println("\nPress ENTER when ready...");
    waitForSerialInput();
    
    testCurrentReading("Low Load", zeroPoint);
    
    // Test with medium load
    Serial.println("\nSTEP 3: Medium Load Test");
    Serial.println("-----------------------------------------");
    Serial.println("1. Add laptop charger + phone charger");
    Serial.println("2. Read the ACTUAL current on clamp meter");
    Serial.println("\nPress ENTER when ready...");
    waitForSerialInput();
    
    testCurrentReading("Medium Load", zeroPoint);
    
    // Test with higher load
    Serial.println("\nSTEP 4: High Load Test");
    Serial.println("-----------------------------------------");
    Serial.println("1. Add more devices (fan, light, etc.)");
    Serial.println("2. Read the ACTUAL current on clamp meter");
    Serial.println("\nPress ENTER when ready...");
    waitForSerialInput();
    
    testCurrentReading("High Load", zeroPoint);
    
    Serial.println("\n═══════════════════════════════════════");
    Serial.println("  Current Calibration Complete!");
    Serial.println("═══════════════════════════════════════\n");
}

void testCurrentReading(String loadDesc, float zeroPoint) {
    Serial.printf("\nTesting: %s\n", loadDesc.c_str());
    Serial.println("Taking 10 readings...\n");
    
    float sensorSum = 0;
    int readings = 10;
    
    for(int i = 0; i < readings; i++) {
        long sum = 0;
        int samples = 1000;
        
        for (int j = 0; j < samples; j++) {
            int reading = analogRead(CURRENT_PIN);
            float adjusted = reading - zeroPoint;
            sum += adjusted * adjusted;
            delayMicroseconds(100);
        }
        
        float rms = sqrt(sum / samples);
        float voltage = (rms * 3.3) / 4095.0;
        float current = voltage / ACS712_SENSITIVITY;
        
        sensorSum += current;
        Serial.printf("  Reading %2d: %.4fA (uncalibrated)\n", i+1, current);
        delay(1000);
    }
    
    float avgSensorReading = sensorSum / readings;
    Serial.println("\n-----------------------------------------");
    Serial.printf("Average sensor: %.4fA (uncalibrated)\n", avgSensorReading);
    
    Serial.println("\n📋 Enter your CLAMP METER reading:");
    Serial.println("   (Type the current in Amps, e.g., 0.65)");
    Serial.print("   Clamp meter: ");
    
    String input = readSerialLine();
    float clampReading = input.toFloat();
    
    if(clampReading > 0 && avgSensorReading > 0.001) {
        float calibrationFactor = clampReading / avgSensorReading;
        Serial.printf("\n✅ USE THIS VALUE: %.4f\n", calibrationFactor);
        Serial.println("\n📝 Update currentCalibrationFactor in code!");
    } else {
        Serial.println("\n❌ Invalid reading - try again");
    }
    
    Serial.println("-----------------------------------------");
}

void calibrateVoltageSimple() {
    Serial.println("\n═══════════════════════════════════════");
    Serial.println("  VOLTAGE SENSOR CALIBRATION");
    Serial.println("═══════════════════════════════════════");
    Serial.println("Equipment needed:");
    Serial.println("  • Multimeter (AC voltage)");
    Serial.println("  • OR assume 230V nominal");
    Serial.println("═══════════════════════════════════════\n");
    
    Serial.println("STEP 1: Measure Wall Voltage");
    Serial.println("-----------------------------------------");
    Serial.println("1. Use multimeter to measure outlet voltage");
    Serial.println("2. Or press ENTER to assume 230V");
    Serial.println("\nPress ENTER when ready...");
    waitForSerialInput();
    
    float voltageSum = 0;
    int readings = 10;
    
    Serial.println("\nTaking 10 voltage readings...\n");
    
    for(int i = 0; i < readings; i++) {
        float voltage_reading = readVoltageRaw();
        voltageSum += voltage_reading;
        Serial.printf("  Reading %2d: %.4fV (raw)\n", i+1, voltage_reading);
        delay(1000);
    }
    
    float avgVoltage = voltageSum / readings;
    Serial.println("\n-----------------------------------------");
    Serial.printf("Average raw voltage: %.4fV\n", avgVoltage);
    
    Serial.println("\n📋 Enter your MULTIMETER reading:");
    Serial.println("   (Or press ENTER for 230V)");
    Serial.print("   Voltage: ");
    
    String input = readSerialLine();
    float actualVoltage = 230.0;
    
    if (input.length() > 0) {
        actualVoltage = input.toFloat();
    }
    
    if(actualVoltage > 0 && avgVoltage > 0) {
        float voltageFactor = actualVoltage / avgVoltage;
        Serial.printf("\n✅ USE THIS VALUE: %.4f\n", voltageFactor);
        Serial.println("\n📝 Update voltageCalibrationFactor in code!");
    }
    
    Serial.println("-----------------------------------------");
}

void runFullCalibration() {
    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║   FULL SYSTEM CALIBRATION WIZARD      ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.println("\nCalibrating current and voltage sensors");
    Serial.println("\nPress ENTER to begin...");
    waitForSerialInput();
    
    calibrateCurrentWithClampMeter();
    
    delay(2000);
    
    calibrateVoltageSimple();
    
    Serial.println("\n\n╔════════════════════════════════════════╗");
    Serial.println("║     CALIBRATION COMPLETE! 🎉          ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.println("\n📝 Update these in your code:");
    Serial.println("\n   float currentCalibrationFactor = ;");
    Serial.println("   float voltageCalibrationFactor = ;");
    Serial.println("\nThen set CALIBRATION_MODE = false");
}

void waitForSerialInput() {
    while(!Serial.available()) {
        delay(100);
    }
    while(Serial.available()) {
        Serial.read();
    }
}

String readSerialLine() {
    String input = "";
    while(!Serial.available()) {
        delay(100);
    }
    delay(100);
    while(Serial.available()) {
        char c = Serial.read();
        if (c == '\n' || c == '\r') continue;
        input += c;
    }
    return input;
}

float readCurrentRaw() {
    long sum = 0;
    int samples = 500;
    
    for (int i = 0; i < samples; i++) {
        int reading = analogRead(CURRENT_PIN);
        sum += (reading - ADC_CENTER) * (reading - ADC_CENTER);
        delayMicroseconds(50);
    }
    
    float rms = sqrt(sum / samples);
    float voltage = (rms * ADC_VOLTAGE) / ADC_MAX;
    
    return voltage;
}

float readVoltageRaw() {
    long sum = 0;
    int samples = 500;

    for (int i = 0; i < samples; i++) {
        int reading = analogRead(VOLTAGE_PIN);
        sum += (reading - ADC_CENTER) * (reading - ADC_CENTER);
        delayMicroseconds(50);
    }

    float rms = sqrt(sum / samples);
    float voltage_reading = (rms * ADC_VOLTAGE) / ADC_MAX;
    
    return voltage_reading;
}
