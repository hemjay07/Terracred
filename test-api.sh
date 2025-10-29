#!/bin/bash

API="http://localhost:3001"

echo "🧪 Testing TerraCred API"
echo "======================="
echo ""

echo "1️⃣  Health Check"
curl -s $API/health | jq 2>/dev/null || curl -s $API/health
echo -e "\n"

echo "2️⃣  Properties"
curl -s $API/api/properties | jq '.properties | length' 2>/dev/null || echo "Response received"
echo -e "\n"

echo "3️⃣  Transactions"
curl -s $API/api/transactions | jq '.count' 2>/dev/null || echo "Response received"
echo -e "\n"

echo "4️⃣  Your Assets"
curl -s "$API/api/assets?owner=0.0.7095129" | jq 2>/dev/null || curl -s "$API/api/assets?owner=0.0.7095129"
echo -e "\n"

echo "5️⃣  Your Loan"
curl -s $API/api/loans/0x5f55f4537B30C5e5B8Aa1FdAB4D84F7f59AA1bB6 | jq 2>/dev/null || curl -s $API/api/loans/0x5f55f4537B30C5e5B8Aa1FdAB4D84F7f59AA1bB6
echo -e "\n"

echo "✅ All endpoints tested!"
