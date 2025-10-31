const express = require('express');
const router = express.Router();
const dataStore = require('../data/database');

/**
 * Get user profile
 * GET /api/users/:accountId
 */
router.get('/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;

        let user = dataStore.getUserByAccountId(accountId);

        // If user doesn't exist, create a basic profile
        if (!user) {
            user = dataStore.addUser({
                accountId,
                email: `user.${accountId}@example.com`,
                name: `User ${accountId}`,
                kycStatus: 'not_started',
                createdAt: new Date()
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('User fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Submit KYC information
 * POST /api/users/kyc
 */
router.post('/kyc', async (req, res) => {
    try {
        const {
            accountId,
            email,
            name,
            kycProvider,
            documentType,
            documentNumber
        } = req.body;

        // Validate required fields
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: accountId'
            });
        }

        let user = dataStore.getUserByAccountId(accountId);

        if (!user) {
            // Create new user
            user = dataStore.addUser({
                accountId,
                email: email || `user.${accountId}@example.com`,
                name: name || `User ${accountId}`,
                kycStatus: 'pending',
                kycLevel: null,
                kycProvider: kycProvider || 'Persona',
                kycSubmittedAt: new Date(),
                createdAt: new Date()
            });
        } else {
            // Update existing user
            dataStore.updateUserKYC(accountId, {
                email: email || user.email,
                name: name || user.name,
                kycStatus: 'pending',
                kycProvider: kycProvider || 'Persona',
                kycSubmittedAt: new Date()
            });
        }

        // Log transaction (without PII)
        dataStore.addTransaction({
            type: 'KYC_SUBMITTED',
            userAddress: accountId,
            data: {
                provider: kycProvider || 'Persona',
                documentType: documentType || 'passport'
            }
        });

        res.json({
            success: true,
            message: 'KYC submitted for verification',
            kyc: {
                userId: user.userId,
                accountId: user.accountId,
                status: user.kycStatus,
                submittedAt: user.kycSubmittedAt
            }
        });

    } catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get KYC status
 * GET /api/users/:accountId/kyc
 */
router.get('/:accountId/kyc', async (req, res) => {
    try {
        const { accountId } = req.params;

        const user = dataStore.getUserByAccountId(accountId);

        if (!user) {
            return res.json({
                success: true,
                kyc: {
                    status: 'not_started',
                    message: 'No KYC submission found'
                }
            });
        }

        res.json({
            success: true,
            kyc: {
                userId: user.userId,
                accountId: user.accountId,
                status: user.kycStatus,
                level: user.kycLevel,
                provider: user.kycProvider,
                verifiedAt: user.kycVerifiedAt,
                submittedAt: user.kycSubmittedAt
            }
        });

    } catch (error) {
        console.error('KYC status check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Approve KYC (Admin only - for demo purposes)
 * POST /api/users/:accountId/kyc/approve
 */
router.post('/:accountId/kyc/approve', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { level } = req.body;

        const user = dataStore.updateUserKYC(accountId, {
            kycStatus: 'verified',
            kycLevel: level || 'full',
            kycVerifiedAt: new Date()
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Log to HCS if service available (no PII)
        // FIXED: Added better error handling
        if (req.app.locals.services?.hcs && typeof req.app.locals.services.hcs.logKYC === 'function') {
            try {
                await req.app.locals.services.hcs.logKYC({
                    userId: user.userId,
                    accountId: user.accountId,
                    level: user.kycLevel,
                    provider: user.kycProvider
                });
            } catch (hcsError) {
                console.error('HCS logging failed (non-critical):', hcsError.message);
                // Continue anyway - HCS logging is optional
            }
        }

        // Log transaction
        dataStore.addTransaction({
            type: 'KYC_VERIFIED',
            userAddress: accountId,
            data: {
                level: user.kycLevel,
                provider: user.kycProvider
            }
        });

        res.json({
            success: true,
            kyc: {
                userId: user.userId,
                accountId: user.accountId,
                status: user.kycStatus,
                level: user.kycLevel,
                verifiedAt: user.kycVerifiedAt
            }
        });

    } catch (error) {
        console.error('KYC approval error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Reject KYC (Admin only - for demo purposes)
 * POST /api/users/:accountId/kyc/reject
 */
router.post('/:accountId/kyc/reject', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { reason } = req.body;

        const user = dataStore.updateUserKYC(accountId, {
            kycStatus: 'rejected',
            kycRejectedAt: new Date(),
            kycRejectionReason: reason || 'Incomplete documentation'
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Log transaction
        dataStore.addTransaction({
            type: 'KYC_REJECTED',
            userAddress: accountId,
            data: {
                reason: user.kycRejectionReason
            }
        });

        res.json({
            success: true,
            kyc: {
                userId: user.userId,
                accountId: user.accountId,
                status: user.kycStatus,
                rejectedAt: user.kycRejectedAt,
                reason: user.kycRejectionReason
            }
        });

    } catch (error) {
        console.error('KYC rejection error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get user's assets (tokenized properties)
 * GET /api/users/:accountId/assets
 */
router.get('/:accountId/assets', async (req, res) => {
    try {
        const { accountId } = req.params;

        const assets = dataStore.getAssetsByOwner(accountId);

        res.json({
            success: true,
            assets
        });

    } catch (error) {
        console.error('Assets fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get user's transaction history
 * GET /api/users/:accountId/transactions
 */
router.get('/:accountId/transactions', async (req, res) => {
    try {
        const { accountId } = req.params;

        const transactions = dataStore.getTransactionsByUser(accountId);

        res.json({
            success: true,
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

module.exports = router;