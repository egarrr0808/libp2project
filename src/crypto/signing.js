import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { Buffer } from 'node:buffer'

function encodeMessageForSigning(message) {
  const payload = JSON.stringify({
    id: message.id,
    timestamp: message.timestamp,
    senderId: message.senderId,
    content: message.content
  })
  return new TextEncoder().encode(payload)
}

export class MessageSigner {
  constructor(privateKey) {
    this.privateKey = privateKey
  }

  async sign(message) {
    const data = encodeMessageForSigning(message)
    const signature = await this.privateKey.sign(data)
    message.signature = Buffer.from(signature).toString('base64')
    return message.signature
  }

  static async verify(message) {
    if (!message.signature || !message.publicKey) {
      return false
    }

    try {
      const data = encodeMessageForSigning(message)
      const publicKeyBytes = Buffer.from(message.publicKey, 'base64')
      const publicKey = publicKeyFromProtobuf(publicKeyBytes)
      const signatureBytes = Buffer.from(message.signature, 'base64')

      return await publicKey.verify(data, signatureBytes)
    } catch (err) {
      console.warn('[sign] Failed to verify message', err)
      return false
    }
  }
}
