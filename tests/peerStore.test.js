import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { PeerStore } from '../src/storage/peerStore.js'

async function createTempDir(prefix) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  return base
}

test('PeerStore savePeer and getPeer work and track timestamps', async () => {
  const tmpDir = await createTempDir('p2p-peerstore-')
  const dbPath = path.join(tmpDir, 'peers')
  const store = new PeerStore(dbPath)

  const peerId = 'peer-123'
  const meta1 = { status: 'connected' }
  const saved1 = await store.savePeer(peerId, meta1)

  const loaded1 = await store.getPeer(peerId)
  assert.equal(loaded1.id, peerId)
  assert.equal(loaded1.status, 'connected')
  assert.ok(loaded1.firstSeen)
  assert.ok(loaded1.lastSeen)

  // Update with new metadata
  const meta2 = { status: 'disconnected' }
  const saved2 = await store.savePeer(peerId, meta2)

  assert.equal(saved2.id, peerId)
  assert.equal(saved2.status, 'disconnected')
  assert.equal(saved2.firstSeen, loaded1.firstSeen)
  assert.ok(saved2.lastSeen >= loaded1.lastSeen)

  const all = await store.getAllPeers()
  assert.equal(all.length, 1)

  await fs.rm(tmpDir, { recursive: true, force: true })
})
