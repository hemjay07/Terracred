const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client, ContractExecuteTransaction, ContractFunctionParameters, PrivateKey } = require("@hashgraph/sdk");

async function fundNewPool() {
    const client = Client.forTestnet();

    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyHex = process.env.HEDERA_PRIVATE_KEY_DER;
    const operatorKey = PrivateKey.fromStringDer(operatorKeyHex);

    client.setOperator(operatorId, operatorKey);

    const heNGNTokenId = process.env.HENGN_TOKEN_ID;
    const poolAddress = process.env.LENDING_POOL_ADDRESS;

    // 10M Naira = 1B heNGN with 2 decimals
    const fundAmount = "100000000000";

    console.log('Minting heNGN to NEW pool...');
    console.log('heNGN Token ID:', heNGNTokenId);
    console.log('Pool Address:', poolAddress);
    console.log('Amount: ₦10,000,000');

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
        console.log('✅ Successfully minted to new pool!');
        console.log('TX:', mintTx.transactionId.toString());
        console.log('Status:', receipt.status.toString());

        client.close();
    } catch (error) {
        console.error('❌ Failed:', error.message);
        client.close();
        process.exit(1);
    }
}

fundNewPool();
