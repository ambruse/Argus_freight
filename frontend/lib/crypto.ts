import api from "./api";

let cachedPublicKeyPem: string | null = null;

async function fetchPublicKey(): Promise<string> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;
  const { data } = await api.get("/auth/public-key");
  if (data && data.success && data.publicKey) {
    cachedPublicKeyPem = data.publicKey;
    return data.publicKey;
  }
  throw new Error("Failed to fetch public key for password encryption.");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64Lines = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  const binaryDer = window.atob(b64Lines);
  const binaryLen = binaryDer.length;
  const bytes = new Uint8Array(binaryLen);
  for (let i = 0; i < binaryLen; i++) {
    bytes[i] = binaryDer.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const arrayBuffer = pemToArrayBuffer(pem);
  return await window.crypto.subtle.importKey(
    "spki",
    arrayBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

export async function encryptPassword(password: string): Promise<string> {
  if (!password) return "";
  try {
    const pem = await fetchPublicKey();
    const publicKey = await importPublicKey(pem);
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      data
    );
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(encrypted);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err: any) {
    console.error("Encryption error:", err);
    throw new Error("Failed to secure password in transit.");
  }
}
