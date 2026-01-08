import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { LinearSidebar } from "@/components/linear-sidebar";
import { AICommandPalette } from "@/components/ai-command-palette";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import LeadDetail from "@/pages/lead-detail";
import ScriptsPage from "@/pages/scripts";
import ScrapePage from "@/pages/scrape";
import ExportPage from "@/pages/export";
import SettingsPage from "@/pages/settings";
import IcpPage from "@/pages/icp";
import AnalyticsPage from "@/pages/analytics";
import CallQueuePage from "@/pages/call-queue";
import ReviewQueuePage from "@/pages/review-queue";
import AddLeadPage from "@/pages/add-lead";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/leads/new" component={AddLeadPage} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/scripts" component={ScriptsPage} />
      <Route path="/scrape" component={ScrapePage} />
      <Route path="/export" component={ExportPage} />
      <Route path="/icp" component={IcpPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/call-queue" component={CallQueuePage} />
      <Route path="/review-queue" component={ReviewQueuePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Keyboard shortcuts handler
function KeyboardShortcuts() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // G + key for navigation (Linear style)
      if (e.key === "g") {
        const handleNavKey = (navE: KeyboardEvent) => {
          switch (navE.key) {
            case "h":
              setLocation("/");
              break;
            case "l":
              setLocation("/leads");
              break;
            case "q":
              setLocation("/call-queue");
              break;
            case "r":
              setLocation("/review-queue");
              break;
            case "s":
              setLocation("/scrape");
              break;
            case "a":
              setLocation("/analytics");
              break;
            case "e":
              setLocation("/settings");
              break;
          }
          window.removeEventListener("keydown", handleNavKey);
        };
        window.addEventListener("keydown", handleNavKey, { once: true });
        setTimeout(() => window.removeEventListener("keydown", handleNavKey), 500);
      }

      // ? to show shortcuts (could trigger a modal)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        // Could show shortcuts modal
      }

      // Cmd+N to add new lead
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setLocation("/leads/new");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          {/* Linear-style layout: sidebar + main content */}
          <div className="flex h-screen w-full bg-background">
            {/* Sidebar */}
            <LinearSidebar />

            {/* Main content area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <ErrorBoundary>
                <div className="flex-1 overflow-auto">
                  <Router />
                </div>
              </ErrorBoundary>
            </main>
          </div>

          {/* Global components */}
          <Toaster />
          <AICommandPalette />
          <KeyboardShortcuts />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
