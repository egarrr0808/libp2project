import { Level } from 'level'

export class PeerStore {
  constructor(dbPath = './data/peers') {
    this.db = new Level(dbPath, { valueEncoding: 'json' })
  }

  async savePeer(peerId, metadata = {}) {
    const now = Date.now()
    const existing = await this.getPeer(peerId)

    const value = {
      id: peerId,
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
      ...existing,
      ...metadata
    }

    await this.db.put(peerId, value)
    return value
  }

  async getPeer(peerId) {
    try {
      return await this.db.get(peerId)
    } catch (err) {
      if (err.notFound) return null
      throw err
    }
  }

  async getAllPeers() {
    const peers = []
    for await (const [, value] of this.db.iterator()) {
      peers.push(value)
    }
    return peers
  }
}
