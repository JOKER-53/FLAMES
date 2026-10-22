import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Page error", error.message, info.componentStack); }
  render() {
    if (this.state.failed) return (
      <main className="min-h-screen grid place-items-center bg-canvas p-6">
        <div className="card max-w-md p-8">
          <h1 className="text-xl font-semibold">This page could not be displayed</h1>
          <p className="mt-2 text-muted">Your saved progress is unaffected. Reload the page to try again.</p>
          <div className="mt-6 flex gap-2">
            <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
            <a className="btn-ghost" href="/">Go to courses</a>
          </div>
        </div>
      </main>
    );
    return this.props.children;
  }
}
