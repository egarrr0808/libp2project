package peerchat;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

public class ChatProtocol {
    private static final String PROTOCOL_ID = "/peerchat/1.0.0";

    public String getProtocolId() {
        return PROTOCOL_ID;
    }

    public void handleIncomingMessage(Message message) {
        if (message == null) {
            return;
        }
        switch (message.getType()) {
            case DIRECT:
                System.out.printf("DIRECT %s -> %s : %s%n",
                        message.getSenderId(),
                        message.getRecipientId(),
                        message.getContent());
                break;
            case GROUP:
                System.out.printf("GOSSIP topic=%s sender=%s : %s%n",
                        message.getTopic(),
                        message.getSenderId(),
                        message.getContent());
                break;
            default:
                System.out.println("Received message: " + message);
        }
    }

    public byte[] serializeMessage(Message message) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(bos)) {
            oos.writeObject(message);
        }
        return bos.toByteArray();
    }

    public Message deserializeMessage(byte[] data) throws IOException, ClassNotFoundException {
        ByteArrayInputStream bis = new ByteArrayInputStream(data);
        try (ObjectInputStream ois = new ObjectInputStream(bis)) {
            return (Message) ois.readObject();
        }
    }
}
