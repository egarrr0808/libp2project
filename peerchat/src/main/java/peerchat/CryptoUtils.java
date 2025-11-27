package peerchat;

import javax.crypto.Cipher;
import java.security.*;
import java.util.Base64;

public class CryptoUtils {
    private static final String ALGORITHM = "RSA";
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";
    private static final int KEY_SIZE = 2048;
    
    /**
     * Generate RSA key pair
     * @return KeyPair containing public and private keys
     */
    public static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance(ALGORITHM);
            keyGen.initialize(KEY_SIZE, new SecureRandom());
            return keyGen.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error generating key pair: " + e.getMessage(), e);
        }
    }
    
    /**
     * Sign a message with a private key
     * @param message The message to sign
     * @param privateKey The private key to use for signing
     * @return Base64 encoded signature
     */
    public static String signMessage(String message, PrivateKey privateKey) {
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initSign(privateKey);
            signature.update(message.getBytes());
            byte[] signatureBytes = signature.sign();
            return Base64.getEncoder().encodeToString(signatureBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException | SignatureException e) {
            throw new RuntimeException("Error signing message: " + e.getMessage(), e);
        }
    }
    
    /**
     * Verify a message signature
     * @param message The original message
     * @param signature The Base64 encoded signature to verify
     * @param publicKey The public key to verify with
     * @return true if signature is valid, false otherwise
     */
    public static boolean verifySignature(String message, String signature, PublicKey publicKey) {
        try {
            Signature sig = Signature.getInstance(SIGNATURE_ALGORITHM);
            sig.initVerify(publicKey);
            sig.update(message.getBytes());
            byte[] signatureBytes = Base64.getDecoder().decode(signature);
            return sig.verify(signatureBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException | SignatureException e) {
            throw new RuntimeException("Error verifying signature: " + e.getMessage(), e);
        } catch (IllegalArgumentException e) {
            // Invalid Base64 encoding
            return false;
        }
    }
}
