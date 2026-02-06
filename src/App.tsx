import { FlowCanvas } from './components/FlowCanvas';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './hooks/useTheme';

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // 프로덕션에서는 에러 리포팅 서비스로 전송할 수 있음
          console.error('[App Error]', error.message);
          console.error('[App Stack]', errorInfo.componentStack);
        }}
      >
        <div style={{ width: '100vw', height: '100vh' }}>
          <FlowCanvas />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
