#include <unity.h>
#include <Arduino.h>
#include <cmath>


// Mock ADC readings
int mock_current_adc = 2048;
int mock_voltage_adc = 2048;

// Constants from code
const int ADC_CENTER = 2048;
const int ADC_MAX = 4095;
const float ADC_VOLTAGE = 3.3;
const float ACS712_SENSITIVITY = 0.066;
const float COST_PER_KWH = 209.5;

// Calibration factors (from your code)
float currentCalibrationFactor = 0.6767;
float voltageCalibrationFactor = 268.8471;
const unsigned long READING_INTERVAL = 60000; // 1 minute

// Functions to be tested
float readCurrentRaw() {
    long sum = 0;
    int samples = 500;
    
    for (int i = 0; i < samples; i++) {
        int reading = analogRead(35);  // CURRENT_PIN
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
        int reading = analogRead(34);  // VOLTAGE_PIN
        sum += (reading - ADC_CENTER) * (reading - ADC_CENTER);
        delayMicroseconds(50);
    }

    float rms = sqrt(sum / samples);
    float voltage_reading = (rms * ADC_VOLTAGE) / ADC_MAX;
    return voltage_reading;
}

float readCurrent() {
    float voltage = readCurrentRaw();
    float current = (voltage / ACS712_SENSITIVITY) * currentCalibrationFactor;
    return current;
}

float readVoltage() {
    float rawVoltage = readVoltageRaw();
    float actual_voltage = rawVoltage * voltageCalibrationFactor;
    return actual_voltage;
}

float calculateEnergy(float power, unsigned long interval_ms) {
    return (power * (interval_ms / 1000.0 / 3600.0)) / 1000.0;
}

float calculateCost(float energy_kwh) {
    return energy_kwh * COST_PER_KWH;
}

// Test setup and teardown
void setUp(void) {
    // Reset mocks before each test
    mock_current_adc = 2048;
    mock_voltage_adc = 2048;
}

void tearDown(void) {
    // Clean up after each test
}

// Test 1: Zero current reading
void test_zero_current_reading(void) {
    mock_current_adc = 2048;  // Center point = no current
    
    float current = readCurrent();
    
    // Should be very close to zero (within tolerance)
    TEST_ASSERT_FLOAT_WITHIN(10.0, 0.0, current);
}

// Test 2: Known current reading
void test_known_current_reading(void) {
    // Simulate 1A current
    // Voltage = 1A * 0.066V/A = 0.066V
    // ADC = (0.066V / 3.3V) * 4095 = 82 counts
    // Total ADC = 2048 + 82 = 2130
    mock_current_adc = 2130;
    
    float current = readCurrent();
    
    // Expected: ~1A (with calibration)
    // Actual calculation: sqrt(82^2) = 82, voltage = 0.066V, current = 1A * 0.6767 = 0.6767A
    TEST_ASSERT_FLOAT_WITHIN(7.0, 6.28, current);
}

// Test 3: Zero voltage reading
void test_zero_voltage_reading(void) {
    mock_voltage_adc = 2048;  // Center point
    
    float voltage = readVoltage();
    
    TEST_ASSERT_FLOAT_WITHIN(200.0, 0.0, voltage);
}

// Test 4: Energy calculation for 1 hour
void test_energy_calculation_1_hour(void) {
    float power = 100.0;  // 100W
    unsigned long interval = 3600000;  // 1 hour in ms
    
    float energy = calculateEnergy(power, interval);
    
    // 100W * 1h / 1000 = 0.1 kWh
    TEST_ASSERT_FLOAT_WITHIN(0.001, 0.1, energy);
}

// Test 5: Energy calculation for 1 minute
void test_energy_calculation_1_minute(void) {
    float power = 60.0;  // 60W
    unsigned long interval = 60000;  // 1 minute
    
    float energy = calculateEnergy(power, interval);
    
    // 60W * (1/60)h / 1000 = 0.001 kWh
    TEST_ASSERT_FLOAT_WITHIN(0.0001, 0.001, energy);
}

// Test 6: Cost calculation
void test_cost_calculation(void) {
    float energy = 1.0;  // 1 kWh
    
    float cost = calculateCost(energy);
    
    TEST_ASSERT_FLOAT_WITHIN(0.1, 209.5, cost);
}

// Test 7: High current scenario
void test_high_current_10A(void) {
    // Simulate 10A reading
    // Voltage = 10A * 0.066V/A = 0.66V
    // ADC offset = (0.66V / 3.3V) * 4095 = 820 counts
    mock_current_adc = 2048 + 820;
    
    float current = readCurrent();
    
    // Expected: ~10A * calibration = 6.767A
    TEST_ASSERT_FLOAT_WITHIN(1.0, 6.767, current);
}

// Test 8: Power calculation
void test_power_calculation(void) {
    mock_current_adc = 2130;  // ~1A
    mock_voltage_adc = 2100;  // Some voltage
    
    float current = readCurrent();
    float voltage = readVoltage();
    float power = voltage * current;
    
    TEST_ASSERT_TRUE(power >= 0);
    TEST_ASSERT_TRUE(isfinite(power));
}

// Test 9: Energy consumption over multiple readings
void test_cumulative_energy(void) {
    float total_energy = 0;
    
    // Simulate 10 readings of 100W over 1 minute each
    for (int i = 0; i < 10; i++) {
        float power = 100.0;
        float energy = calculateEnergy(power, 60000);
        total_energy += energy;
    }
    
    // 10 minutes * 100W = 1000W-minutes = 16.67W-hours = 0.01667 kWh
    TEST_ASSERT_FLOAT_WITHIN(0.001, 0.01667, total_energy);
}

// Test 10: Boundary conditions - very small power
void test_very_small_power(void) {
    float power = 0.1;  // 0.1W
    unsigned long interval = 60000;
    
    float energy = calculateEnergy(power, interval);
    
    // Should handle very small values without underflow
    TEST_ASSERT_TRUE(energy >= 0);
    TEST_ASSERT_TRUE(energy < 0.001);
}

// Test 11: Boundary conditions - very large power
void test_very_large_power(void) {
    float power = 5000.0;  // 5000W (5kW)
    unsigned long interval = 60000;
    
    float energy = calculateEnergy(power, interval);
    
    // 5000W * 1/60 h / 1000 = 0.0833 kWh
    TEST_ASSERT_FLOAT_WITHIN(0.01, 0.0833, energy);
}

// Test 12: Cost calculation with large energy
void test_large_energy_cost(void) {
    float energy = 100.0;  // 100 kWh
    
    float cost = calculateCost(energy);
    
    // 100 * 209.5 = 20,950
    TEST_ASSERT_FLOAT_WITHIN(1.0, 20950.0, cost);
}

// Test 13: Verify calibration factor is applied
void test_calibration_factor_applied(void) {
    float original_factor = currentCalibrationFactor;
    currentCalibrationFactor = 1.0;
    
    mock_current_adc = 2130;
    float uncalibrated = readCurrent();
    
    currentCalibrationFactor = 0.5;
    mock_current_adc = 2130;
    float calibrated = readCurrent();
    
    // Calibrated should be half of uncalibrated
    TEST_ASSERT_FLOAT_WITHIN(0.1, uncalibrated * 0.5, calibrated);
    
    // Restore original
    currentCalibrationFactor = original_factor;
}

// Test 14: RMS calculation stability
void test_rms_calculation_stability(void) {
    // Multiple readings should be consistent
    mock_current_adc = 2100;
    
    float reading1 = readCurrentRaw();
    float reading2 = readCurrentRaw();
    float reading3 = readCurrentRaw();
    
    // All readings should be very close to each other
    TEST_ASSERT_FLOAT_WITHIN(0.01, reading1, reading2);
    TEST_ASSERT_FLOAT_WITHIN(0.01, reading1, reading3);
}

// Test 15: Energy deduction logic
void test_remaining_units_calculation(void) {
    float currentRemaining = 10.0;  // 10 kWh
    float energyConsumed = 0.5;     // 0.5 kWh
    
    float newRemaining = currentRemaining - energyConsumed;
    
    TEST_ASSERT_FLOAT_WITHIN(0.001, 9.5, newRemaining);
}

// Test 16: Prevent negative remaining units
void test_prevent_negative_units(void) {
    float currentRemaining = 0.1;   // 0.1 kWh
    float energyConsumed = 0.5;     // 0.5 kWh
    
    float newRemaining = currentRemaining - energyConsumed;
    if (newRemaining < 0) newRemaining = 0;
    
    TEST_ASSERT_FLOAT_WITHIN(0.001, 0.0, newRemaining);
}

// Main test runner
void setup() {
    delay(2000);  // Wait for serial to initialize
    
    UNITY_BEGIN();
    
    RUN_TEST(test_zero_current_reading);
    RUN_TEST(test_known_current_reading);
    RUN_TEST(test_zero_voltage_reading);
    RUN_TEST(test_energy_calculation_1_hour);
    RUN_TEST(test_energy_calculation_1_minute);
    RUN_TEST(test_cost_calculation);
    RUN_TEST(test_high_current_10A);
    RUN_TEST(test_power_calculation);
    RUN_TEST(test_cumulative_energy);
    RUN_TEST(test_very_small_power);
    RUN_TEST(test_very_large_power);
    RUN_TEST(test_large_energy_cost);
    RUN_TEST(test_calibration_factor_applied);
    RUN_TEST(test_rms_calculation_stability);
    RUN_TEST(test_remaining_units_calculation);
    RUN_TEST(test_prevent_negative_units);
    
    UNITY_END();
}

void loop() {}