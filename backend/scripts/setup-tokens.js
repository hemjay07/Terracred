require('dotenv').config();
const HederaService = require('../src/services/hedera.service');

async function setupTokens() {
    const hederaService = new HederaService();

    //create heNGN stablecoin
    console.log('Creating heNGN stablecoin token...');
    const heNGNTokenId = await hederaService.createHeNGNToken();
    console.log(`Save this to .env: HENGN_TOKEN_ID=${heNGNTokenId}`);

    //create first RWA token for test property
    console.log('Creating RWA token for Test Property...');
    const rwaTokenId = await hederaService.createRWAToken({
        propertyId: 'PROP001',
        address: '123 Victoria Island, Lagos',
        value: 500000, // $500, 000
        tokenSupply: 1000, // 1000 tokens = $500 each
        ownerAccountId: process.env.HEDERA_ACCOUNT_ID
    });
    console.log(`Test RWA Token: ${rwaTokenId}\n`);

    //associate and grant KYC
    console.log('Associating and granting KYC to owner for RWA token...');
    await hederaService.associateToken(
        process.env.HEDERA_ACCOUNT_ID, 
        heNGNTokenId
    );
    await hederaService.grantKYC(
        process.env.HEDERA_ACCOUNT_ID, 
        rwaTokenId
    );
    console.log('Setup complete.');
}

setupTokens().catch(console.error);