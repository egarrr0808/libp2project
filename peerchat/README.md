# Peerchat Prototype Overview

## Purpose

This repo holds a JVM-based libp2p-inspired chat prototype. It demonstrates:

- **Peer discovery** via a DHT-like directory (`NetworkNode.NetworkState`)
- **Direct encrypted messaging** using ephemeral RSA identities
- **Gossip-based pubsub** for group chat resilience
- **Offline delivery** via per-peer mailboxes
- **State sync** where newcomers pull missed history from neighbors

## Core Components

| File | Role |
| ---- | ---- |
| `App.java` | CLI entrypoint; launches demo peers or a single long-running node |
| `NetworkNode.java` | Implements identity, gossip fan-out, offline queues, and history sync |
| `ChatProtocol.java` | Handles message serialization and logs incoming traffic |
| `Message.java` | Data model with IDs, payload helpers, and type metadata |
| `CryptoUtils.java` | Local RSA key + signature helper functions |

### Lifecycle

1. **Node start (`NetworkNode#start`)**
   - Generate RSA pair via `CryptoUtils`
   - Register with the shared `NetworkState` (simulated DHT)
   - Connect to bootstrap peers (IDs passed in)
   - Drain any offline messages queued in `NetworkState`

2. **Direct messaging (`sendDirectMessage`)**
   - Build `Message.direct`, sign payload, append locally
   - Immediate delivery if the recipient runs; otherwise queued in `offlineMessages`

3. **Group messaging (`publishToTopic`)**
   - Auto-subscribe to topic (pubsub join)
   - Sign & append message, record self as delivered
   - `NetworkState#spreadGossipFrom` picks up to 3 subscribers, avoiding duplicates, and relays
   - Each receiving peer repeats verification, dedupe, logging, and further gossip

4. **Offline sync**
   - When a peer comes online, `drainOfflineMessages` replays its mailbox
   - `requestHistoryFromNeighbors` asks a few peers for recent logs, merges by timestamp, and stores them CRDT-style (no conflict because payloads are immutable)

## Demo Flow

Run `java -jar build/peerchat-1.0-SNAPSHOT.jar demo` to see:

1. `alpha`, `bravo`, `charlie` start automatically; `delta` is offline.
2. Alpha/bravo exchange direct messages; delta receives buffered ones later.
3. Gossip fan-out is showcased when each peer talks on `crew-room`.
4. Delta starts late, subscribes, requests history from neighbors, and prints the recovered timeline.

No real network sockets are used yet—`NetworkState` is a static in-memory singleton to keep everything local while proving the architecture.

## Build & Run

```bash
mvn -o package             # produces build/peerchat-1.0-SNAPSHOT.jar
java -jar build/peerchat-1.0-SNAPSHOT.jar demo
```

For a single node:

```bash
java -jar build/peerchat-1.0-SNAPSHOT.jar node --id alice --bootstrap bob,charlie
```

## Next Steps

1. Swap `NetworkState` with real libp2p Host + Kademlia DHT.
2. Replace RSA-in-code with libp2p keypair handling + multiaddrs.
3. Wire gossip to libp2p’s gossipsub and persist CRDT state to disk.
4. Add a CLI/GUI for interactive typing instead of scripted demo events.
