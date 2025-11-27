package peerchat;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Entry point that spins up a couple of in-memory peers to demonstrate how
 * discovery (via a mini DHT), direct messaging, gossip-based pubsub, and
 * offline replay can work together.
 */
public final class App {

    private static final String DEFAULT_TOPIC = "crew-room";

    public static void main(String[] args) {
        if (args.length == 0 || "demo".equalsIgnoreCase(args[0])) {
            runDemo();
            return;
        }

        if ("node".equalsIgnoreCase(args[0])) {
            runSingleNode(Arrays.copyOfRange(args, 1, args.length));
            return;
        }

        System.out.println("Usage:");
        System.out.println("  java -jar peerchat.jar demo");
        System.out.println("  java -jar peerchat.jar node --id <peerId> [--bootstrap a,b,c]");
    }

    private static void runDemo() {
        System.out.println("=== Bootstrapping private libp2p chat prototype ===");

        NetworkNode alpha = new NetworkNode("alpha");
        alpha.start(Collections.emptyList());
        alpha.subscribe(DEFAULT_TOPIC);

        NetworkNode bravo = new NetworkNode("bravo");
        bravo.start(List.of("alpha"));
        bravo.subscribe(DEFAULT_TOPIC);

        NetworkNode charlie = new NetworkNode("charlie");
        charlie.start(List.of("alpha", "bravo"));
        charlie.subscribe(DEFAULT_TOPIC);

        // Simulate a node that has not connected yet
        String delayedPeerId = "delta";

        System.out.println("\n=== Direct message scenario ===");
        alpha.sendDirectMessage("bravo", "Hey Bravo, this is Alpha. Are you online?");
        bravo.sendDirectMessage("alpha", "Yes! Direct link established.");

        System.out.println("\n=== Offline mailbox demo ===");
        alpha.sendDirectMessage(delayedPeerId, "Hi Delta. You'll see this once you come online.");
        bravo.sendDirectMessage(delayedPeerId, "We saved you a spot in the chat.");

        System.out.println("\n=== Gossip pubsub scenario ===");
        alpha.publishToTopic(DEFAULT_TOPIC, "Alpha broadcasting to the whole crew.");
        bravo.publishToTopic(DEFAULT_TOPIC, "Status update: everything synced.");
        charlie.publishToTopic(DEFAULT_TOPIC, "I'm relaying what I hear via gossip.");

        System.out.println("\n=== Bringing an offline peer online and syncing state ===");
        NetworkNode delta = new NetworkNode(delayedPeerId);
        delta.start(List.of("alpha", "bravo"));
        delta.subscribe(DEFAULT_TOPIC);
        List<Message> synced = delta.requestHistoryFromNeighbors(2, 10);

        System.out.println("\nDelta pulled " + synced.size() + " messages from neighbors:");
        for (Message message : synced) {
            printMessage(message);
        }

        System.out.println("\nDelta mailbox (messages that waited for them):");
        for (Message message : delta.getMessageLogSnapshot()) {
            if (delayedPeerId.equals(message.getRecipientId())) {
                printMessage(message);
            }
        }
    }

    private static void runSingleNode(String[] args) {
        String peerId = "peer-" + System.currentTimeMillis();
        String bootstrapArg = null;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--id":
                    if (i + 1 < args.length) {
                        peerId = args[++i];
                    }
                    break;
                case "--bootstrap":
                    if (i + 1 < args.length) {
                        bootstrapArg = args[++i];
                    }
                    break;
                default:
                    System.out.println("Ignoring unknown argument: " + args[i]);
            }
        }

        List<String> bootstrapPeers = bootstrapArg == null
                ? Collections.emptyList()
                : Arrays.asList(bootstrapArg.split(","));

        NetworkNode self = new NetworkNode(peerId);
        self.start(bootstrapPeers);
        self.subscribe(DEFAULT_TOPIC);

        System.out.printf(Locale.US,
                "Node %s online with %d bootstrap peers. Use the demo mode for a richer showcase.%n",
                peerId, bootstrapPeers.size());
    }

    private static void printMessage(Message message) {
        String scope = message.getType() == Message.MessageType.DIRECT
                ? "direct -> " + message.getRecipientId()
                : "topic -> " + message.getTopic();
        System.out.printf(Locale.US,
                "[%s] %s %s : %s%n",
                Instant.ofEpochMilli(message.getTimestamp()),
                message.getSenderId(),
                scope,
                message.getContent());
    }
}
