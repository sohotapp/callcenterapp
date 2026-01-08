import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Target,
  Building2,
  Stethoscope,
  Scale,
  Landmark,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Save,
  Users,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { extractArray } from "@/lib/utils";
import type { IcpProfile, TargetCriteria } from "@shared/schema";

const verticalIcons: Record<string, typeof Target> = {
  government: Building2,
  healthcare: Stethoscope,
  legal: Scale,
  financial_services: Landmark,
  pe: Briefcase,
};

const verticalColors: Record<string, string> = {
  government: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  healthcare: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  legal: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  financial_services: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  pe: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
};

interface AiSuggestion {
  description: string;
  targetCriteria: TargetCriteria;
  searchQueries: string[];
  rationale: string;
}

interface IcpCardProps {
  profile: IcpProfile;
  matchingCount: number;
  onUpdate: (id: number, data: Partial<IcpProfile>) => void;
  isPending: boolean;
}

function IcpCard({ profile, matchingCount, onUpdate, isPending }: IcpCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedCriteria, setEditedCriteria] = useState<TargetCriteria>(
    profile.targetCriteria || {}
  );
  const [editedDescription, setEditedDescription] = useState(profile.description || "");
  const [editedQueries, setEditedQueries] = useState(
    (profile.searchQueries || []).join("\n")
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const { toast } = useToast();

  const aiSuggestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/icp/${profile.id}/ai-suggest`);
      return response as unknown as AiSuggestion;
    },
    onSuccess: (suggestion) => {
      setEditedDescription(suggestion.description || "");
      setEditedCriteria(suggestion.targetCriteria || {});
      setEditedQueries((suggestion.searchQueries || []).join("\n"));
      setAiRationale(suggestion.rationale || null);
      setHasChanges(true);
      toast({
        title: "AI Suggestions Applied",
        description: "Review the suggested criteria and save to apply changes.",
      });
    },
    onError: () => {
      toast({
        title: "AI Suggestion Failed",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const Icon = verticalIcons[profile.verticalName] || Target;
  const colorClass = verticalColors[profile.verticalName] || "bg-muted text-muted-foreground";

  const handleToggle = (checked: boolean) => {
    onUpdate(profile.id, { isActive: checked });
  };

  const handleSave = () => {
    onUpdate(profile.id, {
      description: editedDescription,
      targetCriteria: editedCriteria,
      searchQueries: editedQueries.split("\n").filter((q) => q.trim()),
    });
    setHasChanges(false);
  };

  const updateCriteria = (updates: Partial<TargetCriteria>) => {
    setEditedCriteria((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  return (
    <Card
      className={`transition-all ${!profile.isActive ? "opacity-60" : ""}`}
      data-testid={`card-icp-${profile.verticalName}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`p-2 rounded-md ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{profile.displayName}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant={profile.isActive ? "default" : "secondary"}
                className="no-default-hover-elevate no-default-active-elevate"
              >
                {profile.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {matchingCount} leads match
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={profile.isActive}
            onCheckedChange={handleToggle}
            disabled={isPending}
            data-testid={`switch-icp-active-${profile.id}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-expand-icp-${profile.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <CardDescription className="mb-4">{profile.description}</CardDescription>

        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor={`desc-${profile.id}`}>Description</Label>
              <Textarea
                id={`desc-${profile.id}`}
                value={editedDescription}
                onChange={(e) => {
                  setEditedDescription(e.target.value);
                  setHasChanges(true);
                }}
                className="resize-none"
                rows={2}
                data-testid={`textarea-description-${profile.id}`}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm">Target Criteria</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`minPop-${profile.id}`}>Min Population</Label>
                  <Input
                    id={`minPop-${profile.id}`}
                    type="number"
                    value={editedCriteria.minPopulation ?? ""}
                    onChange={(e) =>
                      updateCriteria({
                        minPopulation: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="No minimum"
                    data-testid={`input-min-population-${profile.id}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`maxPop-${profile.id}`}>Max Population</Label>
                  <Input
                    id={`maxPop-${profile.id}`}
                    type="number"
                    value={editedCriteria.maxPopulation ?? ""}
                    onChange={(e) =>
                      updateCriteria({
                        maxPopulation: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="No maximum"
                    data-testid={`input-max-population-${profile.id}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Tech Maturity Range: {editedCriteria.techMaturityMin || 1} -{" "}
                  {editedCriteria.techMaturityMax || 10}
                </Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[
                    editedCriteria.techMaturityMin || 1,
                    editedCriteria.techMaturityMax || 10,
                  ]}
                  onValueChange={([min, max]) =>
                    updateCriteria({ techMaturityMin: min, techMaturityMax: max })
                  }
                  className="w-full"
                  data-testid={`slider-tech-maturity-${profile.id}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Tech</span>
                  <span>High Tech</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`depts-${profile.id}`}>
                  Target Departments (comma-separated)
                </Label>
                <Input
                  id={`depts-${profile.id}`}
                  value={(editedCriteria.departments || []).join(", ")}
                  onChange={(e) =>
                    updateCriteria({
                      departments: e.target.value
                        .split(",")
                        .map((d) => d.trim())
                        .filter((d) => d),
                    })
                  }
                  placeholder="e.g., IT, Finance, Public Works"
                  data-testid={`input-departments-${profile.id}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`states-${profile.id}`}>
                  Target States (comma-separated, leave empty for all)
                </Label>
                <Input
                  id={`states-${profile.id}`}
                  value={(editedCriteria.states || []).join(", ")}
                  onChange={(e) =>
                    updateCriteria({
                      states: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  placeholder="e.g., California, Texas, New York"
                  data-testid={`input-states-${profile.id}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`keywords-${profile.id}`}>
                  Pain Point Keywords (comma-separated)
                </Label>
                <Input
                  id={`keywords-${profile.id}`}
                  value={(editedCriteria.painPointKeywords || []).join(", ")}
                  onChange={(e) =>
                    updateCriteria({
                      painPointKeywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter((k) => k),
                    })
                  }
                  placeholder="e.g., legacy systems, manual processes"
                  data-testid={`input-keywords-${profile.id}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`queries-${profile.id}`}>
                Search Queries (one per line)
              </Label>
              <Textarea
                id={`queries-${profile.id}`}
                value={editedQueries}
                onChange={(e) => {
                  setEditedQueries(e.target.value);
                  setHasChanges(true);
                }}
                className="resize-none font-mono text-sm"
                rows={3}
                placeholder="Enter search queries for lead discovery..."
                data-testid={`textarea-queries-${profile.id}`}
              />
            </div>

            {aiRationale && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-primary">AI Rationale</span>
                    <p className="text-sm text-muted-foreground mt-1">{aiRationale}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => aiSuggestMutation.mutate()}
                disabled={aiSuggestMutation.isPending}
                data-testid={`button-ai-suggest-${profile.id}`}
              >
                {aiSuggestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {aiSuggestMutation.isPending ? "Generating..." : "AI Suggest"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isPending}
                data-testid={`button-save-icp-${profile.id}`}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IcpCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-md" />
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24 mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-5 rounded-full" />
          <Skeleton className="w-9 h-9" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function IcpPage() {
  const { toast } = useToast();

  const { data: profilesData, isLoading } = useQuery<unknown>({
    queryKey: ["/api/icp"],
  });

  const profiles = extractArray<IcpProfile>(profilesData);

  const { data: matchingCounts } = useQuery<Record<number, number>>({
    queryKey: ["/api/icp/matching-counts"],
    queryFn: async () => {
      if (!profiles) return {};
      const counts: Record<number, number> = {};
      await Promise.all(
        profiles.map(async (p) => {
          const res = await fetch(`/api/icp/${p.id}/matching-leads`);
          if (res.ok) {
            const data = await res.json();
            counts[p.id] = data.count;
          }
        })
      );
      return counts;
    },
    enabled: !!profiles && profiles.length > 0,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<IcpProfile>;
    }) => {
      return apiRequest("PUT", `/api/icp/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/icp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/icp/matching-counts"] });
      toast({
        title: "ICP Updated",
        description: "Your targeting criteria has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (id: number, data: Partial<IcpProfile>) => {
    updateMutation.mutate({ id, data });
  };

  const activeCount = profiles.filter((p) => p.isActive).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            ICP Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure targeting criteria for different verticals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
            {activeCount} of {profiles.length} active
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <>
            <IcpCardSkeleton />
            <IcpCardSkeleton />
            <IcpCardSkeleton />
          </>
        ) : (
          profiles.map((profile) => (
            <IcpCard
              key={profile.id}
              profile={profile}
              matchingCount={matchingCounts?.[profile.id] ?? 0}
              onUpdate={handleUpdate}
              isPending={updateMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}
