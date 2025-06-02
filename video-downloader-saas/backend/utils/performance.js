const logger = require('./logger');

/**
 * Performance Monitoring Utility
 * Tracks execution time, memory usage, and system metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName) {
    this.startTimes.set(operationName, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage()
    });
  }

  /**
   * End timing and log performance metrics
   */
  endTimer(operationName, metadata = {}) {
    const startData = this.startTimes.get(operationName);
    if (!startData) {
      logger.warn('Performance timer not found', { operationName });
      return null;
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startData.startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startData.startMemory.rss,
      heapUsed: endMemory.heapUsed - startData.startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startData.startMemory.heapTotal,
      external: endMemory.external - startData.startMemory.external
    };

    const metrics = {
      operation: operationName,
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta,
      currentMemory: endMemory,
      ...metadata
    };

    // Store metrics
    this.metrics.set(operationName, metrics);

    // Log performance data
    if (duration > 1000) { // Log slow operations (>1s)
      logger.warn('Slow operation detected', metrics);
    } else if (duration > 100) { // Log medium operations (>100ms)
      logger.performance('Operation completed', metrics);
    } else {
      logger.debug('Fast operation completed', metrics);
    }

    // Clean up
    this.startTimes.delete(operationName);

    return metrics;
  }

  /**
   * Middleware to track HTTP request performance
   */
  requestMiddleware() {
    return (req, res, next) => {
      const operationName = `${req.method} ${req.route?.path || req.path}`;
      
      this.startTimer(operationName);
      
      // Track additional request metadata
      const metadata = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        contentLength: req.get('Content-Length') || 0
      };

      res.on('finish', () => {
        const metrics = this.endTimer(operationName, {
          ...metadata,
          statusCode: res.statusCode,
          responseSize: res.get('Content-Length') || 0
        });

        // Track slow requests
        if (metrics && parseFloat(metrics.duration) > 2000) {
          logger.warn('Slow HTTP request', {
            ...metrics,
            userId: req.user?.id,
            query: req.query,
            params: req.params
          });
        }
      });

      next();
    };
  }

  /**
   * Database query performance wrapper
   */
  wrapDatabaseQuery(queryName, queryFunction) {
    return async (...args) => {
      this.startTimer(`DB:${queryName}`);
      
      try {
        const result = await queryFunction(...args);
        
        this.endTimer(`DB:${queryName}`, {
          queryType: 'success',
          resultCount: Array.isArray(result) ? result.length : 1
        });
        
        return result;
      } catch (error) {
        this.endTimer(`DB:${queryName}`, {
          queryType: 'error',
          error: error.message
        });
        throw error;
      }
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      memory: {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memory.external / 1024 / 1024).toFixed(2)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: `${(uptime / 60).toFixed(2)} minutes`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metrics = Array.from(this.metrics.values());
    
    if (metrics.length === 0) {
      return { message: 'No performance data available' };
    }

    const durations = metrics.map(m => parseFloat(m.duration));
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    return {
      totalOperations: metrics.length,
      averageDuration: `${avgDuration.toFixed(2)}ms`,
      maxDuration: `${maxDuration.toFixed(2)}ms`,
      minDuration: `${minDuration.toFixed(2)}ms`,
      slowOperations: metrics.filter(m => parseFloat(m.duration) > 1000).length,
      systemMetrics: this.getSystemMetrics()
    };
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.startTimes.clear();
  }

  /**
   * Monitor memory usage and alert on high usage
   */
  monitorMemory() {
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    const heapTotalMB = memory.heapTotal / 1024 / 1024;
    const rssMB = memory.rss / 1024 / 1024;

    // Alert thresholds
    const HIGH_MEMORY_THRESHOLD = 500; // MB
    const CRITICAL_MEMORY_THRESHOLD = 1000; // MB

    if (rssMB > CRITICAL_MEMORY_THRESHOLD) {
      logger.error('Critical memory usage detected', {
        rss: `${rssMB.toFixed(2)}MB`,
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        heapTotal: `${heapTotalMB.toFixed(2)}MB`,
        threshold: `${CRITICAL_MEMORY_THRESHOLD}MB`
      });
    } else if (rssMB > HIGH_MEMORY_THRESHOLD) {
      logger.warn('High memory usage detected', {
        rss: `${rssMB.toFixed(2)}MB`,
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        heapTotal: `${heapTotalMB.toFixed(2)}MB`,
        threshold: `${HIGH_MEMORY_THRESHOLD}MB`
      });
    }

    return {
      rss: rssMB,
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      isHigh: rssMB > HIGH_MEMORY_THRESHOLD,
      isCritical: rssMB > CRITICAL_MEMORY_THRESHOLD
    };
  }

  /**
   * Start periodic monitoring
   */
  startPeriodicMonitoring(intervalMs = 60000) { // Default: 1 minute
    setInterval(() => {
      this.monitorMemory();
      
      // Log system metrics periodically
      logger.performance('System metrics', this.getSystemMetrics());
    }, intervalMs);
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Helper functions for common use cases
const measureAsync = async (operationName, asyncFunction, metadata = {}) => {
  performanceMonitor.startTimer(operationName);
  try {
    const result = await asyncFunction();
    performanceMonitor.endTimer(operationName, metadata);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(operationName, { ...metadata, error: error.message });
    throw error;
  }
};

const measureSync = (operationName, syncFunction, metadata = {}) => {
  performanceMonitor.startTimer(operationName);
  try {
    const result = syncFunction();
    performanceMonitor.endTimer(operationName, metadata);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(operationName, { ...metadata, error: error.message });
    throw error;
  }
};

module.exports = {
  performanceMonitor,
  measureAsync,
  measureSync
};
