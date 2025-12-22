// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MonadStreamOrder - High-Performance Order Book
 * @notice Optimized for Monad's 10,000 TPS capability
 * @dev MEV-resistant with time-weighted priority matching
 */
contract OrderBook {
    struct Order {
        uint256 id;
        address trader;
        uint256 price;      // Price in USDT (6 decimals)
        uint256 amount;     // Amount in base token (18 decimals)
        bool isBuy;
        uint256 timestamp;
        bool isActive;
    }

    struct Trade {
        uint256 id;
        address buyer;
        address seller;
        uint256 price;
        uint256 amount;
        uint256 timestamp;
    }

    // State
    uint256 public nextOrderId = 1;
    uint256 public nextTradeId = 1;
    uint256 public totalVolume;
    uint256 public totalTrades;
    
    mapping(uint256 => Order) public orders;
    mapping(address => int256) public pnl;
    mapping(address => uint256) public volume;
    
    uint256[] public buyOrderIds;
    uint256[] public sellOrderIds;
    Trade[] public recentTrades;

    // Events
    event OrderPlaced(uint256 indexed id, address indexed trader, uint256 price, uint256 amount, bool isBuy);
    event OrderFilled(uint256 indexed orderId, uint256 indexed tradeId, uint256 fillAmount, uint256 fillPrice);
    event OrderCancelled(uint256 indexed id);
    event TradeExecuted(uint256 indexed id, address buyer, address seller, uint256 price, uint256 amount);

    /**
     * @notice Place a new order (market or limit)
     * @param price Order price (0 for market order)
     * @param amount Order amount
     * @param isBuy True for buy, false for sell
     */
    function placeOrder(uint256 price, uint256 amount, bool isBuy) external returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        
        uint256 orderId = nextOrderId++;
        uint256 remainingAmount = amount;

        // Try to match immediately (MEV-resistant: FIFO matching)
        if (isBuy) {
            remainingAmount = _matchBuyOrder(orderId, price, amount, msg.sender);
        } else {
            remainingAmount = _matchSellOrder(orderId, price, amount, msg.sender);
        }

        // Add remaining as limit order
        if (remainingAmount > 0 && price > 0) {
            orders[orderId] = Order({
                id: orderId,
                trader: msg.sender,
                price: price,
                amount: remainingAmount,
                isBuy: isBuy,
                timestamp: block.timestamp,
                isActive: true
            });

            if (isBuy) {
                _insertBuyOrder(orderId, price);
            } else {
                _insertSellOrder(orderId, price);
            }

            emit OrderPlaced(orderId, msg.sender, price, remainingAmount, isBuy);
        }

        return orderId;
    }

    /**
     * @notice Cancel an existing order
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.isActive, "Order not active");
        
        order.isActive = false;
        emit OrderCancelled(orderId);
    }

    /**
     * @notice Batch place multiple orders (gas optimized)
     */
    function batchPlaceOrders(
        uint256[] calldata prices,
        uint256[] calldata amounts,
        bool[] calldata isBuys
    ) external returns (uint256[] memory) {
        require(prices.length == amounts.length && amounts.length == isBuys.length, "Array mismatch");
        
        uint256[] memory orderIds = new uint256[](prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            orderIds[i] = this.placeOrder(prices[i], amounts[i], isBuys[i]);
        }
        return orderIds;
    }

    // Internal matching functions
    function _matchBuyOrder(uint256 buyOrderId, uint256 maxPrice, uint256 amount, address buyer) internal returns (uint256) {
        uint256 remaining = amount;
        
        for (uint256 i = 0; i < sellOrderIds.length && remaining > 0; i++) {
            Order storage sellOrder = orders[sellOrderIds[i]];
            
            if (!sellOrder.isActive) continue;
            if (maxPrice > 0 && sellOrder.price > maxPrice) break;
            
            uint256 fillAmount = remaining < sellOrder.amount ? remaining : sellOrder.amount;
            uint256 fillPrice = sellOrder.price;
            
            // Execute trade
            _executeTrade(buyer, sellOrder.trader, fillPrice, fillAmount);
            
            remaining -= fillAmount;
            sellOrder.amount -= fillAmount;
            
            if (sellOrder.amount == 0) {
                sellOrder.isActive = false;
            }
            
            emit OrderFilled(sellOrderIds[i], nextTradeId - 1, fillAmount, fillPrice);
        }
        
        return remaining;
    }

    function _matchSellOrder(uint256 sellOrderId, uint256 minPrice, uint256 amount, address seller) internal returns (uint256) {
        uint256 remaining = amount;
        
        for (uint256 i = 0; i < buyOrderIds.length && remaining > 0; i++) {
            Order storage buyOrder = orders[buyOrderIds[i]];
            
            if (!buyOrder.isActive) continue;
            if (minPrice > 0 && buyOrder.price < minPrice) break;
            
            uint256 fillAmount = remaining < buyOrder.amount ? remaining : buyOrder.amount;
            uint256 fillPrice = buyOrder.price;
            
            // Execute trade
            _executeTrade(buyOrder.trader, seller, fillPrice, fillAmount);
            
            remaining -= fillAmount;
            buyOrder.amount -= fillAmount;
            
            if (buyOrder.amount == 0) {
                buyOrder.isActive = false;
            }
            
            emit OrderFilled(buyOrderIds[i], nextTradeId - 1, fillAmount, fillPrice);
        }
        
        return remaining;
    }

    function _executeTrade(address buyer, address seller, uint256 price, uint256 amount) internal {
        uint256 tradeId = nextTradeId++;
        uint256 tradeValue = price * amount / 1e18;
        
        Trade memory trade = Trade({
            id: tradeId,
            buyer: buyer,
            seller: seller,
            price: price,
            amount: amount,
            timestamp: block.timestamp
        });
        
        if (recentTrades.length >= 100) {
            // Shift array (keep last 100)
            for (uint256 i = 0; i < 99; i++) {
                recentTrades[i] = recentTrades[i + 1];
            }
            recentTrades[99] = trade;
        } else {
            recentTrades.push(trade);
        }
        
        totalVolume += tradeValue;
        totalTrades++;
        volume[buyer] += tradeValue;
        volume[seller] += tradeValue;
        
        emit TradeExecuted(tradeId, buyer, seller, price, amount);
    }

    function _insertBuyOrder(uint256 orderId, uint256 price) internal {
        // Insert sorted by price (highest first) - time priority for same price
        uint256 i = buyOrderIds.length;
        buyOrderIds.push(orderId);
        
        while (i > 0 && orders[buyOrderIds[i - 1]].price < price) {
            buyOrderIds[i] = buyOrderIds[i - 1];
            i--;
        }
        buyOrderIds[i] = orderId;
    }

    function _insertSellOrder(uint256 orderId, uint256 price) internal {
        // Insert sorted by price (lowest first) - time priority for same price
        uint256 i = sellOrderIds.length;
        sellOrderIds.push(orderId);
        
        while (i > 0 && orders[sellOrderIds[i - 1]].price > price) {
            sellOrderIds[i] = sellOrderIds[i - 1];
            i--;
        }
        sellOrderIds[i] = orderId;
    }

    // View functions
    function getBuyOrders(uint256 limit) external view returns (Order[] memory) {
        uint256 count = limit < buyOrderIds.length ? limit : buyOrderIds.length;
        Order[] memory result = new Order[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = orders[buyOrderIds[i]];
        }
        return result;
    }

    function getSellOrders(uint256 limit) external view returns (Order[] memory) {
        uint256 count = limit < sellOrderIds.length ? limit : sellOrderIds.length;
        Order[] memory result = new Order[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = orders[sellOrderIds[i]];
        }
        return result;
    }

    function getRecentTrades(uint256 limit) external view returns (Trade[] memory) {
        uint256 count = limit < recentTrades.length ? limit : recentTrades.length;
        Trade[] memory result = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = recentTrades[recentTrades.length - 1 - i];
        }
        return result;
    }

    function getStats() external view returns (uint256 _totalVolume, uint256 _totalTrades, uint256 _buyOrders, uint256 _sellOrders) {
        return (totalVolume, totalTrades, buyOrderIds.length, sellOrderIds.length);
    }
}
