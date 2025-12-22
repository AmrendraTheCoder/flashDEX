import type { Trade, Order } from '../types'

export const exportTradesToCSV = (trades: Trade[], filename = 'trades.csv') => {
  const headers = ['ID', 'Side', 'Price', 'Amount', 'Value', 'Buyer', 'Seller', 'Pair', 'Time']
  
  const rows = trades.map(t => [
    t.id,
    t.side,
    t.price.toFixed(2),
    t.amount.toFixed(6),
    (t.price * t.amount).toFixed(2),
    t.buyer,
    t.seller,
    t.pair,
    new Date(t.timestamp).toISOString()
  ])
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  downloadCSV(csv, filename)
}

export const exportOrdersToCSV = (orders: Order[], filename = 'orders.csv') => {
  const headers = ['ID', 'Side', 'Type', 'Price', 'Amount', 'Filled', 'Status', 'Pair', 'Time']
  
  const rows = orders.map(o => [
    o.id,
    o.side,
    o.type,
    o.price.toFixed(2),
    o.amount.toFixed(6),
    o.filledAmount.toFixed(6),
    o.status,
    o.pair,
    new Date(o.timestamp).toISOString()
  ])
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  downloadCSV(csv, filename)
}

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
