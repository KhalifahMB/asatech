import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Logging hook — connect to a real error-reporting service in production.
    console.error("Application error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-muted">
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
