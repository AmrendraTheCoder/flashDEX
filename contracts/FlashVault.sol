// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlashVault - Secure Token Custody for FlashDEX
 * @notice Manages deposits, withdrawals, and trade settlements for hybrid DEX
 * @dev Optimized for batch settlements with comprehensive security features
 * 
 * ARCHITECTURE:
 * This vault implements a hybrid DEX model where:
 * - Users deposit tokens to the vault for trading
 * - Orders are matched off-chain by the matching engine
 * - Matched trades are settled on-chain in batches
 * - Users can withdraw their balance at any time
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard on all external state-changing functions
 * - Role-based access control (Admin, Operator, Guardian)
 * - Pausable for emergency situations
 * - CEI (Checks-Effects-Interactions) pattern
 * - SafeERC20 for token transfers
 * - Trade deduplication to prevent replay attacks
 * - Deposit/withdrawal limits
 * 
 * GAS OPTIMIZATIONS:
 * - Batch settlement reduces per-trade gas overhead
 * - Calldata arrays instead of memory
 * - Unchecked increments in loops
 * - Direct mapping access vs struct storage
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract FlashVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============ ROLES ============
    
    /// @notice Operator role - can settle trades (matching engine)
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    /// @notice Guardian role - can pause in emergencies
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // ============ STORAGE ============
    
    /// @notice Token balances: token => user => balance
    mapping(address => mapping(address => uint256)) public balances;
    
    /// @notice Supported tokens whitelist
    mapping(address => bool) public supportedTokens;
    
    /// @notice List of all supported tokens (for enumeration)
    address[] public tokenList;
    
    /// @notice Settlement nonce (for off-chain tracking)
    uint256 public settlementNonce;
    
    /// @notice Settled trades (prevents replay)
    mapping(bytes32 => bool) public settledTrades;
    
    /// @notice Per-transaction deposit limit (0 = unlimited)
    uint256 public maxDepositPerTx;
    
    /// @notice Per-transaction withdrawal limit (0 = unlimited)
    uint256 public maxWithdrawPerTx;
    
    /// @notice Total value locked per token
    mapping(address => uint256) public totalDeposited;
    
    // ============ EVENTS ============
    
    event Deposited(
        address indexed user, 
        address indexed token, 
        uint256 amount,
        uint256 newBalance
    );
    
    event Withdrawn(
        address indexed user, 
        address indexed token, 
        uint256 amount,
        uint256 newBalance
    );
    
    event TradeSettled(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 price,
        uint256 timestamp
    );
    
    event BatchSettled(
        uint256 indexed nonce,
        uint256 tradeCount,
        uint256 timestamp
    );
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event LimitsUpdated(uint256 maxDeposit, uint256 maxWithdraw);
    
    // ============ ERRORS ============
    
    error TokenNotSupported();
    error InsufficientBalance();
    error InvalidAmount();
    error ExceedsLimit();
    error TradeAlreadySettled();
    error ArrayLengthMismatch();
    error ZeroAddress();
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
        
        // Default: no limits
        maxDepositPerTx = type(uint256).max;
        maxWithdrawPerTx = type(uint256).max;
    }
    
    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Deposit tokens into the vault for trading
     * @param token Token address to deposit
     * @param amount Amount to deposit (with token decimals)
     */
    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (amount == 0) revert InvalidAmount();
        if (amount > maxDepositPerTx) revert ExceedsLimit();
        
        // Transfer tokens to vault
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update balances
        balances[token][msg.sender] += amount;
        totalDeposited[token] += amount;
        
        emit Deposited(msg.sender, token, amount, balances[token][msg.sender]);
    }
    
    /**
     * @notice Withdraw tokens from the vault
     * @param token Token address to withdraw
     * @param amount Amount to withdraw (with token decimals)
     */
    function withdraw(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (amount == 0) revert InvalidAmount();
        if (amount > maxWithdrawPerTx) revert ExceedsLimit();
        if (balances[token][msg.sender] < amount) revert InsufficientBalance();
        
        // Update state first (CEI pattern)
        balances[token][msg.sender] -= amount;
        totalDeposited[token] -= amount;
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, token, amount, balances[token][msg.sender]);
    }
    
    // ============ OPERATOR FUNCTIONS ============
    
    /**
     * @notice Settle a batch of matched trades
     * @dev Only callable by OPERATOR_ROLE (matching engine)
     * 
     * Trade settlement transfers:
     * - Buyer pays quoteAmount of quoteToken
     * - Buyer receives baseAmount of baseToken
     * - Seller pays baseAmount of baseToken
     * - Seller receives quoteAmount of quoteToken
     * 
     * @param tradeIds Unique trade identifiers
     * @param buyers Buyer addresses
     * @param sellers Seller addresses  
     * @param baseToken Base token (e.g., FETH)
     * @param quoteToken Quote token (e.g., FUSDT)
     * @param baseAmounts Amounts of base token traded
     * @param quoteAmounts Amounts of quote token traded
     * @param prices Trade prices (for event logging)
     */
    function settleTrades(
        bytes32[] calldata tradeIds,
        address[] calldata buyers,
        address[] calldata sellers,
        address baseToken,
        address quoteToken,
        uint256[] calldata baseAmounts,
        uint256[] calldata quoteAmounts,
        uint256[] calldata prices
    ) 
        external 
        onlyRole(OPERATOR_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        uint256 len = tradeIds.length;
        
        // Validate array lengths
        if (
            len != buyers.length ||
            len != sellers.length ||
            len != baseAmounts.length ||
            len != quoteAmounts.length ||
            len != prices.length
        ) revert ArrayLengthMismatch();
        
        // Increment settlement nonce
        uint256 currentNonce = ++settlementNonce;
        
        // Process each trade
        for (uint256 i; i < len;) {
            _settleSingleTrade(
                tradeIds[i],
                buyers[i],
                sellers[i],
                baseToken,
                quoteToken,
                baseAmounts[i],
                quoteAmounts[i],
                prices[i]
            );
            unchecked { ++i; }
        }
        
        emit BatchSettled(currentNonce, len, block.timestamp);
    }
    
    /**
     * @notice Settle a single trade (convenience function)
     */
    function settleSingleTrade(
        bytes32 tradeId,
        address buyer,
        address seller,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 price
    ) 
        external 
        onlyRole(OPERATOR_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        _settleSingleTrade(
            tradeId, buyer, seller, 
            baseToken, quoteToken, 
            baseAmount, quoteAmount, price
        );
        
        emit BatchSettled(++settlementNonce, 1, block.timestamp);
    }
    
    /**
     * @dev Internal trade settlement logic
     */
    function _settleSingleTrade(
        bytes32 tradeId,
        address buyer,
        address seller,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 price
    ) internal {
        // Check trade hasn't been settled
        if (settledTrades[tradeId]) revert TradeAlreadySettled();
        
        // Validate balances
        if (balances[quoteToken][buyer] < quoteAmount) revert InsufficientBalance();
        if (balances[baseToken][seller] < baseAmount) revert InsufficientBalance();
        
        // Mark as settled (before state changes)
        settledTrades[tradeId] = true;
        
        // Execute transfers
        // Buyer: -quote, +base
        balances[quoteToken][buyer] -= quoteAmount;
        balances[baseToken][buyer] += baseAmount;
        
        // Seller: -base, +quote
        balances[baseToken][seller] -= baseAmount;
        balances[quoteToken][seller] += quoteAmount;
        
        emit TradeSettled(
            tradeId, buyer, seller,
            baseToken, quoteToken,
            baseAmount, quoteAmount,
            price, block.timestamp
        );
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Add a supported token
     * @param token Token address to whitelist
     */
    function addToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        if (!supportedTokens[token]) {
            supportedTokens[token] = true;
            tokenList.push(token);
            emit TokenAdded(token);
        }
    }
    
    /**
     * @notice Remove a supported token
     * @param token Token address to remove
     */
    function removeToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (supportedTokens[token]) {
            supportedTokens[token] = false;
            
            // Remove from list (order doesn't matter)
            uint256 len = tokenList.length;
            for (uint256 i; i < len;) {
                if (tokenList[i] == token) {
                    tokenList[i] = tokenList[len - 1];
                    tokenList.pop();
                    break;
                }
                unchecked { ++i; }
            }
            
            emit TokenRemoved(token);
        }
    }
    
    /**
     * @notice Set deposit/withdrawal limits
     * @param _maxDeposit Max deposit per transaction (0 = no limit)
     * @param _maxWithdraw Max withdrawal per transaction (0 = no limit)
     */
    function setLimits(uint256 _maxDeposit, uint256 _maxWithdraw) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        maxDepositPerTx = _maxDeposit == 0 ? type(uint256).max : _maxDeposit;
        maxWithdrawPerTx = _maxWithdraw == 0 ? type(uint256).max : _maxWithdraw;
        emit LimitsUpdated(maxDepositPerTx, maxWithdrawPerTx);
    }
    
    /**
     * @notice Pause all operations (Guardian or Admin)
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause operations (Admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get user's balance for a specific token
     * @param token Token address
     * @param user User address
     * @return uint256 Balance
     */
    function getBalance(address token, address user) 
        external 
        view 
        returns (uint256) 
    {
        return balances[token][user];
    }
    
    /**
     * @notice Get all balances for a user
     * @param user User address
     * @return tokens Array of token addresses
     * @return amounts Array of balances
     */
    function getUserBalances(address user) 
        external 
        view 
        returns (address[] memory tokens, uint256[] memory amounts) 
    {
        uint256 len = tokenList.length;
        tokens = new address[](len);
        amounts = new uint256[](len);
        
        for (uint256 i; i < len;) {
            tokens[i] = tokenList[i];
            amounts[i] = balances[tokenList[i]][user];
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Check if a trade has been settled
     * @param tradeId Trade identifier
     * @return bool True if already settled
     */
    function isTradeSettled(bytes32 tradeId) external view returns (bool) {
        return settledTrades[tradeId];
    }
    
    /**
     * @notice Get count of supported tokens
     * @return uint256 Number of tokens
     */
    function tokenCount() external view returns (uint256) {
        return tokenList.length;
    }
}
