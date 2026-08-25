# SDG Timesheet System — Deployment Checklist

Before release, confirm that the database schema and latest migration are applied, built-in authentication and notification environment values are available, and the application starts without TypeScript or server errors. Run the full Vitest suite and record the passing and skipped test counts.

Verify the critical workflow in a browser: staff GPS check-in, multi-task timesheet submission, GPS check-out enforcement, leave request and admin decision notification, Admin attendance and waypoint synchronization, monthly report review, CSV/Excel/PDF export, and backup preview and restore safeguards. Verify the Admin dashboard at desktop, tablet, and phone widths, including filters, heatmap cards, map details, and horizontally scrollable detail tables where required.

After validation, save a checkpoint. Because this project uses automatic publishing, the successful checkpoint is the production release. Monitor runtime logs after release and retain the generated database backup before any destructive maintenance or restore operation.
