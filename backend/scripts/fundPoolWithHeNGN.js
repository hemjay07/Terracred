const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client, TransferTransaction, AccountId, PrivateKey } = require("@hashgraph/sdk");

async function fundPool() {
    const client = Client.forTestnet();

    // Set operator
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyHex = process.env.HEDERA_PRIVATE_KEY_DER;
    const operatorKey = PrivateKey.fromStringDer(operatorKeyHex);

    client.setOperator(operatorId, operatorKey);

    const poolId = process.env.LENDING_POOL_ID;
    const heNGNTokenId = process.env.HENGN_TOKEN_ID;

    // Fund with 5 heNGN (assuming 8 decimals)
    const fundAmount = 5_00000000; // 5 heNGN

    console.log('Funding LendingPool with heNGN tokens...');
    console.log('Pool ID:', poolId);
    console.log('heNGN Token ID:', heNGNTokenId);
    console.log('Amount:', (fundAmount / 100000000).toLocaleString(), 'heNGN');
    console.log('Sender:', operatorId);

    try {
        const transaction = await new TransferTransaction()
            .addTokenTransfer(heNGNTokenId, operatorId, -fundAmount)
            .addTokenTransfer(heNGNTokenId, poolId, fundAmount)
            .execute(client);

        const receipt = await transaction.getReceipt(client);

        console.log('✅ Pool funded successfully!');
        console.log('Transaction ID:', transaction.transactionId.toString());
        console.log('Status:', receipt.status.toString());

        client.close();
    } catch (error) {
        console.error('❌ Funding failed:', error.message);
        if (error.status) {
            console.error('Status:', error.status.toString());
        }
        client.close();
        process.exit(1);
    }
}

fundPool();
