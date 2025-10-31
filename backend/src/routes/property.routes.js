const express = require('express');
const router = express.Router();
const dataStore = require('../data/database');

/**
 * Submit new property for tokenization
 */
router.post('/', async (req, res) => {
    try {
        const {
            owner,
            address,
            value,
            description,
            proofDocumentUri,
            // tokenSupply is no longer accepted from user input (auto-calculated)
        } = req.body;

        if (!owner || !address || !value) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: owner, address, value'
            });
        }

        // Validate value is positive
        if (value <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Property value must be greater than 0'
            });
        }

        const property = dataStore.addProperty({
            owner,
            address,
            value,
            description: description || '',
            proofDocumentUri: proofDocumentUri || 'ipfs://pending',
            appraisalHash: '0x' + Math.random().toString(16).substr(2, 40),
            deedHash: '0x' + Math.random().toString(16).substr(2, 40),
            status: 'pending',
            tokenSupply: value, // ✅ Auto-calculate: 1 token = ₦1
            createdAt: new Date()
        });

        dataStore.addTransaction({
            type: 'PROPERTY_SUBMITTED',
            propertyId: property.propertyId,
            userAddress: owner,
            data: { address, value }
        });

        res.json({
            success: true,
            property: {
                propertyId: property.propertyId,
                status: property.status,
                message: 'Property submitted for verification'
            }
        });

    } catch (error) {
        console.error('Property submission error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get property verification status
 */
router.get('/:propertyId/status', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const property = dataStore.getProperty(propertyId);

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        res.json({
            success: true,
            status: {
                propertyId: property.propertyId,
                status: property.status,
                verifiedAt: property.verifiedAt,
                tokenId: property.tokenId,
                tokenAddress: property.tokenAddress,
                message: property.status === 'verified' 
                    ? 'Property verified and tokenized'
                    : property.status === 'rejected'
                    ? 'Property verification rejected'
                    : 'Property verification in progress'
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get property details
 */
router.get('/:propertyId', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const property = dataStore.getProperty(propertyId);

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        res.json({ success: true, property });

    } catch (error) {
        console.error('Property fetch error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get all properties
 */
router.get('/', async (req, res) => {
    try {
        const { owner } = req.query;

        if (owner) {
            const properties = dataStore.getPropertiesByOwner(owner);
            return res.json({ success: true, properties });
        }

        const properties = dataStore.getAllProperties();
        res.json({ success: true, properties });

    } catch (error) {
        console.error('Properties fetch error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Verify property - CREATES REAL RWA TOKEN
 */
router.post('/:propertyId/verify', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { verifier } = req.body;

        console.log(`\n========================================`);
        console.log(`🔥 VERIFYING PROPERTY: ${propertyId}`);
        console.log(`========================================\n`);

        const property = dataStore.getProperty(propertyId);
        
        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        console.log(`Property Owner: ${property.owner}`);
        console.log(`Property Value: ₦${property.value.toLocaleString()}`);
        console.log(`Token Supply: ${property.tokenSupply} (1:1 with value)`);

        const hederaService = req.app.locals.services.hedera;

        if (!hederaService) {
            throw new Error('Hedera service not available');
        }

        console.log(`\n💎 Minting property tokens to owner...`);

        const masterTokenId = process.env.MASTER_RWA_TOKEN_ID;
        const masterTokenAddress = process.env.MASTER_RWA_TOKEN_ADDRESS;

        if (!masterTokenId || !masterTokenAddress) {
            throw new Error('Master RWA token not configured. Run create-master-rwa-token.js first!');
        }

        await hederaService.mintPropertyTokens({
            propertyId: property.propertyId,
            ownerAccountId: property.owner,
            tokenSupply: property.tokenSupply,
            propertyValue: property.value  // ✅ Pass for validation
        });
        
        console.log(`✅ Property tokens minted and transferred!`);
        
        const rwaTokenId = masterTokenId;
        const tokenAddress = masterTokenAddress;

        
        console.log(`\n✅ PROPERTY VERIFIED AND TOKENIZED!\n`);

        const updatedProperty = dataStore.updatePropertyStatus(propertyId, 'verified', {
            verifiedAt: new Date(),
            verifier: verifier || '0.0.98765',
            tokenId: rwaTokenId,
            tokenAddress: tokenAddress
        });

        dataStore.addTransaction({
            type: 'PROPERTY_VERIFIED',
            propertyId: updatedProperty.propertyId,
            userAddress: updatedProperty.owner,
            data: {
                tokenId: updatedProperty.tokenId,
                tokenAddress: updatedProperty.tokenAddress,
                verifier: updatedProperty.verifier
            }
        });

        try {
            if (req.app.locals.services?.hcs) {
                await req.app.locals.services.hcs.logPropertyVerification({
                    propertyId: updatedProperty.propertyId,
                    address: updatedProperty.address,
                    value: updatedProperty.value,
                    appraisalHash: updatedProperty.appraisalHash,
                    deedHash: updatedProperty.deedHash,
                    verifier: updatedProperty.verifier,
                    tokenId: updatedProperty.tokenId
                });
            }
        } catch (hcsError) {
            console.log('HCS logging skipped:', hcsError.message);
        }

        res.json({ success: true, property: updatedProperty });

    } catch (error) {
        console.error('❌ Property verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Reject property
 */
router.post('/:propertyId/reject', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { reason } = req.body;

        const property = dataStore.updatePropertyStatus(propertyId, 'rejected', {
            rejectedAt: new Date(),
            rejectionReason: reason || 'Insufficient documentation'
        });

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        dataStore.addTransaction({
            type: 'PROPERTY_REJECTED',
            propertyId: property.propertyId,
            userAddress: property.owner,
            data: { reason: property.rejectionReason }
        });

        res.json({ success: true, property });

    } catch (error) {
        console.error('Property rejection error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delist property (for untokenization after collateral withdrawal)
 */
router.post('/:propertyId/delist', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { owner } = req.body;

        console.log(`\n========================================`);
        console.log(`🔓 DELISTING PROPERTY: ${propertyId}`);
        console.log(`========================================\n`);

        const property = dataStore.getProperty(propertyId);

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        // Verify ownership
        if (property.owner !== owner) {
            return res.status(403).json({ success: false, error: 'Not authorized to delist this property' });
        }

        console.log(`Property Owner: ${property.owner}`);
        console.log(`Property Value: ₦${property.value.toLocaleString()}`);
        console.log(`Token Supply: ${property.tokenSupply}`);

        // Update property status to delisted
        const updatedProperty = dataStore.updatePropertyStatus(propertyId, 'delisted', {
            delistedAt: new Date(),
            reason: 'Collateral withdrawn - untokenization requested'
        });

        // Add transaction record
        dataStore.addTransaction({
            type: 'PROPERTY_DELISTED',
            propertyId: updatedProperty.propertyId,
            userAddress: updatedProperty.owner,
            data: {
                tokenId: updatedProperty.tokenId,
                tokenAddress: updatedProperty.tokenAddress,
                delistedAt: updatedProperty.delistedAt
            }
        });

        console.log(`✅ PROPERTY DELISTED!\n`);

        res.json({
            success: true,
            message: 'Property delisted successfully. Our team will contact you for property transfer arrangements.',
            property: updatedProperty
        });

    } catch (error) {
        console.error('❌ Property delisting error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;