import * as React from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  Loader2,
  Search,
  Building2,
  TrendingUp,
  MessageSquareText,
  Crosshair,
  Send,
  Database,
  Settings,
  FileDown,
  LayoutDashboard,
  Command,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AICommandPaletteProps {
  currentLeadId?: number;
  selectedLeadIds?: number[];
}

export function AICommandPalette({ currentLeadId, selectedLeadIds }: AICommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [response, setResponse] = React.useState("");
  const [mode, setMode] = React.useState<"command" | "ai">("command");
  const [, setLocation] = useLocation();

  // Keyboard shortcut to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResponse("");
      setMode("command");
      setIsStreaming(false);
    }
  }, [open]);

  const navigationCommands = [
    { icon: LayoutDashboard, label: "Dashboard", shortcut: "G H", action: () => { setLocation("/"); setOpen(false); } },
    { icon: Building2, label: "Leads", shortcut: "G L", action: () => { setLocation("/leads"); setOpen(false); } },
    { icon: Database, label: "Scrape", shortcut: "G S", action: () => { setLocation("/scrape"); setOpen(false); } },
    { icon: MessageSquareText, label: "Scripts", action: () => { setLocation("/scripts"); setOpen(false); } },
    { icon: Crosshair, label: "ICP Builder", action: () => { setLocation("/icp"); setOpen(false); } },
    { icon: TrendingUp, label: "Analytics", shortcut: "G A", action: () => { setLocation("/analytics"); setOpen(false); } },
    { icon: FileDown, label: "Export", action: () => { setLocation("/export"); setOpen(false); } },
    { icon: Settings, label: "Settings", shortcut: "G E", action: () => { setLocation("/settings"); setOpen(false); } },
  ];

  const aiCommands = [
    { icon: Search, label: "Find high priority leads", action: () => askAI("Show me the top 5 highest priority leads that haven't been contacted yet") },
    { icon: Sparkles, label: "Suggest next actions", action: () => askAI("Based on my current data, what should I focus on today?") },
    { icon: Building2, label: "Analyze lead quality", action: () => askAI("Give me a quick analysis of my lead quality and any issues") },
    { icon: Crosshair, label: "Best outreach strategy", action: () => askAI("What's the best outreach strategy for government leads?") },
  ];

  async function askAI(command: string) {
    setMode("ai");
    setIsStreaming(true);
    setResponse("");
    setQuery(command);

    try {
      const response = await fetch("/api/ai/stream/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          context: {
            currentLeadId,
            selectedLeadIds,
            currentPage: window.location.pathname,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setResponse((prev) => prev + data.text);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("AI command error:", error);
      setResponse("Sorry, I couldn't process that request. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      askAI(query.trim());
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-col max-h-[500px]">
        {mode === "command" ? (
          <>
            <CommandInput
              placeholder="Search commands or ask AI..."
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim() && !query.startsWith("/")) {
                  e.preventDefault();
                  askAI(query.trim());
                }
              }}
              className="border-0"
            />
            <CommandList className="max-h-[400px] overflow-y-auto">
              <CommandEmpty>
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Ask AI</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Press Enter to ask: "{query}"
                    </p>
                  </div>
                </div>
              </CommandEmpty>

              <CommandGroup heading="Navigation">
                {navigationCommands.map((item) => (
                  <CommandItem
                    key={item.label}
                    onSelect={item.action}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {item.shortcut}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="AI Assistant">
                {aiCommands.map((item) => (
                  <CommandItem
                    key={item.label}
                    onSelect={item.action}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </CommandItem>
                ))}
                <CommandItem
                  onSelect={() => askAI(query || "What can you help me with?")}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="flex-1">Ask anything...</span>
                  <span className="text-xs text-muted-foreground">Enter</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </>
        ) : (
          <div className="flex flex-col">
            {/* AI Response Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium truncate flex-1">{query}</span>
              {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            {/* AI Response Body */}
            <ScrollArea className="h-[300px]">
              <div className="p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  {response || (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Follow-up Input */}
            <div className="border-t border-border p-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a follow-up..."
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !query.trim()}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="kbd">Esc</span>
            <span>to close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span className="kbd">K</span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
}
