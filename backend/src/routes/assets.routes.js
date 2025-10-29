const express = require('express');
const router = express.Router();
const dataStore = require('../data/store');

/**
 * Get all assets for an owner
 * GET /api/assets?owner=0.0.12345
 */
router.get('/', async (req, res) => {
    try {
        const { owner } = req.query;

        if (!owner) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: owner'
            });
        }

        const assets = dataStore.getAssetsByOwner(owner);

        res.json({
            success: true,
            count: assets.length,
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
 * Get specific asset details by tokenId
 * GET /api/assets/:tokenId
 */
router.get('/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const asset = dataStore.getAssetByTokenId(tokenId);

        if (!asset) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }

        // Get the full property details
        const property = dataStore.getProperty(asset.propertyId);

        // Combine asset and property information
        const fullAsset = {
            ...asset,
            proofDocumentUri: property.proofDocumentUri,
            appraisalHash: property.appraisalHash,
            deedHash: property.deedHash,
            verifier: property.verifier
        };

        res.json({
            success: true,
            asset: fullAsset
        });

    } catch (error) {
        console.error('Asset fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get asset valuation (current price from oracle)
 * GET /api/assets/:tokenId/valuation
 */
router.get('/:tokenId/valuation', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const asset = dataStore.getAssetByTokenId(tokenId);

        if (!asset) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }

        // In a real implementation, this would call the oracle service
        // For demo, we'll use the stored value with a small random fluctuation
        const baseValue = asset.value;
        const fluctuation = (Math.random() - 0.5) * 0.05; // ±2.5%
        const currentValue = Math.round(baseValue * (1 + fluctuation));

        res.json({
            success: true,
            valuation: {
                tokenId: asset.tokenId,
                tokenAddress: asset.tokenAddress,
                propertyId: asset.propertyId,
                baseValue: baseValue,
                currentValue: currentValue,
                priceChange: currentValue - baseValue,
                priceChangePercent: ((currentValue - baseValue) / baseValue * 100).toFixed(2),
                lastUpdated: new Date(),
                currency: 'NGN'
            }
        });

    } catch (error) {
        console.error('Valuation fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get asset collateral status (if used in lending)
 * GET /api/assets/:tokenId/collateral
 */
router.get('/:tokenId/collateral', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const asset = dataStore.getAssetByTokenId(tokenId);

        if (!asset) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }

        // For demo purposes, we'll return mock collateral status
        // In production, this would query the lending pool contract
        const isCollateralized = Math.random() > 0.5; // Random for demo

        if (isCollateralized) {
            res.json({
                success: true,
                collateral: {
                    tokenId: asset.tokenId,
                    isCollateralized: true,
                    collateralAmount: Math.floor(asset.tokenSupply * 0.5), // 50% of supply
                    borrowedAmount: Math.floor(asset.value * 0.4), // 40% borrowed
                    availableToBorrow: Math.floor(asset.value * 0.26), // More can be borrowed
                    healthFactor: 165 // Healthy position
                }
            });
        } else {
            res.json({
                success: true,
                collateral: {
                    tokenId: asset.tokenId,
                    isCollateralized: false,
                    availableForCollateral: asset.tokenSupply
                }
            });
        }

    } catch (error) {
        console.error('Collateral status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
