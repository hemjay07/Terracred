const express = require('express');
const router = express.Router();

/**
 * Get loan details for user
 */
router.get('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { liquidation } = req.app.locals.services;

    // Get on-chain loan details
    const details = await liquidation.lendingPool.getLoanDetails(userAddress);

    res.json({
      success: true,
      loan: {
        collateralAmount: details[0].toString(),
        collateralToken: details[1],
        borrowedAmount: details[2].toString(),
        totalDebt: details[3].toString(),
        healthFactor: details[4].toString(),
        maxBorrow: details[5].toString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get user's loan history from HCS
 */
router.get('/:userAddress/history', async (req, res) => {
  try {
    // TODO: Query HCS messages filtered by user
    res.json({
      success: true,
      history: []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;