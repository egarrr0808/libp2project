import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { MessageStore } from '../src/storage/messageStore.js'

async function createTempDir(prefix) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  return base
}

test('MessageStore saves and retrieves messages', async () => {
  const tmpDir = await createTempDir('p2p-msgstore-')
  const dbPath = path.join(tmpDir, 'messages')
  const store = new MessageStore(dbPath)

  const message = {
    id: 'msg-1',
    timestamp: Date.now(),
    senderId: 'peer123',
    content: 'Hello from store test'
  }

  await store.saveMessage(message)

  const loaded = await store.getMessage(message.id)
  assert.deepEqual(loaded, message)

  const recent = await store.getRecentMessages(10)
  assert.ok(recent.length >= 1)

  await fs.rm(tmpDir, { recursive: true, force: true })
})
