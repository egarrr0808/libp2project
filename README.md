# libp2project

Self-contained libp2p chat node with message storage, history sync, peer profiles, and optional relay support.

## Quick start

```bash
npm install
npm start
```

Use the built-in CLI commands:

- `/peers` – list known peers
- `/profiles` – show any announced peer profiles
- `/profile` – show your local profile
- `/history` – print recent locally stored messages
- `/sync` – request recent history from a connected peer (last 5 minutes)
- `/quit` – exit the node cleanly

## Environment variables

| Variable | Description |
| --- | --- |
| `P2P_PORT` | Port to listen on (default random) |
| `P2P_USERNAME` | Override default username for profile announcements |
| `P2P_SERVER_MULTIADDR` | Multiaddr for your bootstrap/infra node (defaults to the Oracle server) |
| `P2P_RELAY_ADDR` | Relay multiaddr clients should try if direct dials fail (defaults to `P2P_SERVER_MULTIADDR`) |
| `P2P_RELAY_DISCOVER` | How many relays to discover automatically (default `2`) |
| `P2P_ENABLE_RELAY_SERVER` | Set to `true` on a server to advertise circuit-relay reservations |
| `P2P_RELAY_MAX_RESERVATIONS` | Max circuit-relay reservations to keep when relay mode is enabled (default `32`) |

## Running a relay/bootstrap node

On a VPS or other always-on machine:

```bash
export P2P_ENABLE_RELAY_SERVER=true
export P2P_PORT=4001
npm start
```

Make sure TCP port 4001 is open in your firewall / cloud security rules. Nodes using the default configuration will automatically bootstrap to the server multiaddr and can fall back to relayed dials if direct TCP fails.

## Running a local test mesh

```bash
# Peer A
npm start
# copy the displayed /ip4/127.0.0.1 multiaddr

# Peer B (in another checkout)
npm start -- /ip4/127.0.0.1/tcp/<port>/p2p/<peer-id>
```

When peers are connected you can chat interactively, sync history, and inspect stored peers/messages via the `/` commands.
