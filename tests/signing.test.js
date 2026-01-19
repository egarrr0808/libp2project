import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'

import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'

import { Message } from '../src/messages/protocol.js'
import { MessageSigner } from '../src/crypto/signing.js'

async function createSignedMessage(content) {
  const keypair = await generateKeyPair('Ed25519')
  const pubBytes = publicKeyToProtobuf(keypair.publicKey)
  const publicKeyString = Buffer.from(pubBytes).toString('base64')

  const message = new Message(content, 'peer123', publicKeyString)
  const signer = new MessageSigner(keypair)
  await signer.sign(message)

  return { message, keypair }
}

test('MessageSigner signs messages that verify successfully', async () => {
  const { message } = await createSignedMessage('hello')

  assert.ok(message.signature, 'signature should be set on message')

  const isValid = await MessageSigner.verify(message)
  assert.equal(isValid, true)
})

test('MessageSigner verification fails when message is tampered with', async () => {
  const { message } = await createSignedMessage('original')

  // Tamper with content
  message.content = 'tampered'

  const isValid = await MessageSigner.verify(message)
  assert.equal(isValid, false)
})
