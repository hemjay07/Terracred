import { Client, TopicCreateTransaction, PrivateKey, AccountId } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function createTopic() {
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY)
  );

  console.log("🌀 Creating new HCS topic...");
  const txResponse = await new TopicCreateTransaction().execute(client);
  const receipt = await txResponse.getReceipt(client);
  const topicId = receipt.topicId.toString();

  console.log(`✅ HCS Topic created: ${topicId}`);
  console.log(`Save this to your .env as: HCS_TOPIC_ID=${topicId}`);

  client.close();
}

createTopic().catch(console.error);
