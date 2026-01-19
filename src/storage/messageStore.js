import { Level } from 'level'

export class MessageStore {
  constructor(dbPath = './data/messages') {
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

  async saveMessage(message) {
    await this._ensureOpen()
    await this.db.put(message.id, message)
  }

  async getMessage(id) {
    await this._ensureOpen()
    try {
      return await this.db.get(id)
    } catch (err) {
      if (err.notFound) return null
      throw err
    }
  }

  async getRecentMessages(limit = 100) {
    await this._ensureOpen()
    const messages = []
    for await (const [, value] of this.db.iterator({ limit, reverse: true })) {
      messages.push(value)
    }
    return messages
  }

  async deleteOldMessages(beforeTimestamp) {
    const batch = this.db.batch()

    for await (const [key, value] of this.db.iterator()) {
      if (value.timestamp < beforeTimestamp) {
        batch.del(key)
      }
    }

    await batch.write()
  }
}
