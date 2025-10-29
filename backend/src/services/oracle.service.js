const { ethers, JsonRpcProvider } = require("ethers");
const { PrivateKey } = require("@hashgraph/sdk");

// ✅ Disable ENS globally — patches all ethers instances
ethers.JsonRpcProvider.prototype.getResolver = async function () {
  return null;
};
ethers.JsonRpcProvider.prototype.resolveName = async function (name) {
  return name;
};

class OracleService {
  constructor(hederaClient, hcsService) {
    this.hederaClient = hederaClient;
    this.hcsService = hcsService;

    // ✅ Define Hedera Testnet network explicitly
    const hederaNetwork = {
      name: "hedera-testnet",
      chainId: 296,
      ensAddress: null,
    };

    // ✅ Provider (ENS is already patched globally)
    this.provider = new JsonRpcProvider(process.env.HEDERA_RPC_URL, hederaNetwork);

    // ✅ Convert Hedera key → raw hex for Ethers
    const hederaOracleKey = PrivateKey.fromStringECDSA(process.env.ORACLE_PRIVATE_KEY);
    const rawKeyHex = hederaOracleKey.toStringRaw();

    // ✅ Create wallet safely
    this.wallet = new ethers.Wallet(rawKeyHex, this.provider);

    // ✅ Oracle contract setup
    this.oracleContract = new ethers.Contract(
      process.env.ORACLE_ADDRESS,
      [
        "function updatePrice(address token, uint256 price) external",
        "function updatePrices(address[] tokens, uint256[] prices) external",
        "function getPrice(address token) view returns (uint256)",
      ],
      this.wallet
    );

    this.priceCache = new Map();
  }

  async updatePropertyPrice(tokenAddress, newPrice) {
    try {
      console.log(`Updating price for ${tokenAddress}: ${newPrice}`);

      const oldPrice = this.priceCache.get(tokenAddress) || 0;
      const priceWei = ethers.parseUnits(newPrice.toString(), 18);

      const tx = await this.oracleContract.updatePrice(tokenAddress, priceWei);
      const receipt = await tx.wait();

      this.priceCache.set(tokenAddress, newPrice);

      await this.hcsService.logPriceUpdate({
        token: tokenAddress,
        propertyId: await this.getPropertyId(tokenAddress),
        oldPrice,
        newPrice,
        source: "oracle_service",
        timestamp: Date.now(),
      });

      console.log(`✅ Price updated: ${tokenAddress} = ${newPrice}`);
      return receipt.hash;
    } catch (error) {
      console.error("❌ Price update failed:", error.message);
      return null;
    }
  }

  async updateMultiplePrices(updates) {
    try {
      const tokens = [];
      const prices = [];

      for (const update of updates) {
        tokens.push(update.tokenAddress);
        prices.push(ethers.parseUnits(update.price.toString(), 18));
      }

      const tx = await this.oracleContract.updatePrices(tokens, prices);
      const receipt = await tx.wait();

      for (const update of updates) {
        await this.hcsService.logPriceUpdate({
          token: update.tokenAddress,
          propertyId: update.propertyId,
          oldPrice: 0,
          newPrice: update.price,
          source: "batch_update",
          timestamp: Date.now(),
        });
      }

      console.log(`✅ Batch price update: ${updates.length} properties`);
      return receipt.hash;
    } catch (error) {
      console.error("❌ Batch price update failed:", error.message);
      return null;
    }
  }

  async fetchPropertyValuation(propertyId) {
    const property = await this.getPropertyFromDB(propertyId);
    if (!property) return null;

    const baseValue = property.lastValuation;
    const fluctuation = (Math.random() - 0.5) * 0.1;
    const newValue = baseValue * (1 + fluctuation);

    return Math.round(newValue);
  }

  startPriceUpdates(intervalMs) {
    console.log(`Oracle update interval: ${intervalMs / 1000}s`);

    setInterval(async () => {
      console.log("🔄 Running scheduled price updates...");

      const properties = await this.getAllActiveProperties();
      console.log(`Found ${properties.length} active properties`);

      const updates = [];

      for (const property of properties) {
        const newPrice = await this.fetchPropertyValuation(property.id);

        if (newPrice && newPrice !== property.currentPrice) {
          updates.push({
            tokenAddress: property.tokenAddress,
            propertyId: property.id,
            price: newPrice,
          });
        }
      }

      if (updates.length > 0) {
        await this.updateMultiplePrices(updates);
      } else {
        console.log("No price changes detected");
      }
    }, intervalMs);
  }

  async getCurrentPrice(tokenAddress) {
    try {
      const priceWei = await this.oracleContract.getPrice(tokenAddress);
      return parseFloat(ethers.formatUnits(priceWei, 18));
    } catch (error) {
      console.error("❌ Failed to get price:", error.message);
      return null;
    }
  }

  async getAllActiveProperties() {
    const dataStore = require("../data/store");
    return dataStore.getAllProperties().filter((p) => p.status === "verified");
  }

  async getPropertyFromDB(propertyId) {
    const dataStore = require("../data/store");
    const property = dataStore.getProperty(propertyId);

    if (property) {
      return {
        id: property.propertyId,
        lastValuation: property.value,
        tokenAddress: property.tokenAddress,
        currentPrice: property.value,
      };
    }
    return null;
  }

  async getPropertyId(tokenAddress) {
    const dataStore = require("../data/store");
    const properties = dataStore.getAllProperties();
    const property = properties.find((p) => p.tokenAddress === tokenAddress);
    return property ? property.propertyId : "UNKNOWN";
  }
}

module.exports = OracleService;
