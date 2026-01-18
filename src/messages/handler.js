import { Message } from './protocol.js'
import { TOPIC } from '../network/node.js'

export class MessageHandler {
  constructor(node) {
    this.node = node
    this.receivedMessages = new Set()
  }

  async subscribe(onMessage) {
    this.node.services.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic !== TOPIC) return

      const msgData = new TextDecoder().decode(evt.detail.data)
      const message = Message.deserialize(msgData)

      if (this.receivedMessages.has(message.id)) return
      this.receivedMessages.add(message.id)

      onMessage(message)
    })

    await this.node.services.pubsub.subscribe(TOPIC)
  }

  async send(content) {
    const message = new Message(content, this.node.peerId.toString())
    const data = new TextEncoder().encode(message.serialize())

    await this.node.services.pubsub.publish(TOPIC, data)
  }
}
