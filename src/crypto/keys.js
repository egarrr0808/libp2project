import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { Buffer } from 'node:buffer'

export class KeyManager {
  constructor() {
    this.privateKey = null
  }

  async initialize() {
    this.privateKey = await generateKeyPair('Ed25519')
  }

  ensureInitialized() {
    if (!this.privateKey) {
      throw new Error('KeyManager not initialized, call initialize() first')
    }
  }

  getPrivateKey() {
    this.ensureInitialized()
    return this.privateKey
  }

  getPublicKeyString() {
    this.ensureInitialized()
    // IMPORTANT: verifier uses publicKeyFromProtobuf, so we must send protobuf bytes here
    const pubBytes = publicKeyToProtobuf(this.privateKey.publicKey)
    return Buffer.from(pubBytes).toString('base64')
  }
}
