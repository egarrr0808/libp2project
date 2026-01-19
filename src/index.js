import { createNode } from './network/node.js'
import { setupEventListeners } from './network/events.js'
import { connectToPeer } from './network/connect.js'
import { MessageHandler } from './messages/handler.js'
import { KeyManager } from './crypto/keys.js'
import { MessageSigner } from './crypto/signing.js'
import { MessageStore } from './storage/messageStore.js'
import { PeerStore } from './storage/peerStore.js'
import { CLIInterface } from './ui/cli.js'
import { RateLimiter } from './security/ratelimit.js'
import { loadOrCreateProfile, subscribeToProfiles, announceLocalProfile } from './users/profile.js'
import { HistorySync } from './sync/history.js'
import { startAutoConnect } from './network/autoconnect.js'

async function main() {
  const keyManager = new KeyManager()
  await keyManager.initialize()

  const privateKey = keyManager.getPrivateKey()
  const publicKeyString = keyManager.getPublicKeyString()

  const localProfile = await loadOrCreateProfile(publicKeyString)

  const messageStore = new MessageStore()
  const peerStore = new PeerStore()

  const rateLimiter = new RateLimiter()

  const node = await createNode()

  const historySync = new HistorySync(node, messageStore)

  setupEventListeners(node, peerStore)

  const signer = new MessageSigner(privateKey)
  const messageHandler = new MessageHandler(node, signer, publicKeyString, messageStore, rateLimiter)

  await node.start()
  console.log('Node started with ID:', node.peerId.toString())
  console.log('Listening on:', node.getMultiaddrs().map(ma => ma.toString()))

  await historySync.start()

  // Start background auto-connect to remembered peers so the swarm
  // re-forms even if the original bootstrap server goes away.
  startAutoConnect(node, peerStore)

  await subscribeToProfiles(node, peerStore)
  await announceLocalProfile(node, localProfile)

  // Periodically re-announce our profile + addresses so that peers
  // that come online later (or reconnect) still learn how to dial us.
  const PROFILE_ANNOUNCE_INTERVAL = 60_000
  setInterval(() => {
    announceLocalProfile(node, localProfile).catch((err) => {
      console.warn('[profile] periodic announce failed', err?.message ?? err)
    })
  }, PROFILE_ANNOUNCE_INTERVAL)

  const cli = new CLIInterface(messageHandler, peerStore, localProfile, historySync)

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
