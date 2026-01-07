import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  Phone,
  TrendingUp,
  Target,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { GovernmentLead } from "@shared/schema";
import { useState } from "react";

interface DashboardStats {
  totalLeads: number;
  highPriority: number;
  contacted: number;
  qualified: number;
}

const statusColors: Record<string, string> = {
  not_contacted: "bg-muted text-muted-foreground",
  contacted: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  follow_up: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  qualified: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  closed_won: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  closed_lost: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  follow_up: "Follow Up",
  qualified: "Qualified",
  closed_won: "Won",
  closed_lost: "Lost",
};

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: number | string;
  icon: typeof Building2;
  trend?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </span>
            {trend && (
              <span className="text-xs text-muted-foreground">{trend}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<GovernmentLead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: topScoredLeads, isLoading: topScoredLoading } = useQuery<GovernmentLead[]>({
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
        title: "Scoring Complete",
        description: "All leads have been scored successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Scoring Failed",
        description: "Failed to score leads. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      searchQuery === "" ||
      lead.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.county?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    const matchesState = stateFilter === "all" || lead.state === stateFilter;

    return matchesSearch && matchesStatus && matchesState;
  });

  const uniqueStates = Array.from(new Set(leads?.map((l) => l.state) ?? [])).sort();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Government sales pipeline overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          icon={Building2}
          loading={statsLoading}
        />
        <StatCard
          title="High Priority"
          value={stats?.highPriority ?? 0}
          icon={Target}
          loading={statsLoading}
        />
        <StatCard
          title="Contacted"
          value={stats?.contacted ?? 0}
          icon={Phone}
          loading={statsLoading}
        />
        <StatCard
          title="Qualified"
          value={stats?.qualified ?? 0}
          icon={TrendingUp}
          loading={statsLoading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Top Scored Leads
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => scoreAllMutation.mutate()}
            disabled={scoreAllMutation.isPending}
            data-testid="button-score-all"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scoreAllMutation.isPending ? "animate-spin" : ""}`} />
            {scoreAllMutation.isPending ? "Scoring..." : "Score All Leads"}
          </Button>
        </CardHeader>
        <CardContent>
          {topScoredLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : topScoredLeads && topScoredLeads.length > 0 ? (
            <div className="space-y-3">
              {topScoredLeads.slice(0, 5).map((lead, idx) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div
                    className="flex items-center justify-between gap-4 p-3 rounded-md hover-elevate cursor-pointer bg-muted/50"
                    data-testid={`top-lead-${lead.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{lead.institutionName}</span>
                        <span className="text-xs text-muted-foreground">{lead.state}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1 min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${(lead.priorityScore ?? 0) >= 80 ? "text-green-600 dark:text-green-400" : (lead.priorityScore ?? 0) >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                            {lead.priorityScore ?? 0}
                          </span>
                        </div>
                        <Progress value={lead.priorityScore ?? 0} className="h-1 w-full" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Star className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-medium">No scored leads</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Score your leads to see top priorities
              </p>
              <Button
                className="mt-3"
                onClick={() => scoreAllMutation.mutate()}
                disabled={scoreAllMutation.isPending}
                data-testid="button-score-all-empty"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${scoreAllMutation.isPending ? "animate-spin" : ""}`} />
                Score All Leads
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-lg">Recent Leads</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-leads"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_contacted">Not Contacted</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="closed_won">Won</SelectItem>
                <SelectItem value="closed_lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-36" data-testid="select-state-filter">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <LeadsTableSkeleton />
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <Button variant="ghost" size="sm" className="gap-1 -ml-3">
                        Institution
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.slice(0, 10).map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="hover-elevate cursor-pointer"
                      data-testid={`row-lead-${lead.id}`}
                    >
                      <TableCell>
                        <Link href={`/leads/${lead.id}`}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {lead.institutionName}
                            </span>
                            {lead.department && (
                              <span className="text-xs text-muted-foreground">
                                {lead.department}
                              </span>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {lead.institutionType}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.state}</TableCell>
                      <TableCell>
                        {lead.phoneNumber ? (
                          <span className="font-mono text-sm">
                            {lead.phoneNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              (lead.priorityScore ?? 0) >= 70
                                ? "bg-green-500"
                                : (lead.priorityScore ?? 0) >= 40
                                ? "bg-yellow-500"
                                : "bg-muted-foreground"
                            }`}
                          />
                          <span className="text-sm">
                            {lead.priorityScore ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[lead.status]} border-0`}
                        >
                          {statusLabels[lead.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/leads/${lead.id}`}>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-view-lead-${lead.id}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No leads found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || stateFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start by scraping government data"}
              </p>
              {!searchQuery && statusFilter === "all" && stateFilter === "all" && (
                <Link href="/scrape">
                  <Button className="mt-4" data-testid="button-start-scraping">
                    Start Scraping
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
