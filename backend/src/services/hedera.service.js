const {
    Client, TokenCreateTransaction, TokenType, TokenSupplyType, PrivateKey, AccountId, TokenAssociateTransaction, TokenGrantKycTransaction, TokenId, TokenMintTransaction, TokenBurnTransaction
} = require("@hashgraph/sdk");

class HederaService {
    constructor() {
        this.client = Client.forTestnet();
        this.client.setOperator(
            AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
            PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY_DER)
        );
    }

    async createHeNGNToken(name, symbol, initialSupply) {
        // Create and execute the token creation transaction
        const txResponse = await new TokenCreateTransaction()
            .setTokenName(name || "Hedera Nigerian Naira")
            .setTokenSymbol(symbol || "heNGN")
            .setDecimals(2)
            .setInitialSupply(initialSupply || 0)
            .setTreasuryAccountId(this.client.operatorAccountId)
            .setSupplyType(TokenSupplyType.Infinite)
            .setTokenType(TokenType.FungibleCommon)
            .setSupplyKey(this.client.operatorPublicKey)
            .setAdminKey(this.client.operatorPublicKey)
            .setFreezeKey(this.client.operatorPublicKey)
            .setWipeKey(this.client.operatorPublicKey)
            .execute(this.client);

        // Get the receipt
        const receipt = await txResponse.getReceipt(this.client);
        const tokenId = receipt.tokenId;

        console.log(` heNGN Token Created: ${tokenId}`);

        return tokenId.toString();
    }

  // Mint tokens for a verified property (uses master token)
async mintPropertyTokens(propertyData) {
    const { propertyId, ownerAccountId, tokenSupply, propertyValue } = propertyData;

    const masterTokenId = process.env.MASTER_RWA_TOKEN_ID;

    if (!masterTokenId) {
        throw new Error('MASTER_RWA_TOKEN_ID not set in .env');
    }

    // ✅ VALIDATE: 1 token = ₦1 economics
    if (propertyValue && tokenSupply !== propertyValue) {
        console.warn(`⚠️  Token supply (${tokenSupply}) doesn't match property value (₦${propertyValue})`);
        console.warn(`   Under 1:1 economics, these should be equal!`);
        console.warn(`   Using tokenSupply = propertyValue = ${propertyValue}`);
        // Override with correct value for safety
        propertyData.tokenSupply = propertyValue;
    }

    console.log(`Minting ${tokenSupply} TCRED tokens for ${propertyId}...`);
    console.log(`Property Value: ₦${propertyValue ? propertyValue.toLocaleString() : 'unknown'}`);
    console.log(`Token Supply: ${tokenSupply} tokens (1:1 economics)`);
    console.log(`Owner: ${ownerAccountId}`);

    // Check if user has associated the token
    try {
        const { TransferTransaction } = require("@hashgraph/sdk");
        
        // Try a zero-amount transfer to check association
        await new TransferTransaction()
            .addTokenTransfer(masterTokenId, this.client.operatorAccountId, 0)
            .addTokenTransfer(masterTokenId, ownerAccountId, 0)
            .execute(this.client);
        
        console.log(`✅ User has associated the token`);
    } catch (error) {
        if (error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
            throw new Error(`User ${ownerAccountId} has not associated token ${masterTokenId}. They must associate it first!`);
        }
        throw error;
    }

    // Mint tokens
    console.log(`Minting ${tokenSupply} tokens...`);
    const mintTx = await new TokenMintTransaction()
        .setTokenId(masterTokenId)
        .setAmount(tokenSupply)
        .execute(this.client);
    
    await mintTx.getReceipt(this.client);
    console.log(`✅ Tokens minted to treasury`);

    // NOTE: Master RWA token v2 (0.0.7162666) has NO KYC key
    // No need to grant KYC - token is freely transferable after association
    console.log(`⚠️  Skipping KYC grant (token has no KYC key)`);

    // Transfer tokens to user
    console.log(`Transferring ${tokenSupply} tokens to ${ownerAccountId}...`);
    const { TransferTransaction } = require("@hashgraph/sdk");
    
    const transferTx = await new TransferTransaction()
        .addTokenTransfer(masterTokenId, this.client.operatorAccountId, -tokenSupply)
        .addTokenTransfer(masterTokenId, ownerAccountId, tokenSupply)
        .execute(this.client);
    
    await transferTx.getReceipt(this.client);
    console.log(`✅ Tokens transferred to owner!`);

    return masterTokenId;
}
    async associateToken(accountId, tokenId) {
        //const { TokenAssociateTransaction } = require("@hashgraph/sdk");

        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId])
            .execute(this.client);

        await associateTx.getReceipt(this.client);

        console.log(`Token ${tokenId} associated with account ${accountId}`);
    }

    async grantKYC(accountId, tokenId) {
        //const { TokenGrantKycTransaction } = require("@hashgraph/sdk");

        const kycTx = await new TokenGrantKycTransaction()
            .setAccountId(accountId)
            .setTokenId(tokenId)
            .execute(this.client);

        await kycTx.getReceipt(this.client);
        console.log(`KYC granted for account ${accountId} on token ${tokenId}`);
    }

    //mint when user borrows
    async mintHeNGN(amount, receipientAccountId) {
        const mintTx = await new TokenMintTransaction()
            .setTokenId(process.env.HENGN_TOKEN_ID)
            .setAmount(amount)
            .execute(this.client);
        
        await mintTx.getReceipt(this.client);

        //transfer to recipient
        const { TransferTransaction } = require("@hashgraph/sdk");
        const transferTx = await new TransferTransaction()
            .addTokenTransfer(process.env.HENGN_TOKEN_ID, this.client.operatorAccountId, -amount)
            .addTokenTransfer(process.env.HENGN_TOKEN_ID, receipientAccountId, amount)
            .execute(this.client);

        await transferTx.getReceipt(this.client);
        console.log(`Minted ${amount} heNGN to ${receipientAccountId}`);
    }

    //burn when user repays
    async burnHeNGN(amount) {
        const burnTx = await new TokenBurnTransaction()
            .setTokenId(process.env.HENGN_TOKEN_ID)
            .setAmount(amount)
            .execute(this.client);

        await burnTx.getReceipt(this.client);
        console.log(`Burned ${amount} heNGN from treasury`);
    }
}

module.exports = HederaService;

