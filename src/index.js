import { createNode } from './network/node.js'
import { setupEventListeners } from './network/events.js'
import { connectToPeer } from './network/connect.js'
import { MessageHandler } from './messages/handler.js'
import { KeyManager } from './crypto/keys.js'
import { MessageSigner } from './crypto/signing.js'
import { MessageStore } from './storage/messageStore.js'
import { PeerStore } from './storage/peerStore.js'
import { CLIInterface } from './ui/cli.js'

async function main() {
  const keyManager = new KeyManager()
  await keyManager.initialize()

  const privateKey = keyManager.getPrivateKey()
  const publicKeyString = keyManager.getPublicKeyString()

  const messageStore = new MessageStore()
  const peerStore = new PeerStore()

  const node = await createNode()

  setupEventListeners(node, peerStore)

  const signer = new MessageSigner(privateKey)
  const messageHandler = new MessageHandler(node, signer, publicKeyString, messageStore)

  await node.start()
  console.log('Node started with ID:', node.peerId.toString())
  console.log('Listening on:', node.getMultiaddrs().map(ma => ma.toString()))

  const cli = new CLIInterface(messageHandler, peerStore)

  await messageHandler.subscribe((message) => {
    cli.displayMessage(message)
  })

  await cli.start()

  if (process.argv[2]) {
    await connectToPeer(node, process.argv[2])
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
