import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Basic error boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#ffdddd', color: '#333', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: '#cc0000' }}>Something went wrong</h1>
          <p>The application encountered an error. Please check the console for more details.</p>
          <details style={{ whiteSpace: 'pre-wrap', padding: '10px', backgroundColor: '#fff', marginTop: '10px' }}>
            <summary>Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '20px', 
              padding: '10px 15px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add diagnostic information to window object for debugging
window.appDebugInfo = {
  builtAt: new Date().toISOString(),
  publicUrl: import.meta.env.BASE_URL || '/',
  nodeEnv: import.meta.env.MODE || 'unknown'
};

console.log('App Debug Info:', window.appDebugInfo);

// Render app with error boundary
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
