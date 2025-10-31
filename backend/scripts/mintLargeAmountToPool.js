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
    const deployerEvmAddress = "0x5f55f4537b30c5e5b8aa1fdab4d84f7f59aa1bb6";

    // MockHeNGN has 2 decimals!
    // 1 heNGN = 1 kobo = ₦0.01
    // For ₦10M worth: 10,000,000 * 100 kobo = 1,000,000,000 heNGN
    // In base units (2 decimals): 1,000,000,000 * 100 = 100,000,000,000
    const mintAmount = "100000000000"; // 1 billion heNGN = ₦10M

    console.log('Step 1: Minting heNGN to deployer account...');
    console.log('heNGN Token ID:', heNGNTokenId);
    console.log('Deployer:', operatorId);
    console.log('Amount (base units):', mintAmount);
    console.log('Amount (heNGN):', (Number(mintAmount) / 100).toLocaleString(), 'heNGN');
    console.log('Amount (Naira):', '₦' + (Number(mintAmount) / 100 / 100).toLocaleString());

    try {
        // Mint to self
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

        // Wait longer for mirror node
        console.log('\nWaiting 8 seconds for mirror node to index...');
        await new Promise(resolve => setTimeout(resolve, 8000));

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

        console.log('\n🎉 Pool should now have ₦10M+ worth of heNGN for testing!');

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
