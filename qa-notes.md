
The mobile Admin screenshot at `/admin?tab=leave` rendered the Admin dashboard but fell back to the Staff tab rather than opening the Leave tab. This indicates the shared Admin tab allowlist/deep-link resolver does not currently include the live leave management tab, so the direct Admin leave link needs to be restored while keeping removed tabs blocked.
