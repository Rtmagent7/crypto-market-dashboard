import {
  Activity,
  ArrowLeftRight,
  ChartCandlestick,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: "/" | "/stocks" | "/fx" | "/status";
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/stocks", label: "Stocks", icon: ChartCandlestick },
  { href: "/fx", label: "FX", icon: ArrowLeftRight },
  { href: "/status", label: "Status", icon: Activity },
];

export const isActive = (pathname: string, href: NavItem["href"]): boolean =>
  href === "/" ? pathname === "/" || pathname.startsWith("/coins") : pathname.startsWith(href);
