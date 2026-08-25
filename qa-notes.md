# Verification Notes

- The valid Staff route is `/dashboard`, not `/staff`; `/staff` correctly renders the 404 page.
- Mobile preview at 375x812 rendered `/dashboard` and `/admin` without build or TypeScript errors.
- Staff dashboard visibly shows annual leave balance at 21.00 days, confirming the annual entitlement reconciliation is reflected in the UI.
- The Admin dashboard remains responsive at the mobile breakpoint. The newly added task/history controls are below the initial viewport and require scroll-level verification.

The full-page mobile capture confirmed the staff dashboard renders the checkout prerequisite warning and the Admin dashboard renders without runtime errors. However, the dense multi-tab strip is visually crowded at 375px, so the tab list should be made horizontally scrollable or otherwise simplified before delivery. The new history content is structurally below the current dashboard sections and will remain accessible by scrolling.

After the tab-strip refinement, the Staff dashboard remains readable at 375px and the checkout prerequisite warning is visible. The tab row is now horizontally scrollable rather than wrapping into a dense overlapping block; full-page capture showed no runtime or TypeScript errors.
