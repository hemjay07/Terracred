const {ethers} = require('ethers');
const { PrivateKey } = require('@hashgraph/sdk');

class LiquidationService {
    constructor(hederaClient, hcsService) {
        this.hederaClient = hederaClient;
        this.hcsService = hcsService;
        this.provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL);
        
        // ✅ FIX: Convert Hedera DER key to ethers-compatible format
        const hederaLiquidationKey = PrivateKey.fromStringECDSA(process.env.LIQUIDATION_PRIVATE_KEY);
        const rawKeyHex = hederaLiquidationKey.toStringRaw(); // Get raw 32-byte hex key
        
        this.wallet = new ethers.Wallet(
            rawKeyHex, // Now in correct format for ethers.js
            this.provider
        );

        // Lending pool contract
        this.lendingPool = new ethers.Contract(
            process.env.LENDING_POOL_ADDRESS,
            [
                'function isLiquidatable(address user) view returns (bool)',
                'function liquidate(address borrower) external',
                'function getHealthFactor(address user) view returns (uint256)',
                'function getLoanDetails(address user) view returns (uint256, address, uint256, uint256, uint256, uint256)'
            ],
            this.wallet
        );

        // heNGN token (needed for liquidation payments)
        this.heNGNContract = new ethers.Contract(
            process.env.HENGN_TOKEN_ADDRESS,
            [
                'function approve(address spender, uint256 amount) external returns (bool)',
                'function balanceOf(address account) view returns (uint256)'
            ],
            this.wallet
        );
    }

    async checkAndExecuteLiquidation(borrowerAddress) {
        try {
            const isLiquidatable = await this.lendingPool.isLiquidatable(borrowerAddress);

            if (!isLiquidatable) {
                return { liquidated: false, reason: 'Position healthy' };
            }

            console.log(`Liquidatable position found: ${borrowerAddress}`);

            const loanDetails = await this.lendingPool.getLoanDetails(borrowerAddress);
            const totalDebt = loanDetails[3];
            const healthFactor = loanDetails[4];

            console.log(`  Debt: ${ethers.formatUnits(totalDebt, 2)} heNGN`);
            console.log(`  Health Factor: ${healthFactor}%`);

            const ourBalance = await this.heNGNContract.balanceOf(this.wallet.address);
            if (ourBalance < totalDebt) {
                console.log('  Insufficient heNGN for liquidation');
                return { liquidated: false, reason: 'Insufficient heNGN balance' };
            }

            const approveTx = await this.heNGNContract.approve(
                await this.lendingPool.getAddress(),
                totalDebt
            );
            await approveTx.wait();

            console.log(`Liquidating ${borrowerAddress}...`);
            const liquidateTx = await this.lendingPool.liquidate(borrowerAddress);
            const receipt = await liquidateTx.wait();

            await this.hcsService.logLiquidation({
                borrower: borrowerAddress,
                liquidator: this.wallet.address,
                debtCovered: ethers.formatUnits(totalDebt, 2),
                collateralSeized: 'calculated_on_chain',
                transactionHash: receipt.hash,
                timestamp: Date.now()
            });

            console.log(`  Liquidation executed: Tx Hash ${receipt.hash}`);
            return {
                liquidated: true, 
                txHash: receipt.hash,
                debtCovered: ethers.formatUnits(totalDebt, 2)
            };
        } catch (error) {
            console.error(`Liquidation failed for ${borrowerAddress}:`, error.message);
            return { liquidated: false, reason: error.message };
        }
    }

    async getAllBorrowers() {
        const dataStore = require('../data/store');
        const loanTransactions = dataStore.getAllTransactions()
            .filter(tx => tx.type === 'LOAN_CREATED');
        
        const uniqueBorrowers = [...new Set(loanTransactions.map(tx => tx.userAddress))];
        return uniqueBorrowers.map(address => ({ address }));
    }

    startMonitoring(intervalMs) {
        console.log(`Liquidation check interval: ${intervalMs / 1000}s`);
        
        setInterval(async () => {
            console.log('🔍 Checking for liquidatable positions...');
            
            const borrowers = await this.getAllBorrowers();
            console.log(`Monitoring ${borrowers.length} active loans`);
            
            let liquidationCount = 0;
            
            for (const borrower of borrowers) {
                const result = await this.checkAndExecuteLiquidation(borrower.address);
                if (result.liquidated) {
                    liquidationCount++;
                }
            }

            if (liquidationCount > 0) {
                console.log(`✅ Liquidated ${liquidationCount} positions`);
            } else {
                console.log(`✅ All positions healthy`);
            }
        }, intervalMs);
    }

    async manualLiquidate(borrowerAddress) {
        console.log(`Manual liquidation requested for ${borrowerAddress}`);
        return await this.checkAndExecuteLiquidation(borrowerAddress);
    }
}

module.exports = LiquidationService;