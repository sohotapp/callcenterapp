import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Linkedin,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LinkedInComposerProps {
  leadId: number;
  leadName: string;
  linkedinUrl?: string | null;
  whyNow?: string | null;
  onSend?: (message: string) => void;
}

interface GeneratedMessage {
  body: string;
  slopScore: number;
  slopIssues: string[];
  suggestedImprovements: string[];
}

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

export function LinkedInComposer({ leadId, leadName, linkedinUrl, whyNow, onSend }: LinkedInComposerProps) {
  const [message, setMessage] = useState("");
  const [slopScore, setSlopScore] = useState<number | null>(null);
  const [slopIssues, setSlopIssues] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/generate/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: "linkedin" }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      return res.json() as Promise<GeneratedMessage>;
    },
    onSuccess: (data) => {
      setMessage(data.body);
      setSlopScore(data.slopScore);
      setSlopIssues(data.slopIssues);
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
      const res = await fetch(`/api/messages/regenerate/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: "linkedin",
          feedback: feedback || "Make it more specific and less generic",
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      return res.json() as Promise<GeneratedMessage>;
    },
    onSuccess: (data) => {
      setMessage(data.body);
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
        body: JSON.stringify({ message }),
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
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleSend = () => {
    if (onSend) {
      onSend(message);
    }
    toast({
      title: "Message Logged",
      description: "Activity recorded. Open LinkedIn to send your message.",
    });
  };

  // Character limit for LinkedIn connection requests (300) vs InMail (1900)
  const charLimit = 300;
  const isOverLimit = message.length > charLimit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Linkedin className="h-5 w-5 text-[#0077b5]" />
            LinkedIn Message
          </CardTitle>
          {slopScore !== null && <SlopIndicator score={slopScore} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context */}
        {whyNow && (
          <div className="p-3 bg-[#0077b5]/5 rounded-lg border border-[#0077b5]/20">
            <p className="text-sm font-medium text-[#0077b5] mb-1">Why reach out now:</p>
            <p className="text-sm">{whyNow}</p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="bg-[#0077b5] hover:bg-[#005e8a]"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate LinkedIn Message
        </Button>

        {/* Issues */}
        {slopIssues.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Issues detected:</p>
              <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                {slopIssues.slice(0, 3).map((issue, i) => (
                  <li key={i}>- {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="linkedin-message">Message</Label>
            <span className={cn(
              "text-xs",
              isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {message.length}/{charLimit} characters
              {isOverLimit && " (over limit for connection request)"}
            </span>
          </div>
          <Textarea
            id="linkedin-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSlopScore(null);
            }}
            placeholder="Enter your LinkedIn message..."
            className={cn("mt-1 min-h-[120px]", isOverLimit && "border-destructive")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Connection requests have a 300 character limit. InMail messages allow up to 1,900 characters.
          </p>
        </div>

        {/* Regenerate */}
        {message && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Feedback (e.g., 'shorter', 'mention their recent post')"
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
              disabled={analyzeMutation.isPending || !message}
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
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#0077b5] hover:underline"
              >
                <Linkedin className="h-3 w-3" />
                View Profile
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-amber-600">No LinkedIn URL available</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!message}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy
            </Button>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-[#0077b5] hover:bg-[#005e8a]" disabled={!message}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open LinkedIn
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handleSend} disabled={!message}>
              Log Activity
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
