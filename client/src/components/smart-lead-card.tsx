import * as React from "react";
import { Sparkles, Loader2, RefreshCw, Phone, Mail, MapPin, Building2, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Lead {
  id: number;
  institutionName: string;
  institutionType: string;
  department?: string | null;
  state: string;
  county?: string | null;
  city?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  population?: number | null;
  priorityScore?: number | null;
  techMaturityScore?: number | null;
  status: string;
  painPoints?: string[] | null;
  buyingSignals?: string[] | null;
  decisionMakers?: Array<{ name: string; title: string }> | null;
}

interface SmartLeadCardProps {
  lead: Lead;
  onCall?: () => void;
  onEmail?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function SmartLeadCard({ lead, onCall, onEmail, onClick, compact = false }: SmartLeadCardProps) {
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSummary, setShowSummary] = React.useState(false);

  async function generateSummary() {
    setIsLoading(true);
    setShowSummary(true);
    setAiSummary("");

    try {
      const response = await fetch("/api/ai/stream/lead-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });

      if (!response.ok) throw new Error("Failed to get summary");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setAiSummary((prev) => (prev || "") + data.text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      setAiSummary("Unable to generate summary. Click to retry.");
    } finally {
      setIsLoading(false);
    }
  }

  const priorityColor = (score: number | null | undefined) => {
    if (!score) return "bg-gray-100 text-gray-600";
    if (score >= 70) return "bg-green-100 text-green-700";
    if (score >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "qualified": return "bg-green-100 text-green-700";
      case "contacted": return "bg-blue-100 text-blue-700";
      case "follow_up": return "bg-yellow-100 text-yellow-700";
      case "closed_won": return "bg-purple-100 text-purple-700";
      case "closed_lost": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  if (compact) {
    return (
      <Card
        className="cursor-pointer hover:border-purple-300 transition-colors"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{lead.institutionName}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {lead.department || lead.institutionType} - {lead.state}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={priorityColor(lead.priorityScore)} variant="outline">
                {lead.priorityScore || "—"}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!aiSummary && !isLoading) generateSummary();
                  else setShowSummary(!showSummary);
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-purple-500" />
                )}
              </Button>
            </div>
          </div>

          {showSummary && (
            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 mb-1">
                <Sparkles className="h-3 w-3" />
                <span>AI Insight</span>
              </div>
              {isLoading && !aiSummary ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <p className="text-sm">{aiSummary}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{lead.institutionName}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {lead.department || lead.institutionType}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor(lead.status)} variant="outline">
              {lead.status.replace("_", " ")}
            </Badge>
            <Badge className={priorityColor(lead.priorityScore)} variant="outline">
              <TrendingUp className="h-3 w-3 mr-1" />
              {lead.priorityScore || "—"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location & Contact */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{lead.city || lead.county}, {lead.state}</span>
          </div>
          {lead.population && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{lead.population.toLocaleString()} pop.</span>
            </div>
          )}
        </div>

        {/* Contact Actions */}
        <div className="flex gap-2">
          {lead.phoneNumber && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onCall}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          )}
          {lead.email && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
        </div>

        {/* Pain Points */}
        {lead.painPoints && lead.painPoints.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Pain Points</p>
            <div className="flex flex-wrap gap-1">
              {lead.painPoints.slice(0, 3).map((point, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {point}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Decision Makers */}
        {lead.decisionMakers && lead.decisionMakers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Decision Makers</p>
            <div className="space-y-1">
              {lead.decisionMakers.slice(0, 2).map((dm, i) => (
                <p key={i} className="text-sm">
                  {dm.name} <span className="text-muted-foreground">- {dm.title}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary Section */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            onClick={generateSummary}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating insight...
              </>
            ) : aiSummary ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh AI Insight
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Why This Lead?
              </>
            )}
          </Button>

          {(isLoading || aiSummary) && (
            <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 mb-2">
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">AI Insight</span>
              </div>
              {isLoading && !aiSummary ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{aiSummary}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Lead card skeleton for loading states
export function SmartLeadCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
