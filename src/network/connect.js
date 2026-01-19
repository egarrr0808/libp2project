import { multiaddr } from '@multiformats/multiaddr'

const RELAY_ADDR =
  process.env.P2P_RELAY_ADDR ??
  process.env.P2P_SERVER_MULTIADDR ??
  '/ip4/207.127.93.169/tcp/4001/p2p/12D3KooWFT6CyLNmfdLf4QZkz9DGj9Yry1TJ3dQx4KM7GZzpn7DA'

export async function connectToPeer(node, peerMultiaddr) {
  try {
    const ma = multiaddr(peerMultiaddr)
    console.log('[dial] Dialing', ma.toString())
    await node.dial(ma)
    console.log('[dial] Successfully connected')
  } catch (err) {
    console.error('[dial] Failed to connect:', err.message ?? err)

    if (RELAY_ADDR) {
      try {
        const targetMa = multiaddr(peerMultiaddr)
        const targetPeerId = targetMa.getPeerId?.()
        if (targetPeerId) {
          const relayMa = multiaddr(
            `${RELAY_ADDR.replace(/\/$/, '')}/p2p-circuit/p2p/${targetPeerId}`
          )
          console.log('[dial] Attempting relay via', relayMa.toString())
          await node.dial(relayMa)
          console.log('[dial] Connected via relay')
          return
        }
      } catch (relayErr) {
        console.error('[dial] Relay fallback failed:', relayErr.message ?? relayErr)
      }
    }

    throw err
  }
}
