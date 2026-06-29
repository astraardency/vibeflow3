import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fff', color: '#ff0000', minHeight: '100vh', overflow: 'auto' }}>
          <h1>App Crashed!</h1>
          <h3 style={{color: 'black'}}>{this.state.error && this.state.error.toString()}</h3>
          <pre style={{ color: 'black', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.stack}
          </pre>
          <h4>Component Stack:</h4>
          <pre style={{ color: 'black', fontSize: '12px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
