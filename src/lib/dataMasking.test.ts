/**
 * Data Masking Service Tests
 *
 * Test suite to verify customer data is properly masked before sending to LLM
 */

import { DataMaskingService } from './dataMasking';

// Mock customer data for testing
const testCustomerData = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_phone: '+91-9876543210',
    email: 'john.doe@example.com',
    material: 'gold',
    s_cost: 50000,
    profit: 5000,
    asof_date: '2024-12-15'
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_phone: '9123456789',
    email: 'jane@company.com',
    material: 'silver',
    s_cost: 25000,
    profit: 2500,
    asof_date: '2024-12-15'
  },
  {
    id: '3',
    customer_name: 'A',
    customer_phone: '98765',
    email: 'a@b.co',
    material: 'gold',
    s_cost: 75000,
    profit: 7500,
    asof_date: '2024-12-15'
  }
];

// Test customer name masking
console.log('🔒 Testing Customer Name Masking:');
console.log('Original: John Doe');
console.log('Masked:', DataMaskingService['maskCustomerName']('John Doe'));

console.log('Original: Jane Smith');
console.log('Masked:', DataMaskingService['maskCustomerName']('Jane Smith'));

console.log('Original: A (single character)');
console.log('Masked:', DataMaskingService['maskCustomerName']('A'));

console.log('Original: Ab (two characters)');
console.log('Masked:', DataMaskingService['maskCustomerName']('Ab'));

// Test phone number masking
console.log('\n📱 Testing Phone Number Masking:');
console.log('Original: +91-9876543210');
console.log('Masked:', DataMaskingService['maskPhoneNumber']('+91-9876543210'));

console.log('Original: 9123456789');
console.log('Masked:', DataMaskingService['maskPhoneNumber']('9123456789'));

console.log('Original: 98765 (short)');
console.log('Masked:', DataMaskingService['maskPhoneNumber']('98765'));

// Test email masking
console.log('\n📧 Testing Email Masking:');
console.log('Original: john.doe@example.com');
console.log('Masked:', DataMaskingService['maskEmail']('john.doe@example.com'));

console.log('Original: a@b.co');
console.log('Masked:', DataMaskingService['maskEmail']('a@b.co'));

// Test full data masking
console.log('\n🔒 Testing Full Data Masking:');
const maskedData = DataMaskingService.maskQueryResults(testCustomerData);

console.log('Original Data:');
console.log(JSON.stringify(testCustomerData[0], null, 2));

console.log('\nMasked Data:');
console.log(JSON.stringify(maskedData[0], null, 2));

// Test sensitive field detection
console.log('\n🔍 Testing Sensitive Field Detection:');
console.log('customer_name is sensitive:', DataMaskingService.isSensitiveField('customer_name'));
console.log('customer_phone is sensitive:', DataMaskingService.isSensitiveField('customer_phone'));
console.log('material is sensitive:', DataMaskingService.isSensitiveField('material'));
console.log('profit is sensitive:', DataMaskingService.isSensitiveField('profit'));

// Test safe data summary
console.log('\n📊 Testing Safe Data Summary:');
const summary = DataMaskingService.getSafeDataSummary(testCustomerData);
console.log('Data Summary:', summary);

// Test safe data description
console.log('\n📝 Testing Safe Data Description:');
const description = DataMaskingService.createSafeDataDescription(testCustomerData);
console.log('Safe Description:', description);

// Verify that masked data doesn't contain original sensitive information
console.log('\n✅ Privacy Verification:');
const maskedJson = JSON.stringify(maskedData);
const containsOriginalNames = testCustomerData.some(item =>
  maskedJson.includes(item.customer_name)
);
const containsOriginalPhones = testCustomerData.some(item =>
  maskedJson.includes(item.customer_phone)
);

console.log('Masked data contains original names:', containsOriginalNames ? '❌ FAIL' : '✅ PASS');
console.log('Masked data contains original phones:', containsOriginalPhones ? '❌ FAIL' : '✅ PASS');

// Test that non-sensitive data is preserved
const originalProfit = testCustomerData[0].profit;
const maskedProfit = maskedData[0].profit;
console.log('Non-sensitive data preserved (profit):', originalProfit === maskedProfit ? '✅ PASS' : '❌ FAIL');

console.log('\n🎉 Data Masking Tests Completed!');

export {}; // Make this a module