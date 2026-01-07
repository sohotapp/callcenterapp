import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText,
  Search,
  Clock,
  Building2,
  Copy,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { CallScript, GovernmentLead } from "@shared/schema";
import { useState } from "react";

interface ScriptWithLead extends CallScript {
  lead?: GovernmentLead;
}

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
  const { toast } = useToast();

  const { data: scripts, isLoading } = useQuery<ScriptWithLead[]>({
    queryKey: ["/api/scripts"],
  });

  const filteredScripts = scripts?.filter((script) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      script.lead?.institutionName.toLowerCase().includes(query) ||
      script.lead?.state.toLowerCase().includes(query) ||
      script.fullScript.toLowerCase().includes(query)
    );
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Script copied to clipboard.",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Scripts
        </h1>
        <p className="text-muted-foreground">
          AI-generated cold-call scripts for your leads
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-scripts"
          />
        </div>
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
      ) : filteredScripts && filteredScripts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredScripts.map((script) => (
            <Card key={script.id} className="hover-elevate" data-testid={`card-script-${script.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {script.lead?.institutionName ?? "Unknown Lead"}
                    </h3>
                    {script.lead && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {script.lead.institutionType}
                        </Badge>
                        <span>•</span>
                        <span>{script.lead.state}</span>
                      </div>
                    )}
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>

                <div className="text-sm text-muted-foreground line-clamp-3">
                  {script.openingStatement}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {script.generatedAt
                    ? new Date(script.generatedAt).toLocaleDateString()
                    : "Unknown date"}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(script.fullScript)}
                    data-testid={`button-copy-script-${script.id}`}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  {script.lead && (
                    <Link href={`/leads/${script.leadId}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-lead-${script.leadId}`}>
                        View Lead
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium">No Scripts Generated</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            {searchQuery
              ? "No scripts match your search. Try a different query."
              : "Start by viewing a lead and clicking 'Generate Script' to create AI-powered cold-call scripts."}
          </p>
          {!searchQuery && (
            <Link href="/leads">
              <Button className="mt-4" data-testid="button-view-leads">
                <Building2 className="h-4 w-4 mr-2" />
                View Leads
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
