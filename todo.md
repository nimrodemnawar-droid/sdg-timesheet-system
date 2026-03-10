# SDG Timesheet System - Project TODO

## Database & Backend Infrastructure
- [x] Design and implement database schema (users, attendance, leaves, waypoints, documents)
- [x] Create database migrations and apply schema
- [x] Implement authentication and role-based access control (Staff, Supervisor, Admin)
- [x] Set up encrypted field storage for remarks and sensitive data
- [x] Configure S3 file storage for profile photos, reports, and documents

## Staff Features
- [x] GPS check-in with 8-decimal precision location capture and accuracy metrics
- [x] GPS check-out with distance calculation between check-in/check-out points
- [ ] Waypoint tracking during field work with timestamps and cumulative distance
- [x] Daily timesheet submission with automatic duration calculation
- [x] Automatic overtime calculation (hours > 8/day)
- [x] Leave request submission with balance tracking
- [x] View leave balance and request history
- [x] Staff dashboard with real-time metrics (hours worked, distance, leave balance)
- [ ] Profile photo upload and management
- [ ] Receive email notifications for leave approval decisions
- [ ] Receive daily timesheet submission reminders

## Supervisor Features
- [x] Live GPS tracking map with 5-second auto-refresh showing staff locations
- [x] Multi-point waypoint visualization on map
- [x] Attendance reporting with date range filtering
- [x] Staff search and filter functionality
- [x] View check-in/check-out locations with 8-decimal precision
- [x] Distance tracking between check-in and check-out points
- [ ] CSV export for attendance reports
- [x] Add encrypted remarks to staff field work
- [x] View staff timesheet submissions
- [ ] Receive overtime threshold alerts

## Admin Features
- [x] Admin dashboard with KPIs (total hours, staff count, attendance rate)
- [x] Real-time staff metrics and performance indicators
- [x] Attendance overview by date range
- [x] Leave request review and approval workflow
- [ ] Bulk leave approval/rejection actions
- [ ] Leave balance management and adjustment
- [ ] User management and role assignment
- [ ] Comprehensive attendance reports with filtering
- [ ] CSV export for all reports
- [ ] Historical records and audit logging
- [ ] System performance monitoring
- [ ] Receive overtime threshold alerts

## Email Notifications
- [x] Send leave approval decision emails to staff
- [x] Send leave rejection reason emails to staff
- [x] Send overtime threshold alerts to admins
- [x] Send daily timesheet submission reminders to staff
- [x] Send leave balance update notifications
- [x] Email template system with customizable content

## File Storage & Security
- [x] Implement encrypted cloud storage for profile photos
- [x] Implement encrypted cloud storage for CSV reports
- [x] Implement encrypted cloud storage for leave request documents
- [x] File access control and authorization
- [x] Secure file download with expiring links
- [ ] File deletion and cleanup procedures

## Testing & Quality
- [x] Unit tests for GPS calculation functions
- [x] Unit tests for timesheet calculation logic
- [x] Unit tests for leave balance calculations
- [x] Integration tests for check-in/check-out workflows
- [x] Integration tests for leave approval workflow
- [x] Integration tests for email notifications
- [x] Email template generation tests
- [x] CSV report generation tests
- [x] File validation and encryption tests
- [ ] End-to-end tests for critical user flows
- [ ] Performance testing for map refresh and large datasets
- [ ] Security testing for encrypted fields and file access

## Deployment & Documentation
- [ ] Production environment setup
- [ ] Database backups and recovery procedures
- [ ] User documentation and guides
- [ ] Admin setup guide
- [ ] API documentation
- [ ] System monitoring and alerting

