#!/bin/bash

# TerraCred Contract Interaction Scripts
# Helper commands for common contract operations

set -e

# Load environment variables
source .env

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Check if required env vars are set
check_env() {
    if [ -z "$HEDERA_RPC_URL" ] || [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
        print_error "Missing required environment variables. Check your .env file."
        exit 1
    fi
}

# Deploy contracts
deploy() {
    print_info "Deploying contracts to Hedera Testnet..."
    forge script script/Deploy.s.sol \
        --rpc-url $HEDERA_RPC_URL \
        --broadcast \
        --legacy \
        -vvvv
    print_success "Deployment complete!"
}

# Add supported token to LendingPool
add_token() {
    local token=$1
    if [ -z "$token" ]; then
        print_error "Usage: ./interact.sh add_token <TOKEN_ADDRESS>"
        exit 1
    fi
    
    print_info "Adding token ${token} to supported tokens..."
    cast send $LENDING_POOL_ADDRESS \
        "addSupportedToken(address)" \
        $token \
        --rpc-url $HEDERA_RPC_URL \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --legacy
    print_success "Token added successfully!"
}

# Update price in oracle
update_price() {
    local token=$1
    local price=$2
    if [ -z "$token" ] || [ -z "$price" ]; then
        print_error "Usage: ./interact.sh update_price <TOKEN_ADDRESS> <PRICE>"
        exit 1
    fi
    
    # Convert price to 18 decimals if it's a regular number
    # Example: 50000000 -> 50000000000000000000000000
    local price_wei=$(cast to-wei $price ether)
    
    print_info "Updating price for ${token} to ${price_wei}..."
    cast send $ORACLE_ADDRESS \
        "updatePrice(address,uint256)" \
        $token \
        $price_wei \
        --rpc-url $HEDERA_RPC_URL \
        --private-key $ORACLE_PRIVATE_KEY \
        --legacy
    print_success "Price updated successfully!"
}

# Get current price from oracle
get_price() {
    local token=$1
    if [ -z "$token" ]; then
        print_error "Usage: ./interact.sh get_price <TOKEN_ADDRESS>"
        exit 1
    fi
    
    print_info "Getting price for ${token}..."
    cast call $ORACLE_ADDRESS \
        "getPrice(address)" \
        $token \
        --rpc-url $HEDERA_RPC_URL
}

# Get loan details
get_loan() {
    local user=$1
    if [ -z "$user" ]; then
        print_error "Usage: ./interact.sh get_loan <USER_ADDRESS>"
        exit 1
    fi
    
    print_info "Getting loan details for ${user}..."
    cast call $LENDING_POOL_ADDRESS \
        "getLoanDetails(address)" \
        $user \
        --rpc-url $HEDERA_RPC_URL
}

# Check health factor
check_health() {
    local user=$1
    if [ -z "$user" ]; then
        print_error "Usage: ./interact.sh check_health <USER_ADDRESS>"
        exit 1
    fi
    
    print_info "Checking health factor for ${user}..."
    cast call $LENDING_POOL_ADDRESS \
        "getHealthFactor(address)" \
        $user \
        --rpc-url $HEDERA_RPC_URL
}

# Check if liquidatable
is_liquidatable() {
    local user=$1
    if [ -z "$user" ]; then
        print_error "Usage: ./interact.sh is_liquidatable <USER_ADDRESS>"
        exit 1
    fi
    
    print_info "Checking if ${user} is liquidatable..."
    cast call $LENDING_POOL_ADDRESS \
        "isLiquidatable(address)" \
        $user \
        --rpc-url $HEDERA_RPC_URL
}

# Fund lending pool with heNGN
fund_pool() {
    local amount=$1
    if [ -z "$amount" ]; then
        print_error "Usage: ./interact.sh fund_pool <AMOUNT>"
        exit 1
    fi
    
    local amount_wei=$(cast to-wei $amount ether)
    
    print_info "Funding LendingPool with ${amount} heNGN..."
    cast send $HENGN_ADDRESS \
        "transfer(address,uint256)" \
        $LENDING_POOL_ADDRESS \
        $amount_wei \
        --rpc-url $HEDERA_RPC_URL \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --legacy
    print_success "Pool funded successfully!"
}

# Get contract balance
get_balance() {
    local address=$1
    if [ -z "$address" ]; then
        print_error "Usage: ./interact.sh get_balance <ADDRESS>"
        exit 1
    fi
    
    print_info "Getting HBAR balance for ${address}..."
    cast balance $address --rpc-url $HEDERA_RPC_URL
}

# Verify contract
verify_contract() {
    local contract=$1
    local address=$2
    if [ -z "$contract" ] || [ -z "$address" ]; then
        print_error "Usage: ./interact.sh verify_contract <CONTRACT_NAME> <ADDRESS>"
        print_error "Example: ./interact.sh verify_contract PriceOracle 0x..."
        exit 1
    fi
    
    print_info "Verifying ${contract} at ${address}..."
    forge verify-contract \
        --chain-id 296 \
        --compiler-version v0.8.24 \
        $address \
        src/${contract}.sol:${contract}
}

# Transfer ownership
transfer_ownership() {
    local contract=$1
    local new_owner=$2
    if [ -z "$contract" ] || [ -z "$new_owner" ]; then
        print_error "Usage: ./interact.sh transfer_ownership <CONTRACT_ADDRESS> <NEW_OWNER>"
        exit 1
    fi
    
    print_info "Transferring ownership of ${contract} to ${new_owner}..."
    cast send $contract \
        "transferOwnership(address)" \
        $new_owner \
        --rpc-url $HEDERA_RPC_URL \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --legacy
    print_success "Ownership transferred successfully!"
}

# Main command handler
case "$1" in
    deploy)
        check_env
        deploy
        ;;
    add_token)
        check_env
        add_token $2
        ;;
    update_price)
        check_env
        update_price $2 $3
        ;;
    get_price)
        check_env
        get_price $2
        ;;
    get_loan)
        check_env
        get_loan $2
        ;;
    check_health)
        check_env
        check_health $2
        ;;
    is_liquidatable)
        check_env
        is_liquidatable $2
        ;;
    fund_pool)
        check_env
        fund_pool $2
        ;;
    get_balance)
        check_env
        get_balance $2
        ;;
    verify_contract)
        check_env
        verify_contract $2 $3
        ;;
    transfer_ownership)
        check_env
        transfer_ownership $2 $3
        ;;
    *)
        echo "TerraCred Contract Interaction Script"
        echo ""
        echo "Usage: ./interact.sh <command> [arguments]"
        echo ""
        echo "Available commands:"
        echo "  deploy                              - Deploy all contracts"
        echo "  add_token <token>                   - Add supported collateral token"
        echo "  update_price <token> <price>        - Update token price in oracle"
        echo "  get_price <token>                   - Get current token price"
        echo "  get_loan <user>                     - Get user loan details"
        echo "  check_health <user>                 - Check user health factor"
        echo "  is_liquidatable <user>              - Check if user is liquidatable"
        echo "  fund_pool <amount>                  - Fund LendingPool with heNGN"
        echo "  get_balance <address>               - Get HBAR balance"
        echo "  verify_contract <name> <address>    - Verify contract on explorer"
        echo "  transfer_ownership <contract> <new> - Transfer contract ownership"
        echo ""
        exit 1
        ;;
esac
