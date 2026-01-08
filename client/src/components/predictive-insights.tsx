import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Brain,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Zap,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface PredictiveInsights {
  totalLeads: number;
  averageScore: number;
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
  byConfidence: {
    counts: { high: number; medium: number; low: number };
    averages: { high: number; medium: number; low: number };
  };
  topFactors: Array<{
    name: string;
    frequency: number;
    avgImpact: number;
  }>;
  recommendations: {
    callImmediately: number;
    enrichFirst: number;
    needsMoreData: number;
  };
}

interface TopPredictedLead {
  leadId: number;
  predictedConversionProbability: number;
  confidenceLevel: "high" | "medium" | "low";
  predictedValue: "high" | "medium" | "low";
  nextBestAction: string;
  lead: {
    id: number;
    institutionName: string;
    state: string;
    status: string;
  } | null;
}

const confidenceColors = {
  high: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  low: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

export function PredictiveInsightsCard() {
  const { data: insights, isLoading: insightsLoading } = useQuery<PredictiveInsights>({
    queryKey: ["/api/predictive/insights"],
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: topLeads, isLoading: topLeadsLoading } = useQuery<TopPredictedLead[]>({
    queryKey: ["/api/predictive/top"],
    staleTime: 60000,
  });

  const isLoading = insightsLoading || topLeadsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Predictive Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!insights || !topLeads) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Predictive Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Recommendations */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
            <span className="text-2xl font-bold text-green-700 dark:text-green-300">
              {insights.recommendations.callImmediately}
            </span>
            <span className="text-xs text-center text-muted-foreground">Call Now</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <Target className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mb-1" />
            <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {insights.recommendations.enrichFirst}
            </span>
            <span className="text-xs text-center text-muted-foreground">Enrich First</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {insights.recommendations.needsMoreData}
            </span>
            <span className="text-xs text-center text-muted-foreground">Needs Data</span>
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Conversion Probability Distribution</span>
            <span className="font-medium">{insights.averageScore}% avg</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(insights.distribution.high / insights.totalLeads) * 100}%` }}
              title={`High: ${insights.distribution.high}`}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${(insights.distribution.medium / insights.totalLeads) * 100}%` }}
              title={`Medium: ${insights.distribution.medium}`}
            />
            <div
              className="bg-red-400 transition-all"
              style={{ width: `${(insights.distribution.low / insights.totalLeads) * 100}%` }}
              title={`Low: ${insights.distribution.low}`}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              High ({insights.distribution.high})
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              Medium ({insights.distribution.medium})
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              Low ({insights.distribution.low})
            </span>
          </div>
        </div>

        {/* Top Predicted Leads */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Predicted Conversions
          </h4>
          <div className="space-y-2">
            {topLeads.slice(0, 5).map((item) => (
              <Link key={item.leadId} href={`/leads/${item.leadId}`}>
                <div className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">
                        {item.lead?.institutionName ?? `Lead #${item.leadId}`}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.nextBestAction}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${
                        item.predictedConversionProbability >= 70
                          ? "text-green-600 dark:text-green-400"
                          : item.predictedConversionProbability >= 50
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {item.predictedConversionProbability}%
                      </span>
                      <Badge className={`${confidenceColors[item.confidenceLevel]} text-xs border-0`}>
                        {item.confidenceLevel}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Scoring Factors */}
        {insights.topFactors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Scoring Factors</h4>
            <div className="flex flex-wrap gap-1">
              {insights.topFactors.slice(0, 5).map((factor) => (
                <Badge
                  key={factor.name}
                  variant="outline"
                  className={`text-xs ${factor.avgImpact > 0 ? "border-green-300 text-green-700 dark:text-green-300" : "border-red-300 text-red-700 dark:text-red-300"}`}
                >
                  {factor.name} ({factor.avgImpact > 0 ? "+" : ""}{factor.avgImpact})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
