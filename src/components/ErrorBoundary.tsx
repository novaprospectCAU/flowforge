/**
 * 에러 바운더리 - React 컴포넌트 에러 처리
 * 자식 컴포넌트에서 발생한 에러를 잡아서 폴백 UI를 표시
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { IconWarning } from './Icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 콘솔에 에러 로그
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // 외부 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 폴백이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>{IconWarning({ size: 32, color: '#f6e05e' })}</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              An unexpected error occurred. You can try to recover or reload the page.
            </p>

            {this.state.error && (
              <div style={styles.errorBox}>
                <code style={styles.errorCode}>
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div style={styles.buttons}>
              <button onClick={this.handleReset} style={styles.primaryBtn} aria-label="Try again">
                Try Again
              </button>
              <button onClick={this.handleReload} style={styles.secondaryBtn} aria-label="Reload page">
                Reload Page
              </button>
            </div>

            {this.state.errorInfo && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.stack}>
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 노드 위젯 전용 에러 바운더리
 * 개별 노드 에러가 전체 캔버스에 영향을 주지 않도록 함
 */
interface NodeErrorBoundaryProps {
  children: ReactNode;
  nodeId: string;
  nodeType: string;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class NodeErrorBoundary extends Component<NodeErrorBoundaryProps, NodeErrorBoundaryState> {
  constructor(props: NodeErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NodeErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[NodeError] Node ${this.props.nodeId} (${this.props.nodeType}):`, error);
    console.error('[NodeError] Stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={nodeStyles.container}>
          <div style={nodeStyles.icon}>{IconWarning({ size: 32, color: '#f6e05e' })}</div>
          <div style={nodeStyles.message}>Widget Error</div>
          <button onClick={this.handleRetry} style={nodeStyles.retryBtn} aria-label="Retry loading widget">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 메인 에러 바운더리 스타일
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    maxWidth: 500,
    width: '100%',
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: 20,
    fontWeight: 600,
    color: '#ffffff',
  },
  message: {
    margin: '0 0 20px 0',
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 1.5,
  },
  errorBox: {
    background: '#3f1d1d',
    border: '1px solid #ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorCode: {
    fontSize: 12,
    color: '#fca5a5',
    wordBreak: 'break-word',
  },
  buttons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    padding: '10px 20px',
    background: '#3182ce',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 20px',
    background: '#3c3c3c',
    border: 'none',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  details: {
    textAlign: 'left',
    marginTop: 16,
  },
  summary: {
    cursor: 'pointer',
    color: '#808080',
    fontSize: 12,
    marginBottom: 8,
  },
  stack: {
    background: '#1a1a1a',
    border: '1px solid #3c3c3c',
    borderRadius: 6,
    padding: 12,
    fontSize: 10,
    color: '#808080',
    overflow: 'auto',
    maxHeight: 200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

// 노드 에러 바운더리 스타일
const nodeStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  icon: {
    fontSize: 24,
  },
  message: {
    fontSize: 11,
    color: '#ef4444',
  },
  retryBtn: {
    padding: '4px 12px',
    background: '#3c3c3c',
    border: 'none',
    borderRadius: 4,
    color: '#a0a0a0',
    fontSize: 10,
    cursor: 'pointer',
  },
};
