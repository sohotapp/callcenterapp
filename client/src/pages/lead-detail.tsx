import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Building2,
  MapPin,
  Users,
  DollarSign,
  Gauge,
  FileText,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Brain,
  Newspaper,
  Cpu,
  TrendingUp,
  RefreshCw,
  User,
  Linkedin,
  Target,
  MessageCircle,
  Zap,
  HelpCircle,
  Flame,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GovernmentLead, CallScript, DecisionMaker, RecentNews, CompetitorAnalysis, ScriptStyle, ObjectionHandler } from "@shared/schema";

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

const scriptStyleConfig: Record<ScriptStyle, { label: string; icon: typeof MessageCircle; description: string; color: string }> = {
  consultative: {
    label: "Consultative",
    icon: MessageCircle,
    description: "Advisor approach, discovery-focused",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  direct_value: {
    label: "Direct Value",
    icon: Zap,
    description: "Lead with ROI and quantified benefits",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  question_led: {
    label: "Question-Led",
    icon: HelpCircle,
    description: "Socratic method, self-discovery",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  },
  pain_agitate_solution: {
    label: "PAS",
    icon: Flame,
    description: "Pain-Agitate-Solution framework",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  },
};

function InfoItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Phone;
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className={mono ? "font-mono text-sm" : "text-sm"}>{value}</span>
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id ?? "0");
  const { toast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState<ScriptStyle>("consultative");
  const [expandedObjections, setExpandedObjections] = useState<number[]>([]);

  const { data: lead, isLoading: leadLoading } = useQuery<GovernmentLead>({
    queryKey: ["/api/leads", leadId],
    enabled: leadId > 0,
  });

  const { data: allScripts, isLoading: scriptsLoading } = useQuery<CallScript[]>({
    queryKey: ["/api/leads", leadId, "scripts"],
    enabled: leadId > 0,
  });

  const currentScript = allScripts?.find(s => s.scriptStyle === selectedStyle);

  const generateScriptMutation = useMutation({
    mutationFn: async (style: ScriptStyle) => {
      return apiRequest("POST", `/api/leads/${leadId}/generate-script`, { scriptStyle: style });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "scripts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({
        title: "Script Generated",
        description: `A new ${scriptStyleConfig[selectedStyle].label} script has been created.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/leads/${leadId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Status Updated",
        description: "Lead status has been updated successfully.",
      });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/leads/${leadId}/enrich`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({
        title: "Enrichment Complete",
        description: "Lead has been enriched with intelligence data.",
      });
    },
    onError: () => {
      toast({
        title: "Enrichment Failed",
        description: "Failed to enrich lead. Please check if TAVILY_API_KEY is configured.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  };

  const toggleObjection = (index: number) => {
    setExpandedObjections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  if (leadLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Lead Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The lead you're looking for doesn't exist.
        </p>
        <Link href="/">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold truncate" data-testid="text-lead-name">
              {lead.institutionName}
            </h1>
            <Badge className={`${statusColors[lead.status]} border-0`}>
              {statusLabels[lead.status]}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="capitalize">{lead.institutionType}</span>
            <span>-</span>
            <span>{lead.state}</span>
            {lead.county && (
              <>
                <span>-</span>
                <span>{lead.county} County</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.phoneNumber && (
            <Button
              variant="outline"
              onClick={() => copyToClipboard(lead.phoneNumber!, "Phone number")}
              data-testid="button-copy-phone"
            >
              <Phone className="h-4 w-4 mr-2" />
              {lead.phoneNumber}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="script" className="w-full">
            <TabsList>
              <TabsTrigger value="script" data-testid="tab-script">
                <FileText className="h-4 w-4 mr-2" />
                Call Scripts
              </TabsTrigger>
              <TabsTrigger value="intelligence" data-testid="tab-intelligence">
                <Brain className="h-4 w-4 mr-2" />
                Intelligence
              </TabsTrigger>
              <TabsTrigger value="pain-points" data-testid="tab-pain-points">
                <AlertCircle className="h-4 w-4 mr-2" />
                Pain Points
              </TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Call Scripts
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose a script style and generate personalized cold-call scripts
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(Object.keys(scriptStyleConfig) as ScriptStyle[]).map((style) => {
                      const config = scriptStyleConfig[style];
                      const StyleIcon = config.icon;
                      const hasScript = allScripts?.some(s => s.scriptStyle === style);
                      return (
                        <Button
                          key={style}
                          variant={selectedStyle === style ? "default" : "outline"}
                          className={`flex flex-col items-center gap-1 h-auto py-3 ${selectedStyle === style ? "" : ""}`}
                          onClick={() => setSelectedStyle(style)}
                          data-testid={`button-style-${style}`}
                        >
                          <StyleIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">{config.label}</span>
                          {hasScript && (
                            <CheckCircle2 className="h-3 w-3 text-green-500 absolute top-1 right-1" />
                          )}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="bg-muted/50 rounded-md p-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-sm">{scriptStyleConfig[selectedStyle].label} Style</div>
                      <div className="text-xs text-muted-foreground">{scriptStyleConfig[selectedStyle].description}</div>
                    </div>
                    <Button
                      onClick={() => generateScriptMutation.mutate(selectedStyle)}
                      disabled={generateScriptMutation.isPending}
                      data-testid="button-generate-script"
                    >
                      {generateScriptMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : currentScript ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>

                  {scriptsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : currentScript ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            Opener
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(currentScript.opener, "Opener")}
                            data-testid="button-copy-opener"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary rounded-md p-4">
                          <p className="text-sm leading-relaxed">{currentScript.opener}</p>
                        </div>
                      </div>

                      <Separator />

                      {currentScript.talkingPoints && currentScript.talkingPoints.length > 0 && (
                        <>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Talking Points</h4>
                            <ul className="space-y-2">
                              {currentScript.talkingPoints.map((point, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm bg-muted/50 rounded-md p-2"
                                >
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <Separator />
                        </>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Value Proposition
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(currentScript.valueProposition, "Value proposition")}
                            data-testid="button-copy-value-prop"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                          <p className="text-sm leading-relaxed">{currentScript.valueProposition}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Full Script
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(currentScript.fullScript, "Full script")}
                            data-testid="button-copy-full-script"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-muted/50 rounded-md p-4">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentScript.fullScript}</p>
                        </div>
                      </div>

                      <Separator />

                      {currentScript.objectionHandlers && (currentScript.objectionHandlers as ObjectionHandler[]).length > 0 && (
                        <>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Objection Handlers</h4>
                            <div className="space-y-2">
                              {(currentScript.objectionHandlers as ObjectionHandler[]).map((handler, idx) => (
                                <Collapsible
                                  key={idx}
                                  open={expandedObjections.includes(idx)}
                                  onOpenChange={() => toggleObjection(idx)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-md p-3 cursor-pointer hover-elevate">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="text-sm font-medium">{handler.objection}</span>
                                      </div>
                                      {expandedObjections.includes(idx) ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="mt-2 ml-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border-l-2 border-green-500">
                                      <p className="text-sm">{handler.response}</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-2"
                                        onClick={() => copyToClipboard(handler.response, "Response")}
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy Response
                                      </Button>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Closing Statement
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(currentScript.closingStatement, "Closing statement")}
                            data-testid="button-copy-closing"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-primary/10 rounded-md p-4">
                          <p className="text-sm leading-relaxed">{currentScript.closingStatement}</p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Generated: {currentScript.generatedAt ? new Date(currentScript.generatedAt).toLocaleString() : "Unknown"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No {scriptStyleConfig[selectedStyle].label} Script</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Generate a personalized {scriptStyleConfig[selectedStyle].label.toLowerCase()} script for this lead.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => generateScriptMutation.mutate(selectedStyle)}
                        disabled={generateScriptMutation.isPending}
                        data-testid="button-generate-script-empty"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {generateScriptMutation.isPending ? "Generating..." : "Generate Script"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="intelligence" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Lead Intelligence
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {lead.enrichmentScore && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Score:</span>
                        <Badge variant="outline" className="font-mono">
                          {lead.enrichmentScore}/100
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enrichMutation.mutate()}
                      disabled={enrichMutation.isPending}
                      data-testid="button-enrich-lead"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${enrichMutation.isPending ? "animate-spin" : ""}`} />
                      {enrichMutation.isPending ? "Enriching..." : "Refresh"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {lead.enrichedAt ? (
                    <>
                      <div className="text-xs text-muted-foreground">
                        Last enriched: {new Date(lead.enrichedAt).toLocaleString()}
                      </div>
                      
                      {lead.enrichmentScore && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Enrichment Quality</span>
                            <span className="font-medium">{lead.enrichmentScore}%</span>
                          </div>
                          <Progress value={lead.enrichmentScore} className="h-2" />
                        </div>
                      )}
                      
                      {lead.decisionMakers && lead.decisionMakers.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Decision Makers
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(lead.decisionMakers as DecisionMaker[]).map((dm, idx) => (
                              <div key={idx} className="bg-muted/50 rounded-md p-3 space-y-1">
                                <div className="font-medium text-sm">{dm.name}</div>
                                <div className="text-xs text-muted-foreground">{dm.title}</div>
                                {dm.email && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Mail className="h-3 w-3" />
                                    <a href={`mailto:${dm.email}`} className="hover:underline">{dm.email}</a>
                                  </div>
                                )}
                                {dm.phone && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Phone className="h-3 w-3" />
                                    <span className="font-mono">{dm.phone}</span>
                                  </div>
                                )}
                                {dm.linkedIn && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Linkedin className="h-3 w-3" />
                                    <a href={dm.linkedIn} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                                      LinkedIn Profile
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {lead.techStack && lead.techStack.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            Current Tech Stack
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {lead.techStack.map((tech, idx) => (
                              <Badge key={idx} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {lead.buyingSignals && lead.buyingSignals.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Buying Signals
                          </h4>
                          <ul className="space-y-2">
                            {lead.buyingSignals.map((signal, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-900/20 rounded-md p-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                {signal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {lead.recentNews && lead.recentNews.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Newspaper className="h-4 w-4" />
                            Recent News
                          </h4>
                          <div className="space-y-3">
                            {(lead.recentNews as RecentNews[]).map((news, idx) => (
                              <div key={idx} className="bg-muted/50 rounded-md p-3 space-y-1">
                                <a
                                  href={news.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm hover:underline flex items-center gap-1"
                                >
                                  {news.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                {news.date && (
                                  <div className="text-xs text-muted-foreground">{news.date}</div>
                                )}
                                <p className="text-xs text-muted-foreground">{news.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {lead.competitorAnalysis && lead.competitorAnalysis.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Competitor Analysis
                          </h4>
                          <div className="space-y-2">
                            {(lead.competitorAnalysis as CompetitorAnalysis[]).map((comp, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 bg-muted/50 rounded-md p-3">
                                <div>
                                  <div className="font-medium text-sm">{comp.competitor}</div>
                                  <div className="text-xs text-muted-foreground">{comp.product}</div>
                                </div>
                                <Badge variant="outline" className="shrink-0">{comp.relationship}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No Intelligence Data</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Run lead enrichment to gather decision makers, tech stack, buying signals, and more.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => enrichMutation.mutate()}
                        disabled={enrichMutation.isPending}
                        data-testid="button-enrich-lead-empty"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${enrichMutation.isPending ? "animate-spin" : ""}`} />
                        {enrichMutation.isPending ? "Enriching..." : "Enrich Lead"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pain-points" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Pain Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.painPoints && lead.painPoints.length > 0 ? (
                    <ul className="space-y-3">
                      {lead.painPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md"
                        >
                          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No Pain Points Identified</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Pain points will be identified when you generate a script or enrich the lead.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Lead Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem icon={Building2} label="Institution" value={lead.institutionName} />
              <InfoItem icon={MapPin} label="Location" value={`${lead.city || ""} ${lead.county ? lead.county + " County," : ""} ${lead.state}`} />
              <InfoItem icon={Phone} label="Phone" value={lead.phoneNumber} mono />
              <InfoItem icon={Mail} label="Email" value={lead.email} />
              <InfoItem icon={Globe} label="Website" value={lead.website} />
              <InfoItem icon={Users} label="Population" value={lead.population?.toLocaleString()} />
              <InfoItem icon={DollarSign} label="Annual Budget" value={lead.annualBudget} />
              <InfoItem icon={Gauge} label="Tech Maturity" value={lead.techMaturityScore ? `${lead.techMaturityScore}/10` : undefined} />
              
              {lead.website && (
                <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full mt-2" data-testid="button-visit-website">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {["not_contacted", "contacted", "follow_up", "qualified", "closed_won", "closed_lost"].map((status) => (
                <Button
                  key={status}
                  variant={lead.status === status ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => updateStatusMutation.mutate(status)}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-status-${status}`}
                >
                  <Badge className={`${statusColors[status]} border-0 mr-2`}>
                    {statusLabels[status]}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>

          {allScripts && allScripts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Scripts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allScripts.map((script) => (
                  <div
                    key={script.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer ${selectedStyle === script.scriptStyle ? "bg-primary/10" : "bg-muted/50 hover-elevate"}`}
                    onClick={() => setSelectedStyle(script.scriptStyle as ScriptStyle)}
                  >
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StyleIcon = scriptStyleConfig[script.scriptStyle as ScriptStyle]?.icon || FileText;
                        return <StyleIcon className="h-4 w-4" />;
                      })()}
                      <span className="text-sm">{scriptStyleConfig[script.scriptStyle as ScriptStyle]?.label || script.scriptStyle}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {script.generatedAt ? new Date(script.generatedAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
