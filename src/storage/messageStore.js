import { Level } from 'level'

export class MessageStore {
  constructor(dbPath = './data/messages') {
    this.db = new Level(dbPath, { valueEncoding: 'json' })
  }

  async saveMessage(message) {
    await this.db.put(message.id, message)
  }

  async getMessage(id) {
    try {
      return await this.db.get(id)
    } catch (err) {
      if (err.notFound) return null
      throw err
    }
  }

  async getRecentMessages(limit = 100) {
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
