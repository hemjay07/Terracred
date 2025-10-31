const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client, ContractExecuteTransaction, ContractFunctionParameters, PrivateKey } = require("@hashgraph/sdk");

async function mintHeNGNToPool() {
    const client = Client.forTestnet();

    // Set operator
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyHex = process.env.HEDERA_PRIVATE_KEY_DER;
    const operatorKey = PrivateKey.fromStringDer(operatorKeyHex);

    client.setOperator(operatorId, operatorKey);

    const heNGNTokenId = process.env.HENGN_TOKEN_ID;
    const poolAddress = process.env.LENDING_POOL_ADDRESS;

    // Mint 100 million heNGN (8 decimals)
    const mintAmount = "10000000000000000"; // 100M heNGN (100,000,000 * 10^8)

    console.log('Minting heNGN tokens to LendingPool...');
    console.log('heNGN Token ID:', heNGNTokenId);
    console.log('Pool Address:', poolAddress);
    console.log('Mint Amount:', (Number(mintAmount) / 100000000).toLocaleString(), 'heNGN');

    try {
        const transaction = await new ContractExecuteTransaction()
            .setContractId(heNGNTokenId)
            .setGas(1000000)
            .setFunction(
                "mint",
                new ContractFunctionParameters()
                    .addAddress(poolAddress)
                    .addUint256(mintAmount)
            )
            .execute(client);

        const receipt = await transaction.getReceipt(client);

        console.log('✅ Successfully minted heNGN to pool!');
        console.log('Transaction ID:', transaction.transactionId.toString());
        console.log('Status:', receipt.status.toString());

        // Wait a bit for mirror node to index
        console.log('Waiting for mirror node to index...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        client.close();
    } catch (error) {
        console.error('❌ Minting failed:', error.message);
        if (error.status) {
            console.error('Status:', error.status.toString());
        }
        client.close();
        process.exit(1);
    }
}

mintHeNGNToPool();
