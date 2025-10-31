const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client, ContractExecuteTransaction, ContractFunctionParameters, PrivateKey } = require("@hashgraph/sdk");

async function fundPoolMassive() {
    const client = Client.forTestnet();

    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyHex = process.env.HEDERA_PRIVATE_KEY_DER;
    const operatorKey = PrivateKey.fromStringDer(operatorKeyHex);

    client.setOperator(operatorId, operatorKey);

    const heNGNTokenId = process.env.HENGN_TOKEN_ID;
    const poolAddress = process.env.LENDING_POOL_ADDRESS;

    // ₦400M = 400,000,000 Naira = 40,000,000,000 kobo
    // With 2 decimals: 40,000,000,000 * 100 = 4,000,000,000,000
    const fundAmount = "4000000000000";

    console.log('Minting MASSIVE heNGN to pool...');
    console.log('heNGN Token ID:', heNGNTokenId);
    console.log('Pool Address:', poolAddress);
    console.log('Amount: ₦400,000,000 (400 Million Naira)');

    try {
        const mintTx = await new ContractExecuteTransaction()
            .setContractId(heNGNTokenId)
            .setGas(1000000)
            .setFunction(
                "mint",
                new ContractFunctionParameters()
                    .addAddress(poolAddress)
                    .addUint256(fundAmount)
            )
            .execute(client);

        const receipt = await mintTx.getReceipt(client);
        console.log('✅ Successfully minted ₦400M to pool!');
        console.log('TX:', mintTx.transactionId.toString());
        console.log('Status:', receipt.status.toString());

        client.close();
    } catch (error) {
        console.error('❌ Failed:', error.message);
        client.close();
        process.exit(1);
    }
}

fundPoolMassive();
