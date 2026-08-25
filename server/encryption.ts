import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
// Derive a stable key from the configured encryption key or existing project secret.
// This avoids losing decryption capability when the server restarts without ENCRYPTION_KEY.
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "sdg-timesheet-development-key")
  .digest();

/**
 * Encrypts sensitive data using AES-256-CBC.
 * Returns an object with encrypted data and IV for decryption.
 */
export function encryptData(
  plaintext: string
): { encryptedData: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts AES-256-CBC encrypted data.
 */
export function decryptData(encryptedData: string, iv: string): string {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex")
  );

  let decrypted = decipher.update(encryptedData, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

/**
 * Calculates distance between two GPS coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines GPS accuracy quality based on accuracy value in meters.
 */
export function getAccuracyQuality(
  accuracyMeters: number
): "Excellent" | "Good" | "Fair" | "Poor" {
  if (accuracyMeters < 10) return "Excellent";
  if (accuracyMeters < 50) return "Good";
  if (accuracyMeters < 100) return "Fair";
  return "Poor";
}
