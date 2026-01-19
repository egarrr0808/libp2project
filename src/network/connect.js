import { multiaddr } from '@multiformats/multiaddr'

export async function connectToPeer(node, peerMultiaddr) {
  try {
    const ma = multiaddr(peerMultiaddr)
    console.log('[dial] Dialing', ma.toString())
    await node.dial(ma)
    console.log('[dial] Successfully connected')
  } catch (err) {
    console.error('[dial] Failed to connect:', err.message ?? err)
    throw err
  }
}
