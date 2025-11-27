package peerchat;

import java.security.KeyPair;
import java.security.PublicKey;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Queue;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.logging.Logger;
import java.util.stream.Collectors;

public class NetworkNode {
    private static final Logger LOGGER = Logger.getLogger(NetworkNode.class.getName());
    private static final int DEFAULT_GOSSIP_FANOUT = 3;
    private static final NetworkState NETWORK_STATE = new NetworkState();

    private final ChatProtocol chatProtocol = new ChatProtocol();
    private final Set<String> connectedPeers = ConcurrentHashMap.newKeySet();
    private final Set<String> subscriptions = ConcurrentHashMap.newKeySet();
    private final Set<String> knownMessageIds = ConcurrentHashMap.newKeySet();
    private final List<Message> localLog = Collections.synchronizedList(new ArrayList<>());

    private final String peerId;
    private KeyPair identity;
    private boolean running;

    public NetworkNode(String peerId) {
        this.peerId = peerId;
    }

    public synchronized void start(List<String> bootstrapPeers) {
        if (running) {
            LOGGER.info(peerId + " already running");
            return;
        }
        identity = CryptoUtils.generateKeyPair();
        NETWORK_STATE.registerPeer(this, identity.getPublic());
        running = true;
        bootstrapPeers.forEach(this::connectToPeer);
        drainOfflineMessages();
        LOGGER.info(() -> String.format(Locale.US,
                "%s online with %d bootstrap peers", peerId, bootstrapPeers.size()));
    }

    public void stop() {
        running = false;
        NETWORK_STATE.unregisterPeer(peerId);
    }

    public void connectToPeer(String targetPeerId) {
        if (targetPeerId == null || targetPeerId.equals(peerId)) {
            return;
        }
        Optional<NetworkNode> target = NETWORK_STATE.findPeer(targetPeerId);
        target.ifPresent(node -> {
            connectedPeers.add(node.peerId);
            node.connectedPeers.add(peerId);
            LOGGER.info(peerId + " connected to " + node.peerId);
        });
    }

    public void subscribe(String topic) {
        if (topic == null || topic.isBlank()) {
            return;
        }
        subscriptions.add(topic);
        NETWORK_STATE.subscribe(topic, peerId);
    }

    public void sendDirectMessage(String recipientId, String text) {
        ensureRunning();
        Message message = Message.direct(text, peerId, recipientId);
        message.setSignature(CryptoUtils.signMessage(message.payload(), identity.getPrivate()));
        appendToHistory(message);
        NETWORK_STATE.deliverDirectMessage(message);
    }

    public void publishToTopic(String topic, String text) {
        ensureRunning();
        subscribe(topic);
        Message message = Message.group(text, peerId, topic);
        message.setSignature(CryptoUtils.signMessage(message.payload(), identity.getPrivate()));
        appendToHistory(message);
        NETWORK_STATE.markDelivered(message.getMessageId(), peerId);
        NETWORK_STATE.spreadGossipFrom(this, message, DEFAULT_GOSSIP_FANOUT);
    }

    public List<Message> requestHistoryFromNeighbors(int neighborCount, int messagesPerNeighbor) {
        List<String> candidates = new ArrayList<>(connectedPeers);
        candidates.addAll(NETWORK_STATE.randomPeers(neighborCount, peerId));
        List<String> unique = candidates.stream()
                .filter(id -> !id.equals(peerId))
                .distinct()
                .limit(neighborCount)
                .collect(Collectors.toList());

        List<Message> aggregated = new ArrayList<>();
        for (String candidate : unique) {
            NETWORK_STATE.findPeer(candidate)
                    .ifPresent(peer -> aggregated.addAll(peer.exportRecentMessages(messagesPerNeighbor)));
        }

        aggregated.sort(Comparator.comparingLong(Message::getTimestamp));
        aggregated.forEach(this::appendToHistory);
        LOGGER.info(() -> peerId + " merged " + aggregated.size() + " messages from neighbors");
        return aggregated;
    }

    public List<Message> getMessageLogSnapshot() {
        synchronized (localLog) {
            return new ArrayList<>(localLog);
        }
    }

    public String getPeerId() {
        return peerId;
    }

    void receiveDirectMessage(Message message) {
        if (!verifyMessage(message)) {
            LOGGER.warning(() -> peerId + " rejected direct message " + message.getMessageId());
            return;
        }
        appendToHistory(message);
        chatProtocol.handleIncomingMessage(message);
    }

    void receiveGroupMessage(Message message) {
        if (!NETWORK_STATE.markDelivered(message.getMessageId(), peerId)) {
            return;
        }
        if (!verifyMessage(message)) {
            LOGGER.warning(() -> peerId + " rejected gossip message " + message.getMessageId());
            return;
        }
        appendToHistory(message);
        chatProtocol.handleIncomingMessage(message);
        NETWORK_STATE.spreadGossipFrom(this, message, DEFAULT_GOSSIP_FANOUT);
    }

    private boolean verifyMessage(Message message) {
        Optional<PublicKey> senderKey = NETWORK_STATE.getPeerKey(message.getSenderId());
        return senderKey.filter(publicKey -> CryptoUtils.verifySignature(
                message.payload(), message.getSignature(), publicKey)).isPresent();
    }

    private void appendToHistory(Message message) {
        if (message == null) {
            return;
        }
        if (knownMessageIds.add(message.getMessageId())) {
            localLog.add(message);
        }
    }

    private List<Message> exportRecentMessages(int limit) {
        synchronized (localLog) {
            int fromIndex = Math.max(0, localLog.size() - limit);
            return new ArrayList<>(localLog.subList(fromIndex, localLog.size()));
        }
    }

    private void drainOfflineMessages() {
        List<Message> pending = NETWORK_STATE.drainOfflineMessages(peerId);
        for (Message message : pending) {
            if (message.getType() == Message.MessageType.DIRECT) {
                receiveDirectMessage(message);
            } else {
                receiveGroupMessage(message);
            }
        }
    }

    private void ensureRunning() {
        if (!running) {
            throw new IllegalStateException("Node " + peerId + " is not running");
        }
    }

    private static final class NetworkState {
        private final ConcurrentHashMap<String, NetworkNode> peers = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<String, PublicKey> publicKeys = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<String, Queue<Message>> offlineMessages = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<String, Set<String>> topicSubscriptions = new ConcurrentHashMap<>();
        private final ConcurrentHashMap<String, Set<String>> gossipDeliveries = new ConcurrentHashMap<>();
        private final Random random = new Random();

        void registerPeer(NetworkNode node, PublicKey publicKey) {
            peers.put(node.peerId, node);
            publicKeys.put(node.peerId, publicKey);
        }

        void unregisterPeer(String peerId) {
            peers.remove(peerId);
            publicKeys.remove(peerId);
        }

        Optional<NetworkNode> findPeer(String peerId) {
            return Optional.ofNullable(peers.get(peerId));
        }

        Optional<PublicKey> getPeerKey(String peerId) {
            return Optional.ofNullable(publicKeys.get(peerId));
        }

        void subscribe(String topic, String peerId) {
            topicSubscriptions
                    .computeIfAbsent(topic, key -> ConcurrentHashMap.newKeySet())
                    .add(peerId);
        }

        void deliverDirectMessage(Message message) {
            findPeer(message.getRecipientId())
                    .ifPresentOrElse(
                            node -> node.receiveDirectMessage(message),
                            () -> enqueueOffline(message.getRecipientId(), message));
        }

        void spreadGossipFrom(NetworkNode sender, Message message, int fanout) {
            if (message.getTopic() == null) {
                return;
            }
            List<String> subscribers = new ArrayList<>(
                    topicSubscriptions.getOrDefault(message.getTopic(), Collections.emptySet()));
            Collections.shuffle(subscribers, random);
            int delivered = 0;
            for (String candidate : subscribers) {
                if (candidate.equals(sender.peerId) || hasSeen(message.getMessageId(), candidate)) {
                    continue;
                }
                deliverGroupMessage(candidate, message);
                delivered++;
                if (delivered >= fanout) {
                    break;
                }
            }
        }

        private void deliverGroupMessage(String peerId, Message message) {
            findPeer(peerId)
                    .ifPresentOrElse(
                            node -> node.receiveGroupMessage(message),
                            () -> enqueueOffline(peerId, message));
        }

        private void enqueueOffline(String peerId, Message message) {
            offlineMessages
                    .computeIfAbsent(peerId, key -> new ConcurrentLinkedQueue<>())
                    .add(message);
        }

        List<Message> drainOfflineMessages(String peerId) {
            Queue<Message> queue = offlineMessages.remove(peerId);
            if (queue == null) {
                return Collections.emptyList();
            }
            List<Message> drained = new ArrayList<>();
            Message message;
            while ((message = queue.poll()) != null) {
                drained.add(message);
            }
            return drained;
        }

        boolean markDelivered(String messageId, String peerId) {
            Set<String> delivered = gossipDeliveries
                    .computeIfAbsent(messageId, key -> ConcurrentHashMap.newKeySet());
            return delivered.add(peerId);
        }

        boolean hasSeen(String messageId, String peerId) {
            return gossipDeliveries
                    .getOrDefault(messageId, Collections.emptySet())
                    .contains(peerId);
        }

        List<String> randomPeers(int limit, String excludePeer) {
            if (limit <= 0) {
                return Collections.emptyList();
            }
            List<String> ids = new ArrayList<>(peers.keySet());
            ids.remove(excludePeer);
            Collections.shuffle(ids, random);
            return ids.stream().limit(limit).collect(Collectors.toList());
        }
    }
}
