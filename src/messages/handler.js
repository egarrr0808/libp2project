import { Message } from './protocol.js'
import { TOPIC } from '../network/node.js'
import { MessageSigner } from '../crypto/signing.js'

export class MessageHandler {
  constructor(node, signer, localPublicKey, messageStore = null, rateLimiter = null) {
    this.node = node
    this.signer = signer
    this.localPublicKey = localPublicKey
    this.messageStore = messageStore
    this.rateLimiter = rateLimiter
    this.receivedMessages = new Set()
  }

  async subscribe(onMessage) {
    this.node.services.pubsub.addEventListener('message', (evt) => {
      void (async () => {
        if (evt.detail.topic !== TOPIC) return

        const msgData = new TextDecoder().decode(evt.detail.data)
        const message = Message.deserialize(msgData)

        if (this.receivedMessages.has(message.id)) return

        if (this.rateLimiter) {
          const senderKey = message.senderId ?? 'unknown'
          if (!this.rateLimiter.canSend(senderKey)) {
            console.warn('[msg] Rate limit exceeded for peer', senderKey)
            return
          }
        }

        const isValid = await MessageSigner.verify(message)
        if (!isValid) {
          console.warn('[msg] Dropping message with invalid signature', message.id)
          return
        }

        this.receivedMessages.add(message.id)

        if (this.messageStore) {
          try {
            await this.messageStore.saveMessage(message)
          } catch (err) {
            console.warn('[msg] Failed to persist message', message.id, err)
          }
        }

        onMessage(message)
      })()
    })

    await this.node.services.pubsub.subscribe(TOPIC)
  }

  async send(content) {
    const senderId = this.node.peerId.toString()

    if (this.rateLimiter && !this.rateLimiter.canSend(senderId)) {
      console.warn('[msg] Local rate limit exceeded, dropping message')
      return
    }

    const message = new Message(
      content,
      senderId,
      this.localPublicKey ?? null
    )

    if (this.signer) {
      await this.signer.sign(message)
    }

    if (this.messageStore) {
      try {
        await this.messageStore.saveMessage(message)
      } catch (err) {
        console.warn('[msg] Failed to persist outbound message', message.id, err)
      }
    }

    const data = new TextEncoder().encode(message.serialize())
    try {
      await this.node.services.pubsub.publish(TOPIC, data)
    } catch (err) {
      console.warn('[msg] Failed to publish message', message.id, err)
    }
  }
}
