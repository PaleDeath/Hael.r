import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors inside game chrome; prevents full route blanking.
 */
export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BrainTraining GameErrorBoundary:', error, info.componentStack);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[50dvh] flex-col items-center justify-center gap-6 px-6 py-12 text-center"
          role="alert"
        >
          <p className="text-lg font-semibold" style={{ color: 'var(--bt-text)' }}>
            Something went wrong
          </p>
          <button
            type="button"
            onClick={this.handleTryAgain}
            className="min-h-11 min-w-44 rounded-xl px-6 py-3 font-semibold text-white"
            style={{ background: 'var(--bt-primary-gradient)' }}
            aria-label="Try again after error"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
