import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import {
  FileText,
  Search,
  Clock,
  Building2,
  Copy,
  ChevronRight,
  MessageCircle,
  Zap,
  HelpCircle,
  Flame,
  Filter,
  Eye,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { CallScript, GovernmentLead, ScriptStyle, ObjectionHandler } from "@shared/schema";

interface ScriptWithLead extends CallScript {
  lead?: GovernmentLead;
}

const scriptStyleConfig: Record<ScriptStyle, { label: string; icon: typeof MessageCircle; color: string }> = {
  consultative: {
    label: "Consultative",
    icon: MessageCircle,
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  direct_value: {
    label: "Direct Value",
    icon: Zap,
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  question_led: {
    label: "Question-Led",
    icon: HelpCircle,
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  },
  pain_agitate_solution: {
    label: "PAS",
    icon: Flame,
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  },
};

function ScriptCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScriptsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<ScriptStyle | "all">("all");
  const [selectedScript, setSelectedScript] = useState<ScriptWithLead | null>(null);
  const { toast } = useToast();

  const { data: scripts, isLoading } = useQuery<ScriptWithLead[]>({
    queryKey: ["/api/scripts"],
  });

  const filteredScripts = scripts?.filter((script) => {
    if (styleFilter !== "all" && script.scriptStyle !== styleFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      script.lead?.institutionName.toLowerCase().includes(query) ||
      script.lead?.state.toLowerCase().includes(query) ||
      script.fullScript.toLowerCase().includes(query) ||
      script.opener?.toLowerCase().includes(query)
    );
  });

  const groupedByLead = filteredScripts?.reduce((acc, script) => {
    const leadId = script.leadId;
    if (!acc[leadId]) {
      acc[leadId] = {
        lead: script.lead,
        scripts: [],
      };
    }
    acc[leadId].scripts.push(script);
    return acc;
  }, {} as Record<number, { lead?: GovernmentLead; scripts: ScriptWithLead[] }>);

  const copyToClipboard = (text: string, label = "Script") => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Scripts
        </h1>
        <p className="text-muted-foreground">
          AI-generated cold-call scripts in 4 different styles
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search scripts by lead name, state, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-scripts"
          />
        </div>
        <Select value={styleFilter} onValueChange={(v) => setStyleFilter(v as ScriptStyle | "all")}>
          <SelectTrigger className="w-40" data-testid="select-style-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Styles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            <SelectItem value="consultative">Consultative</SelectItem>
            <SelectItem value="direct_value">Direct Value</SelectItem>
            <SelectItem value="question_led">Question-Led</SelectItem>
            <SelectItem value="pain_agitate_solution">PAS</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredScripts?.length ?? 0} scripts
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScriptCardSkeleton key={i} />
          ))}
        </div>
      ) : groupedByLead && Object.keys(groupedByLead).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedByLead).map(([leadId, group]) => (
            <div key={leadId} className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <Link href={`/leads/${leadId}`}>
                    <h2 className="text-lg font-medium hover:underline cursor-pointer" data-testid={`text-lead-name-${leadId}`}>
                      {group.lead?.institutionName ?? "Unknown Lead"}
                    </h2>
                  </Link>
                  {group.lead && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{group.lead.institutionType}</span>
                      <span>-</span>
                      <span>{group.lead.state}</span>
                      {group.lead.county && (
                        <>
                          <span>-</span>
                          <span>{group.lead.county} County</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Badge variant="outline">{group.scripts.length} script{group.scripts.length !== 1 ? "s" : ""}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {group.scripts.map((script) => {
                  const styleConfig = scriptStyleConfig[script.scriptStyle as ScriptStyle] || {
                    label: script.scriptStyle,
                    icon: FileText,
                    color: "bg-muted text-muted-foreground",
                  };
                  const StyleIcon = styleConfig.icon;

                  return (
                    <Card key={script.id} className="hover-elevate" data-testid={`card-script-${script.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={`${styleConfig.color} border-0`}>
                            <StyleIcon className="h-3 w-3 mr-1" />
                            {styleConfig.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {script.generatedAt
                              ? new Date(script.generatedAt).toLocaleDateString()
                              : "Unknown"}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {script.opener}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedScript(script)}
                            data-testid={`button-preview-script-${script.id}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(script.fullScript)}
                            data-testid={`button-copy-script-${script.id}`}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium">No Scripts Generated</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            {searchQuery || styleFilter !== "all"
              ? "No scripts match your filters. Try a different search or style."
              : "Start by viewing a lead and generating scripts in your preferred style."}
          </p>
          {!searchQuery && styleFilter === "all" && (
            <Link href="/leads">
              <Button className="mt-4" data-testid="button-view-leads">
                <Building2 className="h-4 w-4 mr-2" />
                View Leads
              </Button>
            </Link>
          )}
        </div>
      )}

      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedScript && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Badge className={`${scriptStyleConfig[selectedScript.scriptStyle as ScriptStyle]?.color || "bg-muted"} border-0`}>
                    {scriptStyleConfig[selectedScript.scriptStyle as ScriptStyle]?.label || selectedScript.scriptStyle}
                  </Badge>
                  <span>{selectedScript.lead?.institutionName ?? "Script Preview"}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Opener</h4>
                  <div className="bg-primary/10 border-l-4 border-primary rounded-md p-4">
                    <p className="text-sm">{selectedScript.opener}</p>
                  </div>
                </div>

                {Array.isArray(selectedScript.talkingPoints) && selectedScript.talkingPoints.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Talking Points</h4>
                      <ul className="space-y-1">
                        {selectedScript.talkingPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-primary font-medium">{idx + 1}.</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Value Proposition</h4>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                    <p className="text-sm">{selectedScript.valueProposition}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Full Script</h4>
                  <div className="bg-muted/50 rounded-md p-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedScript.fullScript}</p>
                  </div>
                </div>

                {Array.isArray(selectedScript.objectionHandlers) && selectedScript.objectionHandlers.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Objection Handlers</h4>
                      <div className="space-y-3">
                        {(selectedScript.objectionHandlers as ObjectionHandler[]).map((handler, idx) => (
                          <div key={idx} className="bg-muted/50 rounded-md p-3">
                            <div className="font-medium text-sm mb-1">{handler.objection}</div>
                            <p className="text-sm text-muted-foreground">{handler.response}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Closing Statement</h4>
                  <div className="bg-muted/50 rounded-md p-4">
                    <p className="text-sm">{selectedScript.closingStatement}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => copyToClipboard(selectedScript.fullScript, "Full script")}
                    data-testid="button-copy-full-script-modal"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Full Script
                  </Button>
                  <Link href={`/leads/${selectedScript.leadId}`}>
                    <Button variant="outline" data-testid="button-go-to-lead">
                      View Lead
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
