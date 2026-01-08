import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Mail,
  Linkedin,
  Phone,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Send,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReviewLead {
  id: number;
  institutionName: string;
  institutionType: string;
  state: string;
  department: string | null;
  outreachScore: number | null;
  whyNow: string | null;
  hooks: string[] | null;
  recommendedAngle: string | null;
  email: string | null;
  phone: string | null;
  signalCount: number;
  latestSignalType: string | null;
}

interface GeneratedMessage {
  subject?: string;
  body: string;
  slopScore: number;
  slopIssues: string[];
  suggestedImprovements: string[];
  hookUsed: string | null;
  signalReferenced: string | null;
}

type MessageType = "cold_email" | "linkedin" | "follow_up_email";

function SlopScoreBadge({ score }: { score: number }) {
  const color = score < 20 ? "bg-green-500" : score < 40 ? "bg-yellow-500" : "bg-red-500";
  const label = score < 20 ? "Great" : score < 40 ? "OK" : "Needs Work";

  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">({score}% slop)</span>
    </div>
  );
}

function MessagePreview({
  lead,
  onApprove,
  onClose,
}: {
  lead: ReviewLead;
  onApprove: (type: string, message: GeneratedMessage) => void;
  onClose: () => void;
}) {
  const [messageType, setMessageType] = useState<MessageType>("cold_email");
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (type: MessageType) => {
      const res = await fetch(`/api/messages/generate/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: type }),
      });
      if (!res.ok) throw new Error("Failed to generate message");
      return res.json() as Promise<GeneratedMessage>;
    },
    onSuccess: (data) => {
      setGeneratedMessage(data);
      setEditedBody(data.body);
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate message. Check API configuration.",
        variant: "destructive",
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/regenerate/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType,
          feedback: feedback || "Make it better",
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate message");
      return res.json() as Promise<GeneratedMessage>;
    },
    onSuccess: (data) => {
      setGeneratedMessage(data);
      setEditedBody(data.body);
      setIsEditing(false);
      setFeedback("");
    },
  });

  const handleCopy = () => {
    const textToCopy = generatedMessage?.subject
      ? `Subject: ${generatedMessage.subject}\n\n${editedBody}`
      : editedBody;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleApprove = () => {
    if (generatedMessage) {
      onApprove(messageType, { ...generatedMessage, body: editedBody });
    }
  };

  return (
    <div className="space-y-4">
      {/* Lead Context */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{lead.institutionName}</h3>
            <p className="text-sm text-muted-foreground">
              {lead.institutionType} | {lead.state}
              {lead.department && ` | ${lead.department}`}
            </p>
          </div>
          <Badge variant="outline" className="ml-2">
            Score: {lead.outreachScore}/10
          </Badge>
        </div>
        {lead.whyNow && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm font-medium text-primary">Why Now:</p>
            <p className="text-sm">{lead.whyNow}</p>
          </div>
        )}
        {lead.hooks && lead.hooks.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Hooks:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.hooks.map((hook, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {hook}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message Type Selection */}
      <div className="flex items-center gap-4">
        <Label>Message Type:</Label>
        <Select
          value={messageType}
          onValueChange={(v) => {
            setMessageType(v as MessageType);
            setGeneratedMessage(null);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cold_email">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Cold Email
              </div>
            </SelectItem>
            <SelectItem value="linkedin">
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </div>
            </SelectItem>
            <SelectItem value="follow_up_email">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Follow-up Email
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => generateMutation.mutate(messageType)}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate
        </Button>
      </div>

      {/* Generated Message */}
      {generatedMessage && (
        <div className="space-y-4">
          {/* Slop Score */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <SlopScoreBadge score={generatedMessage.slopScore} />
            {generatedMessage.slopIssues.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{generatedMessage.slopIssues.length} issues</span>
              </div>
            )}
          </div>

          {/* Issues & Improvements */}
          {(generatedMessage.slopIssues.length > 0 || generatedMessage.suggestedImprovements.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {generatedMessage.slopIssues.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-destructive mb-1">Issues:</p>
                  <ul className="space-y-1">
                    {generatedMessage.slopIssues.map((issue, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-1">
                        <span className="text-destructive">•</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generatedMessage.suggestedImprovements.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-green-600 mb-1">Suggestions:</p>
                  <ul className="space-y-1">
                    {generatedMessage.suggestedImprovements.map((imp, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-1">
                        <span className="text-green-600">•</span> {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Subject (for emails) */}
          {generatedMessage.subject && (
            <div>
              <Label className="text-sm">Subject:</Label>
              <div className="mt-1 p-2 bg-muted rounded text-sm">
                {generatedMessage.subject}
              </div>
            </div>
          )}

          {/* Message Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm">Message:</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {isEditing ? "Preview" : "Edit"}
              </Button>
            </div>
            {isEditing ? (
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
              />
            ) : (
              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                {editedBody}
              </div>
            )}
          </div>

          {/* Regenerate with Feedback */}
          <div className="flex items-center gap-2">
            <Textarea
              placeholder="Feedback for regeneration (e.g., 'make it shorter', 'be more specific about X')"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="flex-1 h-10 min-h-0"
            />
            <Button
              variant="outline"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {lead.email && messageType.includes("email") && (
                <a href={`mailto:${lead.email}?subject=${encodeURIComponent(generatedMessage.subject || "")}&body=${encodeURIComponent(editedBody)}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in Email
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleApprove}>
                <ThumbsUp className="h-4 w-4 mr-2" />
                Approve & Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewQueuePage() {
  const [selectedLead, setSelectedLead] = useState<ReviewLead | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch leads pending review
  const { data, isLoading, error } = useQuery<{ leads: ReviewLead[]; total: number }>({
    queryKey: ["/api/messages/pending-review"],
    queryFn: async () => {
      const res = await fetch("/api/messages/pending-review?limit=50");
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
  });

  // Log activity when message approved
  const logActivityMutation = useMutation({
    mutationFn: async ({
      leadId,
      activityType,
      subject,
      content,
    }: {
      leadId: number;
      activityType: string;
      subject?: string;
      content: string;
    }) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          activityType,
          subject,
          content,
          status: "sent",
        }),
      });
      if (!res.ok) throw new Error("Failed to log activity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Message Approved",
        description: "Activity logged. Lead will be removed from queue.",
      });
      setSelectedLead(null);
    },
  });

  const handleApprove = (type: string, message: GeneratedMessage) => {
    if (!selectedLead) return;

    const activityType = type === "linkedin" ? "linkedin" : "email";

    logActivityMutation.mutate({
      leadId: selectedLead.id,
      activityType,
      subject: message.subject,
      content: message.body,
    });
  };

  const leads = data?.leads || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve AI-generated messages before sending
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {leads.length} leads ready
        </Badge>
      </div>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load queue</h3>
            <p className="text-muted-foreground">Please try again later</p>
          </CardContent>
        </Card>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-2">Review Queue Empty</h3>
            <p className="text-muted-foreground max-w-md">
              No high-value leads (score 8+) are ready for outreach yet.
              Leads need to be synthesized first via the Intelligence engine.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.href = "/leads"}
            >
              View All Leads
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedLead?.id === lead.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedLead(lead)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {lead.institutionName}
                    </CardTitle>
                    <CardDescription>
                      {lead.institutionType} | {lead.state}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={lead.outreachScore && lead.outreachScore >= 9 ? "default" : "secondary"}
                  >
                    {lead.outreachScore}/10
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {lead.whyNow && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {lead.whyNow}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone
                      </span>
                    )}
                  </div>
                  <span>{lead.signalCount} signals</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message Preview Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Message</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <MessagePreview
              lead={selectedLead}
              onApprove={handleApprove}
              onClose={() => setSelectedLead(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
