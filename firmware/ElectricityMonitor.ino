#define ENABLE_DATABASE
#define ENABLE_USER_AUTH
#define HAS_VOLTAGE_SENSOR true
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <time.h>
#include <math.h>

// WiFi credentials - CHANGE THESE
const char* ssid = "";
const char* password = "";

// Firebase credentials - GET FROM FIREBASE CONSOLE
#define WEB_API_KEY ""
#define DATABASE_URL ""

// Pin definitions
#define CURRENT_PIN 34
#define VOLTAGE_PIN 35
#define STATUS_LED 2

// Unit identification - CHANGE FOR SECOND UNIT
const String UNIT_ID = "unit_001";
const String UNIT_ID = "unit_002";
const String UNIT_ID = "unit_003";

// Firebase objects
WiFiClientSecure ssl_client;
using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);
RealtimeDatabase Database;
FirebaseApp app;

// Authentication - Anonymous mode
NoAuth noAuth;

// Timing
unsigned long lastReading = 0;
const unsigned long READING_INTERVAL = 60000; // 60 seconds

// Time configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7200;  // Rwanda is UTC+2 (7200 seconds)
const int daylightOffset_sec = 0;  // Rwanda doesn't use daylight saving

String getFormattedTimestamp() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Failed to obtain time");
        return String(millis()); // Fallback to millis if time sync fails
    }
    
    char timeStringBuff[50];
    strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(timeStringBuff);
}

void setup() {
    Serial.begin(115200);
    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, LOW);
    
    // Initialize ADC
    analogSetWidth(12);
    analogSetAttenuation(ADC_11db);
    
    Serial.println("Starting ESP32 Electricity Monitor 2025");
    
    setupWiFi();
    setupFirebase();
    
    digitalWrite(STATUS_LED, HIGH);
    Serial.println("System ready!");
    // Uncomment for calibration
    runFullCalibration(); 
}

void loop() {
    // Process Firebase authentication
    app.loop();
    
    // Read sensors every 60 seconds
    if (millis() - lastReading >= READING_INTERVAL) {
        if (app.ready()) {
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
        // Blink LED while connecting
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
    
    ssl_client.setInsecure(); // For testing only
    
    Serial.println("Initializing Firebase...");
    
    // Initialize Firebase with no authentication (anonymous)
    initializeApp(aClient, app, getAuth(noAuth), asyncCB, "authTask");
    
    // Configure database
    app.getApp<RealtimeDatabase>(Database);
    Database.url(DATABASE_URL);
    
    Serial.println("Firebase initialization started");
}

// Authentication callback
void asyncCB(AsyncResult &aResult) {
    if (aResult.isEvent()) {
        Firebase.printf("Event task: %s, msg: %s, code: %d\n", 
                       aResult.uid().c_str(), 
                       aResult.appEvent().message().c_str(), 
                       aResult.appEvent().code());
    }
    
    if (aResult.isDebug()) {
        Firebase.printf("Debug task: %s, msg: %s\n", 
                       aResult.uid().c_str(), 
                       aResult.debug().c_str());
    }
    
    if (aResult.isError()) {
        Firebase.printf("Error task: %s, msg: %s, code: %d\n", 
                       aResult.uid().c_str(), 
                       aResult.error().message().c_str(), 
                       aResult.error().code());
    }
}

// void getSharedVoltageFromFirebase() {
//     if (!voltageUpdateInProgress) {
//         voltageUpdateInProgress = true;
//         Database.get(aClient, "/buildings/building_001/shared_voltage", sharedVoltageCallback, "getSharedVoltage");
//     }
// }

float readVoltage () {
    if (!HAS_VOLTAGE_SENSOR) {
        return 230.0;
    }

    long sum = 0;
    int samples = 1000;

    for (int i = 0; i < samples; i++ ) {
        int reading = analogRead(VOLTAGE_PIN);
        sum += (reading - 2048) * (reading - 2048);
        delayMicroseconds(100);
    }

    float rms = sqrt(sum / samples);
    float voltage_reading = (rms * 3.3) / 4095.0;
    float actual_voltage = voltage_reading * (250.0 / 3.3);

    return actual_voltage;
} 

float readCurrent() {
    long sum = 0;
    int samples = 1000;
    
    for (int i = 0; i < samples; i++) {
        int reading = analogRead(CURRENT_PIN);
        // Remove dc offset
        sum += (reading - 2048) * (reading - 2048);
        delayMicroseconds(100);
    }
    
    float rms = sqrt(sum / samples);
    
    float voltage = (rms * 3.3) / 4095.0;
    float current = voltage / 0.1;
    
    return current;
}

void calibrateCurrentWithClampMeter() {
    Serial.println("=== CURRENT CALIBRATION WITH CLAMP METER ===");
    Serial.println("Clamp meter around the wire being monitored");
    
    // Zero calibration (no load)
    Serial.println("Turn OFF all bulbs - measuring zero point...");
    Serial.println("Press any key when ready...");
    while(!Serial.available()) delay(100);
    Serial.read(); // Clear input
    
    long zeroSum = 0;
    for(int i = 0; i < 2000; i++) {
        zeroSum += analogRead(CURRENT_PIN);
        delayMicroseconds(50);
    }
    float zeroPoint = zeroSum / 2000.0;
    Serial.printf("Zero point (no load): %.2f ADC counts\n", zeroPoint);
    
    // Test with one bulb
    Serial.println("\nTurn ON 1 bulb (5W)");
    Serial.println("Press any key when ready...");
    while(!Serial.available()) delay(100);
    Serial.read();
    
    testCurrentReading("1 bulb (5W)", zeroPoint, 0.022);
    
    // Test with two bulbs
    Serial.println("\nTurn ON 2 bulbs (10W total)");
    Serial.println("Press any key when ready...");
    while(!Serial.available()) delay(100);
    Serial.read();
    
    testCurrentReading("2 bulbs (10W)", zeroPoint, 0.044);
    
    // Test with three bulbs
    Serial.println("\nTurn ON 3 bulbs (15W total)");
    Serial.println("Press any key when ready...");
    while(!Serial.available()) delay(100);
    Serial.read();
    
    testCurrentReading("3 bulbs (15W)", zeroPoint, 0.066);
}

void testCurrentReading(String loadDesc, float zeroPoint, float expectedCurrent) {
    Serial.printf("Testing: %s (Expected: %.3fA)\n", loadDesc.c_str(), expectedCurrent);
    Serial.println("Read clamp meter and enter the value in Serial Monitor");
    
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
        float current = voltage / 0.1; // ACS712 sensitivity: 100mV/A
        
        sensorSum += current;
        Serial.printf("Reading %d: %.4fA\n", i+1, current);
        delay(1000);
    }
    
    float avgSensorReading = sensorSum / readings;
    Serial.printf("Average sensor reading: %.4fA\n", avgSensorReading);
    Serial.printf("Expected current: %.4fA\n", expectedCurrent);
    
    if(avgSensorReading > 0.001) {
        float calibrationFactor = expectedCurrent / avgSensorReading;
        Serial.printf("Suggested calibration factor: %.4f\n", calibrationFactor);
    }
    
    Serial.println("Enter clamp meter reading (in Amps):");
    while(!Serial.available()) delay(100);
    String input = Serial.readStringUntil('\n');
    float clampReading = input.toFloat();
    
    if(clampReading > 0 && avgSensorReading > 0.001) {
        float clampCalibration = clampReading / avgSensorReading;
        Serial.printf("Clamp meter calibration factor: %.4f\n", clampCalibration);
    }
    
    Serial.println("---");
}

void calibrateVoltageSimple() {
    Serial.println("=== VOLTAGE CALIBRATION ===");
    Serial.println("Measure outlet voltage with multimeter if available");
    Serial.println("Otherwise we'll use standard 230V assumption");
    
    float voltageSum = 0;
    int readings = 10;
    
    for(int i = 0; i < readings; i++) {
        long sum = 0;
        int samples = 1000;
        
        for (int j = 0; j < samples; j++) {
            int reading = analogRead(VOLTAGE_PIN);
            sum += (reading - 2048) * (reading - 2048);
            delayMicroseconds(100);
        }
        
        float rms = sqrt(sum / samples);
        float voltage_reading = (rms * 3.3) / 4095.0;
        
        voltageSum += voltage_reading;
        Serial.printf("Voltage reading %d: %.4fV (raw)\n", i+1, voltage_reading);
        delay(1000);
    }
    
    float avgVoltage = voltageSum / readings;
    Serial.printf("Average voltage reading: %.4fV\n", avgVoltage);
    
    // Assume 230V standard
    float voltageFactor = 230.0 / avgVoltage;
    Serial.printf("Voltage calibration factor (assuming 230V): %.4f\n", voltageFactor);
}

void runFullCalibration() {
    Serial.println("Starting full system calibration...");
    delay(2000);
    
    calibrateCurrentWithClampMeter();
    delay(5000);
    
    if(HAS_VOLTAGE_SENSOR) {
        calibrateVoltageSimple();
    }
    
    Serial.println("Calibration complete!");
    Serial.println("Update your calibration constants in the code.");
}

void readAndSendData() {
    Serial.println("Reading sensors...");
    
    float current = readCurrent();
    float voltage = readVoltage();
    float power = voltage * current;
    
    String timestamp = getFormattedTimestamp();
    
    // Send this unit's data
    String basePath = "/buildings/building_001/units/" + UNIT_ID + "/";
    Database.set<float>(aClient, basePath + "current", current, dataCallback, "setCurrent");
    Database.set<float>(aClient, basePath + "voltage", voltage, dataCallback, "setVoltage");
    Database.set<float>(aClient, basePath + "power", power, dataCallback, "setPower");
    Database.set<String>(aClient, basePath + "timestamp", timestamp, dataCallback, "setTimestamp");
    
    // Share voltage reading for other units
    Database.set<float>(aClient, "/buildings/building_001/shared_voltage", voltage, dataCallback, "setSharedVoltage");
    
    Serial.printf("Master Unit - Current: %.2fA, Voltage: %.2fV, Power: %.2fW\n", 
                  current, voltage, power);
}

// Data send callback
void dataCallback(AsyncResult &aResult) {
    if (aResult.available()) {
        Serial.println("Data sent successfully!");
        // Quick LED flash
        digitalWrite(STATUS_LED, LOW);
        delay(50);
        digitalWrite(STATUS_LED, HIGH);
    }
    
    if (aResult.isError()) {
        Serial.printf("Firebase error: %s\n", aResult.error().message().c_str());
        // Error LED pattern
        for (int i = 0; i < 3; i++) {
            digitalWrite(STATUS_LED, LOW);
            delay(200);
            digitalWrite(STATUS_LED, HIGH);
            delay(200);
        }
    }
}
