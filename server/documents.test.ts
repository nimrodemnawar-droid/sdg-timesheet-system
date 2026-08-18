import { describe, expect, it } from "vitest";
import { documents } from "../drizzle/schema";

describe("Documents schema contract", () => {
  it("exposes the fields selected by document loading queries", () => {
    expect(documents.id).toBeDefined();
    expect(documents.userId).toBeDefined();
    expect(documents.documentType).toBeDefined();
    expect(documents.fileKey).toBeDefined();
    expect(documents.fileName).toBeDefined();
    expect(documents.fileSize).toBeDefined();
    expect(documents.mimeType).toBeDefined();
    expect(documents.isEncrypted).toBeDefined();
    expect(documents.createdAt).toBeDefined();
  });
});
