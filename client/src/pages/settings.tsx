import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings,
  Building2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CompanyProfile } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
  });

  const refreshProfileMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/company-profile/refresh");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      toast({
        title: "Profile Updated",
        description: "Company profile has been refreshed from rltx.ai.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh company profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your company profile and application settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Profile
                </CardTitle>
                <CardDescription className="mt-1">
                  Information extracted from rltx.ai to personalize cold-call scripts
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => refreshProfileMutation.mutate()}
                disabled={refreshProfileMutation.isPending}
                data-testid="button-refresh-profile"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    refreshProfileMutation.isPending ? "animate-spin" : ""
                  }`}
                />
                {refreshProfileMutation.isPending ? "Refreshing..." : "Refresh from rltx.ai"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Company Name
                  </h3>
                  <p className="text-lg font-semibold">{profile.companyName}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Value Proposition
                  </h3>
                  <p className="text-sm leading-relaxed">{profile.valueProposition}</p>
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Price Range
                    </h3>
                    <Badge variant="secondary" className="text-sm">
                      {profile.priceRange}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Target Market
                    </h3>
                    <p className="text-sm">{profile.targetMarket}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Services
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.services?.map((service, idx) => (
                      <Badge key={idx} variant="outline">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Unique Selling Points
                  </h3>
                  <ul className="space-y-2">
                    {profile.uniqueSellingPoints?.map((usp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        {usp}
                      </li>
                    ))}
                  </ul>
                </div>

                {profile.caseStudies && profile.caseStudies.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        Case Studies
                      </h3>
                      <ul className="space-y-2">
                        {profile.caseStudies.map((study, idx) => (
                          <li key={idx} className="text-sm bg-muted/50 rounded-md p-3">
                            {study}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <div className="text-xs text-muted-foreground pt-4">
                  Last updated:{" "}
                  {profile.lastUpdated
                    ? new Date(profile.lastUpdated).toLocaleString()
                    : "Never"}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No Company Profile</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Click "Refresh from rltx.ai" to analyze the website and extract
                  company capabilities for script generation.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => refreshProfileMutation.mutate()}
                  disabled={refreshProfileMutation.isPending}
                  data-testid="button-create-profile"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {refreshProfileMutation.isPending
                    ? "Analyzing..."
                    : "Analyze rltx.ai"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About GovLeads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              GovLeads is an intelligent government sales pipeline platform that helps
              you identify, research, and connect with local government institutions
              across the United States.
            </p>
            <p>
              Powered by Claude 4.5 Opus AI to generate personalized cold-call scripts
              based on each government's specific needs and pain points.
            </p>
            <div className="pt-2">
              <Badge variant="outline">Version 1.0.0</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Claude 4.5 Opus Connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Using Replit AI Integrations for Anthropic access. No API key required.
              Charges are billed to your Replit credits.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
