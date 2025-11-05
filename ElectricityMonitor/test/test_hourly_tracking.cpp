#include <unity.h>
#include <Arduino.h>

struct tm mock_time;
bool mock_time_valid = true;

bool mockGetLocalTime(struct tm *info) {
    if (!mock_time_valid) return false;
    *info = mock_time;
    return true;
}

void setMockTime(int year, int month, int day, int hour, int minute, int second) {
    mock_time.tm_year = year - 1900;
    mock_time.tm_mon = month - 1;
    mock_time.tm_mday = day;
    mock_time.tm_hour = hour;
    mock_time.tm_min = minute;
    mock_time.tm_sec = second;
    mock_time_valid = true;
}

struct HourlyData {
    float totalEnergy = 0;
    float totalPower = 0;
    float totalCurrent = 0;
    float peakPower = 0;
    int samples = 0;
    int currentHour = -1;
};

HourlyData hourlyBuffer;

int getCurrentHour() {
    struct tm timeinfo;
    if (!mockGetLocalTime(&timeinfo)) {
        return -1;
    }
    return timeinfo.tm_hour;
}

String getCurrentDate() {
    struct tm timeinfo;
    if (!mockGetLocalTime(&timeinfo)) {
        return "";
    }
    char dateBuff[20];
    strftime(dateBuff, sizeof(dateBuff), "%Y-%m-%d", &timeinfo);
    return String(dateBuff);
}

String getFormattedTimestamp() {
    struct tm timeinfo;
    if (!mockGetLocalTime(&timeinfo)) {
        return String(millis());
    }
    
    char timeStringBuff[50];
    strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(timeStringBuff);
}

void accumulateReading(float current, float power, float energy) {
    hourlyBuffer.totalEnergy += energy;
    hourlyBuffer.totalPower += power;
    hourlyBuffer.totalCurrent += current;
    if (power > hourlyBuffer.peakPower) {
        hourlyBuffer.peakPower = power;
    }
    hourlyBuffer.samples++;
}

void resetHourlyBuffer(int newHour) {
    hourlyBuffer.totalEnergy = 0;
    hourlyBuffer.totalPower = 0;
    hourlyBuffer.totalCurrent = 0;
    hourlyBuffer.peakPower = 0;
    hourlyBuffer.samples = 0;
    hourlyBuffer.currentHour = newHour;
}

void setUp(void) {
    // Reset hourly buffer before each test
    resetHourlyBuffer(-1);
    setMockTime(2025, 11, 4, 10, 0, 0);  // Nov 4, 2025, 10:00 AM
}

void tearDown(void) {
    // Clean up
}

// Test 1: Initial hour tracking
void test_initial_hour_tracking(void) {
    setMockTime(2025, 11, 4, 14, 30, 0);
    
    int hour = getCurrentHour();
    hourlyBuffer.currentHour = hour;
    
    TEST_ASSERT_EQUAL(14, hourlyBuffer.currentHour);
}

// Test 2: Hour change detection
void test_hour_change_detection(void) {
    // Start at 10:55
    setMockTime(2025, 11, 4, 10, 55, 0);
    hourlyBuffer.currentHour = getCurrentHour();
    TEST_ASSERT_EQUAL(10, hourlyBuffer.currentHour);
    
    // Add some data
    accumulateReading(1.5, 100.0, 0.001);
    TEST_ASSERT_EQUAL(1, hourlyBuffer.samples);
    
    // Move to 11:05 (hour changed)
    setMockTime(2025, 11, 4, 11, 5, 0);
    int newHour = getCurrentHour();
    
    TEST_ASSERT_NOT_EQUAL(hourlyBuffer.currentHour, newHour);
    TEST_ASSERT_EQUAL(11, newHour);
}

// Test 3: Data accumulation within same hour
void test_data_accumulation_same_hour(void) {
    setMockTime(2025, 11, 4, 10, 0, 0);
    hourlyBuffer.currentHour = getCurrentHour();
    
    // Add multiple readings
    accumulateReading(1.0, 230.0, 0.0001);
    accumulateReading(1.5, 345.0, 0.00015);
    accumulateReading(0.8, 184.0, 0.00008);
    
    TEST_ASSERT_EQUAL(3, hourlyBuffer.samples);
    TEST_ASSERT_FLOAT_WITHIN(0.00001, 0.00033, hourlyBuffer.totalEnergy);
    TEST_ASSERT_FLOAT_WITHIN(0.1, 759.0, hourlyBuffer.totalPower);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 3.3, hourlyBuffer.totalCurrent);
    TEST_ASSERT_FLOAT_WITHIN(0.1, 345.0, hourlyBuffer.peakPower);
}

// Test 4: Peak power tracking
void test_peak_power_tracking(void) {
    hourlyBuffer.currentHour = 10;
    
    accumulateReading(1.0, 100.0, 0.001);
    TEST_ASSERT_FLOAT_WITHIN(0.1, 100.0, hourlyBuffer.peakPower);
    
    accumulateReading(2.0, 500.0, 0.005);  // New peak
    TEST_ASSERT_FLOAT_WITHIN(0.1, 500.0, hourlyBuffer.peakPower);
    
    accumulateReading(0.5, 50.0, 0.0005);  // Lower than peak
    TEST_ASSERT_FLOAT_WITHIN(0.1, 500.0, hourlyBuffer.peakPower);  // Peak unchanged
}

// Test 5: Average calculations
void test_average_calculations(void) {
    hourlyBuffer.currentHour = 10;
    
    accumulateReading(1.0, 100.0, 0.001);
    accumulateReading(2.0, 200.0, 0.002);
    accumulateReading(3.0, 300.0, 0.003);
    
    float avgPower = hourlyBuffer.totalPower / hourlyBuffer.samples;
    float avgCurrent = hourlyBuffer.totalCurrent / hourlyBuffer.samples;
    
    TEST_ASSERT_FLOAT_WITHIN(0.1, 200.0, avgPower);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 2.0, avgCurrent);
}

// Test 6: Buffer reset on hour change
void test_buffer_reset_on_hour_change(void) {
    hourlyBuffer.currentHour = 10;
    
    // Accumulate data for hour 10
    accumulateReading(1.0, 100.0, 0.001);
    accumulateReading(1.0, 100.0, 0.001);
    TEST_ASSERT_EQUAL(2, hourlyBuffer.samples);
    
    // Save would happen here in real code
    
    // Reset for hour 11
    resetHourlyBuffer(11);
    
    TEST_ASSERT_EQUAL(0, hourlyBuffer.samples);
    TEST_ASSERT_FLOAT_WITHIN(0.0001, 0.0, hourlyBuffer.totalEnergy);
    TEST_ASSERT_EQUAL(11, hourlyBuffer.currentHour);
}

// Test 7: Date formatting
void test_date_formatting(void) {
    setMockTime(2025, 11, 4, 14, 30, 45);
    
    String date = getCurrentDate();
    String timestamp = getFormattedTimestamp();
    
    TEST_ASSERT_EQUAL_STRING("2025-11-04", date.c_str());
    TEST_ASSERT_EQUAL_STRING("2025-11-04 14:30:45", timestamp.c_str());
}

// Test 8: Midnight hour transition
void test_midnight_transition(void) {
    setMockTime(2025, 11, 4, 23, 55, 0);
    hourlyBuffer.currentHour = getCurrentHour();
    TEST_ASSERT_EQUAL(23, hourlyBuffer.currentHour);
    
    accumulateReading(1.0, 100.0, 0.001);
    
    // Move to midnight (next day)
    setMockTime(2025, 11, 5, 0, 5, 0);
    int newHour = getCurrentHour();
    
    TEST_ASSERT_EQUAL(0, newHour);
    TEST_ASSERT_NOT_EQUAL(hourlyBuffer.currentHour, newHour);
}

// Test 9: Multiple hour transitions
void test_multiple_hour_transitions(void) {
    // Simulate system running across multiple hours
    int hours[] = {10, 11, 12, 13};
    
    for (int i = 0; i < 4; i++) {
        setMockTime(2025, 11, 4, hours[i], 30, 0);
        int currentHour = getCurrentHour();
        
        if (hourlyBuffer.currentHour != -1 && currentHour != hourlyBuffer.currentHour) {
            // Hour changed - would save data here
            TEST_ASSERT_TRUE(hourlyBuffer.samples > 0);
            resetHourlyBuffer(currentHour);
        } else if (hourlyBuffer.currentHour == -1) {
            hourlyBuffer.currentHour = currentHour;
        }
        
        // Accumulate some data
        accumulateReading(1.0, 100.0, 0.001);
        
        TEST_ASSERT_EQUAL(hours[i], hourlyBuffer.currentHour);
    }
}

// Test 10: Energy accumulation over time
void test_energy_accumulation_realistic(void) {
    hourlyBuffer.currentHour = 10;
    
    // Simulate 60 readings over 1 hour (1 per minute)
    for (int i = 0; i < 60; i++) {
        float power = 1000.0;  // 1kW constant load
        float energy = (power * (60.0 / 3600.0)) / 1000.0;  // 1 minute worth
        accumulateReading(4.35, power, energy);
    }
    
    // Should have accumulated approximately 1 kWh
    TEST_ASSERT_EQUAL(60, hourlyBuffer.samples);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 1.0, hourlyBuffer.totalEnergy);
}

// Test 11: No samples before first data
void test_no_samples_before_data(void) {
    TEST_ASSERT_EQUAL(0, hourlyBuffer.samples);
    TEST_ASSERT_FLOAT_WITHIN(0.001, 0.0, hourlyBuffer.totalEnergy);
}

// Test 12: Invalid time handling
void test_invalid_time_handling(void) {
    mock_time_valid = false;
    
    int hour = getCurrentHour();
    String date = getCurrentDate();
    
    TEST_ASSERT_EQUAL(-1, hour);
    TEST_ASSERT_EQUAL_STRING("", date.c_str());
    
    mock_time_valid = true;  // Restore for other tests
}

// Test 13: Zero power readings
void test_zero_power_readings(void) {
    hourlyBuffer.currentHour = 10;
    
    accumulateReading(0.0, 0.0, 0.0);
    accumulateReading(0.0, 0.0, 0.0);
    
    TEST_ASSERT_EQUAL(2, hourlyBuffer.samples);
    TEST_ASSERT_FLOAT_WITHIN(0.0001, 0.0, hourlyBuffer.totalEnergy);
    TEST_ASSERT_FLOAT_WITHIN(0.0001, 0.0, hourlyBuffer.peakPower);
}

// Test 14: Very high power spike
void test_high_power_spike(void) {
    hourlyBuffer.currentHour = 10;
    
    accumulateReading(1.0, 100.0, 0.001);
    accumulateReading(20.0, 5000.0, 0.05);  // 5kW spike
    accumulateReading(1.0, 100.0, 0.001);
    
    TEST_ASSERT_FLOAT_WITHIN(0.1, 5000.0, hourlyBuffer.peakPower);
    
    float avgPower = hourlyBuffer.totalPower / hourlyBuffer.samples;
    TEST_ASSERT_TRUE(avgPower < hourlyBuffer.peakPower);
}

// Test 15: Hourly data completeness check
void test_hourly_data_completeness(void) {
    hourlyBuffer.currentHour = 10;
    
    // Simulate realistic data
    accumulateReading(1.5, 345.0, 0.00575);
    
    // Verify all fields are populated
    TEST_ASSERT_TRUE(hourlyBuffer.totalEnergy > 0);
    TEST_ASSERT_TRUE(hourlyBuffer.totalPower > 0);
    TEST_ASSERT_TRUE(hourlyBuffer.totalCurrent > 0);
    TEST_ASSERT_TRUE(hourlyBuffer.peakPower > 0);
    TEST_ASSERT_TRUE(hourlyBuffer.samples > 0);
    TEST_ASSERT_TRUE(hourlyBuffer.currentHour >= 0 && hourlyBuffer.currentHour < 24);
}


void setup() {
    delay(2000);
    
    UNITY_BEGIN();
    
    RUN_TEST(test_initial_hour_tracking);
    RUN_TEST(test_hour_change_detection);
    RUN_TEST(test_data_accumulation_same_hour);
    RUN_TEST(test_peak_power_tracking);
    RUN_TEST(test_average_calculations);
    RUN_TEST(test_buffer_reset_on_hour_change);
    RUN_TEST(test_date_formatting);
    RUN_TEST(test_midnight_transition);
    RUN_TEST(test_multiple_hour_transitions);
    RUN_TEST(test_energy_accumulation_realistic);
    RUN_TEST(test_no_samples_before_data);
    RUN_TEST(test_invalid_time_handling);
    RUN_TEST(test_zero_power_readings);
    RUN_TEST(test_high_power_spike);
    RUN_TEST(test_hourly_data_completeness);
    
    UNITY_END();
}

void loop() {}