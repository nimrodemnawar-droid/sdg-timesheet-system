import { describe, expect, it } from "vitest";
import { decryptData, encryptData } from "./encryption";

describe("sensitive remark encryption", () => {
  it("round-trips approval remarks without exposing plaintext in the encrypted payload", () => {
    const remark = "Approved for the scheduled field assignment.";
    const encrypted = encryptData(remark);
    expect(encrypted.encryptedData).not.toContain(remark);
    expect(encrypted.iv).toHaveLength(32);
    expect(decryptData(encrypted.encryptedData, encrypted.iv)).toBe(remark);
  });
});
