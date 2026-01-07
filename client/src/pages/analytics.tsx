import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Users,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  Target,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface FunnelData {
  totalLeads: number;
  enrichedLeads: number;
  contactedLeads: number;
  respondedLeads: number;
  meetingsBooked: number;
  wonDeals: number;
}

interface ResponseRates {
  email: {
    sent: number;
    opened: number;
    replied: number;
    openRate: number;
    replyRate: number;
  };
  phone: {
    callsMade: number;
    answered: number;
    meetingsBooked: number;
    answerRate: number;
  };
  linkedin: {
    sent: number;
    connected: number;
    replied: number;
  };
}

interface IcpPerformance {
  icpId: number;
  icpName: string;
  isActive: boolean;
  leadCount: number;
  responseRate: number;
  meetingsBooked: number;
  avgScore: number;
}

interface StateAnalytics {
  state: string;
  leadCount: number;
  contacted: number;
  responded: number;
  meetings: number;
  responseRate: number;
}

interface TimeSeriesData {
  date: string;
  leadsCreated: number;
  leadsContacted: number;
  meetingsBooked: number;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: number | string;
  icon: typeof Users;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelChart({ data, loading }: { data?: FunnelData; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const funnelSteps = [
    { label: "Total Leads", value: data.totalLeads, color: "bg-blue-500" },
    { label: "Enriched", value: data.enrichedLeads, color: "bg-cyan-500" },
    { label: "Contacted", value: data.contactedLeads, color: "bg-yellow-500" },
    { label: "Responded", value: data.respondedLeads, color: "bg-orange-500" },
    { label: "Meetings Booked", value: data.meetingsBooked, color: "bg-green-500" },
    { label: "Won Deals", value: data.wonDeals, color: "bg-emerald-500" },
  ];

  const maxValue = Math.max(...funnelSteps.map(s => s.value), 1);

  return (
    <div className="space-y-3">
      {funnelSteps.map((step, index) => {
        const percentage = data.totalLeads > 0 
          ? Math.round((step.value / data.totalLeads) * 100) 
          : 0;
        const conversionFromPrev = index > 0 && funnelSteps[index - 1].value > 0
          ? Math.round((step.value / funnelSteps[index - 1].value) * 100)
          : 100;

        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{percentage}%</span>
                <span className="font-semibold" data-testid={`funnel-${step.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {step.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="relative h-8 w-full rounded-md bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${step.color} transition-all duration-500`}
                style={{ width: `${(step.value / maxValue) * 100}%` }}
              />
              {index > 0 && (
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <Badge variant="secondary" className="text-xs">
                    {conversionFromPrev}% conv.
                  </Badge>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChannelCard({
  title,
  icon: Icon,
  stats,
  loading,
}: {
  title: string;
  icon: typeof Mail;
  stats: { label: string; value: number | string }[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="font-semibold" data-testid={`channel-${title.toLowerCase()}-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: funnelData, isLoading: funnelLoading } = useQuery<FunnelData>({
    queryKey: ["/api/analytics/funnel"],
  });

  const { data: responseRates, isLoading: ratesLoading } = useQuery<ResponseRates>({
    queryKey: ["/api/analytics/response-rates"],
  });

  const { data: icpPerformance, isLoading: icpLoading } = useQuery<IcpPerformance[]>({
    queryKey: ["/api/analytics/by-icp"],
  });

  const { data: stateAnalytics, isLoading: stateLoading } = useQuery<StateAnalytics[]>({
    queryKey: ["/api/analytics/by-state"],
  });

  const { data: timeSeriesData, isLoading: timeLoading } = useQuery<TimeSeriesData[]>({
    queryKey: ["/api/analytics/over-time"],
  });

  const overallResponseRate = funnelData && funnelData.contactedLeads > 0
    ? Math.round((funnelData.respondedLeads / funnelData.contactedLeads) * 100)
    : 0;

  const conversionRate = funnelData && funnelData.totalLeads > 0
    ? Math.round((funnelData.wonDeals / funnelData.totalLeads) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" data-testid="text-analytics-title">
          Analytics
        </h1>
        <p className="text-muted-foreground">
          Pipeline performance and conversion metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={funnelData?.totalLeads ?? 0}
          icon={Users}
          loading={funnelLoading}
        />
        <MetricCard
          title="Response Rate"
          value={`${overallResponseRate}%`}
          icon={TrendingUp}
          subtitle="of contacted leads"
          loading={funnelLoading}
        />
        <MetricCard
          title="Meetings Booked"
          value={funnelData?.meetingsBooked ?? 0}
          icon={Calendar}
          loading={funnelLoading}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
          subtitle="leads to won deals"
          loading={funnelLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} loading={funnelLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Rates by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <ChannelCard
                title="Email"
                icon={Mail}
                loading={ratesLoading}
                stats={[
                  { label: "Sent", value: responseRates?.email.sent ?? 0 },
                  { label: "Opened", value: responseRates?.email.opened ?? 0 },
                  { label: "Open Rate", value: `${responseRates?.email.openRate ?? 0}%` },
                  { label: "Replied", value: responseRates?.email.replied ?? 0 },
                  { label: "Reply Rate", value: `${responseRates?.email.replyRate ?? 0}%` },
                ]}
              />
              <ChannelCard
                title="Phone"
                icon={Phone}
                loading={ratesLoading}
                stats={[
                  { label: "Calls Made", value: responseRates?.phone.callsMade ?? 0 },
                  { label: "Answered", value: responseRates?.phone.answered ?? 0 },
                  { label: "Answer Rate", value: `${responseRates?.phone.answerRate ?? 0}%` },
                  { label: "Meetings", value: responseRates?.phone.meetingsBooked ?? 0 },
                ]}
              />
              <ChannelCard
                title="LinkedIn"
                icon={Linkedin}
                loading={ratesLoading}
                stats={[
                  { label: "Sent", value: responseRates?.linkedin.sent ?? 0 },
                  { label: "Connected", value: responseRates?.linkedin.connected ?? 0 },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {timeLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : timeSeriesData && timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="leadsCreated" 
                  name="Leads Created"
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="leadsContacted" 
                  name="Leads Contacted"
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No activity data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance by ICP
            </CardTitle>
          </CardHeader>
          <CardContent>
            {icpLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : icpPerformance && icpPerformance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ICP</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Response</TableHead>
                    <TableHead className="text-right">Meetings</TableHead>
                    <TableHead className="text-right">Avg Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {icpPerformance.map((icp) => (
                    <TableRow key={icp.icpId} data-testid={`icp-row-${icp.icpId}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {icp.icpName}
                          {!icp.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{icp.leadCount}</TableCell>
                      <TableCell className="text-right">{icp.responseRate}%</TableCell>
                      <TableCell className="text-right">{icp.meetingsBooked}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={icp.avgScore >= 70 ? "default" : icp.avgScore >= 50 ? "secondary" : "outline"}
                        >
                          {icp.avgScore}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No ICP profiles configured
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geographic Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stateLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stateAnalytics && stateAnalytics.length > 0 ? (
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Contacted</TableHead>
                      <TableHead className="text-right">Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stateAnalytics.slice(0, 15).map((state) => (
                      <TableRow key={state.state} data-testid={`state-row-${state.state}`}>
                        <TableCell className="font-medium">{state.state}</TableCell>
                        <TableCell className="text-right">{state.leadCount}</TableCell>
                        <TableCell className="text-right">{state.contacted}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={state.responseRate >= 30 ? "default" : "secondary"}>
                            {state.responseRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {stateAnalytics.length > 15 && (
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Showing top 15 of {stateAnalytics.length} states
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No geographic data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
