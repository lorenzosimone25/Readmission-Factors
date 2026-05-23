import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ReadmissionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ReadmissionTab]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border p-8"
          style={{
            borderColor: 'var(--color-accent-danger)',
            background: 'var(--color-panel-solid)',
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Something went wrong
          </h2>
          <p
            className="max-w-md text-center text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent-blue)' }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
