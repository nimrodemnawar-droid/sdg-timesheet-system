# SDG-Aligned GPS Timesheet & Workforce Monitoring System - TODO

## Phase 1: Database Schema Enhancement
- [ ] Add SDG goals table (1-17 with official colors and descriptions)
- [ ] Add activity categories table (20+ predefined categories)
- [ ] Add KPI table linked to SDG goals
- [ ] Extend timesheet table with:
  - [ ] AM start/end times
  - [ ] PM start/end times
  - [ ] Work modality (office/field/remote)
  - [ ] Primary activity category
  - [ ] SDG goal selection
  - [ ] Program/Department
  - [ ] Linked KPI
  - [ ] Task description
  - [ ] Evidence upload key
  - [ ] Staff remarks
- [ ] Add supervisor confirmation table:
  - [ ] Supervisor name
  - [ ] Supervisor phone
  - [ ] Digital signature
  - [ ] Private field remarks (encrypted)
  - [ ] Timestamp
  - [ ] Linked to timesheet
- [ ] Add overtime tracking table
- [ ] Add leave balance table with year tracking
- [ ] Add activity heatmap data table
- [ ] Add system settings table (default 8 hours, SDG colors, etc.)
- [ ] Add audit log enhancements

## Phase 2: Backend Procedures Enhancement
- [ ] Create SDG goals management procedures
- [ ] Create activity categories CRUD procedures
- [ ] Create KPI management procedures
- [ ] Extend timesheet submission with all new fields
- [ ] Create supervisor confirmation procedure (separate from staff)
- [ ] Create overtime calculation procedures
- [ ] Create leave balance calculation procedures
- [ ] Create SDG analytics procedures
- [ ] Create activity heatmap data procedures
- [ ] Create audit logging for all actions
- [ ] Create user management procedures (add staff/supervisor/admin)
- [ ] Create role editing procedures
- [ ] Create user deactivation procedures
- [ ] Create password reset procedures
- [ ] Create system settings update procedures

## Phase 3: Staff Interface
- [ ] Update staff dashboard with SDG watermark background
- [ ] Create enhanced timesheet form with:
  - [ ] AM/PM time fields
  - [ ] Work modality selector
  - [ ] Activity category dropdown
  - [ ] SDG goal selector (1-17)
  - [ ] Program/Department field
  - [ ] KPI selector
  - [ ] Task description textarea
  - [ ] Evidence file upload
  - [ ] Staff remarks
- [ ] Implement auto-calculation of total hours
- [ ] Create leave request form with type selection
- [ ] Create overtime summary view
- [ ] Create leave balance view
- [ ] Add SDG color highlighting based on selection
- [ ] Implement view-only mode after submission

## Phase 4: Supervisor Interface
- [ ] Create separate "Field Confirmation" page
- [ ] Implement supervisor login and role verification
- [ ] Create field submission review interface with:
  - [ ] Staff entry details display
  - [ ] Field details review
  - [ ] Supervisor name input
  - [ ] Supervisor phone input
  - [ ] Digital signature capture
  - [ ] Private field remarks (encrypted)
- [ ] Implement separate submission workflow
- [ ] Add timestamp to supervisor confirmation
- [ ] Create auto-redirect away from staff dashboard after submission
- [ ] Add supervisor confirmation status indicator

## Phase 5: Admin Dashboard
- [ ] Create admin home page with KPI cards
- [ ] Build live GPS tracking map with:
  - [ ] Real-time staff markers
  - [ ] Route visualization
  - [ ] Date filter
  - [ ] Staff filter
  - [ ] Interactive controls
- [ ] Create overtime dashboard with:
  - [ ] Overtime leaderboard
  - [ ] Weekly overtime chart
  - [ ] Monthly overtime report
- [ ] Create leave management dashboard with:
  - [ ] Pending leave requests
  - [ ] Approve/reject functionality
  - [ ] Leave analytics
- [ ] Create SDG analytics dashboard with:
  - [ ] Hours per SDG
  - [ ] KPI per SDG
  - [ ] SDG distribution chart
- [ ] Create activity heatmap visualization
- [ ] Create user management interface:
  - [ ] Add new staff accounts
  - [ ] Add new supervisors
  - [ ] Add new admin accounts
  - [ ] Edit user roles
  - [ ] Deactivate users
- [ ] Create activity categories management
- [ ] Create SDG options management
- [ ] Create system settings editor
- [ ] Create audit log viewer
- [ ] Implement timesheet approval/rejection
- [ ] Implement override capabilities

## Phase 6: Export Features
- [ ] Create Excel export with:
  - [ ] Date filter
  - [ ] Staff filter
  - [ ] SDG filter
  - [ ] Program filter
  - [ ] Total hours column
  - [ ] Overtime column
  - [ ] Leave days column
  - [ ] GPS coordinates
  - [ ] Supervisor confirmation status
- [ ] Create PDF export with:
  - [ ] NGO logo header
  - [ ] SDG-themed design
  - [ ] Staff report summary
  - [ ] Supervisor private notes (admin-only)
  - [ ] Professional formatting

## Phase 7: SDG Branding & Styling
- [ ] Download/integrate SDG circular Africa logo
- [ ] Create watermark background component
- [ ] Apply watermark to all pages with:
  - [ ] Center positioning
  - [ ] Light opacity
  - [ ] Non-intrusive styling
- [ ] Implement SDG color scheme:
  - [ ] Define all 17 SDG colors
  - [ ] Apply to UI elements
  - [ ] Dynamic color highlighting based on selection
- [ ] Create professional layout system
- [ ] Ensure mobile responsiveness
- [ ] Test readability with watermark

## Phase 8: Testing & Quality Assurance
- [ ] Unit tests for SDG calculations
- [ ] Unit tests for overtime calculations
- [ ] Unit tests for leave balance calculations
- [ ] Integration tests for supervisor workflow
- [ ] Integration tests for export functionality
- [ ] End-to-end tests for critical flows
- [ ] Security testing for encrypted remarks
- [ ] Performance testing for map rendering
- [ ] Mobile responsiveness testing
- [ ] Accessibility testing
- [ ] Browser compatibility testing

## Phase 9: Deployment & Documentation
- [ ] Production environment setup
- [ ] Database backups and recovery procedures
- [ ] User documentation
- [ ] Admin setup guide
- [ ] API documentation
- [ ] System monitoring setup
- [ ] Final QA and sign-off
