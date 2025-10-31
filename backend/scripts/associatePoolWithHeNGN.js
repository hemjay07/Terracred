const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client, ContractExecuteTransaction, PrivateKey } = require("@hashgraph/sdk");

async function associatePoolWithHeNGN() {
    const client = Client.forTestnet();

    // Set operator
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyHex = process.env.HEDERA_PRIVATE_KEY_DER;
    const operatorKey = PrivateKey.fromStringDer(operatorKeyHex);

    client.setOperator(operatorId, operatorKey);

    const poolId = process.env.LENDING_POOL_ID;

    console.log('Associating LendingPool with heNGN token...');
    console.log('Pool ID:', poolId);
    console.log('Operator:', operatorId);

    try {
        const transaction = await new ContractExecuteTransaction()
            .setContractId(poolId)
            .setGas(1000000) // 1M gas
            .setFunction("associateWithHeNGN")
            .execute(client);

        const receipt = await transaction.getReceipt(client);

        console.log('✅ Association successful!');
        console.log('Transaction ID:', transaction.transactionId.toString());
        console.log('Status:', receipt.status.toString());

        client.close();
    } catch (error) {
        console.error('❌ Association failed:', error.message);
        if (error.status) {
            console.error('Status:', error.status.toString());
        }
        client.close();
        process.exit(1);
    }
}

associatePoolWithHeNGN();
