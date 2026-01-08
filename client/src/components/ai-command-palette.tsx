import * as React from "react";
import { useLocation } from "wouter";
import { Sparkles, Loader2, Search, Users, BarChart3, FileText, Target, Send } from "lucide-react";
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

  const quickCommands = [
    {
      group: "Navigation",
      items: [
        { icon: Users, label: "Go to Leads", action: () => { setLocation("/leads"); setOpen(false); } },
        { icon: BarChart3, label: "Go to Analytics", action: () => { setLocation("/analytics"); setOpen(false); } },
        { icon: FileText, label: "Go to Scripts", action: () => { setLocation("/scripts"); setOpen(false); } },
        { icon: Target, label: "Go to ICP Builder", action: () => { setLocation("/icp"); setOpen(false); } },
      ],
    },
    {
      group: "Quick Actions",
      items: [
        { icon: Search, label: "Find high priority leads", action: () => askAI("Show me the top 5 highest priority leads that haven't been contacted yet") },
        { icon: Sparkles, label: "Suggest next actions", action: () => askAI("Based on my current data, what should I focus on today?") },
        { icon: Users, label: "Analyze lead quality", action: () => askAI("Give me a quick analysis of my lead quality and any issues") },
      ],
    },
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
          if (line.startsWith("event: ")) {
            const event = line.slice(7);
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setResponse((prev) => prev + data.text);
              }
            } catch (e) {
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
      {mode === "command" ? (
        <>
          <CommandInput
            placeholder="Type a command or ask AI anything..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim() && !query.startsWith("/")) {
                e.preventDefault();
                askAI(query.trim());
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
                <p>Press Enter to ask AI: "{query}"</p>
              </div>
            </CommandEmpty>

            {quickCommands.map((group) => (
              <CommandGroup key={group.group} heading={group.group}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.label}
                    onSelect={item.action}
                    className="flex items-center gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandSeparator />

            <CommandGroup heading="AI Assistant">
              <CommandItem
                onSelect={() => askAI(query || "What can you help me with?")}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>Ask AI anything...</span>
                <span className="ml-auto text-xs text-muted-foreground">Enter</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3 py-3">
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium truncate flex-1">{query}</span>
            {isStreaming && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </div>

          <ScrollArea className="h-[300px] p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {response || (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a follow-up question..."
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isStreaming || !query.trim()}
                className="p-1 rounded hover:bg-accent disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex justify-between">
        <span>Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to close</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">K</kbd></span>
      </div>
    </CommandDialog>
  );
}

// Floating trigger button for the command palette
export function AICommandTrigger() {
  const [open, setOpen] = React.useState(false);

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

  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 p-4 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors z-50"
      title="AI Command Palette (Cmd+K)"
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}
