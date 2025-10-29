// src/services/hcs.service.js
const { TopicId, TopicMessageSubmitTransaction, Client, PrivateKey, AccountId } = require("@hashgraph/sdk");

class HcsService {
  constructor() {
    // Create a Hedera client for testnet
    this.client = Client.forTestnet();

    // Set operator from .env variables
    this.client.setOperator(
      AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
      PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY_DER)
    );

    this.topicId = null;
  }

  // ✅ Initialize or load an existing topic
  async init(topicId) {
    if (!topicId) {
      throw new Error("No HCS topic ID provided in environment variables.");
    }

    this.topicId = TopicId.fromString(topicId);
    console.log("✅ HCS Topic initialized:", this.topicId.toString());
  }

  // ✅ Log any structured message to HCS
  async logPriceUpdate(data) {
    if (!this.topicId) {
      throw new Error("HCS Topic not initialized.");
    }

    const message = JSON.stringify({
      type: "price_update",
      ...data,
    });

    const tx = await new TopicMessageSubmitTransaction({
      topicId: this.topicId,
      message,
    }).execute(this.client);

    const receipt = await tx.getReceipt(this.client);
    console.log(`🧾 Price update logged to HCS Topic ${this.topicId.toString()} (status: ${receipt.status})`);
  }
}

module.exports = HcsService;
