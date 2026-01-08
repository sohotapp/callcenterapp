import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Building2,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Edit2,
  X,
  Plus,
  Trash2,
  Target,
  Zap,
  Trophy,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CompanyProfile, CaseStudy } from "@shared/schema";

interface ProfileFormData {
  companyName: string;
  tagline: string;
  description: string;
  services: string[];
  capabilities: string[];
  caseStudies: CaseStudy[];
  targetMarkets: string[];
  priceRange: string;
  uniqueSellingPoints: string[];
  competitiveAdvantages: string[];
}

function ArrayEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 pr-1">
            {item}
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="ml-1 rounded-full p-0.5"
              data-testid={`button-remove-${label.toLowerCase().replace(/\s/g, "-")}-${idx}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder || `Add ${label.toLowerCase()}`}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
          data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={addItem}
          data-testid={`button-add-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CaseStudyEditor({
  caseStudies,
  onChange,
}: {
  caseStudies: CaseStudy[];
  onChange: (studies: CaseStudy[]) => void;
}) {
  const addCaseStudy = () => {
    onChange([...caseStudies, { title: "", description: "", results: "" }]);
  };

  const updateCaseStudy = (index: number, field: keyof CaseStudy, value: string) => {
    const updated = [...caseStudies];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeCaseStudy = (index: number) => {
    onChange(caseStudies.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Label>Case Studies</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCaseStudy}
          data-testid="button-add-case-study"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Case Study
        </Button>
      </div>
      {caseStudies.map((study, idx) => (
        <div key={idx} className="border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium">Case Study {idx + 1}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => removeCaseStudy(idx)}
              data-testid={`button-remove-case-study-${idx}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={study.title}
            onChange={(e) => updateCaseStudy(idx, "title", e.target.value)}
            placeholder="Case study title"
            data-testid={`input-case-study-title-${idx}`}
          />
          <Textarea
            value={study.description}
            onChange={(e) => updateCaseStudy(idx, "description", e.target.value)}
            placeholder="Brief description of the project"
            data-testid={`input-case-study-description-${idx}`}
          />
          <Input
            value={study.results}
            onChange={(e) => updateCaseStudy(idx, "results", e.target.value)}
            placeholder="Quantifiable results (e.g., 70% reduction in processing time)"
            data-testid={`input-case-study-results-${idx}`}
          />
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    companyName: "",
    tagline: "",
    description: "",
    services: [],
    capabilities: [],
    caseStudies: [],
    targetMarkets: [],
    priceRange: "",
    uniqueSellingPoints: [],
    competitiveAdvantages: [],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        companyName: profile.companyName || "",
        tagline: profile.tagline || "",
        description: profile.description || "",
        services: profile.services || [],
        capabilities: profile.capabilities || [],
        caseStudies: profile.caseStudies || [],
        targetMarkets: profile.targetMarkets || [],
        priceRange: profile.priceRange || "",
        uniqueSellingPoints: profile.uniqueSellingPoints || [],
        competitiveAdvantages: profile.competitiveAdvantages || [],
      });
    }
  }, [profile]);

  const scrapeWebsiteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/company-profile/scrape-website");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Company intelligence has been scraped from rltx.ai.",
      });
    },
    onError: () => {
      toast({
        title: "Scraping Failed",
        description: "Using fallback profile data. You can manually edit the profile.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PUT", "/api/company-profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      setIsEditing(false);
      toast({
        title: "Profile Saved",
        description: "Company profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save company profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        companyName: profile.companyName || "",
        tagline: profile.tagline || "",
        description: profile.description || "",
        services: profile.services || [],
        capabilities: profile.capabilities || [],
        caseStudies: profile.caseStudies || [],
        targetMarkets: profile.targetMarkets || [],
        priceRange: profile.priceRange || "",
        uniqueSellingPoints: profile.uniqueSellingPoints || [],
        competitiveAdvantages: profile.competitiveAdvantages || [],
      });
    }
    setIsEditing(false);
  };

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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Intelligence
              </CardTitle>
              <CardDescription className="mt-1">
                Rich company profile for personalized cold-call scripts
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => scrapeWebsiteMutation.mutate()}
                    disabled={scrapeWebsiteMutation.isPending}
                    data-testid="button-scrape-website"
                  >
                    <Globe
                      className={`h-4 w-4 mr-2 ${
                        scrapeWebsiteMutation.isPending ? "animate-pulse" : ""
                      }`}
                    />
                    {scrapeWebsiteMutation.isPending ? "Scraping..." : "Scrape from Website"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-profile"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    data-testid="button-cancel-edit"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save
                      className={`h-4 w-4 mr-2 ${
                        saveProfileMutation.isPending ? "animate-pulse" : ""
                      }`}
                    />
                    {saveProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isEditing ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceRange">Price Range</Label>
                  <Input
                    id="priceRange"
                    value={formData.priceRange}
                    onChange={(e) =>
                      setFormData({ ...formData, priceRange: e.target.value })
                    }
                    placeholder="$25,000 - $500,000+"
                    data-testid="input-price-range"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                  placeholder="Palantir for AI - End-to-end custom AI systems"
                  data-testid="input-tagline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Full company description..."
                  data-testid="input-description"
                />
              </div>

              <Separator />

              <ArrayEditor
                label="Services"
                items={formData.services}
                onChange={(services) => setFormData({ ...formData, services })}
                placeholder="Add a service"
              />

              <ArrayEditor
                label="Technical Capabilities"
                items={formData.capabilities}
                onChange={(capabilities) => setFormData({ ...formData, capabilities })}
                placeholder="Add a capability"
              />

              <ArrayEditor
                label="Target Markets"
                items={formData.targetMarkets}
                onChange={(targetMarkets) => setFormData({ ...formData, targetMarkets })}
                placeholder="Add a target market"
              />

              <Separator />

              <ArrayEditor
                label="Unique Selling Points"
                items={formData.uniqueSellingPoints}
                onChange={(uniqueSellingPoints) =>
                  setFormData({ ...formData, uniqueSellingPoints })
                }
                placeholder="Add a unique selling point"
              />

              <ArrayEditor
                label="Competitive Advantages"
                items={formData.competitiveAdvantages}
                onChange={(competitiveAdvantages) =>
                  setFormData({ ...formData, competitiveAdvantages })
                }
                placeholder="Add a competitive advantage"
              />

              <Separator />

              <CaseStudyEditor
                caseStudies={formData.caseStudies}
                onChange={(caseStudies) => setFormData({ ...formData, caseStudies })}
              />
            </div>
          ) : profile ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold" data-testid="text-company-name">
                  {profile.companyName}
                </h2>
                {profile.manuallyEdited && (
                  <Badge variant="outline" className="text-xs">
                    Manually Edited
                  </Badge>
                )}
              </div>

              {profile.tagline && (
                <p className="text-lg text-muted-foreground italic" data-testid="text-tagline">
                  {profile.tagline}
                </p>
              )}

              {profile.description && (
                <p className="text-sm leading-relaxed" data-testid="text-description">
                  {profile.description}
                </p>
              )}

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                {profile.priceRange && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Price Range
                    </h3>
                    <Badge variant="secondary" className="text-sm">
                      {profile.priceRange}
                    </Badge>
                  </div>
                )}

                {profile.targetMarkets && profile.targetMarkets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Target Markets
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {profile.targetMarkets.map((market, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {market}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {profile.services && profile.services.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Services
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.services.map((service, idx) => (
                        <Badge key={idx} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {profile.capabilities && profile.capabilities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Technical Capabilities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.capabilities.map((capability, idx) => (
                        <Badge key={idx} variant="outline">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {profile.uniqueSellingPoints && profile.uniqueSellingPoints.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Unique Selling Points
                    </h3>
                    <ul className="space-y-2">
                      {profile.uniqueSellingPoints.map((usp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          {usp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {profile.competitiveAdvantages && profile.competitiveAdvantages.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Competitive Advantages
                    </h3>
                    <ul className="space-y-2">
                      {profile.competitiveAdvantages.map((advantage, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {profile.caseStudies && profile.caseStudies.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Case Studies
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {profile.caseStudies.map((study, idx) => (
                        <div
                          key={idx}
                          className="border rounded-md p-4 space-y-2"
                          data-testid={`case-study-${idx}`}
                        >
                          <h4 className="font-medium">{study.title}</h4>
                          <p className="text-sm text-muted-foreground">{study.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {study.results}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {profile.lastScrapedAt && (
                  <span>
                    Last scraped: {new Date(profile.lastScrapedAt).toLocaleString()}
                  </span>
                )}
                {profile.scrapedFromUrl && (
                  <span>
                    Source: {profile.scrapedFromUrl}
                  </span>
                )}
                {profile.lastUpdated && (
                  <span>
                    Last updated: {new Date(profile.lastUpdated).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No Company Profile</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Scrape company intelligence from rltx.ai or manually create a profile to
                personalize cold-call scripts.
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => scrapeWebsiteMutation.mutate()}
                  disabled={scrapeWebsiteMutation.isPending}
                  data-testid="button-initial-scrape"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {scrapeWebsiteMutation.isPending ? "Scraping..." : "Scrape from Website"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-create-manual"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Create Manually
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About RLTX Lead Gen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              RLTX Lead Gen is an AI-powered B2B lead generation platform that helps
              you identify, research, and connect with qualified prospects across
              multiple industries.
            </p>
            <p>
              Powered by Claude AI to generate personalized cold-call scripts
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
              <span className="text-sm">Claude AI Connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Using Replit AI Integrations for Anthropic access. The Company Intelligence
              Layer uses Tavily for web scraping and Claude for data extraction.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
