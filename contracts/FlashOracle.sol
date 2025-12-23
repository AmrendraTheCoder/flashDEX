// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlashOracle - Price Feed Oracle for FlashDEX
 * @notice Unified price feed interface with Chainlink compatibility
 * @dev Supports both Chainlink aggregators and manual price updates
 * 
 * ARCHITECTURE:
 * This oracle provides price feeds for the DEX with:
 * - Primary: Chainlink aggregator integration
 * - Fallback: Manual admin-controlled prices (for testnet)
 * - Staleness checks for data validity
 * 
 * SECURITY FEATURES:
 * - Price staleness validation
 * - Owner-only configuration
 * - Chainlink round validation
 * 
 * GAS OPTIMIZATIONS:
 * - Packed PriceFeed struct (fits in 2 storage slots)
 * - bytes32 hash for pair lookup vs string storage
 * - Memory caching in view functions
 */

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Interface for Chainlink price feeds
 */
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

contract FlashOracle is Ownable {
    // ============ PACKED STORAGE ============
    
    /**
     * @dev PriceFeed struct packed into 2 storage slots
     * Slot 1: aggregator (20 bytes) + decimals (1 byte) + useChainlink (1 byte) + padding
     * Slot 2: manualPrice (16 bytes) + lastUpdate (8 bytes)
     */
    struct PriceFeed {
        address aggregator;     // Chainlink aggregator address (0 if manual)
        uint8 decimals;         // Price decimals
        bool useChainlink;      // Whether to use Chainlink
        uint128 manualPrice;    // Fallback manual price (supports up to ~340B with 18 decimals)
        uint64 lastUpdate;      // Last update timestamp
    }
    
    // ============ STATE VARIABLES ============
    
    /// @notice Price feeds by pair symbol hash
    mapping(bytes32 => PriceFeed) public feeds;
    
    /// @notice All registered pair hashes (for enumeration)
    bytes32[] public pairHashes;
    
    /// @notice Pair hash to human-readable symbol
    mapping(bytes32 => string) public pairSymbols;
    
    /// @notice Maximum age for valid price data
    uint256 public stalenessThreshold = 1 hours;
    
    // ============ EVENTS ============
    
    event FeedConfigured(
        bytes32 indexed pairHash, 
        string pair, 
        address aggregator, 
        bool useChainlink
    );
    event PriceUpdated(
        bytes32 indexed pairHash, 
        uint256 price, 
        uint256 timestamp
    );
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    // ============ ERRORS ============
    
    error InvalidPrice();
    error StalePrice();
    error FeedNotConfigured();
    error ZeroAddress();
    
    // ============ CONSTRUCTOR ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Configure a price feed for a trading pair
     * @param pair Trading pair symbol (e.g., "ETH/USDT")
     * @param aggregator Chainlink aggregator address (or 0x0 for manual)
     * @param decimals_ Price decimals
     * @param useChainlink Whether to use Chainlink or manual prices
     */
    function configureFeed(
        string calldata pair,
        address aggregator,
        uint8 decimals_,
        bool useChainlink
    ) external onlyOwner {
        if (useChainlink && aggregator == address(0)) revert ZeroAddress();
        
        bytes32 pairHash = keccak256(bytes(pair));
        
        // Check if this is a new pair
        if (feeds[pairHash].lastUpdate == 0) {
            pairHashes.push(pairHash);
            pairSymbols[pairHash] = pair;
        }
        
        feeds[pairHash] = PriceFeed({
            aggregator: aggregator,
            decimals: decimals_,
            useChainlink: useChainlink,
            manualPrice: 0,
            lastUpdate: uint64(block.timestamp)
        });
        
        emit FeedConfigured(pairHash, pair, aggregator, useChainlink);
    }
    
    /**
     * @notice Set manual price for a trading pair
     * @param pair Trading pair symbol
     * @param price Price value (with configured decimals)
     */
    function setManualPrice(string calldata pair, uint128 price) external onlyOwner {
        bytes32 pairHash = keccak256(bytes(pair));
        PriceFeed storage feed = feeds[pairHash];
        
        if (feed.lastUpdate == 0) revert FeedNotConfigured();
        
        feed.manualPrice = price;
        feed.lastUpdate = uint64(block.timestamp);
        
        emit PriceUpdated(pairHash, price, block.timestamp);
    }
    
    /**
     * @notice Batch update manual prices
     * @param pairs Array of pair symbols
     * @param prices Array of prices
     */
    function batchSetManualPrices(
        string[] calldata pairs,
        uint128[] calldata prices
    ) external onlyOwner {
        uint256 len = pairs.length;
        require(len == prices.length, "Array mismatch");
        
        for (uint256 i; i < len;) {
            bytes32 pairHash = keccak256(bytes(pairs[i]));
            PriceFeed storage feed = feeds[pairHash];
            
            if (feed.lastUpdate > 0) {
                feed.manualPrice = prices[i];
                feed.lastUpdate = uint64(block.timestamp);
                emit PriceUpdated(pairHash, prices[i], block.timestamp);
            }
            
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Update staleness threshold
     * @param newThreshold New threshold in seconds
     */
    function setStalenessThreshold(uint256 newThreshold) external onlyOwner {
        emit StalenessThresholdUpdated(stalenessThreshold, newThreshold);
        stalenessThreshold = newThreshold;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get the current price for a trading pair
     * @param pair Trading pair symbol
     * @return price Current price
     * @return updatedAt Last update timestamp
     */
    function getPrice(string calldata pair) 
        external 
        view 
        returns (uint256 price, uint256 updatedAt) 
    {
        bytes32 pairHash = keccak256(bytes(pair));
        PriceFeed memory feed = feeds[pairHash];
        
        if (feed.lastUpdate == 0) revert FeedNotConfigured();
        
        if (feed.useChainlink && feed.aggregator != address(0)) {
            return _getChainlinkPrice(feed.aggregator);
        }
        
        return (uint256(feed.manualPrice), uint256(feed.lastUpdate));
    }
    
    /**
     * @notice Get price with validity check
     * @param pair Trading pair symbol
     * @return price Current price
     * @return updatedAt Last update timestamp
     * @return isValid True if price is fresh and valid
     */
    function getPriceWithValidity(string calldata pair) 
        external 
        view 
        returns (uint256 price, uint256 updatedAt, bool isValid) 
    {
        bytes32 pairHash = keccak256(bytes(pair));
        PriceFeed memory feed = feeds[pairHash];
        
        if (feed.lastUpdate == 0) {
            return (0, 0, false);
        }
        
        if (feed.useChainlink && feed.aggregator != address(0)) {
            (price, updatedAt) = _getChainlinkPrice(feed.aggregator);
        } else {
            price = uint256(feed.manualPrice);
            updatedAt = uint256(feed.lastUpdate);
        }
        
        isValid = block.timestamp - updatedAt <= stalenessThreshold && price > 0;
    }
    
    /**
     * @notice Get price by pair hash (more gas efficient)
     * @param pairHash Keccak256 hash of pair symbol
     * @return price Current price
     * @return updatedAt Last update timestamp
     */
    function getPriceByHash(bytes32 pairHash) 
        external 
        view 
        returns (uint256 price, uint256 updatedAt) 
    {
        PriceFeed memory feed = feeds[pairHash];
        
        if (feed.lastUpdate == 0) revert FeedNotConfigured();
        
        if (feed.useChainlink && feed.aggregator != address(0)) {
            return _getChainlinkPrice(feed.aggregator);
        }
        
        return (uint256(feed.manualPrice), uint256(feed.lastUpdate));
    }
    
    /**
     * @notice Get all configured pairs
     * @return symbols Array of pair symbols
     * @return prices Array of current prices
     */
    function getAllPrices() 
        external 
        view 
        returns (string[] memory symbols, uint256[] memory prices) 
    {
        uint256 len = pairHashes.length;
        symbols = new string[](len);
        prices = new uint256[](len);
        
        for (uint256 i; i < len;) {
            bytes32 pairHash = pairHashes[i];
            symbols[i] = pairSymbols[pairHash];
            
            PriceFeed memory feed = feeds[pairHash];
            if (feed.useChainlink && feed.aggregator != address(0)) {
                (prices[i],) = _getChainlinkPrice(feed.aggregator);
            } else {
                prices[i] = uint256(feed.manualPrice);
            }
            
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Get feed configuration for a pair
     * @param pair Trading pair symbol
     * @return feed PriceFeed struct
     */
    function getFeedConfig(string calldata pair) 
        external 
        view 
        returns (PriceFeed memory feed) 
    {
        return feeds[keccak256(bytes(pair))];
    }
    
    /**
     * @notice Get number of configured feeds
     * @return uint256 Number of feeds
     */
    function feedCount() external view returns (uint256) {
        return pairHashes.length;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Fetch price from Chainlink aggregator
     * @notice Includes comprehensive validation for data freshness and validity
     */
    function _getChainlinkPrice(address aggregator) 
        internal 
        view 
        returns (uint256, uint256) 
    {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = AggregatorV3Interface(aggregator).latestRoundData();
        
        // Validate round data
        if (answer <= 0) revert InvalidPrice();
        if (updatedAt == 0) revert StalePrice(); // Extra safety check
        if (answeredInRound < roundId) revert StalePrice();
        if (block.timestamp - updatedAt > stalenessThreshold) revert StalePrice();
        
        return (uint256(answer), updatedAt);
    }
}
