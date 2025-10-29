#!/bin/bash

echo "🧹 Cleaning Backend Directory"
echo "=============================="
echo ""

# Keep one test file as demo
if [ -f testLendingComplete.js ]; then
    mv testLendingComplete.js demo-lending-test.js
    echo "✅ Kept: testLendingComplete.js → demo-lending-test.js"
fi

# Remove test/debug files
FILES_TO_REMOVE=(
    "check-env.js"
    "checkStorage.js"
    "diagnose.js"
    "diagnoseLendingPool.js"
    "quickOracleUpdate.js"
    "setupAndTestLending.js"
    "testConnection.js"
    "testLending.js"
    "testLending_Direct.js"
    "testLendingFinal.js"
    "testOracle.js"
    "DeployAll.s.sol"
    "DeployMockHeNGN.s.sol"
    "MockHeNGN.sol"
    ".env.sample.corrected"
    "env.sample"
)

REMOVED=0
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "🗑️  Removed: $file"
        ((REMOVED++))
    fi
done

echo ""
echo "=============================="
echo "✅ Cleanup Complete!"
echo "   Removed: $REMOVED files"
echo ""
echo "📁 Essential files kept:"
echo "   • src/ (all routes and services)"
echo "   • .env (your config)"
echo "   • package.json"
echo "   • demo-lending-test.js"
echo ""
echo "🚀 Your backend is now clean!"
