import { Component } from 'react';

// Catches render-time crashes anywhere below it and shows a recoverable
// screen instead of a blank white page.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'inherit' }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted, #888)', marginBottom: 16 }}>
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
