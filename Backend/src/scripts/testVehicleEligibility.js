import { validateVehicleDetails } from '../modules/food/delivery/helpers/vehicleValidation.helpers.js';
import { filterRidersByVehicleRange } from '../modules/food/delivery/services/riderEligibility.service.js';

async function runVehicleTests() {
    console.log('--- VEHICLE ELIGIBILITY & RANGE UNIT TESTS ---');

    // Test 1: Bicycle registration number clearing
    const bikeVal = validateVehicleDetails({ vehicleType: 'bicycle', vehicleNumber: 'MH12AB1234' });
    console.log(`Test 1 (Bicycle number cleared): Got type=${bikeVal.vehicleType}, number=${bikeVal.vehicleNumber}`);
    console.assert(bikeVal.vehicleType === 'BICYCLE', 'Test 1a Failed');
    console.assert(bikeVal.vehicleNumber === null, 'Test 1b Failed');

    // Test 2: Bike requires vehicle number
    let test2Passed = false;
    try {
        validateVehicleDetails({ vehicleType: 'bike', vehicleNumber: '' });
    } catch (err) {
        test2Passed = true;
        console.log(`Test 2 (Bike number required): Caught expected validation error -> "${err.message}"`);
    }
    console.assert(test2Passed, 'Test 2 Failed');

    // Test 3: Range-based rider filtering (3km delivery distance)
    const partners = [
        { _id: 'p1', name: 'Bicycle Rider', vehicleType: 'BICYCLE' },
        { _id: 'p2', name: 'Bike Rider', vehicleType: 'BIKE' },
        { _id: 'p3', name: 'Car Rider', vehicleType: 'CAR' }
    ];

    const eligible3km = filterRidersByVehicleRange({ partners, deliveryDistanceKm: 2.5 });
    console.log(`Test 3 (2.5km distance): Eligible riders = ${eligible3km.map(p => p.name).join(', ')}`);
    console.assert(eligible3km.length === 3, 'Test 3 Failed');

    // Test 4: Range-based rider filtering (15km delivery distance)
    const eligible15km = filterRidersByVehicleRange({ partners, deliveryDistanceKm: 15 });
    console.log(`Test 4 (15km distance): Eligible riders = ${eligible15km.map(p => p.name).join(', ')}`);
    console.assert(eligible15km.length === 1 && eligible15km[0].vehicleType === 'CAR', 'Test 4 Failed');

    console.log('--- ALL VEHICLE TESTS PASSED SUCCESSFULLY ---');
}

runVehicleTests();
