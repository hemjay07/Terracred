const { ethers } = require('ethers');
require('dotenv').config();

async function repay() {
    const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL, 296, { staticNetwork: true });
    const wallet = new ethers.Wallet(process.env.HEDERA_PRIVATE_KEY, provider);
    
    const pool = new ethers.Contract(process.env.LENDING_POOL_ADDRESS, [
        'function repay(uint256)',
        'function getLoanDetails(address) view returns (uint256,address,uint256,uint256,uint256,uint256)'
    ], wallet);
    
    const heNGN = new ethers.Contract(process.env.HENGN_TOKEN_ADDRESS, [
        'function approve(address, uint256) returns (bool)',
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
    ], wallet);
    
    const decimals = await heNGN.decimals();
    const loan = await pool.getLoanDetails(wallet.address);
    const repayAmount = loan[3] / 4n; // Repay 25% of total debt
    
    console.log('Repaying:', ethers.formatUnits(repayAmount, decimals), 'heNGN');
    
    await (await heNGN.approve(process.env.LENDING_POOL_ADDRESS, repayAmount)).wait();
    await (await pool.repay(repayAmount)).wait();
    
    console.log('✅ Repaid!');
    const newLoan = await pool.getLoanDetails(wallet.address);
    console.log('New debt:', ethers.formatUnits(newLoan[3], decimals), 'heNGN');
}

repay().catch(console.error);
