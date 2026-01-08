import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Building2,
  MessageSquareText,
  Database,
  FileDown,
  Settings,
  TrendingUp,
  Crosshair,
  Search,
  ChevronLeft,
  ChevronRight,
  Command,
  Moon,
  Sun,
  Phone,
  ClipboardList,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
  badgeKey?: "hotLeads" | "reviewQueue";
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "G H" },
  { label: "Leads", href: "/leads", icon: Building2, shortcut: "G L" },
  { label: "Call Queue", href: "/call-queue", icon: Phone, shortcut: "G Q", badgeKey: "hotLeads" },
  { label: "Review Queue", href: "/review-queue", icon: ClipboardList, shortcut: "G R", badgeKey: "reviewQueue" },
  { label: "Scripts", href: "/scripts", icon: MessageSquareText },
  { label: "Scrape", href: "/scrape", icon: Database, shortcut: "G S" },
  { label: "ICP", href: "/icp", icon: Crosshair },
  { label: "Analytics", href: "/analytics", icon: TrendingUp, shortcut: "G A" },
];

const bottomNavItems: NavItem[] = [
  { label: "Export", href: "/export", icon: FileDown },
  { label: "Settings", href: "/settings", icon: Settings, shortcut: "G E" },
];

function NavLink({
  item,
  isCollapsed,
  isActive,
  badgeCount,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  badgeCount?: number;
}) {
  const content = (
    <Link href={item.href}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer relative",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <div className="relative">
          <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
          {isCollapsed && badgeCount && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badgeCount && badgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1.5">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
            {item.shortcut && !badgeCount && (
              <span className="text-xs text-muted-foreground/60 font-mono">
                {item.shortcut}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {badgeCount && badgeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
              {badgeCount}
            </span>
          )}
          {item.shortcut && (
            <span className="text-xs text-muted-foreground font-mono">
              {item.shortcut}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function ThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
  };

  const content = (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 w-full",
        "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Moon className="h-4 w-4 flex-shrink-0" />
      )}
      {!isCollapsed && (
        <span className="flex-1 text-left truncate">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function LinearSidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch hot leads count for badge (score >= 8)
  const { data: callQueueData } = useQuery({
    queryKey: ["/api/briefing", { minScore: 8, limit: 1 }],
    queryFn: async () => {
      const res = await fetch("/api/briefing?minScore=8&limit=1");
      if (!res.ok) return { total: 0 };
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  // Badge counts for navigation items
  const badgeCounts: Record<string, number> = {
    hotLeads: callQueueData?.total ?? 0,
    reviewQueue: 0, // TODO: implement review queue count
  };

  // Handle keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "[" && !e.ctrlKey && !e.metaKey) {
        if (
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)
        ) {
          setIsCollapsed((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
        isCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border">
        {!isCollapsed ? (
          <div className="flex items-center">
            <span className="text-sm font-semibold tracking-tight">
              <span className="text-primary">RLTX</span>
              <span className="text-muted-foreground font-normal ml-1">Lead Gen</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <span className="text-primary font-bold text-sm">R</span>
          </div>
        )}
      </div>

      {/* Search / Command Palette Trigger */}
      <div className="px-2 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                // Trigger command palette
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors duration-150",
                "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Search...</span>
                  <span className="flex items-center gap-0.5 text-xs">
                    <Command className="h-3 w-3" />K
                  </span>
                </>
              )}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="flex items-center gap-2">
              Search
              <span className="flex items-center gap-0.5 text-xs">
                <Command className="h-3 w-3" />K
              </span>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Quick Add Lead Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/leads/new">
              <button
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors duration-150 mt-2",
                  "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Add Lead</span>
                    <span className="flex items-center gap-0.5 text-xs font-mono">
                      <Command className="h-3 w-3" />N
                    </span>
                  </>
                )}
              </button>
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="flex items-center gap-2">
              Add Lead
              <span className="flex items-center gap-0.5 text-xs">
                <Command className="h-3 w-3" />N
              </span>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
            isActive={
              item.href === "/"
                ? location === "/"
                : location.startsWith(item.href)
            }
            badgeCount={item.badgeKey ? badgeCounts[item.badgeKey] : undefined}
          />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-2 py-2 space-y-1 border-t border-sidebar-border">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
            isActive={location.startsWith(item.href)}
          />
        ))}
        <ThemeToggle isCollapsed={isCollapsed} />
      </div>

      {/* Collapse Toggle */}
      <div className="px-2 py-2 border-t border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "flex items-center justify-center w-full py-2 rounded-md text-sm transition-colors duration-150",
                "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand sidebar" : "Collapse sidebar"} <span className="text-xs font-mono ml-1">[</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
