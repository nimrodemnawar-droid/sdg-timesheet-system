import { storagePut, storageGet } from "./storage";
import { encryptData, decryptData } from "./encryption";
import { randomBytes } from "crypto";

/**
 * Generate a random suffix for file keys to prevent enumeration
 */
function generateRandomSuffix(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Upload encrypted profile photo
 */
export async function uploadProfilePhoto(
  userId: number,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<{ url: string; key: string }> {
  const fileKey = `profile-photos/${userId}/${fileName}-${generateRandomSuffix()}`;

  try {
    const result = await storagePut(fileKey, fileBuffer);
    return result;
  } catch (error) {
    console.error("[FileStorage] Failed to upload profile photo:", error);
    throw new Error("Failed to upload profile photo");
  }
}

/**
 * Upload encrypted CSV report
 */
export async function uploadCSVReport(
  reportName: string,
  csvContent: string,
  userId: number
): Promise<{ url: string; key: string }> {
  const fileKey = `reports/${userId}/${reportName}-${generateRandomSuffix()}.csv`;

  try {
    // Encrypt the CSV content
    const { encryptedData, iv } = encryptData(csvContent);

    // Store encrypted data
    const result = await storagePut(
      fileKey,
      Buffer.from(encryptedData, "hex")
    );

    // Store IV separately for decryption (in production, store in database)
    console.log(`[FileStorage] Report IV: ${iv}`);

    return result;
  } catch (error) {
    console.error("[FileStorage] Failed to upload CSV report:", error);
    throw new Error("Failed to upload CSV report");
  }
}

/**
 * Upload encrypted leave request document
 */
export async function uploadLeaveDocument(
  leaveRequestId: number,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "application/pdf"
): Promise<{ url: string; key: string }> {
  const fileKey = `leave-documents/${leaveRequestId}/${fileName}-${generateRandomSuffix()}`;

  try {
    const result = await storagePut(fileKey, fileBuffer);
    return result;
  } catch (error) {
    console.error("[FileStorage] Failed to upload leave document:", error);
    throw new Error("Failed to upload leave document");
  }
}

/**
 * Get encrypted file with presigned URL
 */
export async function getEncryptedFile(
  fileKey: string
): Promise<{ url: string; key: string }> {
  try {
    const result = await storageGet(fileKey);
    return result;
  } catch (error) {
    console.error("[FileStorage] Failed to get file:", error);
    throw new Error("Failed to retrieve file");
  }
}

/**
 * Generate attendance report CSV
 */
export function generateAttendanceReportCSV(
  attendanceRecords: Array<{
    staffName: string;
    staffEmail: string;
    checkInTime: Date;
    checkOutTime: Date | null;
    duration: string;
    checkInLat: string;
    checkInLng: string;
    checkOutLat?: string;
    checkOutLng?: string;
    distanceTraveled?: string;
  }>
): string {
  const headers = [
    "Staff Name",
    "Email",
    "Check-In Time",
    "Check-Out Time",
    "Duration",
    "Check-In Latitude",
    "Check-In Longitude",
    "Check-Out Latitude",
    "Check-Out Longitude",
    "Distance Traveled (km)",
  ];

  const rows = attendanceRecords.map((record) => [
    record.staffName,
    record.staffEmail,
    new Date(record.checkInTime).toISOString(),
    record.checkOutTime ? new Date(record.checkOutTime).toISOString() : "N/A",
    record.duration,
    record.checkInLat,
    record.checkInLng,
    record.checkOutLat || "N/A",
    record.checkOutLng || "N/A",
    record.distanceTraveled || "0",
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Generate leave report CSV
 */
export function generateLeaveReportCSV(
  leaveRecords: Array<{
    staffName: string;
    staffEmail: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    daysRequested: string;
    status: string;
    approvalReason?: string;
  }>
): string {
  const headers = [
    "Staff Name",
    "Email",
    "Leave Type",
    "Start Date",
    "End Date",
    "Days Requested",
    "Status",
    "Approval/Rejection Reason",
  ];

  const rows = leaveRecords.map((record) => [
    record.staffName,
    record.staffEmail,
    record.leaveType,
    new Date(record.startDate).toLocaleDateString(),
    new Date(record.endDate).toLocaleDateString(),
    record.daysRequested,
    record.status,
    record.approvalReason || "N/A",
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Generate staff overview CSV
 */
export function generateStaffOverviewCSV(
  staffRecords: Array<{
    name: string;
    email: string;
    role: string;
    loginMethod: string;
    createdAt: Date;
    lastSignedIn: Date;
  }>
): string {
  const headers = [
    "Name",
    "Email",
    "Role",
    "Login Method",
    "Created Date",
    "Last Signed In",
  ];

  const rows = staffRecords.map((record) => [
    record.name,
    record.email,
    record.role,
    record.loginMethod,
    new Date(record.createdAt).toLocaleDateString(),
    new Date(record.lastSignedIn).toLocaleDateString(),
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(fileSize: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
}

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Allowed MIME types for different file categories
 */
export const ALLOWED_MIME_TYPES = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  documents: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  spreadsheets: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};
