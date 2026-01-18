export class Message {
  constructor(content, senderId) {
    this.id = generateMessageId()
    this.timestamp = Date.now()
    this.senderId = senderId
    this.content = content
    this.signature = null
  }

  serialize() {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp,
      senderId: this.senderId,
      content: this.content,
      signature: this.signature
    })
  }

  static deserialize(data) {
    const obj = JSON.parse(data)
    const msg = new Message(obj.content, obj.senderId)
    msg.id = obj.id
    msg.timestamp = obj.timestamp
    msg.signature = obj.signature ?? null
    return msg
  }
}

function generateMessageId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  )
}
