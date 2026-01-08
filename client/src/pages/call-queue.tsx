import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, AlertTriangle, Clock, ChevronRight, Check, X, Voicemail, Calendar, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface QueueLead {
  id: number;
  institutionName: string;
  department: string | null;
  state: string;
  phone: string | null;
  score: number;
  classification: "hot" | "warm" | "nurture";
  urgency: string;
  whyNow: string | null;
  topHook: string | null;
  signalCount: number;
  latestSignalType: string | null;
  status: string;
  lastContactedAt: string | null;
}

interface CallBriefing {
  leadId: number;
  institutionName: string;
  contactInfo: {
    department: string | null;
    state: string;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  score: number;
  classification: string;
  urgency: {
    level: string;
    action: string;
    deadline: string;
  };
  whyNow: string;
  openingLine: string;
  keyContext: string[];
  objections: Array<{ objection: string; counter: string }>;
  doNotMention: string[];
  signalSources: Array<{
    type: string;
    date: string;
    url: string | null;
    preview: string;
  }>;
  decisionMakers: Array<{
    name: string;
    title: string;
    email: string | null;
    phone: string | null;
  }>;
}

const outcomeOptions = [
  { value: "meeting", label: "Meeting Scheduled", icon: Calendar },
  { value: "callback", label: "Callback Scheduled", icon: Clock },
  { value: "not_interested", label: "Not Interested", icon: X },
  { value: "no_answer", label: "No Answer", icon: Phone },
  { value: "no_reply", label: "Left Voicemail", icon: Voicemail },
];

function ScoreBadge({ score, classification }: { score: number; classification: string }) {
  const colorClass =
    classification === "hot"
      ? "bg-red-500 text-white"
      : classification === "warm"
      ? "bg-orange-500 text-white"
      : "bg-muted text-muted-foreground";

  return (
    <Badge className={colorClass}>
      {score}/10 {classification.toUpperCase()}
    </Badge>
  );
}

function BriefingCard({ briefing, onLogOutcome, onSkip }: {
  briefing: CallBriefing;
  onLogOutcome: () => void;
  onSkip: () => void;
}) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{briefing.institutionName}</CardTitle>
            <p className="text-muted-foreground">
              {briefing.contactInfo.department} | {briefing.contactInfo.state}
            </p>
          </div>
          <ScoreBadge score={briefing.score} classification={briefing.classification} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="flex gap-4 text-sm">
          {briefing.contactInfo.phone && (
            <a href={`tel:${briefing.contactInfo.phone}`} className="flex items-center gap-1 text-primary hover:underline">
              <Phone className="h-4 w-4" />
              {briefing.contactInfo.phone}
            </a>
          )}
          {briefing.contactInfo.email && (
            <a href={`mailto:${briefing.contactInfo.email}`} className="text-primary hover:underline">
              {briefing.contactInfo.email}
            </a>
          )}
        </div>

        {/* WHY NOW */}
        <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
          <h3 className="font-semibold text-primary mb-2">WHY NOW</h3>
          <p className="text-sm">{briefing.whyNow}</p>
        </div>

        {/* OPENING LINE */}
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-semibold mb-2">OPENING LINE</h3>
          <p className="text-sm italic">"{briefing.openingLine}"</p>
        </div>

        {/* KEY CONTEXT */}
        {briefing.keyContext.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">KEY CONTEXT</h3>
            <ul className="text-sm space-y-1">
              {briefing.keyContext.map((context, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  {context}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* OBJECTIONS */}
        {briefing.objections.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">LIKELY OBJECTIONS</h3>
            <div className="space-y-2">
              {briefing.objections.map((obj, i) => (
                <div key={i} className="text-sm border-l-2 border-orange-500 pl-3">
                  <p className="font-medium">"{obj.objection}"</p>
                  <p className="text-muted-foreground">→ {obj.counter}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DO NOT MENTION */}
        {briefing.doNotMention.length > 0 && (
          <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
            <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              DO NOT MENTION
            </h3>
            <ul className="text-sm space-y-1">
              {briefing.doNotMention.map((item, i) => (
                <li key={i} className="text-destructive/80">• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* DECISION MAKERS */}
        {briefing.decisionMakers.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">DECISION MAKERS</h3>
            <div className="space-y-2">
              {briefing.decisionMakers.map((dm, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium">{dm.name}</p>
                  <p className="text-muted-foreground">{dm.title}</p>
                  {dm.phone && <p className="text-xs">{dm.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SIGNAL SOURCES */}
        {briefing.signalSources.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">Signal Sources</h3>
            <div className="space-y-1">
              {briefing.signalSources.map((source, i) => (
                <div key={i} className="text-xs border rounded p-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{source.type}</Badge>
                    <span className="text-muted-foreground">{new Date(source.date).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground line-clamp-2">{source.preview}</p>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">
                      View source
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onLogOutcome} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Log Outcome
          </Button>
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CallQueuePage() {
  const [minScore, setMinScore] = useState(6);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch call queue
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ["/api/briefing", minScore],
    queryFn: async () => {
      const res = await fetch(`/api/briefing?minScore=${minScore}&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
  });

  // Fetch briefing for selected lead
  const { data: briefing, isLoading: briefingLoading } = useQuery({
    queryKey: ["/api/briefing", selectedLead],
    queryFn: async () => {
      if (!selectedLead) return null;
      const res = await fetch(`/api/briefing/${selectedLead}`);
      if (!res.ok) throw new Error("Failed to fetch briefing");
      return res.json() as Promise<CallBriefing>;
    },
    enabled: !!selectedLead,
  });

  // Log outcome mutation
  const logOutcomeMutation = useMutation({
    mutationFn: async ({ leadId, outcome, notes }: { leadId: number; outcome: string; notes: string }) => {
      const res = await fetch(`/api/briefing/${leadId}/log-outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes }),
      });
      if (!res.ok) throw new Error("Failed to log outcome");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefing"] });
      toast({ title: "Outcome logged", description: "Moving to next lead..." });
      setOutcomeModalOpen(false);
      setSelectedOutcome("");
      setOutcomeNotes("");
      // Move to next lead
      const queue = queueData?.queue || [];
      const currentIndex = queue.findIndex((l: QueueLead) => l.id === selectedLead);
      if (currentIndex < queue.length - 1) {
        setSelectedLead(queue[currentIndex + 1].id);
      } else {
        setSelectedLead(null);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log outcome", variant: "destructive" });
    },
  });

  const queue: QueueLead[] = queueData?.queue || [];

  // Auto-select first lead
  if (!selectedLead && queue.length > 0) {
    setSelectedLead(queue[0].id);
  }

  const handleSkip = () => {
    const currentIndex = queue.findIndex((l) => l.id === selectedLead);
    if (currentIndex < queue.length - 1) {
      setSelectedLead(queue[currentIndex + 1].id);
    }
  };

  const handleLogOutcome = () => {
    if (!selectedLead || !selectedOutcome) return;
    logOutcomeMutation.mutate({
      leadId: selectedLead,
      outcome: selectedOutcome,
      notes: outcomeNotes,
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Call Queue</h1>
          <p className="text-muted-foreground">
            {queueData?.total || 0} leads ready for outreach
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm">Min Score: {minScore}</Label>
          <Slider
            value={[minScore]}
            onValueChange={([v]) => setMinScore(v)}
            min={1}
            max={10}
            step={1}
            className="w-32"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Sidebar */}
        <div className="space-y-2">
          <h2 className="font-semibold mb-3">Queue ({queue.length})</h2>
          {queueLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : queue.length === 0 ? (
            <p className="text-muted-foreground">No leads match the score threshold</p>
          ) : (
            queue.map((lead) => (
              <Card
                key={lead.id}
                className={`cursor-pointer transition-colors ${
                  selectedLead === lead.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedLead(lead.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <p className="font-medium truncate">{lead.institutionName}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.department} | {lead.state}
                      </p>
                    </div>
                    <ScoreBadge score={lead.score} classification={lead.classification} />
                  </div>
                  {lead.topHook && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                      {lead.topHook}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Main Briefing Area */}
        <div className="lg:col-span-2">
          {briefingLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading briefing...</p>
            </Card>
          ) : briefing ? (
            <BriefingCard
              briefing={briefing}
              onLogOutcome={() => setOutcomeModalOpen(true)}
              onSkip={handleSkip}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Select a lead from the queue to view briefing</p>
            </Card>
          )}
        </div>
      </div>

      {/* Outcome Modal */}
      <Dialog open={outcomeModalOpen} onOpenChange={setOutcomeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={selectedOutcome} onValueChange={setSelectedOutcome}>
              {outcomeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes about the call..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogOutcome} disabled={!selectedOutcome}>
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
