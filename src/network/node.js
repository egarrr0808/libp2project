import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { identify } from '@libp2p/identify'
import { bootstrap } from '@libp2p/bootstrap'
import { multiaddr } from '@multiformats/multiaddr'

export const TOPIC = '/p2p-chat/1.0.0'

const LISTEN_PORT = Number(process.env.P2P_PORT ?? '0')

const DEFAULT_SERVER_MULTIADDR = process.env.P2P_SERVER_MULTIADDR || null

const BOOTSTRAP_NODES = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmZMxNdpMkewiVZLMpRwoqLFBLFEJT9J7amo4fm8h8f9kS',
  DEFAULT_SERVER_MULTIADDR
].filter(Boolean)

export async function createNode() {
  const node = await createLibp2p({
    addresses: { listen: [multiaddr(`/ip4/0.0.0.0/tcp/${LISTEN_PORT}`)] },
    transports: [
      tcp()
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [
      bootstrap({
        list: BOOTSTRAP_NODES
      })
    ],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        emitSelf: false,
        allowPublishToZeroPeers: true
      })
    }
  })

  return node
}
