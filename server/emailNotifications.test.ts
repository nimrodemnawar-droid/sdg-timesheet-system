import { describe, expect, it } from "vitest";
import { emailNotifications } from "../drizzle/schema";

describe("Email notifications schema contract", () => {
  it("exposes the application columns used by the notification query", () => {
    expect(emailNotifications.id).toBeDefined();
    expect(emailNotifications.userId).toBeDefined();
    expect(emailNotifications.type).toBeDefined();
    expect(emailNotifications.subject).toBeDefined();
    expect(emailNotifications.content).toBeDefined();
    expect(emailNotifications.sentAt).toBeDefined();
    expect(emailNotifications.createdAt).toBeDefined();
  });
});
