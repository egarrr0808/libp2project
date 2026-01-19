import { test } from 'node:test'
import assert from 'node:assert/strict'

import { Message } from '../src/messages/protocol.js'

test('Message serialize/deserialize roundtrip', () => {
  const original = new Message('Hello world', 'peer123', 'PUBLIC_KEY_STRING')

  const serialized = original.serialize()
  const deserialized = Message.deserialize(serialized)

  // Core fields should survive roundtrip
  assert.equal(deserialized.content, original.content)
  assert.equal(deserialized.senderId, original.senderId)
  assert.equal(deserialized.publicKey, original.publicKey)

  // ID and timestamp should be preserved, not regenerated
  assert.equal(deserialized.id, original.id)
  assert.equal(deserialized.timestamp, original.timestamp)
})
