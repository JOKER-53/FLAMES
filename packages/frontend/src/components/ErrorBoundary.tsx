import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Page error", error.message, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="account-panel"><h1>The lab could not display this page</h1><p>Your saved account progress is unaffected. Reload the page to try again.</p><button className="platform-primary" onClick={() => window.location.reload()}>Reload lab</button><a className="platform-back" href="/">Return to platforms</a></main>;
    return this.props.children;
  }
}
