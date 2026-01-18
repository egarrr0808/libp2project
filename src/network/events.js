export function setupEventListeners(node) {
  node.addEventListener('peer:discovery', (evt) => {
    const peerId = evt.detail.id?.toString?.() ?? evt.detail.toString()
    console.log('[discovery] Discovered peer:', peerId)
  })

  node.addEventListener('peer:connect', (evt) => {
    const peerId = evt.detail.id?.toString?.() ?? evt.detail.toString()
    console.log('[connect] Connected to:', peerId)
  })

  node.addEventListener('peer:disconnect', (evt) => {
    const peerId = evt.detail.id?.toString?.() ?? evt.detail.toString()
    console.log('[disconnect] Disconnected from:', peerId)
  })
}
