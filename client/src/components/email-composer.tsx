import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
  leadId: number;
  leadName: string;
  email: string | null;
  whyNow?: string | null;
  onSend?: (subject: string, body: string) => void;
}

interface GeneratedMessage {
  subject?: string;
  body: string;
  slopScore: number;
  slopIssues: string[];
  suggestedImprovements: string[];
}

type EmailType = "cold_email" | "follow_up_email";

function SlopIndicator({ score }: { score: number }) {
  const color = score < 20 ? "text-green-500" : score < 40 ? "text-yellow-500" : "text-red-500";
  const bg = score < 20 ? "bg-green-500/10" : score < 40 ? "bg-yellow-500/10" : "bg-red-500/10";
  const label = score < 20 ? "Great" : score < 40 ? "Needs Polish" : "Too Generic";

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm", bg, color)}>
      <div className={cn("h-2 w-2 rounded-full", score < 20 ? "bg-green-500" : score < 40 ? "bg-yellow-500" : "bg-red-500")} />
      <span className="font-medium">{label}</span>
      <span className="opacity-70">({score}%)</span>
    </div>
  );
}

export function EmailComposer({ leadId, leadName, email, whyNow, onSend }: EmailComposerProps) {
  const [emailType, setEmailType] = useState<EmailType>("cold_email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [slopScore, setSlopScore] = useState<number | null>(null);
  const [slopIssues, setSlopIssues] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (type: EmailType) => {
      const res = await fetch(`/api/messages/generate/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: type }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      return res.json() as Promise<GeneratedMessage>;
    },
    onSuccess: (data) => {
      setSubject(data.subject || "");
      setBody(data.body);
      setSlopScore(data.slopScore);
      setSlopIssues(data.slopIssues);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate email. Check API configuration.",
        variant: "destructive",
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/regenerate/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: emailType,
          feedback: feedback || "Make it more specific and less generic",
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      return res.json() as Promise<GeneratedMessage>;
    },
    onSuccess: (data) => {
      setSubject(data.subject || "");
      setBody(data.body);
      setSlopScore(data.slopScore);
      setSlopIssues(data.slopIssues);
      setFeedback("");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/messages/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      if (!res.ok) throw new Error("Failed to analyze");
      return res.json();
    },
    onSuccess: (data) => {
      setSlopScore(data.slopScore);
      setSlopIssues(data.issues);
    },
  });

  const handleCopy = () => {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const mailtoLink = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  const handleSend = () => {
    if (onSend) {
      onSend(subject, body);
    }
    toast({
      title: "Email Logged",
      description: "Activity recorded. Open your email client to send.",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" />
            Email Composer
          </CardTitle>
          {slopScore !== null && <SlopIndicator score={slopScore} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context */}
        {whyNow && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary mb-1">Why reach out now:</p>
            <p className="text-sm">{whyNow}</p>
          </div>
        )}

        {/* Email Type & Generate */}
        <div className="flex items-center gap-3">
          <Select value={emailType} onValueChange={(v) => setEmailType(v as EmailType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cold_email">Cold Email</SelectItem>
              <SelectItem value="follow_up_email">Follow-up</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => generateMutation.mutate(emailType)}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate with AI
          </Button>
        </div>

        {/* Issues */}
        {slopIssues.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Issues detected:</p>
              <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                {slopIssues.slice(0, 3).map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
            className="mt-1"
          />
        </div>

        {/* Body */}
        <div>
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSlopScore(null); // Reset score when editing
            }}
            placeholder="Enter your message..."
            className="mt-1 min-h-[200px]"
          />
        </div>

        {/* Regenerate */}
        {body && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Feedback (e.g., 'make it shorter', 'more specific')"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || !body}
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Check"
              )}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {email ? (
              <span>To: {email}</span>
            ) : (
              <span className="text-amber-600">No email address available</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!body}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy
            </Button>
            {mailtoLink && (
              <a href={mailtoLink}>
                <Button variant="outline" size="sm" disabled={!body}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in Email
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handleSend} disabled={!body || !email}>
              <Send className="h-4 w-4 mr-1" />
              Log & Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
