const os = require('os');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class DockerMonitor {
  constructor() {
    this.isDocker = this.detectDockerEnvironment();
    this.containerStats = {
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      networkConnections: 0
    };
    this.securityChecks = {
      runningAsRoot: false,
      privilegedMode: false,
      exposedPorts: [],
      vulnerablePackages: []
    };
  }

  detectDockerEnvironment() {
    try {
      // Check for Docker-specific files
      const dockerIndicators = [
        '/.dockerenv',
        '/proc/1/cgroup'
      ];

      for (const indicator of dockerIndicators) {
        if (fs.existsSync(indicator)) {
          if (indicator === '/proc/1/cgroup') {
            const content = fs.readFileSync(indicator, 'utf8');
            if (content.includes('docker') || content.includes('containerd')) {
              return true;
            }
          } else {
            return true;
          }
        }
      }

      // Check environment variables
      return !!(process.env.DOCKER_CONTAINER || process.env.KUBERNETES_SERVICE_HOST);
    } catch (error) {
      logger.warn('Error detecting Docker environment:', error);
      return false;
    }
  }

  async performSecurityAudit() {
    const audit = {
      timestamp: new Date().toISOString(),
      environment: this.isDocker ? 'docker' : 'native',
      security: {},
      performance: {},
      recommendations: []
    };

    try {
      // Check if running as root
      audit.security.runningAsRoot = process.getuid ? process.getuid() === 0 : false;
      if (audit.security.runningAsRoot) {
        audit.recommendations.push('SECURITY: Avoid running as root user in container');
      }

      // Check memory limits
      const memInfo = this.getMemoryInfo();
      audit.performance.memory = memInfo;
      if (memInfo.available < 512 * 1024 * 1024) { // Less than 512MB
        audit.recommendations.push('PERFORMANCE: Consider increasing memory allocation');
      }

      // Check CPU limits
      const cpuInfo = this.getCPUInfo();
      audit.performance.cpu = cpuInfo;

      // Check disk space
      const diskInfo = this.getDiskInfo();
      audit.performance.disk = diskInfo;
      if (diskInfo.freePercentage < 20) {
        audit.recommendations.push('PERFORMANCE: Low disk space detected');
      }

      // Check network configuration
      const networkInfo = this.getNetworkInfo();
      audit.security.network = networkInfo;

      // Check for exposed sensitive files
      const sensitiveFiles = this.checkSensitiveFiles();
      audit.security.sensitiveFiles = sensitiveFiles;
      if (sensitiveFiles.exposed.length > 0) {
        audit.recommendations.push('SECURITY: Sensitive files detected in container');
      }

      // Check environment variables for secrets
      const envSecrets = this.checkEnvironmentSecrets();
      audit.security.environmentSecrets = envSecrets;
      if (envSecrets.potentialSecrets.length > 0) {
        audit.recommendations.push('SECURITY: Potential secrets in environment variables');
      }

      logger.info('Docker Security Audit completed', audit);
      return audit;

    } catch (error) {
      logger.error('Error performing security audit:', error);
      audit.error = error.message;
      return audit;
    }
  }

  getMemoryInfo() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Try to get container memory limits
      let containerLimit = null;
      try {
        if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
          const limitBytes = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
          containerLimit = parseInt(limitBytes);
          if (containerLimit > totalMem) containerLimit = null; // Not a real limit
        }
      } catch (e) {
        // Ignore cgroup errors
      }

      return {
        total: totalMem,
        used: usedMem,
        available: freeMem,
        usagePercentage: Math.round((usedMem / totalMem) * 100),
        containerLimit,
        limitExceeded: containerLimit ? usedMem > containerLimit * 0.9 : false
      };
    } catch (error) {
      logger.warn('Error getting memory info:', error);
      return { error: error.message };
    }
  }

  getCPUInfo() {
    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      return {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1],
          '15min': loadAvg[2]
        },
        highLoad: loadAvg[0] > cpus.length * 0.8
      };
    } catch (error) {
      logger.warn('Error getting CPU info:', error);
      return { error: error.message };
    }
  }

  getDiskInfo() {
    try {
      const stats = fs.statSync('/');
      // This is a simplified disk check - in real containers, you'd check specific mount points
      return {
        path: '/',
        freePercentage: 50, // Placeholder - would need more complex logic for real disk usage
        warning: false
      };
    } catch (error) {
      logger.warn('Error getting disk info:', error);
      return { error: error.message };
    }
  }

  getNetworkInfo() {
    try {
      const networkInterfaces = os.networkInterfaces();
      const interfaces = Object.keys(networkInterfaces).map(name => ({
        name,
        addresses: networkInterfaces[name].map(addr => ({
          address: addr.address,
          family: addr.family,
          internal: addr.internal
        }))
      }));

      return {
        interfaces,
        exposedPorts: this.getExposedPorts()
      };
    } catch (error) {
      logger.warn('Error getting network info:', error);
      return { error: error.message };
    }
  }

  getExposedPorts() {
    // Check common environment variables for exposed ports
    const ports = [];
    if (process.env.PORT) ports.push(process.env.PORT);
    if (process.env.EXPOSE) ports.push(...process.env.EXPOSE.split(','));
    return ports;
  }

  checkSensitiveFiles() {
    const sensitivePatterns = [
      '/etc/passwd',
      '/etc/shadow',
      '/root/.ssh',
      '/home/*/.ssh',
      '*.key',
      '*.pem',
      '.env',
      'config.json'
    ];

    const exposed = [];
    const checked = [];

    for (const pattern of sensitivePatterns) {
      try {
        if (pattern.includes('*')) {
          // Skip glob patterns for now - would need glob library
          continue;
        }
        
        if (fs.existsSync(pattern)) {
          const stats = fs.statSync(pattern);
          exposed.push({
            path: pattern,
            permissions: stats.mode.toString(8),
            size: stats.size
          });
        }
        checked.push(pattern);
      } catch (error) {
        // File doesn't exist or no permission - this is good
      }
    }

    return { exposed, checked };
  }

  checkEnvironmentSecrets() {
    const secretPatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i
    ];

    const potentialSecrets = [];
    const envVars = Object.keys(process.env);

    for (const envVar of envVars) {
      for (const pattern of secretPatterns) {
        if (pattern.test(envVar)) {
          potentialSecrets.push({
            variable: envVar,
            hasValue: !!process.env[envVar],
            valueLength: process.env[envVar]?.length || 0,
            pattern: pattern.source
          });
          break;
        }
      }
    }

    return {
      potentialSecrets,
      totalEnvVars: envVars.length
    };
  }

  async startPeriodicAudit(intervalMs = 300000) { // 5 minutes
    logger.info(`Starting Docker security monitoring (interval: ${intervalMs}ms)`);
    
    // Initial audit
    await this.performSecurityAudit();

    // Periodic audits
    this.auditInterval = setInterval(async () => {
      try {
        await this.performSecurityAudit();
      } catch (error) {
        logger.error('Error in periodic security audit:', error);
      }
    }, intervalMs);
  }

  stopPeriodicAudit() {
    if (this.auditInterval) {
      clearInterval(this.auditInterval);
      this.auditInterval = null;
      logger.info('Docker security monitoring stopped');
    }
  }

  // Performance optimization recommendations
  getOptimizationRecommendations() {
    const recommendations = [];

    // Memory optimization
    const memInfo = this.getMemoryInfo();
    if (memInfo.usagePercentage > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'High memory usage detected',
        suggestion: 'Consider increasing container memory limit or optimizing memory usage'
      });
    }

    // CPU optimization
    const cpuInfo = this.getCPUInfo();
    if (cpuInfo.highLoad) {
      recommendations.push({
        type: 'cpu',
        priority: 'high',
        message: 'High CPU load detected',
        suggestion: 'Consider increasing CPU limits or optimizing CPU-intensive operations'
      });
    }

    // Security recommendations
    if (this.securityChecks.runningAsRoot) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Running as root user',
        suggestion: 'Create and use a non-root user in Dockerfile'
      });
    }

    return recommendations;
  }
}

module.exports = new DockerMonitor();