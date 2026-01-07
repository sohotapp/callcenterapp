import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GovernmentLead, CallScript } from "@shared/schema";

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

function ScriptSection({
  title,
  content,
  onCopy,
}: {
  title: string;
  content: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="h-7 px-2"
          data-testid={`button-copy-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      </div>
      <p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
        {content}
      </p>
    </div>
  );
}

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id ?? "0");
  const { toast } = useToast();

  const { data: lead, isLoading: leadLoading } = useQuery<GovernmentLead>({
    queryKey: ["/api/leads", leadId],
    enabled: leadId > 0,
  });

  const { data: script, isLoading: scriptLoading } = useQuery<CallScript>({
    queryKey: ["/api/leads", leadId, "script"],
    enabled: leadId > 0,
  });

  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/leads/${leadId}/generate-script`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "script"] });
      toast({
        title: "Script Generated",
        description: "A new call script has been created for this lead.",
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
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
            <span>•</span>
            <span>{lead.state}</span>
            {lead.county && (
              <>
                <span>•</span>
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
          <Button
            onClick={() => generateScriptMutation.mutate()}
            disabled={generateScriptMutation.isPending}
            data-testid="button-generate-script"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateScriptMutation.isPending ? "Generating..." : "Generate Script"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="script" className="w-full">
            <TabsList>
              <TabsTrigger value="script" data-testid="tab-script">
                <FileText className="h-4 w-4 mr-2" />
                Call Script
              </TabsTrigger>
              <TabsTrigger value="pain-points" data-testid="tab-pain-points">
                <AlertCircle className="h-4 w-4 mr-2" />
                Pain Points
              </TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Call Script
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scriptLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : script ? (
                    <div className="space-y-6">
                      <ScriptSection
                        title="Opening Statement"
                        content={script.openingStatement}
                        onCopy={() =>
                          copyToClipboard(script.openingStatement, "Opening statement")
                        }
                      />
                      <Separator />
                      <ScriptSection
                        title="Pain Point Match"
                        content={script.painPointMatch}
                        onCopy={() =>
                          copyToClipboard(script.painPointMatch, "Pain point match")
                        }
                      />
                      <Separator />
                      <ScriptSection
                        title="Solution Pitch"
                        content={script.solutionPitch}
                        onCopy={() =>
                          copyToClipboard(script.solutionPitch, "Solution pitch")
                        }
                      />
                      <Separator />
                      {script.objectionHandlers && script.objectionHandlers.length > 0 && (
                        <>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Objection Handlers
                            </h4>
                            <ul className="space-y-2">
                              {script.objectionHandlers.map((handler, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm bg-muted/50 rounded-md p-3 flex items-start gap-2"
                                >
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                  {handler}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <Separator />
                        </>
                      )}
                      <ScriptSection
                        title="Closing Statement"
                        content={script.closingStatement}
                        onCopy={() =>
                          copyToClipboard(script.closingStatement, "Closing statement")
                        }
                      />
                      <div className="pt-4">
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(script.fullScript, "Full script")
                          }
                          data-testid="button-copy-full-script"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Full Script
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No Script Generated</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Generate a personalized cold-call script based on this
                        government's specific needs and pain points.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => generateScriptMutation.mutate()}
                        disabled={generateScriptMutation.isPending}
                        data-testid="button-generate-script-empty"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {generateScriptMutation.isPending
                          ? "Generating..."
                          : "Generate Script"}
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
                    Identified Pain Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.painPoints && lead.painPoints.length > 0 ? (
                    <ul className="space-y-3">
                      {lead.painPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm bg-muted/50 rounded-md p-3"
                        >
                          <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No Pain Points Yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pain points will be identified when you generate a script.
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
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem icon={Building2} label="Institution" value={lead.institutionName} />
              <InfoItem icon={Building2} label="Department" value={lead.department} />
              <InfoItem icon={MapPin} label="Location" value={`${lead.county ? lead.county + ", " : ""}${lead.state}`} />
              <InfoItem icon={Phone} label="Phone" value={lead.phoneNumber} mono />
              <InfoItem icon={Mail} label="Email" value={lead.email} />
              {lead.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      Website
                    </span>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {new URL(lead.website).hostname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
              <Separator />
              <InfoItem icon={Users} label="Population" value={lead.population?.toLocaleString()} />
              <InfoItem icon={DollarSign} label="Annual Budget" value={lead.annualBudget} />
              <InfoItem icon={Gauge} label="Tech Maturity" value={lead.techMaturityScore ? `${lead.techMaturityScore}/10` : null} />
              <InfoItem icon={Clock} label="Last Contact" value={lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={lead.status === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateStatusMutation.mutate(key)}
                    disabled={updateStatusMutation.isPending || lead.status === key}
                    className="justify-start"
                    data-testid={`button-status-${key}`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
