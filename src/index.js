import { createNode } from './network/node.js'
import { setupEventListeners } from './network/events.js'
import { connectToPeer } from './network/connect.js'
import { MessageHandler } from './messages/handler.js'

async function main() {
  const node = await createNode()
  setupEventListeners(node)

  const messageHandler = new MessageHandler(node)

  await node.start()
  console.log('Node started with ID:', node.peerId.toString())
  console.log('Listening on:', node.getMultiaddrs().map(ma => ma.toString()))

  await messageHandler.subscribe((message) => {
    console.log(
      `[msg] ${new Date(message.timestamp).toLocaleTimeString()} ` +
      `${message.senderId.slice(0, 8)}: ${message.content}`
    )
  })

  process.stdin.on('data', async (data) => {
    const text = data.toString().trim()
    if (text) {
      await messageHandler.send(text)
    }
  })

  if (process.argv[2]) {
    await connectToPeer(node, process.argv[2])
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})