import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
  Flame,
  Mail,
  Linkedin,
  ExternalLink,
  Play,
  CheckCircle2,
  Clock,
  Crosshair,
  Database,
  Brain,
  Rocket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { GovernmentLead, IcpProfile } from "@shared/schema";
import { useState } from "react";

interface DashboardStats {
  totalLeads: number;
  highPriority: number;
  contacted: number;
  qualified: number;
}

interface HotLead {
  id: number;
  institutionName: string;
  institutionType: string;
  state: string;
  department: string | null;
  outreachScore: number | null;
  whyNow: string | null;
  email: string | null;
  phone: string | null;
  signalCount: number;
}

interface HotLeadsResponse {
  leads: HotLead[];
  total: number;
}

interface CallQueueResponse {
  leads: any[];
  total: number;
}

// Pipeline stages for visual flow
const PIPELINE_STAGES = [
  { id: "icp", label: "Target", icon: Crosshair, description: "Define ICP" },
  { id: "scrape", label: "Discover", icon: Database, description: "Find leads" },
  { id: "enrich", label: "Intelligence", icon: Brain, description: "Enrich data" },
  { id: "call", label: "Outreach", icon: Phone, description: "Make calls" },
];

function PipelineStage({
  stage,
  status,
  isLast,
}: {
  stage: typeof PIPELINE_STAGES[0];
  status: "complete" | "current" | "pending";
  isLast: boolean;
}) {
  const Icon = stage.icon;
  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
            status === "complete" && "bg-green-500 text-white",
            status === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
            status === "pending" && "bg-muted text-muted-foreground"
          )}
        >
          {status === "complete" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        <span className={cn(
          "text-xs mt-1 font-medium",
          status === "current" && "text-primary",
          status === "pending" && "text-muted-foreground"
        )}>
          {stage.label}
        </span>
      </div>
      {!isLast && (
        <div className={cn(
          "w-12 h-0.5 mx-2",
          status === "complete" ? "bg-green-500" : "bg-muted"
        )} />
      )}
    </div>
  );
}

function ActionCard({
  title,
  description,
  action,
  href,
  icon: Icon,
  variant = "default",
  stats,
}: {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: typeof Play;
  variant?: "default" | "success" | "warning";
  stats?: { label: string; value: number }[];
}) {
  return (
    <div className={cn(
      "rounded-xl border-2 p-6 transition-all hover:shadow-lg",
      variant === "success" && "border-green-500 bg-green-50 dark:bg-green-950/20",
      variant === "warning" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
      variant === "default" && "border-primary bg-primary/5"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3",
            variant === "success" && "bg-green-500/20 text-green-700 dark:text-green-300",
            variant === "warning" && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
            variant === "default" && "bg-primary/20 text-primary"
          )}>
            <Icon className="h-4 w-4" />
            Next Step
          </div>
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-4">{description}</p>
          {stats && stats.length > 0 && (
            <div className="flex gap-4 mb-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
          <Link href={href}>
            <button className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
              variant === "success" && "bg-green-500 hover:bg-green-600 text-white",
              variant === "warning" && "bg-yellow-500 hover:bg-yellow-600 text-white",
              variant === "default" && "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}>
              {action}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shrink-0 ml-4",
          variant === "success" && "bg-green-500/20",
          variant === "warning" && "bg-yellow-500/20",
          variant === "default" && "bg-primary/20"
        )}>
          <Icon className={cn(
            "h-8 w-8",
            variant === "success" && "text-green-600",
            variant === "warning" && "text-yellow-600",
            variant === "default" && "text-primary"
          )} />
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: typeof Building2;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={cn(
      "p-4 rounded-lg border border-border bg-card transition-all",
      href && "hover:border-primary/40 cursor-pointer"
    )}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("h-5 w-5", color)} />
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function HotLeadItem({ lead }: { lead: HotLead }) {
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer border-b last:border-b-0">
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{lead.institutionName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {lead.whyNow || `${lead.institutionType} | ${lead.state}`}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-semibold text-orange-600">{lead.outreachScore}/10</span>
          <div className="flex gap-1 mt-1">
            {lead.phone && <Phone className="h-3 w-3 text-green-500" />}
            {lead.email && <Mail className="h-3 w-3 text-blue-500" />}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch all data needed to determine pipeline state
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: icpProfiles = [] } = useQuery<IcpProfile[]>({
    queryKey: ["/api/icp"],
  });

  const { data: hotLeadsData, isLoading: hotLeadsLoading } = useQuery<HotLeadsResponse>({
    queryKey: ["/api/messages/pending-review"],
    queryFn: async () => {
      const res = await fetch("/api/messages/pending-review?limit=10");
      if (!res.ok) return { leads: [], total: 0 };
      return res.json();
    },
  });

  const { data: callQueueData } = useQuery<CallQueueResponse>({
    queryKey: ["/api/briefing", { minScore: 6 }],
    queryFn: async () => {
      const res = await fetch("/api/briefing?minScore=6&limit=50");
      if (!res.ok) return { leads: [], total: 0 };
      return res.json();
    },
  });

  const scoreAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/leads/score-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/pending-review"] });
      toast({
        title: "Scoring complete",
        description: "All leads have been scored. Check the Call Queue for ready leads.",
      });
    },
  });

  // Determine pipeline state
  const activeIcps = icpProfiles.filter((icp) => icp.isActive);
  const hasIcp = activeIcps.length > 0;
  const hasLeads = (stats?.totalLeads ?? 0) > 0;
  const hasReadyLeads = (callQueueData?.total ?? 0) > 0;
  const hotLeadsCount = hotLeadsData?.total ?? 0;

  // Determine current stage
  let currentStage = "icp";
  let stageStatuses: Record<string, "complete" | "current" | "pending"> = {
    icp: "current",
    scrape: "pending",
    enrich: "pending",
    call: "pending",
  };

  if (hasIcp && !hasLeads) {
    currentStage = "scrape";
    stageStatuses = { icp: "complete", scrape: "current", enrich: "pending", call: "pending" };
  } else if (hasLeads && !hasReadyLeads) {
    currentStage = "enrich";
    stageStatuses = { icp: "complete", scrape: "complete", enrich: "current", call: "pending" };
  } else if (hasReadyLeads) {
    currentStage = "call";
    stageStatuses = { icp: "complete", scrape: "complete", enrich: "complete", call: "current" };
  }

  // Determine action card content
  let actionCard = {
    title: "Set Up Your Target Market",
    description: "Define your Ideal Customer Profile (ICP) to start finding leads. Choose your vertical, target criteria, and pain points.",
    action: "Configure ICP",
    href: "/icp",
    icon: Crosshair,
    variant: "default" as const,
    stats: undefined as { label: string; value: number }[] | undefined,
  };

  if (hasIcp && !hasLeads) {
    actionCard = {
      title: "Start Finding Leads",
      description: `You have ${activeIcps.length} active ICP${activeIcps.length > 1 ? "s" : ""} configured. Start scraping to discover contacts matching your criteria.`,
      action: "Start Scraping",
      href: "/scrape",
      icon: Database,
      variant: "default",
      stats: [{ label: "Active ICPs", value: activeIcps.length }],
    };
  } else if (hasLeads && !hasReadyLeads) {
    actionCard = {
      title: "Process Your Leads",
      description: "Your leads need enrichment and scoring to be ready for outreach. This adds intelligence like decision makers, buying signals, and 'Why Now' context.",
      action: "Score All Leads",
      href: "#",
      icon: Brain,
      variant: "warning",
      stats: [
        { label: "Total Leads", value: stats?.totalLeads ?? 0 },
        { label: "Need Scoring", value: (stats?.totalLeads ?? 0) - (stats?.highPriority ?? 0) },
      ],
    };
  } else if (hasReadyLeads) {
    actionCard = {
      title: "Start Making Calls",
      description: `You have ${callQueueData?.total ?? 0} leads ready for outreach with AI-powered briefings. Each lead has scripts, decision makers, and context prepared.`,
      action: "Open Call Queue",
      href: "/call-queue",
      icon: Phone,
      variant: "success",
      stats: [
        { label: "Ready to Call", value: callQueueData?.total ?? 0 },
        { label: "Hot Leads", value: hotLeadsCount },
      ],
    };
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">RLTX.ai Command Center</h1>
              <p className="text-sm text-muted-foreground">Your AI-native prospecting pipeline</p>
            </div>
            <div className="flex items-center gap-2">
              {hasLeads && (
                <button
                  onClick={() => scoreAllMutation.mutate()}
                  disabled={scoreAllMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {scoreAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Re-Score All
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Pipeline Progress */}
        <div className="flex items-center justify-center py-4 bg-card rounded-xl border">
          {PIPELINE_STAGES.map((stage, idx) => (
            <PipelineStage
              key={stage.id}
              stage={stage}
              status={stageStatuses[stage.id]}
              isLast={idx === PIPELINE_STAGES.length - 1}
            />
          ))}
        </div>

        {/* Primary Action Card */}
        {actionCard.href === "#" ? (
          <div
            onClick={() => scoreAllMutation.mutate()}
            className="cursor-pointer"
          >
            <ActionCard {...actionCard} href="/leads" />
          </div>
        ) : (
          <ActionCard {...actionCard} />
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStatCard
            title="Total Leads"
            value={stats?.totalLeads ?? 0}
            icon={Building2}
            color="text-blue-500"
            href="/leads"
          />
          <QuickStatCard
            title="Ready to Call"
            value={callQueueData?.total ?? 0}
            icon={Phone}
            color="text-green-500"
            href="/call-queue"
          />
          <QuickStatCard
            title="Hot Leads"
            value={hotLeadsCount}
            icon={Flame}
            color="text-orange-500"
            href="/review-queue"
          />
          <QuickStatCard
            title="Contacted"
            value={stats?.contacted ?? 0}
            icon={CheckCircle2}
            color="text-purple-500"
            href="/analytics"
          />
        </div>

        {/* Hot Leads Section - Only show if there are hot leads */}
        {hotLeadsCount > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="font-semibold">Hot Leads Ready for Outreach</h2>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-xs font-medium">
                  {hotLeadsCount} leads
                </span>
              </div>
              <Link href="/call-queue">
                <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Start Calling
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
            <div className="divide-y">
              {hotLeadsData?.leads.slice(0, 5).map((lead) => (
                <HotLeadItem key={lead.id} lead={lead} />
              ))}
            </div>
            {hotLeadsCount > 5 && (
              <div className="px-4 py-3 border-t bg-muted/30">
                <Link href="/review-queue">
                  <button className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors">
                    View all {hotLeadsCount} hot leads →
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/leads/new">
            <div className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium">Add Lead Manually</div>
                  <div className="text-sm text-muted-foreground">Enter contact details directly</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/icp">
            <div className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium">Configure ICPs</div>
                  <div className="text-sm text-muted-foreground">Adjust targeting criteria</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/analytics">
            <div className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="font-medium">View Analytics</div>
                  <div className="text-sm text-muted-foreground">Track conversion & performance</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
