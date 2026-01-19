# libp2project

Decentralized P2P chat over libp2p with signed messages, local storage, basic profiles, and optional Oracle server bootstrap.

## Install

```bash
npm install
```

## Running a local peer

Start a peer:

```bash
npm start
```

You will see output similar to:

```text
Node started with ID: 12D3KooW...
Listening on: [ '/ip4/0.0.0.0/tcp/XXXXX/p2p/12D3KooW...' ]
```

In another terminal, you can connect directly using that multiaddr:

```bash
npm start -- /ip4/127.0.0.1/tcp/XXXXX/p2p/12D3KooW...
```

Type messages and they will be broadcast over pubsub.

## CLI commands

Inside a running node, you can use:

- `/peers` – list known peers and their status
- `/profile` – show your local profile
- `/profiles` – list known peer profiles
- `/history` – show recent locally stored messages
- `/sync` – ask a connected peer for recent history
- `/help` – show commands
- `/quit` – exit the node

## Environment variables

`src/network/node.js` and the profile code honor a few environment variables:

- `P2P_PORT` – Port to listen on (default random)
- `P2P_USERNAME` – Override default username for profile announcements
- `P2P_SERVER_MULTIADDR` – Extra bootstrap multiaddr (e.g. your Oracle server)

## Using the Oracle server as bootstrap

On the Oracle machine, from the project directory:

```bash
P2P_USERNAME="server" P2P_PORT=4001 npm start
```

Note the peer ID printed as `Node started with ID: ...`.

From home, you can either connect explicitly:

```bash
npm start -- /ip4/207.127.93.169/tcp/4001/p2p/<SERVER_PEER_ID>
```

or export it as an environment variable so it is used as an extra bootstrap node:

```bash
export P2P_SERVER_MULTIADDR="/ip4/207.127.93.169/tcp/4001/p2p/<SERVER_PEER_ID>"
npm start
```

The Oracle server ID will change if you wipe its data and restart with a new identity, so update `<SERVER_PEER_ID>` when that happens.

## Tests

Run the test suite:

```bash
npm test
```

This covers:

- Message serialization roundtrip
- Message signing and verification
- MessageStore and PeerStore behavior
- Rate limiting
- History sync request/response over a fake pubsub bus
- A small integration test of two handlers exchanging a signed message

## Troubleshooting

- **NoPeersSubscribedToTopic warnings** – harmless if no other peers are listening yet; the CLI will still run locally.
- **LevelDB lock errors** – only run one process per data directory. If a crash leaves a lock, remove the `data/` directory or run another peer from a separate clone.
- **Cannot connect to Oracle multiaddr** – make sure the Oracle node is running, port `4001` is open, and that you are using the *current* `Node started with ID:` value in the multiaddr.
