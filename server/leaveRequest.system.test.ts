import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Leave Request System - End-to-End", () => {
  const testUserId = 9999;
  const testYear = new Date().getFullYear();

  beforeAll(async () => {
    // Initialize leave balance for testing
    await db.initializeLeaveBalance(testUserId, "annual", testYear, 21);
    await db.initializeLeaveBalance(testUserId, "sick", testYear, 10);
    await db.initializeLeaveBalance(testUserId, "maternity", testYear, 90);
  });

  afterAll(async () => {
    // Cleanup would happen here in a real test environment
  });

  describe("Leave Request Creation", () => {
    it("should create a leave request successfully", async () => {
      const startDate = new Date(testYear, 0, 15);
      const endDate = new Date(testYear, 0, 17);

      const result = await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "annual",
        startDate,
        endDate,
        daysRequested: "3",
        reason: "Vacation",
      });

      expect(result).toBeDefined();
    });

    it("should retrieve created leave request", async () => {
      const startDate = new Date(testYear, 1, 10);
      const endDate = new Date(testYear, 1, 12);

      await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "sick",
        startDate,
        endDate,
        daysRequested: "2",
        reason: "Medical",
      });

      const requests = await db.getUserLeaveRequests(testUserId);
      expect(requests.length).toBeGreaterThan(0);
      expect(requests[0].status).toBe("pending");
    });
  });

  describe("Leave Balance Updates", () => {
    it("should update leave balance when request is approved", async () => {
      // Create a new request
      const startDate = new Date(testYear, 2, 5);
      const endDate = new Date(testYear, 2, 7);

      await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "annual",
        startDate,
        endDate,
        daysRequested: "3",
        reason: "Test approval",
      });

      // Get the created request
      const requests = await db.getUserLeaveRequests(testUserId);
      const testRequest = requests.find(
        (r) => r.reason === "Test approval" && r.status === "pending"
      );
      expect(testRequest).toBeDefined();

      const leaveRequestId = testRequest!.id;

      // Get initial balance
      const initialBalance = await db.getLeaveBalance(testUserId, "annual", testYear);
      expect(initialBalance).toBeDefined();
      const initialRemaining = parseFloat(initialBalance!.remainingDays.toString());

      // Approve the request
      await db.approveLeaveRequest(leaveRequestId, 1, "Approved");

      // Get updated balance
      const updatedBalance = await db.getLeaveBalance(testUserId, "annual", testYear);
      expect(updatedBalance).toBeDefined();
      const updatedRemaining = parseFloat(updatedBalance!.remainingDays.toString());
      const updatedUsed = parseFloat(updatedBalance!.usedDays.toString());

      // Verify balance was updated correctly
      expect(updatedRemaining).toBe(initialRemaining - 3);
      expect(updatedUsed).toBeGreaterThan(0);
    });

    it("should calculate remaining days correctly", async () => {
      const balance = await db.getLeaveBalance(testUserId, "annual", testYear);
      expect(balance).toBeDefined();

      const allocated = parseFloat(balance!.allocatedDays.toString());
      const used = parseFloat(balance!.usedDays.toString());
      const remaining = parseFloat(balance!.remainingDays.toString());

      // Verify calculation
      expect(remaining).toBeLessThanOrEqual(allocated);
      expect(remaining + used).toBeLessThanOrEqual(allocated + 0.01); // Allow for floating point errors
    });
  });

  describe("Leave Request Status Tracking", () => {
    it("should track pending requests", async () => {
      const pending = await db.getPendingLeaveRequests();
      expect(Array.isArray(pending)).toBe(true);
      expect(pending.every((req) => req.status === "pending")).toBe(true);
    });

    it("should update request status on approval", async () => {
      const startDate = new Date(testYear, 3, 1);
      const endDate = new Date(testYear, 3, 3);

      await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "sick",
        startDate,
        endDate,
        daysRequested: "2",
        reason: "Test status update approval",
      });

      // Get the created request
      const requests = await db.getUserLeaveRequests(testUserId);
      const testRequest = requests.find(
        (r) => r.reason === "Test status update approval" && r.status === "pending"
      );
      expect(testRequest).toBeDefined();

      const leaveRequestId = testRequest!.id;

      // Approve the request
      await db.approveLeaveRequest(leaveRequestId, 1, "Approved");

      // Verify status changed
      const request = await db.getLeaveRequest(leaveRequestId);
      expect(request?.status).toBe("approved");
      expect(request?.approvedBy).toBe(1);
      expect(request?.approvalReason).toBe("Approved");
    });

    it("should update request status on rejection", async () => {
      const startDate = new Date(testYear, 4, 1);
      const endDate = new Date(testYear, 4, 2);

      await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "annual",
        startDate,
        endDate,
        daysRequested: "1",
        reason: "Test rejection",
      });

      // Get the created request
      const requests = await db.getUserLeaveRequests(testUserId);
      const testRequest = requests.find(
        (r) => r.reason === "Test rejection" && r.status === "pending"
      );
      expect(testRequest).toBeDefined();

      const leaveRequestId = testRequest!.id;

      // Reject the request
      await db.rejectLeaveRequest(leaveRequestId, 1, "Not approved");

      // Verify status changed
      const request = await db.getLeaveRequest(leaveRequestId);
      expect(request?.status).toBe("rejected");
      expect(request?.approvedBy).toBe(1);
      expect(request?.approvalReason).toBe("Not approved");
    });
  });

  describe("Leave Balance Validation", () => {
    it("should have correct balance for multiple leave types", async () => {
      const annualBalance = await db.getLeaveBalance(testUserId, "annual", testYear);
      const sickBalance = await db.getLeaveBalance(testUserId, "sick", testYear);
      const maternityBalance = await db.getLeaveBalance(testUserId, "maternity", testYear);

      expect(annualBalance).toBeDefined();
      expect(sickBalance).toBeDefined();
      expect(maternityBalance).toBeDefined();

      // Verify allocated days match initialization
      expect(parseFloat(annualBalance!.allocatedDays.toString())).toBe(21);
      expect(parseFloat(sickBalance!.allocatedDays.toString())).toBe(10);
      expect(parseFloat(maternityBalance!.allocatedDays.toString())).toBe(90);
    });

    it("should handle decimal days correctly", async () => {
      const startDate = new Date(testYear, 5, 1);
      const endDate = new Date(testYear, 5, 1); // Same day = 1 day

      await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "annual",
        startDate,
        endDate,
        daysRequested: "0.5", // Half day
        reason: "Half day leave",
      });

      const requests = await db.getUserLeaveRequests(testUserId);
      const halfDayRequest = requests.find((r) => {
        const days = parseFloat(r.daysRequested.toString());
        return Math.abs(days - 0.5) < 0.01; // Allow for floating point precision
      });
      expect(halfDayRequest).toBeDefined();
    });
  });

  describe("Leave Request Retrieval", () => {
    it("should retrieve all user leave requests", async () => {
      const requests = await db.getUserLeaveRequests(testUserId);
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.every((r) => r.userId === testUserId)).toBe(true);
    });

    it("should retrieve requests in correct order (newest first)", async () => {
      const requests = await db.getUserLeaveRequests(testUserId);
      if (requests.length > 1) {
        for (let i = 0; i < requests.length - 1; i++) {
          const current = new Date(requests[i].createdAt).getTime();
          const next = new Date(requests[i + 1].createdAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe("Leave Request Notifications", () => {
    it("should include approval reason in request", async () => {
      const startDate = new Date(testYear, 6, 1);
      const endDate = new Date(testYear, 6, 2);

      await db.createLeaveRequest({
        userId: testUserId,
        leaveType: "sick",
        startDate,
        endDate,
        daysRequested: "1",
        reason: "Doctor appointment",
      });

      // Get the created request
      const requests = await db.getUserLeaveRequests(testUserId);
      const testRequest = requests.find(
        (r) => r.reason === "Doctor appointment" && r.status === "pending"
      );
      expect(testRequest).toBeDefined();

      const leaveRequestId = testRequest!.id;
      const approvalReason = "Approved - valid medical reason";

      await db.approveLeaveRequest(leaveRequestId, 1, approvalReason);

      const request = await db.getLeaveRequest(leaveRequestId);
      expect(request?.approvalReason).toBe(approvalReason);
    });
  });
});
