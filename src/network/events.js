export function setupEventListeners(node, peerStore = null) {
  node.addEventListener('peer:discovery', (evt) => {
    const detail = evt.detail
    const peerId = detail.id?.toString?.() ?? detail.toString()
    console.log('[discovery] Discovered peer:', peerId)
  })

  node.addEventListener('peer:connect', (evt) => {
    const conn = evt.detail
    const peerId = conn.remotePeer?.toString?.() ?? conn.id?.toString?.() ?? conn.toString()
    console.log('[connect] Connected to:', peerId)

    const addrs = []
    if (conn.remoteAddr) {
      try {
        addrs.push(conn.remoteAddr.toString())
      } catch {
        // ignore
      }
    }

    if (peerStore) {
      void peerStore.savePeer(peerId, { status: 'connected', addresses: addrs }).catch((err) => {
        console.warn('[peers] Failed to persist connected peer', peerId, err)
      })
    }
  })

  node.addEventListener('peer:disconnect', (evt) => {
    const conn = evt.detail
    const peerId = conn.remotePeer?.toString?.() ?? conn.id?.toString?.() ?? conn.toString()
    console.log('[disconnect] Disconnected from:', peerId)

    if (peerStore) {
      void peerStore.savePeer(peerId, { status: 'disconnected' }).catch((err) => {
        console.warn('[peers] Failed to update peer on disconnect', peerId, err)
      })
    }
  })
}
