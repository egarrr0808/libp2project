# Connecting From Another Device

> **TL;DR:** The current prototype keeps every peer inside one JVM process using the static `NetworkState`. That makes reasoning about DHT behavior easy, but means separate laptops/phones can’t see each other yet. This guide explains the gap and the steps needed to make true multi-device connectivity work.

## 1. Where We Are

| Layer | Current State | What’s Missing for Real Devices |
| --- | --- | --- |
| Identity | RSA keypairs via `CryptoUtils` | Export keys as libp2p-compatible keypairs (Secp256k1/Ed25519) |
| Discovery | Static `NetworkState` map | Kademlia DHT via `HostBuilder` + bootstrap peers |
| Transport | In-memory method calls | TCP/WebSocket transports so nodes can dial `/ip4/x.x.x.x/tcp/port/p2p/<peerId>` |
| PubSub | Gossip simulation | libp2p gossipsub for actual fan-out |
| Storage | JVM heap | On-device storage (file/LevelDB) to persist logs between restarts |

Because the “network” is an in-process singleton, two different machines will spawn distinct `NetworkState` instances that never talk. The fix is to replace the stubbed logic with live libp2p primitives.

## 2. Implementation Roadmap

1. **Introduce a real libp2p Host**
   - Use `HostBuilder` to configure TCP (and WebSockets if you need browsers), Noise/Secio for security, and mplex/yamux multiplexers.
   - Bind to a listening multiaddr (e.g., `/ip4/0.0.0.0/tcp/4001`).

2. **Persist PeerIds**
   - Store the generated private key on disk (`~/.peerchat/<peerId>.key`), so restarting a node keeps its identity.

3. **Bootstrap List**
   - Maintain a `peers.list` file (already present) containing multiaddrs of trusted friends. On startup, dial each address to join the DHT.

4. **DHT Integration**
   - Use `KademliaClient` to advertise your PeerId and to discover others.
   - Replace the static `NetworkState#registerPeer` lookups with DHT queries + libp2p connections.

5. **PubSub Wiring**
   - Replace `spreadGossipFrom` with libp2p’s `GossipSub` API. Subscribe to topics and publish messages using real transports.

6. **Offline Mailboxes**
   - Keep the existing queue semantics, but persist queue contents to disk or to a CRDT store per peer, so reconnecting devices can fetch what they missed.

Once those items are in place, the CLI commands below will work across physical devices.

## 3. Operating Across Devices (After Networking Upgrade)

1. **Build the jar on a trusted machine**
   ```bash
   mvn package
   scp build/peerchat-1.0-SNAPSHOT.jar user@laptop:/opt/peerchat/
   scp build/peerchat-1.0-SNAPSHOT.jar user@phone:/data/local/tmp/
   ```

2. **Prepare bootstrap list**
   - Edit `peers.list` to contain multiaddrs of the nodes you control:
     ```
     /ip4/192.168.1.10/tcp/4001/p2p/12D3KooWalpha
     /ip4/192.168.1.11/tcp/4001/p2p/12D3KooWbravo
     ```
   - Copy this file alongside the jar on every device (or host it remotely).

3. **Run the first node (bootstrap)**
   ```bash
   java -jar peerchat-1.0-SNAPSHOT.jar node --id alpha --listen /ip4/0.0.0.0/tcp/4001 --bootstrap-from-file peers.list
   ```
   - The first node ignores bootstrap entries pointing to itself; it simply starts listening.

4. **Run a second node from another laptop**
   ```bash
   java -jar peerchat-1.0-SNAPSHOT.jar node --id bravo --listen /ip4/0.0.0.0/tcp/4001 --bootstrap /ip4/192.168.1.10/tcp/4001/p2p/12D3KooWalpha
   ```
   - The CLI would parse the multiaddr, dial alpha, exchange PeerIds, and join the DHT/pubsub mesh.

5. **Mobile / Termux**
   - Install OpenJDK on Android via Termux.
   - Copy the jar + peers list, then run the same `node` command with a unique `--id` and `--bootstrap` pointing to reachable peers (typically via Wi‑Fi).

6. **Send traffic**
   - Direct message: `dm bravo "hey from alpha"`
   - Gossip topic: `pub crew-room "updates"` (once you add an interactive CLI loop)

## 4. Interim Option

While the networking work is ongoing, you can still demo multi-device behavior by:

1. Running the jar on Machine A with an exposed TCP port.
2. Starting additional peers on Machine A but exposing their behavior through REST/WebSocket endpoints so remote devices can proxy commands.
3. Once libp2p transport lands, strip the proxy layer and let each device run its own `NetworkNode`.

## 5. Security Checklist Before Real Use

- Replace demo RSA with Ed25519/Secp256k1 keys recognized by libp2p.
- Encrypt stored transcripts and mailboxes at rest.
- Add authentication for bootstrap lists (sign the contact sheet or fetch via HTTPS).
- Implement message expiry and CRDT compaction to avoid unbounded growth.

Following this plan will take the prototype from “single-process simulation” to a real distributed network where laptops and phones join the same gossip-backed chat without central servers.
