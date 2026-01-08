import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
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
import { extractArray } from "@/lib/utils";
import type { GovernmentLead } from "@shared/schema";
import { useState } from "react";

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

const ITEMS_PER_PAGE = 20;

function LeadsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("priorityScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: leadsData, isLoading } = useQuery<unknown>({
    queryKey: ["/api/leads"],
  });

  const leads = extractArray<GovernmentLead>(leadsData);

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        searchQuery === "" ||
        lead.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.county?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (lead.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesState = stateFilter === "all" || lead.state === stateFilter;
      const matchesType = typeFilter === "all" || lead.institutionType === typeFilter;

      return matchesSearch && matchesStatus && matchesState && matchesType;
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof GovernmentLead];
      const bVal = b[sortBy as keyof GovernmentLead];

      // Handle null/undefined - push to end
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === "asc" ? 1 : -1;
      if (bVal == null) return sortOrder === "asc" ? -1 : 1;

      // String comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Numeric comparison (only for actual numbers)
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Fallback: convert to string for other types
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortOrder === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueStates = Array.from(new Set(leads.map((l) => l.state))).sort();
  const uniqueTypes = Array.from(new Set(leads.map((l) => l.institutionType))).sort();

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          All Leads
        </h1>
        <p className="text-muted-foreground">
          {filteredLeads.length} government leads
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 w-64"
                data-testid="input-search-leads"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
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
            <Select
              value={stateFilter}
              onValueChange={(v) => {
                setStateFilter(v);
                setCurrentPage(1);
              }}
            >
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
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-36" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LeadsTableSkeleton />
          ) : paginatedLeads.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 -ml-3"
                          onClick={() => handleSort("institutionName")}
                        >
                          Institution
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 -ml-3"
                          onClick={() => handleSort("priorityScore")}
                        >
                          Priority
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 -ml-3"
                          onClick={() => handleSort("likelihoodScore")}
                        >
                          Likelihood
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 -ml-3"
                          onClick={() => handleSort("matchScore")}
                        >
                          Match
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="hover-elevate cursor-pointer"
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <TableCell>
                          <Link href={`/leads/${lead.id}`}>
                            <div className="flex flex-col">
                              <span className="font-medium">{lead.institutionName}</span>
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
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{lead.state}</span>
                            {lead.county && (
                              <span className="text-xs text-muted-foreground">
                                {lead.county} County
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                (lead.priorityScore ?? 0) >= 80
                                  ? "bg-green-500"
                                  : (lead.priorityScore ?? 0) >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className={`text-sm font-medium ${
                              (lead.priorityScore ?? 0) >= 80
                                ? "text-green-600 dark:text-green-400"
                                : (lead.priorityScore ?? 0) >= 50
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {lead.priorityScore ?? "--"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${
                            (lead.likelihoodScore ?? 0) >= 80
                              ? "text-green-600 dark:text-green-400"
                              : (lead.likelihoodScore ?? 0) >= 50
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-muted-foreground"
                          }`}>
                            {lead.likelihoodScore ?? "--"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${
                            (lead.matchScore ?? 0) >= 80
                              ? "text-green-600 dark:text-green-400"
                              : (lead.matchScore ?? 0) >= 50
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-muted-foreground"
                          }`}>
                            {lead.matchScore ?? "--"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[lead.status]} border-0`}>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} of{" "}
                    {filteredLeads.length} leads
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      data-testid="button-first-page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      data-testid="button-last-page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No leads found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || stateFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start by scraping government data"}
              </p>
              {!searchQuery && statusFilter === "all" && stateFilter === "all" && typeFilter === "all" && (
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
