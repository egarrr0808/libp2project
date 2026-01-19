import { Message } from '../messages/protocol.js'

export const HISTORY_TOPIC = '/p2p-chat/history/1.0.0'

function generateRequestId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  )
}

export class HistorySync {
  constructor(node, messageStore) {
    this.node = node
    this.messageStore = messageStore
    this.pending = new Map() // requestId -> { resolve, timeout }
  }

  async start() {
    this.node.services.pubsub.addEventListener('message', (evt) => {
      void (async () => {
        if (evt.detail.topic !== HISTORY_TOPIC) return

        const raw = new TextDecoder().decode(evt.detail.data)
        let payload
        try {
          payload = JSON.parse(raw)
        } catch (err) {
          console.warn('[history] Failed to parse history message', err)
          return
        }

        const { type } = payload
        if (type === 'request') {
          await this._handleRequest(payload)
        } else if (type === 'response') {
          await this._handleResponse(payload)
        }
      })()
    })

    await this.node.services.pubsub.subscribe(HISTORY_TOPIC)
  }

  async requestHistory(sinceTimestamp, limit, targetPeerId, timeoutMs = 5000) {
    const requestId = generateRequestId()

    const payload = {
      type: 'request',
      requestId,
      fromPeerId: this.node.peerId.toString(),
      targetPeerId,
      since: sinceTimestamp,
      limit
    }

    const data = new TextEncoder().encode(JSON.stringify(payload))
    const promise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        resolve([])
      }, timeoutMs)
      this.pending.set(requestId, { resolve, timeout })
    })

    await this.node.services.pubsub.publish(HISTORY_TOPIC, data)
    return promise
  }

  async _handleRequest(payload) {
    const myId = this.node.peerId.toString()
    if (payload.targetPeerId && payload.targetPeerId !== myId) return

    if (!this.messageStore) return

    const { requestId, fromPeerId, since, limit } = payload

    let messages = []
    try {
      messages = await this.messageStore.getRecentMessages(limit ?? 50)
      if (since) {
        messages = messages.filter(m => m.timestamp >= since)
      }
    } catch (err) {
      console.warn('[history] Failed to load messages for history request', err)
      return
    }

    const response = {
      type: 'response',
      requestId,
      fromPeerId: myId,
      targetPeerId: fromPeerId,
      messages
    }

    const data = new TextEncoder().encode(JSON.stringify(response))
    await this.node.services.pubsub.publish(HISTORY_TOPIC, data)
  }

  async _handleResponse(payload) {
    const myId = this.node.peerId.toString()
    if (payload.targetPeerId && payload.targetPeerId !== myId) return

    const entry = this.pending.get(payload.requestId)
    if (!entry) return

    this.pending.delete(payload.requestId)
    clearTimeout(entry.timeout)

    if (!this.messageStore) {
      entry.resolve(payload.messages ?? [])
      return
    }

    const messages = payload.messages ?? []
    for (const m of messages) {
      try {
        // Ensure they match the Message shape reasonably
        if (!m.id || !m.timestamp || !m.content) continue
        await this.messageStore.saveMessage(m)
      } catch (err) {
        console.warn('[history] Failed to persist synced message', m.id, err)
      }
    }

    entry.resolve(messages)
  }
}
