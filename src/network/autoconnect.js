import { setInterval } from 'node:timers'
import { multiaddr } from '@multiformats/multiaddr'

/**
 * Periodically attempts to connect to peers remembered in PeerStore.
 *
 * Idea: everyone initially connects via a common server / bootstrap.
 * While connected, we learn each other's peer IDs (and the DHT learns
 * about us). Later, even if that server goes away, we can use the DHT
 * plus the stored peer IDs to reconnect directly or via other paths.
 */
export function startAutoConnect(node, peerStore, {
  intervalMs = 30_000,
  maxPeersPerInterval = 5
} = {}) {
  if (!peerStore) return

  const timer = setInterval(async () => {
    try {
      const peers = await peerStore.getAllPeers()
      if (!peers || peers.length === 0) return

      const connections = node.getConnections()
      const connectedIds = new Set(connections.map(c => c.remotePeer?.toString?.() ?? ''))

      let attempts = 0
      outer: for (const p of peers) {
        if (!p?.id || !Array.isArray(p.addresses) || p.addresses.length === 0) {
          continue
        }
        if (connectedIds.has(p.id)) continue

        for (const addrStr of p.addresses) {
          if (!addrStr) continue
          if (attempts >= maxPeersPerInterval) break outer

          try {
            console.log('[autoconnect] attempting', p.id, 'via', addrStr)
            await node.dial(multiaddr(addrStr))
            attempts++
            break
          } catch (err) {
            console.warn('[autoconnect] failed to dial', p.id, 'via', addrStr, err.message ?? err)
          }
        }
      }
    } catch (err) {
      console.warn('[autoconnect] error during auto-connect tick', err)
    }
  }, intervalMs)

  // Best-effort cleanup; process exit will clear timers anyway.
  // If libp2p emits "stop" we can listen to it, otherwise this is harmless.
  try {
    node.addEventListener?.('stop', () => clearInterval(timer))
  } catch {
    // ignore
  }
}
