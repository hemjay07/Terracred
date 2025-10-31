// In-memory data store for MVP/Demo
// This simulates database operations without needing PostgreSQL

class DataStore {
    constructor() {
        // Properties database
        this.properties = new Map();
        this.propertyCounter = 1;

        // Users and KYC database
        this.users = new Map();
        this.userCounter = 1;

        // Tokens database
        this.tokens = new Map();

        // Transactions log
        this.transactions = [];
        this.transactionCounter = 1;

        // Initialize with some dummy data
        // DISABLED: Dummy data commented out for production use
        // this.initializeDummyData();
    }

    initializeDummyDataDISABLED() {
        // Dummy Property 1 - Verified
        this.addProperty({
            propertyId: 'PROP001',
            owner: '0.0.12345',
            address: '123 Victoria Island, Lagos, Nigeria',
            value: 50000000, // 50M Naira
            description: 'Luxury 4-bedroom apartment with ocean view',
            proofDocumentUri: 'ipfs://Qm...abc123',
            appraisalHash: '0xabc...123',
            deedHash: '0xdef...456',
            status: 'verified',
            verifiedAt: new Date('2025-10-15T10:00:00Z'),
            verifier: '0.0.98765',
            tokenId: '0.0.11111',
            tokenAddress: '0x1234567890123456789012345678901234567890',
            tokenSupply: 1000,
            createdAt: new Date('2025-10-10T08:00:00Z')
        });

        // Dummy Property 2 - Pending
        this.addProperty({
            propertyId: 'PROP002',
            owner: '0.0.54321',
            address: '456 Ikoyi Crescent, Lagos, Nigeria',
            value: 35000000, // 35M Naira
            description: '3-bedroom flat in prime location',
            proofDocumentUri: 'ipfs://Qm...xyz789',
            appraisalHash: '0x789...xyz',
            deedHash: '0x456...def',
            status: 'pending',
            verifiedAt: null,
            verifier: null,
            tokenId: null,
            tokenAddress: null,
            tokenSupply: 1000,
            createdAt: new Date('2025-10-20T14:30:00Z')
        });

        // Dummy Property 3 - Verified
        this.addProperty({
            propertyId: 'PROP003',
            owner: '0.0.12345',
            address: '789 Lekki Phase 1, Lagos, Nigeria',
            value: 75000000, // 75M Naira
            description: '5-bedroom detached house with pool',
            proofDocumentUri: 'ipfs://Qm...def456',
            appraisalHash: '0xghi...789',
            deedHash: '0xjkl...012',
            status: 'verified',
            verifiedAt: new Date('2025-10-18T11:00:00Z'),
            verifier: '0.0.98765',
            tokenId: '0.0.22222',
            tokenAddress: '0x2345678901234567890123456789012345678901',
            tokenSupply: 1500,
            createdAt: new Date('2025-10-12T09:00:00Z')
        });

        // Dummy User 1 - KYC Verified
        this.addUser({
            userId: 'USER001',
            accountId: '0.0.12345',
            email: 'john.doe@example.com',
            name: 'John Doe',
            kycStatus: 'verified',
            kycLevel: 'full',
            kycProvider: 'Persona',
            kycVerifiedAt: new Date('2025-10-05T10:00:00Z'),
            createdAt: new Date('2025-10-01T08:00:00Z')
        });

        // Dummy User 2 - KYC Pending
        this.addUser({
            userId: 'USER002',
            accountId: '0.0.54321',
            email: 'jane.smith@example.com',
            name: 'Jane Smith',
            kycStatus: 'pending',
            kycLevel: null,
            kycProvider: 'Persona',
            kycVerifiedAt: null,
            createdAt: new Date('2025-10-18T12:00:00Z')
        });

        // Dummy Transactions
        this.addTransaction({
            type: 'PROPERTY_VERIFIED',
            propertyId: 'PROP001',
            userAddress: '0.0.12345',
            data: {
                tokenId: '0.0.11111',
                verifier: '0.0.98765'
            },
            timestamp: new Date('2025-10-15T10:00:00Z')
        });

        this.addTransaction({
            type: 'LOAN_CREATED',
            propertyId: 'PROP001',
            userAddress: '0.0.12345',
            data: {
                collateralToken: '0x1234567890123456789012345678901234567890',
                collateralAmount: '500',
                borrowAmount: '20000000',
                transactionHash: '0xabcdef...'
            },
            timestamp: new Date('2025-10-16T14:30:00Z')
        });
    }

    // Property operations
    addProperty(property) {
        const propertyId = property.propertyId || `PROP${String(this.propertyCounter++).padStart(3, '0')}`;
        property.propertyId = propertyId;
        this.properties.set(propertyId, property);
        return property;
    }

    getProperty(propertyId) {
        return this.properties.get(propertyId);
    }

    getPropertiesByOwner(ownerAddress) {
        return Array.from(this.properties.values()).filter(
            p => p.owner === ownerAddress
        );
    }

    getAllProperties() {
        return Array.from(this.properties.values());
    }

    updatePropertyStatus(propertyId, status, additionalData = {}) {
        const property = this.properties.get(propertyId);
        if (property) {
            property.status = status;
            Object.assign(property, additionalData);
            return property;
        }
        return null;
    }

    // User operations
    addUser(user) {
        const userId = user.userId || `USER${String(this.userCounter++).padStart(3, '0')}`;
        user.userId = userId;
        this.users.set(userId, user);
        this.users.set(user.accountId, user); // Also index by accountId
        return user;
    }

    getUser(identifier) {
        // Try userId first, then accountId
        return this.users.get(identifier);
    }

    getUserByAccountId(accountId) {
        return Array.from(this.users.values()).find(
            u => u.accountId === accountId
        );
    }

    updateUserKYC(accountId, kycData) {
        const user = this.getUserByAccountId(accountId);
        if (user) {
            Object.assign(user, kycData);
            return user;
        }
        return null;
    }

    // Token operations
    addToken(token) {
        this.tokens.set(token.tokenId, token);
        return token;
    }

    getToken(tokenId) {
        return this.tokens.get(tokenId);
    }

    getTokensByOwner(ownerAddress) {
        return Array.from(this.tokens.values()).filter(
            t => t.owner === ownerAddress
        );
    }

    // Transaction operations
    addTransaction(transaction) {
        const txId = `TX${String(this.transactionCounter++).padStart(6, '0')}`;
        transaction.txId = txId;
        transaction.timestamp = transaction.timestamp || new Date();
        this.transactions.push(transaction);
        return transaction;
    }

    getTransactionsByUser(userAddress) {
        return this.transactions.filter(
            t => t.userAddress === userAddress
        );
    }

    getAllTransactions() {
        return this.transactions;
    }

    // Asset operations (combines property and token info)
    getAssetByTokenId(tokenId) {
        // Find property with this tokenId
        const property = Array.from(this.properties.values()).find(
            p => p.tokenId === tokenId
        );
        
        if (!property) return null;

        return {
            tokenId: property.tokenId,
            tokenAddress: property.tokenAddress,
            propertyId: property.propertyId,
            owner: property.owner,
            address: property.address,
            value: property.value,
            description: property.description,
            tokenSupply: property.tokenSupply,
            status: property.status,
            verifiedAt: property.verifiedAt,
            createdAt: property.createdAt
        };
    }

    getAssetsByOwner(ownerAddress) {
        return this.getPropertiesByOwner(ownerAddress)
            .filter(p => p.tokenId) // Only verified properties with tokens
            .map(p => ({
                tokenId: p.tokenId,
                tokenAddress: p.tokenAddress,
                propertyId: p.propertyId,
                owner: p.owner,
                address: p.address,
                value: p.value,
                description: p.description,
                tokenSupply: p.tokenSupply,
                status: p.status,
                verifiedAt: p.verifiedAt,
                createdAt: p.createdAt
            }));
    }
}

// Singleton instance
const dataStore = new DataStore();

module.exports = dataStore;
