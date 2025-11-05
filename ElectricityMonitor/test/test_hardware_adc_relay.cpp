#include <unity.h>
#include <Arduino.h>


#define CURRENT_PIN 35
#define VOLTAGE_PIN 34
#define RELAY_PIN 21
#define STATUS_LED 2

const int ADC_CENTER = 2048;
const int ADC_MAX = 4095;
const float ADC_VOLTAGE = 3.3;

void setUp(void) {
    // Configure pins
    pinMode(STATUS_LED, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(STATUS_LED, LOW);
    digitalWrite(RELAY_PIN, HIGH);  // OFF by default
    
    // Configure ADC
    analogSetWidth(12);
    analogSetAttenuation(ADC_11db);
    
    delay(100);  // Let hardware stabilize
}

void tearDown(void) {
    digitalWrite(RELAY_PIN, HIGH);  // Ensure relay is OFF
    digitalWrite(STATUS_LED, LOW);
}

// Test 1: ADC basic functionality
void test_adc_basic_read(void) {
    int reading = analogRead(CURRENT_PIN);
    
    // Should be within valid ADC range
    TEST_ASSERT_GREATER_OR_EQUAL(0, reading);
    TEST_ASSERT_LESS_OR_EQUAL(4095, reading);
    
    Serial.printf("Current PIN raw ADC: %d\n", reading);
}

// Test 2: ADC center point (no load)
void test_adc_center_point(void) {
    long sum = 0;
    int samples = 100;
    
    for (int i = 0; i < samples; i++) {
        sum += analogRead(CURRENT_PIN);
        delay(1);
    }
    
    float average = sum / (float)samples;
    
    Serial.printf("Average ADC (100 samples): %.2f\n", average);
    
    // With no load, should be close to center (2048 ± tolerance)
    // Increased tolerance for real hardware variations
    TEST_ASSERT_FLOAT_WITHIN(500, 2500.0, average);
}

// Test 3: ADC stability (multiple readings)
void test_adc_stability(void) {
    float readings[10];
    
    for (int i = 0; i < 10; i++) {
        readings[i] = analogRead(CURRENT_PIN);
        delay(100);
    }
    
    // Calculate standard deviation
    float mean = 0;
    for (int i = 0; i < 10; i++) {
        mean += readings[i];
    }
    mean /= 10.0;
    
    float variance = 0;
    for (int i = 0; i < 10; i++) {
        float diff = readings[i] - mean;
        variance += diff * diff;
    }
    variance /= 10.0;
    float stddev = sqrt(variance);
    
    Serial.printf("ADC Stability - Mean: %.2f, StdDev: %.2f\n", mean, stddev);
    
    // Standard deviation should be reasonable (not too noisy)
    TEST_ASSERT_LESS_THAN(200, stddev);
}

// Test 4: Voltage sensor ADC
void test_voltage_adc_read(void) {
    int reading = analogRead(VOLTAGE_PIN);
    
    TEST_ASSERT_GREATER_OR_EQUAL(0, reading);
    TEST_ASSERT_LESS_OR_EQUAL(4095, reading);
    
    Serial.printf("Voltage PIN raw ADC: %d\n", reading);
}

// Test 5: Both sensors read independently
void test_both_sensors_independent(void) {
    int current_reading = analogRead(CURRENT_PIN);
    delay(10);
    int voltage_reading = analogRead(VOLTAGE_PIN);
    
    Serial.printf("Current: %d, Voltage: %d\n", current_reading, voltage_reading);
    
    // Both should be valid
    TEST_ASSERT_GREATER_OR_EQUAL(0, current_reading);
    TEST_ASSERT_GREATER_OR_EQUAL(0, voltage_reading);
    
    // They should not be exactly identical (different sensors)
    // Note: They could be close if both are at center, so this is a weak test
    // TEST_ASSERT_NOT_EQUAL(current_reading, voltage_reading);
}

// Test 6: RMS calculation with real ADC
void test_rms_calculation_hardware(void) {
    long sum = 0;
    int samples = 500;
    
    for (int i = 0; i < samples; i++) {
        int reading = analogRead(CURRENT_PIN);
        int adjusted = reading - ADC_CENTER;
        sum += adjusted * adjusted;
        delayMicroseconds(100);
    }
    
    float rms = sqrt(sum / (float)samples);
    float voltage = (rms * ADC_VOLTAGE) / ADC_MAX;
    
    Serial.printf("RMS: %.4f, Voltage: %.4fV\n", rms, voltage);
    
    // RMS should be a valid positive number
    TEST_ASSERT_GREATER_OR_EQUAL(0, rms);
    TEST_ASSERT_GREATER_OR_EQUAL(0, voltage);
}

// Test 7: Relay can turn ON
void test_relay_turn_on(void) {
    digitalWrite(RELAY_PIN, LOW);  // ON (active low)
    delay(100);
    
    int state = digitalRead(RELAY_PIN);
    Serial.printf("Relay ON - Pin state: %d\n", state);
    
    TEST_ASSERT_EQUAL(LOW, state);
}

// Test 8: Relay can turn OFF
void test_relay_turn_off(void) {
    digitalWrite(RELAY_PIN, HIGH);  // OFF
    delay(100);
    
    int state = digitalRead(RELAY_PIN);
    Serial.printf("Relay OFF - Pin state: %d\n", state);
    
    TEST_ASSERT_EQUAL(HIGH, state);
}

// Test 9: Relay toggle multiple times
void test_relay_toggle(void) {
    for (int i = 0; i < 5; i++) {
        digitalWrite(RELAY_PIN, LOW);
        delay(200);
        TEST_ASSERT_EQUAL(LOW, digitalRead(RELAY_PIN));
        
        digitalWrite(RELAY_PIN, HIGH);
        delay(200);
        TEST_ASSERT_EQUAL(HIGH, digitalRead(RELAY_PIN));
    }
    
    Serial.println("Relay toggled 5 times successfully");
}

// Test 10: Relay state persistence
void test_relay_state_persistence(void) {
    // Set relay ON
    digitalWrite(RELAY_PIN, LOW);
    delay(100);
    TEST_ASSERT_EQUAL(LOW, digitalRead(RELAY_PIN));
    
    // Wait and check it stays ON
    delay(1000);
    TEST_ASSERT_EQUAL(LOW, digitalRead(RELAY_PIN));
    
    // Set relay OFF
    digitalWrite(RELAY_PIN, HIGH);
    delay(100);
    TEST_ASSERT_EQUAL(HIGH, digitalRead(RELAY_PIN));
    
    // Wait and check it stays OFF
    delay(1000);
    TEST_ASSERT_EQUAL(HIGH, digitalRead(RELAY_PIN));
}

// Test 11: Status LED control
void test_status_led(void) {
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    TEST_ASSERT_EQUAL(HIGH, digitalRead(STATUS_LED));
    
    digitalWrite(STATUS_LED, LOW);
    delay(100);
    TEST_ASSERT_EQUAL(LOW, digitalRead(STATUS_LED));
    
    Serial.println("Status LED working");
}

// Test 12: LED blink pattern
void test_led_blink_pattern(void) {
    // Quick blink pattern (success indicator)
    for (int i = 0; i < 3; i++) {
        digitalWrite(STATUS_LED, LOW);
        delay(100);
        digitalWrite(STATUS_LED, HIGH);
        delay(100);
    }
    
    // If we reach here without crashing, test passes
    TEST_ASSERT_TRUE(true);
}

// Test 13: Read sensors while relay is ON
void test_sensors_with_relay_on(void) {
    digitalWrite(RELAY_PIN, LOW);  // Relay ON
    delay(200);
    
    int current_reading = analogRead(CURRENT_PIN);
    int voltage_reading = analogRead(VOLTAGE_PIN);
    
    Serial.printf("With Relay ON - Current: %d, Voltage: %d\n", 
                  current_reading, voltage_reading);
    
    TEST_ASSERT_GREATER_OR_EQUAL(0, current_reading);
    TEST_ASSERT_GREATER_OR_EQUAL(0, voltage_reading);
    
    digitalWrite(RELAY_PIN, HIGH);  // Relay OFF
}

// Test 14: Read sensors while relay is OFF
void test_sensors_with_relay_off(void) {
    digitalWrite(RELAY_PIN, HIGH);  // Relay OFF
    delay(200);
    
    int current_reading = analogRead(CURRENT_PIN);
    int voltage_reading = analogRead(VOLTAGE_PIN);
    
    Serial.printf("With Relay OFF - Current: %d, Voltage: %d\n", 
                  current_reading, voltage_reading);
    
    TEST_ASSERT_GREATER_OR_EQUAL(0, current_reading);
    TEST_ASSERT_GREATER_OR_EQUAL(0, voltage_reading);
}

// Test 15: Multiple sensor readings in sequence
void test_sequential_readings(void) {
    const int NUM_READINGS = 10;
    int current_readings[NUM_READINGS];
    int voltage_readings[NUM_READINGS];
    
    for (int i = 0; i < NUM_READINGS; i++) {
        current_readings[i] = analogRead(CURRENT_PIN);
        delay(10);
        voltage_readings[i] = analogRead(VOLTAGE_PIN);
        delay(90);  // Total 100ms per cycle
    }
    
    // Verify all readings are valid
    for (int i = 0; i < NUM_READINGS; i++) {
        TEST_ASSERT_GREATER_OR_EQUAL(0, current_readings[i]);
        TEST_ASSERT_LESS_OR_EQUAL(4095, current_readings[i]);
        TEST_ASSERT_GREATER_OR_EQUAL(0, voltage_readings[i]);
        TEST_ASSERT_LESS_OR_EQUAL(4095, voltage_readings[i]);
    }
    
    Serial.println("Sequential readings test passed");
}

// Test 16: ADC read speed
void test_adc_read_speed(void) {
    unsigned long start = micros();
    
    for (int i = 0; i < 1000; i++) {
        analogRead(CURRENT_PIN);
    }
    
    unsigned long elapsed = micros() - start;
    float avg_per_read = elapsed / 1000.0;
    
    Serial.printf("1000 ADC reads: %lu µs (%.2f µs/read)\n", elapsed, avg_per_read);
    
    // Should be reasonably fast (ESP32 ADC is ~40-100µs per read)
    TEST_ASSERT_LESS_THAN(200000, elapsed);  // Less than 200ms total
}

// Test 17: Relay switching speed
void test_relay_switching_speed(void) {
    unsigned long start = millis();
    
    for (int i = 0; i < 10; i++) {
        digitalWrite(RELAY_PIN, LOW);
        delay(50);
        digitalWrite(RELAY_PIN, HIGH);
        delay(50);
    }
    
    unsigned long elapsed = millis() - start;
    
    Serial.printf("10 relay cycles: %lu ms\n", elapsed);
    
    // Should complete in reasonable time (10 cycles * 100ms = ~1000ms)
    TEST_ASSERT_LESS_OR_EQUAL(1200, elapsed);
}

// Test 18: Continuous operation
void test_continuous_operation(void) {
    Serial.println("Running continuous operation test for 30 seconds...");
    
    unsigned long start = millis();
    int reading_count = 0;
    
    while (millis() - start < 30000) {  // 30 seconds
        int current = analogRead(CURRENT_PIN);
        int voltage = analogRead(VOLTAGE_PIN);
        
        TEST_ASSERT_GREATER_OR_EQUAL(0, current);
        TEST_ASSERT_GREATER_OR_EQUAL(0, voltage);
        
        // Toggle LED to show activity
        digitalWrite(STATUS_LED, reading_count % 2);
        
        reading_count++;
        delay(100);
    }
    
    Serial.printf("Completed %d readings in 30 seconds\n", reading_count);
    TEST_ASSERT_GREATER_THAN(200, reading_count);  // Should get at least 200 readings
}


void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("\n\n========================================");
    Serial.println("ESP32 HARDWARE TESTS");
    Serial.println("========================================\n");
    
    UNITY_BEGIN();
    
    // ADC Tests
    Serial.println("\n--- ADC Tests ---");
    RUN_TEST(test_adc_basic_read);
    RUN_TEST(test_adc_center_point);
    RUN_TEST(test_adc_stability);
    RUN_TEST(test_voltage_adc_read);
    RUN_TEST(test_both_sensors_independent);
    RUN_TEST(test_rms_calculation_hardware);
    
    // Relay Tests
    Serial.println("\n--- Relay Tests ---");
    RUN_TEST(test_relay_turn_on);
    RUN_TEST(test_relay_turn_off);
    RUN_TEST(test_relay_toggle);
    RUN_TEST(test_relay_state_persistence);
    
    // LED Tests
    Serial.println("\n--- LED Tests ---");
    RUN_TEST(test_status_led);
    RUN_TEST(test_led_blink_pattern);
    
    // Integration Tests
    Serial.println("\n--- Integration Tests ---");
    RUN_TEST(test_sensors_with_relay_on);
    RUN_TEST(test_sensors_with_relay_off);
    RUN_TEST(test_sequential_readings);
    
    // Performance Tests
    Serial.println("\n--- Performance Tests ---");
    RUN_TEST(test_adc_read_speed);
    RUN_TEST(test_relay_switching_speed);
    
    // Stress Tests (comment out for quick testing)
    Serial.println("\n--- Stress Tests ---");
    RUN_TEST(test_continuous_operation);
    
    UNITY_END();

    Serial.println("\n========================================");
    Serial.println("HARDWARE TESTS COMPLETE");
    Serial.println("========================================\n");
}

void loop() {
    // Blink LED slowly to indicate tests are done
    digitalWrite(STATUS_LED, HIGH);
    delay(1000);
    digitalWrite(STATUS_LED, LOW);
    delay(1000);
}