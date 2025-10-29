const express = require('express');
const router = express.Router();
const dataStore = require('../data/store');

/**
 * Get transactions with optional filtering
 * GET /api/transactions?owner=0.0.12345&type=LOAN_CREATED&limit=10
 */
router.get('/', async (req, res) => {
    try {
        const { owner, type, limit } = req.query;

        let transactions;

        if (owner) {
            transactions = dataStore.getTransactionsByUser(owner);
        } else {
            transactions = dataStore.getAllTransactions();
        }

        // Filter by type if specified
        if (type) {
            transactions = transactions.filter(tx => tx.type === type);
        }

        // Sort by timestamp (newest first)
        transactions.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit if specified
        if (limit) {
            const limitNum = parseInt(limit);
            transactions = transactions.slice(0, limitNum);
        }

        res.json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error('Transactions fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get transaction by ID
 * GET /api/transactions/:txId
 */
router.get('/:txId', async (req, res) => {
    try {
        const { txId } = req.params;

        const transaction = dataStore.getAllTransactions().find(
            tx => tx.txId === txId
        );

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            transaction
        });

    } catch (error) {
        console.error('Transaction fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get transaction types (for filtering)
 * GET /api/transactions/types
 */
router.get('/meta/types', async (req, res) => {
    try {
        const types = [
            'PROPERTY_SUBMITTED',
            'PROPERTY_VERIFIED',
            'PROPERTY_REJECTED',
            'KYC_SUBMITTED',
            'KYC_VERIFIED',
            'KYC_REJECTED',
            'LOAN_CREATED',
            'LOAN_REPAID',
            'LIQUIDATION',
            'PRICE_UPDATE'
        ];

        res.json({
            success: true,
            types
        });

    } catch (error) {
        console.error('Types fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get transaction statistics
 * GET /api/transactions/stats
 */
router.get('/meta/stats', async (req, res) => {
    try {
        const transactions = dataStore.getAllTransactions();

        const stats = {
            total: transactions.length,
            byType: {},
            recent: transactions.slice(-10).reverse() // Last 10 transactions
        };

        // Count by type
        transactions.forEach(tx => {
            stats.byType[tx.type] = (stats.byType[tx.type] || 0) + 1;
        });

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
