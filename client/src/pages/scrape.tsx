import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  MapPin,
  ExternalLink,
  Layers,
  Target,
  Database,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScrapeJob, IcpProfile } from "@shared/schema";

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

interface PlaybookScrapeJobResponse {
  message: string;
  scrapeJobId: number;
  icpId: number;
  icpName: string;
  entitiesCount: number;
}

export default function ScrapePage() {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("government");
  const [selectedIcpId, setSelectedIcpId] = useState<string>("");
  const [entityInput, setEntityInput] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [playbookJobId, setPlaybookJobId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const previousJobsRef = useRef<ScrapeJob[]>([]);

  const { data: jobs, isLoading: jobsLoading } = useQuery<ScrapeJob[]>({
    queryKey: ["/api/scrape/jobs"],
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActiveJob = data?.some((j) => j.status === "running" || j.status === "pending");
      return hasActiveJob ? 2000 : false;
    },
  });

  const { data: icpProfiles, isLoading: icpLoading } = useQuery<IcpProfile[]>({
    queryKey: ["/api/icp"],
  });

  const { data: apiKeyStatus } = useQuery<{ tavily: boolean; anthropic: boolean }>({
    queryKey: ["/api/system/api-keys-status"],
    staleTime: 60000,
  });

  const selectedIcp = icpProfiles?.find((icp) => icp.id.toString() === selectedIcpId);
  const missingApiKeys = apiKeyStatus && (!apiKeyStatus.tavily || !apiKeyStatus.anthropic);

  useEffect(() => {
    if (!jobs) return;
    
    const previousJobs = previousJobsRef.current;
    const wasRunning = previousJobs.some((j) => j.status === "running");
    const nowCompleted = jobs.some((j) => 
      j.status === "completed" && 
      previousJobs.find((pj) => pj.id === j.id)?.status === "running"
    );

    if (wasRunning && nowCompleted) {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/top-scored"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/funnel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/response-rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/by-icp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/by-state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/over-time"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      
      const completedJob = jobs.find((j) => 
        j.status === "completed" && 
        previousJobs.find((pj) => pj.id === j.id)?.status === "running"
      );
      
      toast({
        title: "Scraping Complete",
        description: `Found ${completedJob?.leadsFound ?? 0} leads from ${completedJob?.totalStates ?? 0} state(s).`,
      });
    }

    previousJobsRef.current = jobs;
  }, [jobs, toast]);

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

  const playbookScrapeMutation = useMutation({
    mutationFn: async ({ icpId, entities }: { icpId: number; entities: Array<{ name: string; state?: string }> }) => {
      const response = await apiRequest("POST", `/api/icp/${icpId}/playbook-scrape`, {
        entities,
        maxResults: 5,
        dryRun: false,
      });
      return response.json() as Promise<PlaybookScrapeJobResponse>;
    },
    onSuccess: (data) => {
      setPlaybookJobId(data.scrapeJobId);
      queryClient.invalidateQueries({ queryKey: ["/api/scrape/jobs"] });
      toast({
        title: "Playbook Scraping Started",
        description: `Started scraping ${data.entitiesCount} entities for ${data.icpName}. Track progress below.`,
      });
      setEntityInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start playbook scraping. Please try again.",
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

  const parseEntities = (input: string): Array<{ name: string; state?: string }> => {
    return input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((name) => ({
        name,
        state: stateFilter || undefined,
      }));
  };

  const entities = parseEntities(entityInput);

  const handlePlaybookScrape = () => {
    if (!selectedIcpId || entities.length === 0) return;
    playbookScrapeMutation.mutate({
      icpId: parseInt(selectedIcpId),
      entities,
    });
  };

  const getEntityPlaceholder = () => {
    if (!selectedIcp) return "Select an ICP profile first...";
    const entityTypes = selectedIcp.playbookConfig?.targetEntityTypes || [];
    if (entityTypes.includes("hospital")) {
      return "Mayo Clinic\nCleveland Clinic\nJohns Hopkins Hospital";
    }
    if (entityTypes.includes("law_firm")) {
      return "Kirkland & Ellis\nLatham & Watkins\nSkadden Arps";
    }
    if (entityTypes.includes("bank")) {
      return "JPMorgan Chase\nBank of America\nWells Fargo";
    }
    return "Los Angeles County\nCook County\nHarris County";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Lead Scraping
        </h1>
        <p className="text-muted-foreground">
          Collect contact information from various data sources
        </p>
      </div>

      {missingApiKeys && (
        <Alert variant="destructive" data-testid="alert-missing-api-keys">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Keys Missing</AlertTitle>
          <AlertDescription>
            Scraping requires API keys to be configured. Missing: 
            {!apiKeyStatus?.tavily && " Tavily API Key"}
            {!apiKeyStatus?.tavily && !apiKeyStatus?.anthropic && ","}
            {!apiKeyStatus?.anthropic && " Anthropic API Key"}
            . Please add these in your Replit Secrets.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-scrape-mode">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="government" data-testid="tab-government">
            <Building2 className="h-4 w-4 mr-2" />
            Government
          </TabsTrigger>
          <TabsTrigger value="playbook" data-testid="tab-playbook">
            <Layers className="h-4 w-4 mr-2" />
            Playbook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="government" className="mt-6">
          {activeJob && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 mb-6">
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
                      const isClickable = job.status === "completed" && job.leadsFound > 0;
                      return (
                        <div
                          key={job.id}
                          className={`flex items-start gap-3 p-3 bg-muted/50 rounded-md ${
                            isClickable ? "cursor-pointer hover-elevate" : ""
                          }`}
                          data-testid={`job-${job.id}`}
                          onClick={() => {
                            if (isClickable) {
                              setLocation("/leads");
                              toast({
                                title: "Viewing Scraped Leads",
                                description: `Showing ${job.leadsFound} leads from this scrape job.`,
                              });
                            }
                          }}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
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
                              {isClickable && (
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              )}
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
        </TabsContent>

        <TabsContent value="playbook" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>ICP-Based Scraping</CardTitle>
                <CardDescription className="mt-1">
                  Enter entity names to scrape using the selected ICP's playbook configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ICP Profile</label>
                    <Select 
                      value={selectedIcpId} 
                      onValueChange={setSelectedIcpId}
                      data-testid="select-icp-profile"
                    >
                      <SelectTrigger data-testid="select-icp-trigger">
                        <SelectValue placeholder="Select an ICP profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {icpLoading ? (
                          <SelectItem value="_loading" disabled>Loading...</SelectItem>
                        ) : icpProfiles && icpProfiles.length > 0 ? (
                          icpProfiles.map((icp) => (
                            <SelectItem 
                              key={icp.id} 
                              value={icp.id.toString()}
                              data-testid={`select-icp-option-${icp.id}`}
                            >
                              {icp.displayName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="_none" disabled>No ICP profiles available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">State Filter (Optional)</label>
                    <Select 
                      value={stateFilter || "_all"} 
                      onValueChange={(val) => setStateFilter(val === "_all" ? "" : val)}
                      data-testid="select-state-filter"
                    >
                      <SelectTrigger data-testid="select-state-filter-trigger">
                        <SelectValue placeholder="All states" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All states</SelectItem>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedIcp?.playbookConfig && (
                  <div className="p-4 bg-muted/50 rounded-md space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Target className="h-4 w-4" />
                      Playbook Configuration
                    </div>
                    <div className="grid gap-3 text-sm">
                      {selectedIcp.playbookConfig.targetEntityTypes && selectedIcp.playbookConfig.targetEntityTypes.length > 0 && (
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="text-muted-foreground min-w-[120px]">Entity Types:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedIcp.playbookConfig.targetEntityTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="capitalize">
                                {type.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIcp.playbookConfig.dataSources && selectedIcp.playbookConfig.dataSources.length > 0 && (
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="text-muted-foreground min-w-[120px]">
                            <Database className="h-3 w-3 inline mr-1" />
                            Data Sources:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedIcp.playbookConfig.dataSources.map((source) => (
                              <Badge key={source} variant="outline" className="capitalize">
                                {source.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIcp.playbookConfig.valueProposition && (
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="text-muted-foreground min-w-[120px]">
                            <FileText className="h-3 w-3 inline mr-1" />
                            Value Prop:
                          </span>
                          <span className="text-muted-foreground italic">
                            {selectedIcp.playbookConfig.valueProposition}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity Names (one per line)</label>
                  <Textarea
                    value={entityInput}
                    onChange={(e) => setEntityInput(e.target.value)}
                    placeholder={getEntityPlaceholder()}
                    className="min-h-[200px] font-mono text-sm"
                    disabled={!selectedIcpId}
                    data-testid="textarea-entities"
                  />
                  <p className="text-xs text-muted-foreground">
                    {entities.length} entit{entities.length === 1 ? "y" : "ies"} to scrape
                    {stateFilter && ` in ${stateFilter}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {selectedIcp ? `Using ${selectedIcp.displayName} playbook` : "Select an ICP profile to continue"}
                  </span>
                  <Button
                    onClick={handlePlaybookScrape}
                    disabled={!selectedIcpId || entities.length === 0 || playbookScrapeMutation.isPending}
                    data-testid="button-start-playbook-scrape"
                  >
                    {playbookScrapeMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Scraping
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scrape Jobs</CardTitle>
                <CardDescription>Recent playbook scraping jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const playbookJobs = jobs?.filter((j) => j.icpId != null) || [];
                  const activePlaybookJob = playbookJobs.find((j) => j.status === "running");
                  
                  if (playbookScrapeMutation.isPending) {
                    return (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">Starting scrape job...</p>
                      </div>
                    );
                  }
                  
                  if (activePlaybookJob) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="font-medium">Scraping in progress</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {activePlaybookJob.icpName && (
                            <p>ICP: {activePlaybookJob.icpName}</p>
                          )}
                          <p>{activePlaybookJob.leadsFound} leads found so far</p>
                        </div>
                        <Progress value={50} className="h-2" />
                      </div>
                    );
                  }
                  
                  if (playbookJobs.length > 0) {
                    const recentJobs = playbookJobs.slice(0, 5);
                    return (
                      <div className="space-y-4">
                        <ScrollArea className="h-[250px]">
                          <div className="space-y-2">
                            {recentJobs.map((job) => {
                              const StatusIcon = statusIcons[job.status] || Clock;
                              return (
                                <div
                                  key={job.id}
                                  className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                                  data-testid={`playbook-job-${job.id}`}
                                >
                                  <StatusIcon className={`h-4 w-4 ${job.status === "running" ? "animate-spin text-blue-500" : job.status === "completed" ? "text-green-500" : "text-muted-foreground"}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {job.icpName || "Playbook Scrape"}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{job.leadsFound} leads</span>
                                      <span>-</span>
                                      <Badge className={`${statusColors[job.status]} border-0 text-xs`}>
                                        {job.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setLocation("/leads")}
                          data-testid="button-view-all-leads"
                        >
                          View All Leads
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No playbook scrape jobs yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select an ICP and enter entities to start
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
