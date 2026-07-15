import { Component, type ErrorInfo, type ReactNode } from 'react';

type AsyncErrorBoundaryProps = {
  children: ReactNode;
};

type AsyncErrorBoundaryState = {
  error: Error | null;
};

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, AsyncErrorBoundaryState> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global async boundary caught an error', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F3EE] p-6 text-slate-900">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-500">Erreur inattendue</p>
          <h1 className="mt-3 text-2xl font-semibold">Le flux a rencontré un problème</h1>
          <p className="mt-3 text-sm text-slate-600">
            Une erreur asynchrone non gérée est survenue. Vous pouvez relancer l’application depuis l’écran principal.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Revenir à l’accueil
          </button>
        </div>
      </div>
    );
  }
}
