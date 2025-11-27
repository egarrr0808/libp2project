package peerchat;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class Message implements Serializable {
    private static final long serialVersionUID = 1L;

    public enum MessageType {
        DIRECT,
        GROUP
    }

    private final String messageId;
    private String content;
    private long timestamp;
    private String senderId;
    private String signature;
    private String recipientId;
    private String topic;
    private MessageType type;

    public Message() {
        this.messageId = UUID.randomUUID().toString();
        this.timestamp = Instant.now().toEpochMilli();
    }

    public Message(String content, String senderId) {
        this();
        this.content = content;
        this.senderId = senderId;
    }

    public static Message direct(String content, String senderId, String recipientId) {
        Message message = new Message(content, senderId);
        message.recipientId = recipientId;
        message.type = MessageType.DIRECT;
        return message;
    }

    public static Message group(String content, String senderId, String topic) {
        Message message = new Message(content, senderId);
        message.topic = topic;
        message.type = MessageType.GROUP;
        return message;
    }

    public String getMessageId() {
        return messageId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(String recipientId) {
        this.recipientId = recipientId;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public String payload() {
        String recipient = recipientId == null ? "" : recipientId;
        String topicValue = topic == null ? "" : topic;
        String body = content == null ? "" : content;
        return String.join("|",
                messageId,
                Objects.toString(senderId, ""),
                recipient,
                topicValue,
                Long.toString(timestamp),
                body);
    }

    @Override
    public String toString() {
        return "Message{" +
                "messageId='" + messageId + '\'' +
                ", content='" + content + '\'' +
                ", timestamp=" + timestamp +
                ", senderId='" + senderId + '\'' +
                ", signature='" + signature + '\'' +
                ", recipientId='" + recipientId + '\'' +
                ", topic='" + topic + '\'' +
                ", type=" + type +
                '}';
    }
}
