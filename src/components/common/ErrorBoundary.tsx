import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary global — captura erros de renderização React para evitar
 * telas pretas completas. Exibe um fallback estilizado e oferece opção de
 * recuperação sem recarregar a página inteira.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Em produção, aqui enviaríamos para Sentry/LogRocket
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 border border-red-500/20 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
            {/* Ícone animado */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <div className="relative flex items-center justify-center w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Algo deu errado</h2>
              <p className="text-white/50 text-sm">
                Ocorreu um erro inesperado nessa seção. Seus dados locais estão seguros.
              </p>
            </div>

            {/* Detalhe técnico — collapsível */}
            {this.state.error && (
              <details className="text-left">
                <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors">
                  Ver detalhes técnicos
                </summary>
                <pre className="mt-2 p-3 bg-black/40 border border-white/10 rounded-xl text-[10px] text-red-400 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack?.slice(0, 400)}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl transition-all duration-200 active:scale-95 shadow-lg shadow-violet-500/20"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium rounded-2xl transition-all duration-200 active:scale-95 border border-white/10 text-sm"
              >
                Recarregar o app
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
