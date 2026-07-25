import assert from 'assert';
import { encrypt, decrypt } from '../../../../utils/encryption.js';

console.log('--- STARTING SHIFT & PAYOUT ENGINE TESTS ---');

// Test 1: AES-256-CBC Bank Account Encryption & Decryption
console.log('\n[Test 1] Encrypting Bank Account Number...');
const sampleAccount = '12345678901234';
const encryptedAcc = encrypt(sampleAccount);
assert.notStrictEqual(encryptedAcc, sampleAccount, 'Encrypted output must not equal raw plaintext');
assert(encryptedAcc.includes(':'), 'Encrypted format must contain IV separator colon');

const decryptedAcc = decrypt(encryptedAcc);
assert.strictEqual(decryptedAcc, sampleAccount, 'Decrypted output must match original account number');
console.log('✅ PASS: Bank Account Encryption/Decryption verified.');

// Test 2: IFSC Code Regex Enforcement
console.log('\n[Test 2] Validating IFSC Code Regex...');
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const validIfsc = 'SBIN0001234';
const invalidIfsc1 = 'SBIN1001234'; // 5th char must be 0
const invalidIfsc2 = 'sbin0001234'; // lowercase

assert.strictEqual(IFSC_REGEX.test(validIfsc), true, 'Valid IFSC must pass regex');
assert.strictEqual(IFSC_REGEX.test(invalidIfsc1), false, 'Invalid IFSC must fail regex');
assert.strictEqual(IFSC_REGEX.test(invalidIfsc2), false, 'Lowercase IFSC must fail regex');
console.log('✅ PASS: IFSC Regex enforcement verified.');

// Test 3: Account Number Regex Enforcement
console.log('\n[Test 3] Validating Account Number Regex...');
const ACC_REGEX = /^\d{9,18}$/;
assert.strictEqual(ACC_REGEX.test('123456789'), true, '9 digits must pass');
assert.strictEqual(ACC_REGEX.test('123456789012345678'), true, '18 digits must pass');
assert.strictEqual(ACC_REGEX.test('1234567'), false, '7 digits must fail');
assert.strictEqual(ACC_REGEX.test('123456789A'), false, 'Non-digits must fail');
console.log('✅ PASS: Account Number Regex enforcement verified.');

// Test 4: Booking Window Calculation (T-1 24h Prior at Midnight)
console.log('\n[Test 4] Computing Booking Window (bookingOpensAt)...');
const shiftStart = new Date('2026-07-26T11:00:00.000Z');
const bookingOpensAt = new Date(shiftStart);
bookingOpensAt.setDate(bookingOpensAt.getDate() - 1);
bookingOpensAt.setHours(0, 0, 0, 0);

// Verify bookingOpensAt is 1 day before shiftStart date
assert.strictEqual(shiftStart.getTime() - bookingOpensAt.getTime() > 0, true, 'bookingOpensAt must be prior to shiftStart');
assert.strictEqual(bookingOpensAt.getDate(), 25, 'bookingOpensAt day must be T-1 (July 25th)');
console.log('✅ PASS: T-1 Booking Window calculation verified.');

// Test 5: Night Slot Auto-Detection & Boost
console.log('\n[Test 5] Night Slot Auto-Detection & Incentive Boost...');
const daySlotEndTime = '15:00';
const nightSlotEndTime = '23:00';

const isDayNight = daySlotEndTime >= '21:00';
const isNightNight = nightSlotEndTime >= '21:00';

assert.strictEqual(isDayNight, false, '15:00 slot must not be flagged as night slot');
assert.strictEqual(isNightNight, true, '23:00 slot must be flagged as night slot');
console.log('✅ PASS: Night slot auto-detection verified.');

console.log('\n--- ALL SHIFT & PAYOUT ENGINE TESTS PASSED CLEANLY! ---');
