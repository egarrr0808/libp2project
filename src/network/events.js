export function setupEventListeners(node, peerStore = null) {
  node.addEventListener('peer:discovery', (evt) => {
    const peerId = evt.detail.id?.toString?.() ?? evt.detail.toString()
    console.log('[discovery] Discovered peer:', peerId)
  })

  node.addEventListener('peer:connect', (evt) => {
    const peerId = evt.detail.id?.toString?.() ?? evt.detail.toString()
    console.log('[connect] Connected to:', peerId)

    if (peerStore) {
      void peerStore.savePeer(peerId, { status: 'connected' }).catch((err) => {
        console.warn('[peers] Failed to persist connected peer', peerId, err)
      })
    }
  })

  node.addEventListener('peer:disconnect', (evt) => {
    const peerId = evt.detail.id?.toString?.() ?? evt.detail.toString()
    console.log('[disconnect] Disconnected from:', peerId)

    if (peerStore) {
      void peerStore.savePeer(peerId, { status: 'disconnected' }).catch((err) => {
        console.warn('[peers] Failed to update peer on disconnect', peerId, err)
      })
    }
  })
}
