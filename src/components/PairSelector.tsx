import { useOrderBookStore } from '../store/orderBookStore'

export function PairSelector() {
  const { pairs, currentPair, setCurrentPair } = useOrderBookStore()

  return (
    <div className="pair-selector">
      {pairs.map(pair => (
        <button
          key={pair.symbol}
          className={`pair-btn ${currentPair.symbol === pair.symbol ? 'active' : ''}`}
          onClick={() => setCurrentPair(pair.symbol)}
        >
          <span className="pair-symbol">{pair.symbol}</span>
          <span className="pair-price">${pair.basePrice.toLocaleString()}</span>
          <span className={`pair-change ${pair.change24h >= 0 ? 'positive' : 'negative'}`}>
            {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
          </span>
        </button>
      ))}
    </div>
  )
}
