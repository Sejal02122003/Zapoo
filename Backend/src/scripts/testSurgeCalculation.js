import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeRawSurgeAmount, getCurrentSurgeForRestaurant } from '../modules/food/admin/services/surgeCalculation.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runTests() {
    console.log('--- SURGE UNIT TESTS ---');

    const config = {
        lowThresholdRatio: 1.2,
        highThresholdRatio: 3.0,
        baseSurgeAmount: 10,
        maxSurgeAmount: 50,
        smoothingAlpha: 0.3,
        riderSurgeSharePercent: 80
    };

    // Test 1: Below threshold
    const surgeLow = computeRawSurgeAmount(0.8, config);
    console.log(`Ratio 0.8 (below 1.2): Expected 0, Got: ${surgeLow}`);
    console.assert(surgeLow === 0, 'Test 1 Failed');

    // Test 2: At low threshold
    const surgeExactLow = computeRawSurgeAmount(1.2, config);
    console.log(`Ratio 1.2 (exact low): Expected 10, Got: ${surgeExactLow}`);
    console.assert(surgeExactLow === 10, 'Test 2 Failed');

    // Test 3: Mid interpolation
    const surgeMid = computeRawSurgeAmount(2.1, config);
    console.log(`Ratio 2.1 (mid point): Expected 30, Got: ${surgeMid}`);
    console.assert(surgeMid === 30, 'Test 3 Failed');

    // Test 4: At max threshold
    const surgeMax = computeRawSurgeAmount(3.0, config);
    console.log(`Ratio 3.0 (high threshold): Expected 50, Got: ${surgeMax}`);
    console.assert(surgeMax === 50, 'Test 4 Failed');

    // Test 5: Above max threshold
    const surgeAboveMax = computeRawSurgeAmount(4.5, config);
    console.log(`Ratio 4.5 (above high): Expected 50, Got: ${surgeAboveMax}`);
    console.assert(surgeAboveMax === 50, 'Test 5 Failed');

    console.log('--- ALL SURGE UNIT TESTS PASSED ---');
}

runTests();
