import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Keeps a rendering failure inside one region. Without this a single bad record
 * blanks the whole page, which reads as a crash rather than a recoverable fault.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Recovered from a rendering failure", error, info);
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="rounded-md border border-danger bg-danger-soft px-4 py-3" role="alert">
        <p className="m-0 text-sm text-danger">
          <strong>{this.props.label ?? "This section"} could not be displayed.</strong>
        </p>
        <p className="m-0 mt-1 text-sm text-ink-soft">{error.message}</p>
        <button
          type="button"
          className="mt-2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunk"
          onClick={this.reset}
        >
          Try again
        </button>
      </div>
    );
  }
}
