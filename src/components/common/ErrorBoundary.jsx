import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Error Boundary - Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('🚨 App Error Caught:', error);
    console.error('Component Stack:', errorInfo?.componentStack);
    
    this.setState({ error, errorInfo });
    
    // Optional: Send to error tracking service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            
            {/* Message */}
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              Oops, something went wrong
            </h1>
            <p className="text-stone-600 mb-6">
              The app encountered an unexpected error. Your data is safe — try refreshing or retry.
            </p>
            
            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-5 py-2.5 bg-stone-100 text-stone-700 font-semibold rounded-xl hover:bg-stone-200 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-stone-900 text-white font-semibold rounded-xl hover:bg-stone-800 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload App
              </button>
            </div>
            
            {/* Error details (collapsible for debugging) */}
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-stone-50 rounded-lg text-xs text-stone-600 overflow-x-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
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

export default ErrorBoundary;
