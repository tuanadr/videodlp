const EventEmitter = require('events');
const os = require('os');

class StreamingMonitorService extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkIO: { rx: 0, tx: 0 }
      },
      streaming: {
        activeStreams: 0,
        totalBandwidth: 0,
        averageStreamQuality: 0,
        errorRate: 0
      },
      performance: {
        averageLatency: 0,
        throughput: 0,
        concurrentUsers: 0,
        queueLength: 0
      }
    };
    
    this.alerts = {
      cpuThreshold: 85,
      memoryThreshold: 85,
      errorRateThreshold: 5,
      latencyThreshold: 5000
    };
    
    this.monitoringInterval = null;
    this.isMonitoring = false;
    
    // Performance history for trend analysis
    this.performanceHistory = [];
    this.maxHistoryLength = 100;
  }

  /**
   * Start monitoring system and streaming performance
   */
  startMonitoring(intervalMs = 30000) {
    if (this.isMonitoring) {
      console.log('Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting streaming performance monitoring...');

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('⏹️  Streaming performance monitoring stopped');
  }

  /**
   * Collect all performance metrics
   */
  async collectMetrics() {
    try {
      await this.collectSystemMetrics();
      await this.collectStreamingMetrics();
      await this.collectPerformanceMetrics();
      
      // Store in history
      this.storeMetricsHistory();
      
      // Check for alerts
      this.checkAlerts();
      
      // Emit metrics update event
      this.emit('metricsUpdated', this.metrics);
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    // CPU Usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    this.metrics.system.cpuUsage = Math.round(100 - (totalIdle / totalTick * 100));
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    this.metrics.system.memoryUsage = Math.round((totalMem - freeMem) / totalMem * 100);
    
    // Network IO (simplified - would need more detailed implementation)
    this.metrics.system.networkIO = await this.getNetworkIO();
  }

  /**
   * Collect streaming-specific metrics
   */
  async collectStreamingMetrics() {
    // These would be injected from the streaming services
    const streamingService = global.streamingService;
    const ffmpegService = global.ffmpegService;
    
    if (streamingService) {
      const stats = streamingService.getStreamingStats();
      this.metrics.streaming.activeStreams = stats.activeStreams;
      this.metrics.streaming.errorRate = this.calculateErrorRate(stats);
      this.metrics.streaming.totalBandwidth = this.calculateTotalBandwidth(stats);
    }
    
    if (ffmpegService) {
      const transcodingStats = ffmpegService.getTranscodingStats();
      this.metrics.streaming.averageStreamQuality = this.calculateAverageQuality(transcodingStats);
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    // These metrics would be collected from various sources
    this.metrics.performance.concurrentUsers = this.getConcurrentUsers();
    this.metrics.performance.averageLatency = this.getAverageLatency();
    this.metrics.performance.throughput = this.getThroughput();
    this.metrics.performance.queueLength = this.getQueueLength();
  }

  /**
   * Get network IO statistics
   */
  async getNetworkIO() {
    // Simplified implementation - in production, use system tools
    return { rx: 0, tx: 0 };
  }

  /**
   * Calculate error rate from streaming stats
   */
  calculateErrorRate(stats) {
    if (stats.totalStreams === 0) return 0;
    return Math.round((stats.failedStreams / stats.totalStreams) * 100);
  }

  /**
   * Calculate total bandwidth usage
   */
  calculateTotalBandwidth(stats) {
    // Estimate based on active streams and average bitrates
    const averageBitrate = 2000; // 2 Mbps average
    return stats.activeStreams * averageBitrate;
  }

  /**
   * Calculate average stream quality
   */
  calculateAverageQuality(transcodingStats) {
    // Simplified quality calculation
    return transcodingStats.activeSessions || 0;
  }

  /**
   * Get concurrent users count
   */
  getConcurrentUsers() {
    // This would be injected from session management
    return global.sessionManager?.getActiveSessionCount() || 0;
  }

  /**
   * Get average latency
   */
  getAverageLatency() {
    // This would be calculated from request/response times
    return global.latencyTracker?.getAverageLatency() || 0;
  }

  /**
   * Get throughput (requests per second)
   */
  getThroughput() {
    // This would be calculated from request counters
    return global.throughputTracker?.getCurrentThroughput() || 0;
  }

  /**
   * Get queue length for pending requests
   */
  getQueueLength() {
    // This would be from request queue management
    return global.requestQueue?.getLength() || 0;
  }

  /**
   * Store metrics in history for trend analysis
   */
  storeMetricsHistory() {
    const timestamp = Date.now();
    const snapshot = {
      timestamp,
      ...JSON.parse(JSON.stringify(this.metrics))
    };
    
    this.performanceHistory.push(snapshot);
    
    // Keep only recent history
    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Check for performance alerts
   */
  checkAlerts() {
    const alerts = [];
    
    // CPU Alert
    if (this.metrics.system.cpuUsage > this.alerts.cpuThreshold) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: `High CPU usage: ${this.metrics.system.cpuUsage}%`,
        value: this.metrics.system.cpuUsage,
        threshold: this.alerts.cpuThreshold
      });
    }
    
    // Memory Alert
    if (this.metrics.system.memoryUsage > this.alerts.memoryThreshold) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `High memory usage: ${this.metrics.system.memoryUsage}%`,
        value: this.metrics.system.memoryUsage,
        threshold: this.alerts.memoryThreshold
      });
    }
    
    // Error Rate Alert
    if (this.metrics.streaming.errorRate > this.alerts.errorRateThreshold) {
      alerts.push({
        type: 'error_rate',
        level: 'critical',
        message: `High error rate: ${this.metrics.streaming.errorRate}%`,
        value: this.metrics.streaming.errorRate,
        threshold: this.alerts.errorRateThreshold
      });
    }
    
    // Latency Alert
    if (this.metrics.performance.averageLatency > this.alerts.latencyThreshold) {
      alerts.push({
        type: 'latency',
        level: 'warning',
        message: `High latency: ${this.metrics.performance.averageLatency}ms`,
        value: this.metrics.performance.averageLatency,
        threshold: this.alerts.latencyThreshold
      });
    }
    
    // Emit alerts if any
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
      console.warn('🚨 Performance alerts:', alerts);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    return this.metrics;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(minutes = 60) {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.performanceHistory.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const history = this.getPerformanceHistory(60); // Last hour
    
    if (history.length === 0) {
      return null;
    }
    
    const summary = {
      timeRange: '1 hour',
      samples: history.length,
      cpu: {
        current: this.metrics.system.cpuUsage,
        average: this.calculateAverage(history, 'system.cpuUsage'),
        peak: this.calculatePeak(history, 'system.cpuUsage')
      },
      memory: {
        current: this.metrics.system.memoryUsage,
        average: this.calculateAverage(history, 'system.memoryUsage'),
        peak: this.calculatePeak(history, 'system.memoryUsage')
      },
      streaming: {
        currentStreams: this.metrics.streaming.activeStreams,
        averageStreams: this.calculateAverage(history, 'streaming.activeStreams'),
        peakStreams: this.calculatePeak(history, 'streaming.activeStreams'),
        errorRate: this.metrics.streaming.errorRate
      }
    };
    
    return summary;
  }

  /**
   * Calculate average value from history
   */
  calculateAverage(history, path) {
    const values = history.map(entry => this.getNestedValue(entry, path)).filter(v => v !== undefined);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  }

  /**
   * Calculate peak value from history
   */
  calculatePeak(history, path) {
    const values = history.map(entry => this.getNestedValue(entry, path)).filter(v => v !== undefined);
    return values.length > 0 ? Math.max(...values) : 0;
  }

  /**
   * Get nested object value by path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(newThresholds) {
    this.alerts = { ...this.alerts, ...newThresholds };
    console.log('📊 Alert thresholds updated:', this.alerts);
  }
}

module.exports = StreamingMonitorService;
