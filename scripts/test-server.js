#!/usr/bin/env node

/**
 * Test script for FlashDEX backend server
 * Run: node scripts/test-server.js
 */

import WebSocket from 'ws'

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:3001/ws'
const HTTP_URL = process.env.HTTP_URL || 'http://localhost:3001'

console.log('🧪 FlashDEX Server Test')
console.log('========================\n')

// Test HTTP endpoints
async function testHTTP() {
  console.log('📡 Testing HTTP endpoints...\n')
  
  const endpoints = [
    '/health',
    '/api/prices',
    '/api/orderbook?pair=FETH/FUSDT',
    '/api/trades',
  ]
  
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${HTTP_URL}${endpoint}`)
      const data = await res.json()
      console.log(`✅ ${endpoint}`)
      console.log(`   Status: ${res.status}`)
      console.log(`   Data: ${JSON.stringify(data).slice(0, 100)}...`)
      console.log('')
    } catch (error) {
      console.log(`❌ ${endpoint}`)
      console.log(`   Error: ${error.message}`)
      console.log('')
    }
  }
}

// Test WebSocket
function testWebSocket() {
  return new Promise((resolve) => {
    console.log('🔌 Testing WebSocket...\n')
    
    const ws = new WebSocket(SERVER_URL)
    let messageCount = 0
    const maxMessages = 10
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected')
      
      // Send identify message
      ws.send(JSON.stringify({
        type: 'identify',
        payload: { address: '0xTest123', name: 'Test User' }
      }))
      
      // Request order book
      ws.send(JSON.stringify({
        type: 'get_orderbook',
        payload: { pair: 'FETH/FUSDT' }
      }))
      
      // Place a test order
      ws.send(JSON.stringify({
        type: 'place_order',
        payload: {
          pair: 'FETH/FUSDT',
          side: 'buy',
          price: 2450,
          amount: 0.1
        }
      }))
    })
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())
      messageCount++
      
      console.log(`📨 Message ${messageCount}: ${message.type}`)
      
      if (message.type === 'welcome') {
        console.log(`   User ID: ${message.payload.userId}`)
        console.log(`   Connected Users: ${message.payload.connectedUsers}`)
      }
      
      if (message.type === 'price_update') {
        console.log(`   FETH/FUSDT: $${message.payload.prices['FETH/FUSDT']?.toFixed(2)}`)
      }
      
      if (message.type === 'new_trade') {
        console.log(`   Trade: ${message.payload.side} ${message.payload.amount} @ $${message.payload.price}`)
      }
      
      if (message.type === 'order_result') {
        console.log(`   Order ID: ${message.payload.order?.id}`)
        console.log(`   Fills: ${message.payload.matched?.fills?.length || 0}`)
      }
      
      if (messageCount >= maxMessages) {
        console.log(`\n✅ Received ${messageCount} messages, closing...`)
        ws.close()
        resolve()
      }
    })
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket error: ${error.message}`)
      resolve()
    })
    
    ws.on('close', () => {
      console.log('🔌 WebSocket closed')
      resolve()
    })
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('\n⏱️ Timeout reached, closing...')
        ws.close()
      }
      resolve()
    }, 15000)
  })
}

// Run tests
async function main() {
  try {
    await testHTTP()
    await testWebSocket()
    
    console.log('\n========================')
    console.log('🎉 Tests completed!')
    console.log('========================\n')
  } catch (error) {
    console.error('Test error:', error)
  }
  
  process.exit(0)
}

main()
