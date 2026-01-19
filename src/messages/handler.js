import { Message } from './protocol.js'
import { TOPIC } from '../network/node.js'
import { MessageSigner } from '../crypto/signing.js'

export class MessageHandler {
  constructor(node, signer, localPublicKey, messageStore = null) {
    this.node = node
    this.signer = signer
    this.localPublicKey = localPublicKey
    this.messageStore = messageStore
    this.receivedMessages = new Set()
  }

  async subscribe(onMessage) {
    this.node.services.pubsub.addEventListener('message', (evt) => {
      void (async () => {
        if (evt.detail.topic !== TOPIC) return

        const msgData = new TextDecoder().decode(evt.detail.data)
        const message = Message.deserialize(msgData)

        if (this.receivedMessages.has(message.id)) return

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
    const message = new Message(
      content,
      this.node.peerId.toString(),
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
    await this.node.services.pubsub.publish(TOPIC, data)
  }
}
