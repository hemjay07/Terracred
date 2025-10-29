const express = require('express');
const cors = require('cors');
const { Client, PrivateKey, AccountId } = require("@hashgraph/sdk");
require('dotenv').config();

const HederaService = require('./services/hedera.service');
const HCSService = require('./services/hcs.service');
const OracleService = require('./services/oracle.service');
const LiquidationService = require('./services/liquidation.service');

const propertyRoutes = require('./routes/property.routes');
const loanRoutes = require('./routes/loan.routes');
const userRoutes = require('./routes/user.routes');
const assetsRoutes = require('./routes/assets.routes');
const transactionsRoutes = require('./routes/transactions.routes');

const app = express();

//middleware
app.use(cors());
app.use(express.json());

//init hedera client
const client = Client.forTestnet();
client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY_DER || process.env.HEDERA_PRIVATE_KEY.replace("0x", ""))
);

//init services
const hederaService = new HederaService(client);
const hcsService = new HCSService(client);
const oracleService = new OracleService(client, hcsService);
const liquidationService = new LiquidationService(client, hcsService);

//make services available to routes
app.locals.services = {
    hedera: hederaService,
    hcs: hcsService,
    oracle: oracleService,
    liquidation: liquidationService
}

//routes
app.use('/api/properties', propertyRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/transactions', transactionsRoutes);

//health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: 'testnet'
    });
});

//error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

//start services
async function startServices() {
    console.log('Starting TerraCRED backend services...');

    //create or load HCS topic
    if (!process.env.HCS_TOPIC_ID) {
        console.log('Creating new HCS topic...');
        const topicId = await hcsService.createTopic();
        console.log(`Save this to .env: HCS_TOPIC_ID=${topicId}`);
    } else {
        hcsService.topicId = process.env.HCS_TOPIC_ID;
        console.log(`Using existing  HCS Topic: ${process.env.HCS_TOPIC_ID}`);
    }

    //start oracle price updates
    console.log('Starting oracle price updates (every 60 mins)...');
    oracleService.startPriceUpdates(60 * 60 * 1000);

    //start liquidation monitoring (every 5 mins)
    console.log('Starting liquidation monitor...');
    liquidationService.startMonitoring(5 * 60 * 1000);

    console.log('All services started.');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    await startServices();
    console.log(`\n📡 Backend running on http://localhost:${PORT}`);
});

module.exports = app;
