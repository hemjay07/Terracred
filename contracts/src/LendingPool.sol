// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IHederaTokenService.sol";

error TokenNotSupported(address token);
error InvalidAmount(uint256 amount);
error NoCollateral(address user);
error InsufficientCollateral(uint256 requested, uint256 maxBorrow);
error NoActiveLoan(address user);
error PositionHealthy();
error InvalidTokenAddress();
error TokenAlreadySupported();
error InvalidHeNGNAddress();
error InvalidOracleAddress();
error TransferFailed();
error InsufficientCollateralToWithdraw(uint256 available, uint256 requested);
error Undercollateralized(uint256 newHealthFactor, uint256 requiredRatio);
error SelfLiquidationNotAllowed();
error DifferentCollateral(address token);
error LendingPool__TransferFailed(
    address token,
    address from,
    address to,
    uint256 amount
);

interface IPriceOracle {
    function getPrice(address asset) external view returns (uint256);
}

contract LendingPool is Ownable, ReentrancyGuard {
    // Hedera Token Service precompile address
    address constant HTS_PRECOMPILE = address(0x167);

    IERC20 public heNGN;
    IPriceOracle public oracle;

    uint256 public constant COLLATERAL_RATIO = 150; // 150%
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120%
    uint256 public constant LIQUIDATION_BONUS = 105; // 5%
    uint256 public constant INTEREST_RATE = 10; // 10% APR
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant ORIGINATION_FEE = 10; // 0.1% in BPS
    uint256 public constant LOAN_TERM = 365 days; // 12 months
    uint256 public constant EXTENSION_TERM = 90 days; // 3 months

    struct Loan {
        uint256 collateralAmount;
        address collateralToken;
        uint256 borrowedAmount;
        uint256 timestamp;
        uint256 accruedInterest;
        uint256 lastInterestUpdate;
        string propertyId;           // Track which property backs this loan
        uint256 propertyValue;       // Property value at time of deposit
        uint256 dueDate;             // When loan must be repaid
        bool extensionUsed;          // Whether borrower used their one-time extension
    }

    mapping(address => Loan) public loans;
    mapping(address => bool) public supportedTokens;

    event CollateralDeposited(
        address indexed user,
        address indexed token,
        uint256 amount,
        string propertyId
    );
    event Borrowed(address indexed user, uint256 amount, uint256 fee);
    event Repaid(address indexed user, uint256 principal, uint256 interest);
    event Liquidated(
        address indexed borrower,
        uint256 debtCovered,
        uint256 collateralSeized,
        string propertyId
    );
    event LoanExtended(
        address indexed user,
        uint256 newDueDate,
        uint256 interestPaid
    );
    event TokenSupported(address indexed token);
    event CollateralWithdrawn(address indexed user, uint256 amount);

    constructor(address _heNGN, address _oracle, address _masterRWAToken) Ownable(msg.sender) {
        if (_heNGN == address(0)) revert InvalidHeNGNAddress();
        if (_oracle == address(0)) revert InvalidOracleAddress();
        if (_masterRWAToken == address(0)) revert InvalidTokenAddress();

        heNGN = IERC20(_heNGN);
        oracle = IPriceOracle(_oracle);

        // ⭐ AUTO-WHITELIST: Add master RWA token as supported collateral on deployment
        supportedTokens[_masterRWAToken] = true;
        emit TokenSupported(_masterRWAToken);
    }

    /**
     * @notice Associate this contract with heNGN token (required for Hedera)
     * @dev Only owner can call this. Must be called before the contract can receive heNGN
     */
    function associateWithHeNGN() external onlyOwner {
        IHederaTokenService hts = IHederaTokenService(HTS_PRECOMPILE);
        int32 responseCode = hts.associateToken(address(this), address(heNGN));
        require(responseCode == 22, "Token association failed");
    }

    // ⭐ UPDATED: Now accepts propertyId and propertyValue to track which property
    function depositCollateral(
        address token,
        uint256 amount,
        string memory propertyId,      // ⭐ NEW
        uint256 propertyValue          // ⭐ NEW
    ) external nonReentrant {
        if (!supportedTokens[token]) revert TokenNotSupported(token);
        if (amount == 0) revert InvalidAmount(amount);

        Loan storage loan = loans[msg.sender];
        if (loan.collateralToken == address(0)) {
            // First time depositing
            loan.collateralToken = token;
            loan.timestamp = block.timestamp;
            loan.lastInterestUpdate = block.timestamp;
            loan.propertyId = propertyId;           // ⭐ Store which property
            loan.propertyValue = propertyValue;     // ⭐ Store property value
        } else {
            // Adding more collateral
            if (loan.collateralToken != token)
                revert DifferentCollateral(token);
        }
        loan.collateralAmount += amount;

        bool success = IERC20(token).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) {
            revert LendingPool__TransferFailed(
                token,
                msg.sender,
                address(this),
                amount
            );
        }

        emit CollateralDeposited(msg.sender, token, amount, propertyId);  // ⭐ Emit property ID
    }

    function borrow(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];
        if (loan.collateralAmount == 0) revert NoCollateral(msg.sender);
        if (amount == 0) revert InvalidAmount(amount);

        updateInterest(msg.sender);

        uint256 maxBorrow = getMaxBorrow(msg.sender);
        if (amount > maxBorrow)
            revert InsufficientCollateral(amount, maxBorrow);

        // Set due date on first borrow
        if (loan.borrowedAmount == 0 && loan.dueDate == 0) {
            loan.dueDate = block.timestamp + LOAN_TERM; // 12 months from now
        }

        //calculate origination fee
        uint256 fee = (amount * ORIGINATION_FEE) / 10000;
        uint256 netAmount = amount - fee;

        loan.borrowedAmount += amount;

        if (!heNGN.transfer(msg.sender, netAmount)) revert TransferFailed();

        emit Borrowed(msg.sender, netAmount, fee);
    }

    function repay(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];
        if (loan.borrowedAmount == 0) revert NoActiveLoan(msg.sender);
        if (amount == 0) revert InvalidAmount(amount);

        updateInterest(msg.sender);

        uint256 totalDebt = loan.borrowedAmount + loan.accruedInterest;
        uint256 repayAmount;
        if (amount > totalDebt) {
            repayAmount = totalDebt;
        } else {
            repayAmount = amount;
        }

        uint256 interestPaid;
        uint256 principalPaid;

        if (repayAmount <= loan.accruedInterest) {
            loan.accruedInterest -= repayAmount;
            interestPaid = repayAmount;
        } else {
            interestPaid = loan.accruedInterest;
            principalPaid = repayAmount - loan.accruedInterest;
            loan.accruedInterest = 0;
            loan.borrowedAmount -= principalPaid;
        }

        if (!heNGN.transferFrom(msg.sender, address(this), repayAmount))
            revert TransferFailed();

        emit Repaid(msg.sender, principalPaid, interestPaid);
    }

    /**
     * @notice Extend loan term by 3 months (one-time only)
     * @dev Borrower must pay all accrued interest to qualify for extension
     */
    function extendLoan() external nonReentrant {
        Loan storage loan = loans[msg.sender];

        // Validate loan exists and has borrowed amount
        if (loan.borrowedAmount == 0) revert NoActiveLoan(msg.sender);

        // Check extension hasn't been used
        require(!loan.extensionUsed, "Extension already used");

        // Check we're within extension window (last 30 days before due date)
        require(block.timestamp >= loan.dueDate - 30 days, "Too early for extension");
        require(block.timestamp <= loan.dueDate, "Loan already overdue");

        // Update and calculate current interest
        updateInterest(msg.sender);
        uint256 interestOwed = loan.accruedInterest;

        // Require payment of all accrued interest
        require(interestOwed > 0, "No interest to pay");

        // Transfer interest payment
        if (!heNGN.transferFrom(msg.sender, address(this), interestOwed))
            revert TransferFailed();

        // Clear accrued interest and extend due date
        loan.accruedInterest = 0;
        loan.dueDate = loan.dueDate + EXTENSION_TERM; // Add 3 months
        loan.extensionUsed = true;
        loan.lastInterestUpdate = block.timestamp; // Reset interest calculation

        emit LoanExtended(msg.sender, loan.dueDate, interestOwed);
    }

    function withdrawCollateral(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];
        if (loan.collateralAmount < amount) {
            revert InsufficientCollateralToWithdraw(
                loan.collateralAmount,
                amount
            );
        }
        if (loan.borrowedAmount > 0) {
            updateInterest(msg.sender);

            // ⭐ UPDATED: Use stored propertyValue instead of oracle
            uint256 collateralValuePerToken = loan.propertyValue / loan.collateralAmount;
            uint256 remainingCollateralValue = (loan.collateralAmount - amount) * collateralValuePerToken;
            uint256 totalDebt = loan.borrowedAmount + loan.accruedInterest;
            uint256 newHealthFactor = (remainingCollateralValue * 100) / totalDebt;

            if (newHealthFactor < COLLATERAL_RATIO) {
                revert Undercollateralized(newHealthFactor, COLLATERAL_RATIO);
            }
        }

        loan.collateralAmount -= amount;

        bool success = IERC20(loan.collateralToken).transfer(
            msg.sender,
            amount
        );
        if (!success) {
            revert LendingPool__TransferFailed(
                loan.collateralToken,
                address(this),
                msg.sender,
                amount
            );
        }

        emit CollateralWithdrawn(msg.sender, amount);
    }

   function liquidate(address borrower) external nonReentrant {
    if (!isLiquidatable(borrower)) revert PositionHealthy();
    if (borrower == msg.sender) {
        revert SelfLiquidationNotAllowed();
    }

    Loan storage loan = loans[borrower];
    updateInterest(borrower);

    // ⭐ Calculate everything we need BEFORE deleting loan
    uint256 totalDebt = loan.borrowedAmount + loan.accruedInterest;
    uint256 collateralValuePerToken = loan.propertyValue / loan.collateralAmount;
    uint256 totalCollateralValue = loan.collateralAmount * collateralValuePerToken;
    uint256 collateralValueToSeize = (totalDebt * LIQUIDATION_BONUS) / 100;
    
    uint256 collateralToSeize;
    if (collateralValueToSeize >= totalCollateralValue) {
        collateralToSeize = loan.collateralAmount;
    } else {
        collateralToSeize = collateralValueToSeize / collateralValuePerToken;
    }

    uint256 remaining = loan.collateralAmount - collateralToSeize;
    address collateralToken = loan.collateralToken;

    // ⭐ Emit event BEFORE deleting (no need to store propertyId separately)
    emit Liquidated(borrower, totalDebt, collateralToSeize, loan.propertyId);

    // Clear loan
    delete loans[borrower];

    // Liquidator pays debt
    bool debtPaid = heNGN.transferFrom(msg.sender, address(this), totalDebt);
    if (!debtPaid) {
        revert LendingPool__TransferFailed(
            address(heNGN),
            msg.sender,
            address(this),
            totalDebt
        );
    }

    // Send collateral to liquidator
    bool success = IERC20(collateralToken).transfer(msg.sender, collateralToSeize);
    if(!success) {
        revert TransferFailed();
    }

    // Transfer remaining collateral to borrower
    if (remaining > 0) {
        bool collateralSent = IERC20(collateralToken).transfer(borrower, remaining);
        if (!collateralSent) {
            revert LendingPool__TransferFailed(
                collateralToken,
                address(this),
                borrower,
                remaining
            );
        }
    }
}

    function updateInterest(address user) internal {
        Loan storage loan = loans[user];
        uint256 borrowed = loan.borrowedAmount;
        if (borrowed == 0) return;

        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        if (timeElapsed == 0) return;

        uint256 interest = (borrowed * INTEREST_RATE * timeElapsed) /
            (100 * SECONDS_PER_YEAR);

        loan.accruedInterest += interest;
        loan.lastInterestUpdate = block.timestamp;
    }

    // ⭐ UPDATED: Use stored propertyValue instead of oracle
    function getHealthFactor(address user) public view returns (uint256) {
        Loan memory loan = loans[user];
        uint256 borrowed = loan.borrowedAmount;
        if (borrowed == 0) return type(uint256).max;

        // Use the property value stored when collateral was deposited
        uint256 collateralValuePerToken = loan.propertyValue / loan.collateralAmount;
        uint256 value = loan.collateralAmount * collateralValuePerToken;

        // Calculate current interest
        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        uint256 currentInterest = (borrowed * INTEREST_RATE * timeElapsed) /
            (100 * SECONDS_PER_YEAR);

        uint256 debt = borrowed + loan.accruedInterest + currentInterest;

        return (value * 100) / debt;
    }

    function isLiquidatable(address user) public view returns (bool) {
        Loan memory loan = loans[user];

        // No loan to liquidate
        if (loan.borrowedAmount == 0) {
            return false;
        }

        // Check if loan is overdue
        if (loan.dueDate > 0 && block.timestamp > loan.dueDate) {
            return true; // Overdue loans can always be liquidated
        }

        // Check health factor
        uint256 healthFactor = getHealthFactor(user);
        if (healthFactor == type(uint256).max) {
            return false;
        }
        return healthFactor < LIQUIDATION_THRESHOLD;
    }

    // ⭐ UPDATED: Use stored propertyValue instead of oracle
    function getMaxBorrow(address user) public view returns (uint256) {
        Loan memory loan = loans[user];
        if (loan.collateralAmount == 0) {
            return 0;
        }

        // Use stored property value
        uint256 collateralValuePerToken = loan.propertyValue / loan.collateralAmount;
        uint256 value = loan.collateralAmount * collateralValuePerToken;

        uint256 maxBorrow = (value * 100) / COLLATERAL_RATIO;

        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        uint256 currentInterest = (loan.borrowedAmount *
            INTEREST_RATE *
            timeElapsed) / (100 * SECONDS_PER_YEAR);

        uint256 totalDebt = loan.borrowedAmount +
            loan.accruedInterest +
            currentInterest;

        if (totalDebt >= maxBorrow) {
            return 0;
        }
        return maxBorrow - totalDebt;
    }

    // GET loan details
    function getLoanDetails(
        address user
    )
        external
        view
        returns (
            uint256 collateralAmount,
            address collateralToken,
            uint256 borrowedAmount,
            uint256 totalDebt,
            uint256 healthFactor,
            uint256 maxBorrow,
            uint256 dueDate,
            bool extensionUsed
        )
    {
        Loan memory loan = loans[user];
        collateralAmount = loan.collateralAmount;
        collateralToken = loan.collateralToken;
        borrowedAmount = loan.borrowedAmount;

        // Calculate current interest
        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        uint256 currentInterest = (loan.borrowedAmount *
            INTEREST_RATE *
            timeElapsed) / (100 * SECONDS_PER_YEAR);

        return (
            collateralAmount,
            collateralToken,
            borrowedAmount,
            loan.borrowedAmount + loan.accruedInterest + currentInterest,
            getHealthFactor(user),
            getMaxBorrow(user),
            loan.dueDate,
            loan.extensionUsed
        );
    }

    // Admin functions
    function addSupportedToken(address token) external onlyOwner {
        if (token == address(0)) revert InvalidTokenAddress();
        if (supportedTokens[token]) revert TokenAlreadySupported();

        supportedTokens[token] = true;
        emit TokenSupported(token);
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    function updateOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidOracleAddress();
        oracle = IPriceOracle(newOracle);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = heNGN.balanceOf(address(this));

        if (balance == 0) revert TransferFailed();

        bool success = heNGN.transfer(owner(), balance);
        if (!success) revert TransferFailed();
    }
}