import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  generateDailyTimesheetSummary: vi.fn(),
  notifyOwner: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));
vi.mock("./db", () => ({
  generateDailyTimesheetSummary: mocks.generateDailyTimesheetSummary,
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: mocks.notifyOwner,
}));

import { dailyTimesheetReportHandler } from "./_core/scheduledHandlers";

describe("Daily Timesheet Report Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyOwner.mockResolvedValue(true);
  });

  it("rejects requests without cron authentication", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("not authenticated"));
    const response = createResponse();

    await dailyTimesheetReportHandler({ headers: {}, url: "/api/scheduled/dailyTimesheetReport" } as any, response as any);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toBe("cron-only");
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("formats structured-timesheet totals and delivers the summary notification", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "daily-task" });
    mocks.generateDailyTimesheetSummary.mockResolvedValue({
      date: "2026-08-25",
      totalStaffCheckedIn: 3,
      submittedCount: 2,
      pendingCount: 1,
      totalHours: 14.5,
      activitiesByCategory: { Meeting: 2, Training: 1 },
      activitiesBySDG: {},
      records: [
        { staffName: "Amina", staffNumber: "007", isSubmitted: false },
        { staffName: "Brian", staffNumber: "008", isSubmitted: true },
      ],
    });
    const response = createResponse();

    await dailyTimesheetReportHandler({ headers: {}, url: "/api/scheduled/dailyTimesheetReport" } as any, response as any);

    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      title: "Daily Timesheet Summary - 2026-08-25",
      content: expect.stringContaining("Total Hours Worked: 14.5 hours"),
    }));
    expect(mocks.notifyOwner.mock.calls[0][0].content).toContain("Amina (007)");
    expect(mocks.notifyOwner.mock.calls[0][0].content).toContain("Meeting: 2");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ ok: true, success: true, summary: expect.any(Object) });
  });
});

function createResponse() {
  const response: { statusCode: number; body: any; status: (code: number) => any; json: (body: any) => any } = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: any) {
      response.body = body;
      return response;
    },
  };
  return response;
}
