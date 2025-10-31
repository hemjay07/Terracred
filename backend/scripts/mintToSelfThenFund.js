const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client, ContractExecuteTransaction, ContractFunctionParameters, TransferTransaction, PrivateKey } = require("@hashgraph/sdk");

async function mintAndFund() {
    const client = Client.forTestnet();

    // Set operator
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyHex = process.env.HEDERA_PRIVATE_KEY_DER;
    const operatorKey = PrivateKey.fromStringDer(operatorKeyHex);

    client.setOperator(operatorId, operatorKey);

    const heNGNTokenId = process.env.HENGN_TOKEN_ID;
    const poolId = process.env.LENDING_POOL_ID;
    const deployerEvmAddress = "0x5f55f4537b30c5e5b8aa1fdab4d84f7f59aa1bb6"; // Deployer's EVM address

    // Mint 100 million heNGN to self (8 decimals)
    const mintAmount = "10000000000000000"; // 100M heNGN

    console.log('Step 1: Minting heNGN to deployer account...');
    console.log('heNGN Token ID:', heNGNTokenId);
    console.log('Deployer Account ID:', operatorId);
    console.log('Deployer EVM Address:', deployerEvmAddress);
    console.log('Amount:', (Number(mintAmount) / 100000000).toLocaleString(), 'heNGN');

    try {
        // Mint to self (deployer's EVM address)
        const mintTx = await new ContractExecuteTransaction()
            .setContractId(heNGNTokenId)
            .setGas(1000000)
            .setFunction(
                "mint",
                new ContractFunctionParameters()
                    .addAddress(deployerEvmAddress)
                    .addUint256(mintAmount)
            )
            .execute(client);

        const mintReceipt = await mintTx.getReceipt(client);
        console.log('✅ Minted successfully!');
        console.log('Mint TX:', mintTx.transactionId.toString());
        console.log('Status:', mintReceipt.status.toString());

        // Wait for indexing
        console.log('\nWaiting 5 seconds for mirror node...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Transfer to pool
        console.log('\nStep 2: Transferring heNGN to pool...');
        console.log('Pool ID:', poolId);

        const transferTx = await new TransferTransaction()
            .addTokenTransfer(heNGNTokenId, operatorId, -Number(mintAmount))
            .addTokenTransfer(heNGNTokenId, poolId, Number(mintAmount))
            .execute(client);

        const transferReceipt = await transferTx.getReceipt(client);
        console.log('✅ Transferred to pool successfully!');
        console.log('Transfer TX:', transferTx.transactionId.toString());
        console.log('Status:', transferReceipt.status.toString());

        console.log('\n🎉 Pool should now have 100M+ heNGN!');

        client.close();
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        if (error.status) {
            console.error('Status:', error.status.toString());
        }
        client.close();
        process.exit(1);
    }
}

mintAndFund();
