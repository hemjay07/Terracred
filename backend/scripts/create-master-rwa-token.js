require('dotenv').config();
const { Client, TokenCreateTransaction, TokenType, TokenSupplyType, PrivateKey, AccountId } = require("@hashgraph/sdk");

async function createMasterRWAToken() {
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY)
    );

    console.log('\n🏗️  Creating Master TerraCred RWA Token...\n');

    try {
        const tokenCreateTx = await new TokenCreateTransaction()
            .setTokenName("TerraCred Property Token")
            .setTokenSymbol("TCRED")
            .setDecimals(0)
            .setInitialSupply(0) // Start with 0, mint per property
            .setTreasuryAccountId(client.operatorAccountId)
            .setSupplyType(TokenSupplyType.Infinite) // Can mint unlimited
            .setTokenType(TokenType.FungibleCommon)
            .setSupplyKey(client.operatorPublicKey)
            .setAdminKey(client.operatorPublicKey)
            .setFreezeKey(client.operatorPublicKey)
            .setKycKey(client.operatorPublicKey)
            .setTokenMemo("TerraCred Protocol - Tokenized Real Estate Assets")
            .execute(client);

        const receipt = await tokenCreateTx.getReceipt(client);
        const tokenId = receipt.tokenId;

        console.log('✅ Master RWA Token Created!');
        console.log(`   Token ID: ${tokenId}`);
        console.log(`   Token Name: TerraCred Property Token`);
        console.log(`   Symbol: TCRED\n`);

        // Convert to EVM address
        const tokenIdParts = tokenId.toString().split('.');
        const tokenNum = parseInt(tokenIdParts[2]);
        const evmAddress = '0x' + tokenNum.toString(16).padStart(40, '0');

        console.log(`📍 EVM Address: ${evmAddress}\n`);
        console.log('💾 Add these to your .env file:');
        console.log(`MASTER_RWA_TOKEN_ID=${tokenId}`);
        console.log(`MASTER_RWA_TOKEN_ADDRESS=${evmAddress}\n`);

    } catch (error) {
        console.error('❌ Error:', error);
    }

    client.close();
}

createMasterRWAToken();
