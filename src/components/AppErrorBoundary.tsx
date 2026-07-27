import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("GXAuth render error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-card p-6 shadow-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold">GXAuth hit a page error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app is still online, but this page failed to render. Refresh once; if it repeats, check the browser console for the error below.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button className="mt-5 w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload GXAuth
          </Button>
        </div>
      </div>
    );
  }
}
