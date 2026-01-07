import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScrapeJob } from "@shared/schema";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  running: RefreshCw,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

export default function ScrapePage() {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: jobs, isLoading: jobsLoading } = useQuery<ScrapeJob[]>({
    queryKey: ["/api/scrape/jobs"],
  });

  const startScrapeMutation = useMutation({
    mutationFn: async (states: string[]) => {
      return apiRequest("POST", "/api/scrape/start", { states });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scrape/jobs"] });
      toast({
        title: "Scraping Started",
        description: `Started scraping government data for ${selectedStates.length} state(s).`,
      });
      setSelectedStates([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start scraping. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const selectAll = () => setSelectedStates(US_STATES);
  const clearAll = () => setSelectedStates([]);

  const activeJob = jobs?.find((j) => j.status === "running");
  const progress = activeJob
    ? Math.round((activeJob.statesCompleted / activeJob.totalStates) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Scrape Governments
        </h1>
        <p className="text-muted-foreground">
          Collect county and local government contact information
        </p>
      </div>

      {activeJob && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <CardTitle className="text-lg">Scraping in Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>
                {activeJob.statesCompleted} of {activeJob.totalStates} states completed
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {activeJob.leadsFound} leads found
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Select States</CardTitle>
                <CardDescription className="mt-1">
                  Choose which states to scrape for government contacts
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll} data-testid="button-clear-all">
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {US_STATES.map((state) => (
                  <label
                    key={state}
                    className={`flex items-center gap-2 p-3 rounded-md cursor-pointer border transition-colors ${
                      selectedStates.includes(state)
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover-elevate"
                    }`}
                  >
                    <Checkbox
                      checked={selectedStates.includes(state)}
                      onCheckedChange={() => toggleState(state)}
                      data-testid={`checkbox-state-${state.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <span className="text-sm">{state}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedStates.length} state(s) selected
              </span>
              <Button
                onClick={() => startScrapeMutation.mutate(selectedStates)}
                disabled={selectedStates.length === 0 || startScrapeMutation.isPending || !!activeJob}
                data-testid="button-start-scrape"
              >
                <Play className="h-4 w-4 mr-2" />
                {startScrapeMutation.isPending ? "Starting..." : "Start Scraping"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>History of scraping operations</CardDescription>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
                ))}
              </div>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job) => {
                  const Icon = statusIcons[job.status];
                  return (
                    <div
                      key={job.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-md"
                      data-testid={`job-${job.id}`}
                    >
                      <Icon
                        className={`h-4 w-4 mt-0.5 ${
                          job.status === "running" ? "animate-spin text-blue-500" : ""
                        } ${job.status === "completed" ? "text-green-500" : ""} ${
                          job.status === "failed" ? "text-red-500" : ""
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusColors[job.status]} border-0 capitalize`}>
                            {job.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {job.statesCompleted}/{job.totalStates} states •{" "}
                          {job.leadsFound} leads
                        </div>
                        {job.createdAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(job.createdAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No scrape jobs yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
