import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const PROFILE_TOPIC = '/p2p-chat/profile/1.0.0'

const PROFILE_PATH = path.join('data', 'profile.json')

export class UserProfile {
  constructor({ username, publicKey, bio = '', avatar = '' }) {
    this.username = username
    this.publicKey = publicKey
    this.bio = bio
    this.avatar = avatar
  }
}

export async function loadOrCreateProfile(publicKeyString) {
  const dir = path.dirname(PROFILE_PATH)
  await mkdir(dir, { recursive: true })

  if (existsSync(PROFILE_PATH)) {
    try {
      const raw = await readFile(PROFILE_PATH, 'utf8')
      const data = JSON.parse(raw)
      return new UserProfile(data)
    } catch {
      // fall through to create new profile
    }
  }

  const usernameEnv = process.env.P2P_USERNAME
  const username = usernameEnv && usernameEnv.trim().length > 0
    ? usernameEnv.trim()
    : `user-${publicKeyString.slice(0, 8)}`

  const profile = new UserProfile({ username, publicKey: publicKeyString })
  await writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf8')
  return profile
}

export async function announceLocalProfile(node, profile) {
  const addresses = node.getMultiaddrs().map(ma => ma.toString())

  const payload = JSON.stringify({
    peerId: node.peerId.toString(),
    profile,
    addresses
  })

  const data = new TextEncoder().encode(payload)

  // Ensure we are subscribed locally before publishing to avoid NoPeersSubscribedToTopic
  try {
    await node.services.pubsub.subscribe(PROFILE_TOPIC)
  } catch {
    // ignore if already subscribed
  }

  try {
    await node.services.pubsub.publish(PROFILE_TOPIC, data)
  } catch (err) {
    if (err.name === 'PublishError' && err.message.includes('No peers subscribed to topic')) {
      // Ignore if no peers are subscribed yet
      console.warn('[profile] No peers subscribed to profile topic yet')
    } else {
      console.warn('[profile] Failed to announce local profile', err)
    }
  }
}

export async function subscribeToProfiles(node, peerStore) {
  if (!peerStore) return

  node.services.pubsub.addEventListener('message', (evt) => {
    void (async () => {
      if (evt.detail.topic !== PROFILE_TOPIC) return

      const msg = new TextDecoder().decode(evt.detail.data)
      let decoded
      try {
        decoded = JSON.parse(msg)
      } catch (err) {
        console.warn('[profile] Failed to parse profile message', err)
        return
      }

      const peerId = decoded.peerId
      const profile = decoded.profile
      const addresses = Array.isArray(decoded.addresses) ? decoded.addresses : []
      if (!peerId || !profile) return

      try {
        await peerStore.savePeer(peerId, { profile, addresses })
      } catch (err) {
        console.warn('[profile] Failed to save profile for', peerId, err)
      }
    })()
  })

  await node.services.pubsub.subscribe(PROFILE_TOPIC)
}
