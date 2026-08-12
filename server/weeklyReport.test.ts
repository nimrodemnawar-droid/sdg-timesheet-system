import { describe, expect, it } from "vitest";
import { weeklyStatusReportHandler } from "./_core/scheduledHandlers";

describe("Weekly Status Report Handler", () => {
  it("rejects requests without cron authentication headers", async () => {
    let capturedCode = 0;
    let capturedData: any = null;

    const req = {
      headers: {},
      url: "/api/scheduled/weeklyStatusReport",
    } as any;

    const res = {
      status: (code: number) => {
        capturedCode = code;
        return {
          json: (data: any) => {
            capturedData = data;
            return { code, data };
          },
        };
      },
    } as any;

    await weeklyStatusReportHandler(req, res);
    expect(capturedCode).toBe(403);
    expect(capturedData).toEqual({ error: "cron-only" });
  });
});
