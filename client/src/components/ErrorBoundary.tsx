import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, WifiOff, RefreshCw, Wifi } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  isNetworkError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorCount: 0,
      isNetworkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if it's a network/API error
    const isNetworkError = 
      error.message.includes('JSON') ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Connection') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout') ||
      error.message.includes('Unexpected token');

    return { 
      hasError: true, 
      error,
      isNetworkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState(prev => ({
      errorCount: prev.errorCount + 1,
    }));
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-red-200">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                {this.state.isNetworkError ? (
                  <div className="relative">
                    <WifiOff className="w-16 h-16 text-red-500 animate-pulse" />
                    <div className="absolute inset-0 animate-ping opacity-20">
                      <WifiOff className="w-16 h-16 text-red-500" />
                    </div>
                  </div>
                ) : (
                  <AlertTriangle className="w-16 h-16 text-orange-500" />
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
                {this.state.isNetworkError ? 'Connection Lost' : 'Something Went Wrong'}
              </h1>

              {/* Description */}
              <p className="text-center text-gray-600 mb-6">
                {this.state.isNetworkError
                  ? 'The connection to the server has been lost. This could be due to a network issue or the server being temporarily unavailable.'
                  : 'An unexpected error occurred while loading the dashboard. Please try refreshing the page.'}
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 rounded p-4 mb-6 text-xs font-mono text-gray-700 max-h-32 overflow-auto border border-gray-300">
                  <p className="font-bold mb-2">Error Details:</p>
                  <p className="break-words">{this.state.error.message}</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700">
                  {this.state.isNetworkError ? 'Offline' : 'Error'}
                </span>
              </div>

              {/* Retry Count */}
              {this.state.errorCount > 1 && (
                <p className="text-center text-sm text-gray-500 mb-4">
                  Retry attempts: {this.state.errorCount - 1}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleRetry}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                    "bg-blue-600 text-white font-semibold",
                    "hover:bg-blue-700 transition-colors"
                  )}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                    "border-2 border-gray-300 text-gray-700 font-semibold",
                    "hover:bg-gray-50 transition-colors"
                  )}
                >
                  <RotateCcw size={16} />
                  Reload Page
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-2">💡 Troubleshooting Tips:</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Clear your browser cache</li>
                  <li>• Wait a few moments and try again</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
