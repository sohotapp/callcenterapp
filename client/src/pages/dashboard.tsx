import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  Phone,
  TrendingUp,
  Target,
  ChevronRight,
  Search,
  RefreshCw,
  Zap,
  ArrowRight,
  Circle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { GovernmentLead } from "@shared/schema";
import { useState } from "react";

interface DashboardStats {
  totalLeads: number;
  highPriority: number;
  contacted: number;
  qualified: number;
}

interface PaginatedLeadsResponse {
  data: GovernmentLead[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  not_contacted: { label: "Not Contacted", color: "text-neutral-500", bgColor: "bg-neutral-100 dark:bg-neutral-800" },
  contacted: { label: "Contacted", color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-900/30" },
  follow_up: { label: "Follow Up", color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-900/30" },
  qualified: { label: "Qualified", color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-900/30" },
  closed_won: { label: "Won", color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-900/30" },
  closed_lost: { label: "Lost", color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/30" },
};

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  loading,
}: {
  title: string;
  value: number | string;
  icon: typeof Building2;
  iconColor: string;
  loading?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      ) : (
        <span className="text-2xl font-semibold">{value}</span>
      )}
    </div>
  );
}

function LeadRow({ lead }: { lead: GovernmentLead }) {
  const status = statusConfig[lead.status] || statusConfig.not_contacted;
  const priorityScore = lead.priorityScore ?? 0;

  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="group flex items-center gap-4 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b border-border last:border-b-0">
        {/* Priority indicator */}
        <div className="flex items-center justify-center w-8">
          <Circle
            className={cn(
              "h-2.5 w-2.5 fill-current",
              priorityScore >= 70
                ? "text-green-500"
                : priorityScore >= 40
                ? "text-yellow-500"
                : "text-muted-foreground"
            )}
          />
        </div>

        {/* Lead info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{lead.institutionName}</span>
            {lead.department && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                {lead.department}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{lead.state}</span>
            {lead.county && (
              <>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">{lead.county}</span>
              </>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 w-20">
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              priorityScore >= 70
                ? "text-green-600 dark:text-green-400"
                : priorityScore >= 40
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-muted-foreground"
            )}
          >
            {priorityScore}
          </span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                priorityScore >= 70
                  ? "bg-green-500"
                  : priorityScore >= 40
                  ? "bg-yellow-500"
                  : "bg-muted-foreground/30"
              )}
              style={{ width: `${priorityScore}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="hidden md:flex items-center w-28">
          <span className={cn("text-xs px-2 py-1 rounded", status.bgColor, status.color)}>
            {status.label}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && (
        <Link href={action.href}>
          <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />;
}

// Helper to safely extract array from API response
function extractLeadsArray(data: unknown): GovernmentLead[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError } = useQuery<PaginatedLeadsResponse>({
    queryKey: ["/api/leads"],
  });

  const { data: topScoredData, isLoading: topScoredLoading, isError: topScoredError } = useQuery<GovernmentLead[]>({
    queryKey: ["/api/leads/top-scored"],
  });

  const scoreAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/leads/score-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/top-scored"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Scoring complete",
        description: "All leads have been scored successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Scoring failed",
        description: "Failed to score leads. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Safely extract leads arrays
  const leads = extractLeadsArray(leadsData);
  const topScoredLeads = extractLeadsArray(topScoredData);

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.institutionName?.toLowerCase().includes(query) ||
      lead.state?.toLowerCase().includes(query) ||
      (lead.county?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Government sales pipeline overview</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => scoreAllMutation.mutate()}
              disabled={scoreAllMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {scoreAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {scoreAllMutation.isPending ? "Scoring..." : "Score All"}
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={stats?.totalLeads ?? 0}
            icon={Building2}
            iconColor="text-blue-500"
            loading={statsLoading}
          />
          <StatCard
            title="High Priority"
            value={stats?.highPriority ?? 0}
            icon={Target}
            iconColor="text-orange-500"
            loading={statsLoading}
          />
          <StatCard
            title="Contacted"
            value={stats?.contacted ?? 0}
            icon={Phone}
            iconColor="text-green-500"
            loading={statsLoading}
          />
          <StatCard
            title="Qualified"
            value={stats?.qualified ?? 0}
            icon={TrendingUp}
            iconColor="text-purple-500"
            loading={statsLoading}
          />
        </div>

        {/* Top Scored Leads */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <h2 className="text-sm font-medium">Top Scored Leads</h2>
            </div>
            <Link href="/leads">
              <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
            </Link>
          </div>
          <div>
            {topScoredLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topScoredError ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-muted-foreground">Failed to load top leads</p>
                </div>
              </div>
            ) : topScoredLeads.length > 0 ? (
              topScoredLeads.slice(0, 5).map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))
            ) : (
              <EmptyState
                icon={Target}
                title="No scored leads"
                description="Score your leads to see top priorities"
                action={{ label: "Score Leads", href: "/leads" }}
              />
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Recent Leads</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-muted/50 border-0 rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
          <div>
            {leadsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : leadsError ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-muted-foreground">Failed to load leads</p>
                </div>
              </div>
            ) : filteredLeads.length > 0 ? (
              filteredLeads.slice(0, 10).map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))
            ) : leads.length > 0 ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description="Try adjusting your search query"
              />
            ) : (
              <EmptyState
                icon={Building2}
                title="No leads yet"
                description="Start by scraping government data to populate your pipeline"
                action={{ label: "Start Scraping", href: "/scrape" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
