export interface NavigationItem {
  label: string;
  href: string;
}

export function getNavigationItems(role?: string | null): NavigationItem[] {
  const items: NavigationItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Leave Balance", href: "/leave-balance" },
    { label: "Monthly Reports", href: "/monthly-reports" },
  ];

  if (role === "admin") {
    items.push(
      { label: "Executive", href: "/executive" },
      { label: "Admin", href: "/admin" },
      { label: "Analytics", href: "/analytics" },
    );
  }

  return items;
}
