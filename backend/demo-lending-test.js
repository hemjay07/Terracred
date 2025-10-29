const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    console.log('🏦 TerraCred Lending Pool - Complete Test');
    console.log('==========================================\n');

    const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL, 296, { staticNetwork: true });
    const wallet = new ethers.Wallet(process.env.HEDERA_PRIVATE_KEY, provider);
    
    console.log('📍 Wallet:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'HBAR\n');

    const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;
    const RWA_TOKEN_ADDRESS = process.env.RWA_TOKEN_ADDRESS;
    const HENGN_TOKEN_ADDRESS = process.env.HENGN_TOKEN_ADDRESS;
    
    console.log('📝 Addresses:');
    console.log('   Pool:', LENDING_POOL_ADDRESS);
    console.log('   RWA:', RWA_TOKEN_ADDRESS);
    console.log('   heNGN:', HENGN_TOKEN_ADDRESS, '\n');

    const lendingPool = new ethers.Contract(LENDING_POOL_ADDRESS, [
        'function supportedTokens(address) view returns (bool)',
        'function addSupportedToken(address)',
        'function depositCollateral(address, uint256)',
        'function borrow(uint256)',
        'function repay(uint256)',
        'function getMaxBorrow(address) view returns (uint256)',
        'function getLoanDetails(address) view returns (uint256,address,uint256,uint256,uint256,uint256)'
    ], wallet);

    const rwaToken = new ethers.Contract(RWA_TOKEN_ADDRESS, [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function approve(address, uint256) returns (bool)',
        'function allowance(address, address) view returns (uint256)'
    ], wallet);

    const heNGN = new ethers.Contract(HENGN_TOKEN_ADDRESS, [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function approve(address, uint256) returns (bool)'
    ], wallet);

    console.log('1️⃣  Checking heNGN...');
    const heNGNDecimals = await heNGN.decimals();
    const poolBal = await heNGN.balanceOf(LENDING_POOL_ADDRESS);
    console.log('   Pool has:', ethers.formatUnits(poolBal, heNGNDecimals), await heNGN.symbol());
    if (poolBal === 0n) { console.log('❌ Pool empty!'); return; }
    
    console.log('\n2️⃣  Checking RWA support...');
    if (!(await lendingPool.supportedTokens(RWA_TOKEN_ADDRESS))) {
        console.log('   Adding RWA...');
        await (await lendingPool.addSupportedToken(RWA_TOKEN_ADDRESS, {gasLimit: 200000})).wait();
    }
    console.log('   ✅ RWA supported');

    console.log('\n3️⃣  Checking RWA balance...');
    const rwaDecimals = await rwaToken.decimals();
    const rwaBal = await rwaToken.balanceOf(wallet.address);
    console.log('   Balance:', ethers.formatUnits(rwaBal, rwaDecimals), 'RWA');
    if (rwaBal === 0n) { console.log('❌ No RWA!'); return; }

    const COLLATERAL = ethers.parseUnits('10', rwaDecimals);
    
    console.log('\n4️⃣  Approving...');
    if ((await rwaToken.allowance(wallet.address, LENDING_POOL_ADDRESS)) < COLLATERAL) {
        await (await rwaToken.approve(LENDING_POOL_ADDRESS, COLLATERAL, {gasLimit:200000})).wait();
    }
    console.log('   ✅ Approved');

    console.log('\n5️⃣  Depositing collateral...');
    const depositTx = await lendingPool.depositCollateral(RWA_TOKEN_ADDRESS, COLLATERAL, {gasLimit:500000});
    console.log('   ✅ Deposited! Tx:', (await depositTx.wait()).hash);

    console.log('\n6️⃣  Checking borrow capacity...');
    const maxBorrow = await lendingPool.getMaxBorrow(wallet.address);
    console.log('   Max:', ethers.formatUnits(maxBorrow, heNGNDecimals), 'heNGN');

    const BORROW = maxBorrow / 2n;
    console.log('\n7️⃣  Borrowing', ethers.formatUnits(BORROW, heNGNDecimals), 'heNGN...');
    const borrowTx = await lendingPool.borrow(BORROW, {gasLimit:500000});
    console.log('   ✅ Borrowed! Tx:', (await borrowTx.wait()).hash);

    console.log('\n8️⃣  Loan details...');
    const loan = await lendingPool.getLoanDetails(wallet.address);
    console.log('   Collateral:', loan[0].toString(), 'tokens');
    console.log('   Borrowed:', ethers.formatUnits(loan[2], heNGNDecimals), 'heNGN');
    console.log('   Health:', (Number(loan[4])/100).toFixed(2)+'%');

    console.log('\n✅ SUCCESS! 🎉');
}

main().catch(e => console.error('❌', e.message));
