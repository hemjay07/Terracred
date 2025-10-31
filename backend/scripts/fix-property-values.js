/**
 * Script to fix incorrect property values in the database
 *
 * This fixes properties where the value was entered incorrectly during tokenization
 * (e.g., 600,000 instead of 60,000,000)
 */

const dataStore = require('../src/data/store');

console.log('\n========================================');
console.log('🔧 FIXING PROPERTY VALUES');
console.log('========================================\n');

// Get all properties
const properties = dataStore.getAllProperties();

console.log(`Found ${properties.length} properties in database\n`);

// Display current properties
properties.forEach(prop => {
    console.log(`Property: ${prop.propertyId}`);
    console.log(`  Address: ${prop.address}`);
    console.log(`  Current Value: ₦${prop.value.toLocaleString()}`);
    console.log(`  Token Supply: ${prop.tokenSupply.toLocaleString()}`);
    console.log(`  Status: ${prop.status}`);
    console.log('');
});

// Ask user which property to fix (or we can fix automatically)
console.log('\n========================================');
console.log('💡 To fix a property value:');
console.log('   1. Note the propertyId above');
console.log('   2. Run: node scripts/fix-property-values.js <propertyId> <newValue>');
console.log('\nExample:');
console.log('   node scripts/fix-property-values.js PROP001 60000000');
console.log('========================================\n');

// If arguments provided, do the fix
const args = process.argv.slice(2);
if (args.length === 2) {
    const [propertyId, newValueStr] = args;
    const newValue = parseInt(newValueStr);

    if (isNaN(newValue) || newValue <= 0) {
        console.error('❌ Invalid value. Must be a positive number.');
        process.exit(1);
    }

    const property = dataStore.getProperty(propertyId);
    if (!property) {
        console.error(`❌ Property ${propertyId} not found`);
        process.exit(1);
    }

    const oldValue = property.value;
    const oldTokenSupply = property.tokenSupply;

    // Update the property
    property.value = newValue;
    property.tokenSupply = newValue; // Keep 1:1 ratio

    console.log(`✅ Updated ${propertyId}:`);
    console.log(`   Old Value: ₦${oldValue.toLocaleString()} → New Value: ₦${newValue.toLocaleString()}`);
    console.log(`   Old Token Supply: ${oldTokenSupply.toLocaleString()} → New Token Supply: ${newValue.toLocaleString()}`);
    console.log('\n⚠️ NOTE: This only updates the backend database.');
    console.log('   The blockchain token supply remains unchanged!');
    console.log('   The contract uses the propertyValue from depositCollateral() call.\n');
}
