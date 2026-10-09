export type StaffDirectoryEntry = {
  id: number;
  name?: string | null;
  email?: string | null;
  staffNumber?: number | string | null;
};

export type TimesheetSearchRecord = {
  userId?: number;
  staffName?: string | null;
  staffNumber?: number | string | null;
  staffEmail?: string | null;
  [key: string]: unknown;
};

export function findMatchingStaff(staffList: StaffDirectoryEntry[], searchTerm: string, limit = 8) {
  const term = searchTerm.trim().toLowerCase();
  if (term.length < 1) return [];

  return staffList.filter((staff) => [staff.name, staff.email, staff.staffNumber]
    .filter((value) => value !== null && value !== undefined)
    .some((value) => String(value).toLowerCase().includes(term))).slice(0, limit);
}

export function filterTimesheetRecords<T extends TimesheetSearchRecord>(
  records: T[],
  searchTerm: string,
  selectedStaffId?: number,
) {
  const term = searchTerm.trim().toLowerCase();
  return records.filter((record) => {
    if (selectedStaffId) return record.userId === selectedStaffId;
    return [record.staffName, record.staffNumber, record.staffEmail]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(term));
  });
}

export function buildCompleteTimesheetQuery(
  startDate: string,
  endDate: string,
  selectedStaffId?: number,
) {
  return {
    startDate,
    endDate,
    staffId: selectedStaffId,
  };
}
