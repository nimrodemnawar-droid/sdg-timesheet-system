
The mobile Admin screenshot at `/admin?tab=leave` rendered the Admin dashboard but fell back to the Staff tab rather than opening the Leave tab. This indicates the shared Admin tab allowlist/deep-link resolver does not currently include the live leave management tab, so the direct Admin leave link needs to be restored while keeping removed tabs blocked.

Tablet verification at 768px confirmed both Staff and Admin pages render with the expected data and the Admin Leave tab is active through the query deep link. The tablet header and dashboard tab strips are still visually dense, with labels close together, so the next responsive refinement should improve horizontal overflow and header wrapping at tablet widths.

The latest tablet capture confirms the top header is no longer crowded: only the brand, user name, and logout control remain visible at 768px. The Admin Leave deep link opens the Leave tab correctly. The in-page Admin tab strip is now contained in one horizontal row with overflow scrolling, although its labels remain compact by design at tablet width.
