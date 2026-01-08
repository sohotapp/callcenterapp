import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-[#1a1a1c] border border-[#2a2a2e] rounded-lg p-8 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold text-[#f5f5f5] mb-2">
                Something went wrong
              </h1>
              <p className="text-[#8b8b8b] text-sm mb-6">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>
              {this.state.error && (
                <div className="bg-[#0a0a0b] rounded-md p-3 mb-6 text-left">
                  <code className="text-xs text-red-400 break-all">
                    {this.state.error.message}
                  </code>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5e6ad2] hover:bg-[#6872d9] text-white text-sm font-medium rounded-md transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2a2a2e] hover:bg-[#3a3a3e] text-[#f5f5f5] text-sm font-medium rounded-md transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function QueryErrorResetBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
