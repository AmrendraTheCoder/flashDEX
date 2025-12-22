// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlashFaucet - Token Faucet for FlashDEX Testnet
 * @notice Distributes testnet tokens with rate limiting
 * @dev Optimized for gas with packed storage and unchecked increments
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard on claim function
 * - Rate limiting (24h cooldown per address)
 * - Owner-controlled token configuration
 * - Emergency pause capability
 * 
 * GAS OPTIMIZATIONS:
 * - Packed TokenConfig struct (address + uint96 = 32 bytes)
 * - Unchecked loop increments
 * - Memory caching in loops
 * - Single timestamp storage per user
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IFlashToken {
    function mint(address to, uint256 amount) external;
}

contract FlashFaucet is Ownable, ReentrancyGuard, Pausable {
    // ============ PACKED STORAGE ============
    
    /**
     * @dev TokenConfig is packed into a single 32-byte slot
     * - token: 20 bytes (160 bits)
     * - dripAmount: 12 bytes (96 bits) - supports up to ~79B tokens with 18 decimals
     */
    struct TokenConfig {
        address token;
        uint96 dripAmount;
    }
    
    // ============ STATE VARIABLES ============
    
    TokenConfig[] public tokens;
    mapping(address => uint256) public lastClaim;
    
    uint256 public constant COOLDOWN = 24 hours;
    uint256 public constant MAX_TOKENS = 10; // Prevent unbounded loop
    
    // ============ EVENTS ============
    
    event TokenAdded(address indexed token, uint96 dripAmount);
    event TokenRemoved(address indexed token);
    event DripAmountUpdated(address indexed token, uint96 oldAmount, uint96 newAmount);
    event Claimed(address indexed user, uint256 timestamp);
    
    // ============ ERRORS ============
    
    error CooldownNotExpired(uint256 timeRemaining);
    error TokenNotFound();
    error MaxTokensReached();
    error ZeroAddress();
    error ZeroAmount();
    
    // ============ CONSTRUCTOR ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Claim tokens from the faucet
     * @dev Rate-limited to once per 24 hours per address
     */
    function claim() external nonReentrant whenNotPaused {
        uint256 nextClaimTime = lastClaim[msg.sender] + COOLDOWN;
        if (block.timestamp < nextClaimTime) {
            revert CooldownNotExpired(nextClaimTime - block.timestamp);
        }
        
        // Update state before external calls (CEI pattern)
        lastClaim[msg.sender] = block.timestamp;
        
        // Mint all configured tokens to caller
        uint256 len = tokens.length;
        for (uint256 i; i < len;) {
            TokenConfig memory cfg = tokens[i];
            IFlashToken(cfg.token).mint(msg.sender, cfg.dripAmount);
            unchecked { ++i; }
        }
        
        emit Claimed(msg.sender, block.timestamp);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Check if an address can claim
     * @param user Address to check
     * @return bool True if user can claim now
     */
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaim[user] + COOLDOWN;
    }
    
    /**
     * @notice Get time remaining until next claim
     * @param user Address to check
     * @return uint256 Seconds until next claim (0 if claimable now)
     */
    function timeUntilClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaim[user] + COOLDOWN;
        return block.timestamp >= nextClaimTime ? 0 : nextClaimTime - block.timestamp;
    }
    
    /**
     * @notice Get all configured tokens and their drip amounts
     * @return TokenConfig[] Array of all token configurations
     */
    function getAllTokens() external view returns (TokenConfig[] memory) {
        return tokens;
    }
    
    /**
     * @notice Get the number of configured tokens
     * @return uint256 Number of tokens
     */
    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Add a new token to the faucet
     * @param token Token contract address (must implement mint)
     * @param amount Amount to drip per claim (with token decimals)
     */
    function addToken(address token, uint96 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (tokens.length >= MAX_TOKENS) revert MaxTokensReached();
        
        tokens.push(TokenConfig(token, amount));
        emit TokenAdded(token, amount);
    }
    
    /**
     * @notice Update drip amount for an existing token
     * @param token Token address to update
     * @param newAmount New drip amount
     */
    function updateDripAmount(address token, uint96 newAmount) external onlyOwner {
        if (newAmount == 0) revert ZeroAmount();
        
        uint256 len = tokens.length;
        for (uint256 i; i < len;) {
            if (tokens[i].token == token) {
                uint96 oldAmount = tokens[i].dripAmount;
                tokens[i].dripAmount = newAmount;
                emit DripAmountUpdated(token, oldAmount, newAmount);
                return;
            }
            unchecked { ++i; }
        }
        revert TokenNotFound();
    }
    
    /**
     * @notice Remove a token from the faucet
     * @param token Token address to remove
     */
    function removeToken(address token) external onlyOwner {
        uint256 len = tokens.length;
        for (uint256 i; i < len;) {
            if (tokens[i].token == token) {
                // Move last element to this position and pop
                tokens[i] = tokens[len - 1];
                tokens.pop();
                emit TokenRemoved(token);
                return;
            }
            unchecked { ++i; }
        }
        revert TokenNotFound();
    }
    
    /**
     * @notice Pause the faucet (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the faucet
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
