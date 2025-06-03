import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error ID:', errorId);

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo, errorId);

    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });
  }

  reportError = (error, errorInfo, errorId) => {
    // In a real app, you would send this to your error reporting service
    // like Sentry, LogRocket, or your own API
    try {
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.props.userId || 'anonymous'
      };

      // Example: Send to your API
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });

      console.log('Error report:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, retryCount } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-lg w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Đã xảy ra lỗi
              </h3>

              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <p>Ứng dụng đã gặp lỗi không mong muốn. Chúng tôi đã ghi nhận sự cố này.</p>

                {errorId && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Mã lỗi: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{errorId}</code>
                  </p>
                )}

                {retryCount > 0 && (
                  <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    Đã thử lại {retryCount} lần
                  </p>
                )}

                {isDevelopment && error && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                      Chi tiết lỗi (Development)
                    </summary>
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-xs font-mono">
                      <div className="text-red-800 dark:text-red-300">
                        <strong>Error:</strong> {error.toString()}
                      </div>
                      {errorInfo && (
                        <div className="mt-2 text-red-700 dark:text-red-400">
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {retryCount < 3 && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Thử lại
                  </button>
                )}

                <button
                  onClick={this.handleReload}
                  className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                >
                  Tải lại trang
                </button>
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