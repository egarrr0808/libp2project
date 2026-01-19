import { Level } from 'level'

export class PeerStore {
  constructor(dbPath = './data/peers') {
    this.db = new Level(dbPath, { valueEncoding: 'json' })
    this._openPromise = null
  }

  async _ensureOpen() {
    if (!this._openPromise) {
      this._openPromise = this.db.open().catch((err) => {
        this._openPromise = null
        throw err
      })
    }
    await this._openPromise
  }

  async savePeer(peerId, metadata = {}) {
    await this._ensureOpen()
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
    await this._ensureOpen()
    try {
      return await this.db.get(peerId)
    } catch (err) {
      if (err.notFound) return null
      throw err
    }
  }

  async getAllPeers() {
    await this._ensureOpen()
    const peers = []
    for await (const [, value] of this.db.iterator()) {
      peers.push(value)
    }
    return peers
  }
}
