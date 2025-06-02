const fs = require('fs');
const path = require('path');

/**
 * Enhanced Logger Utility for Video Downloader SaaS
 * Provides structured logging with different levels and file output
 */
class Logger {
  constructor() {
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL 
      ? this.logLevels[process.env.LOG_LEVEL.toUpperCase()] 
      : (process.env.NODE_ENV === 'production' ? this.logLevels.INFO : this.logLevels.DEBUG);
    
    this.logDir = process.env.LOGS_DIR || './logs';
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  writeToFile(level, formattedMessage) {
    if (process.env.NODE_ENV === 'production') {
      const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
      fs.appendFileSync(logFile, formattedMessage + '\n');
    }
  }

  log(level, message, meta = {}) {
    const levelValue = this.logLevels[level];
    
    if (levelValue <= this.currentLevel) {
      const formattedMessage = this.formatMessage(level, message, meta);
      
      // Console output with colors
      if (process.env.NODE_ENV !== 'test') {
        const colors = {
          ERROR: '\x1b[31m', // Red
          WARN: '\x1b[33m',  // Yellow
          INFO: '\x1b[36m',  // Cyan
          DEBUG: '\x1b[37m'  // White
        };
        console.log(`${colors[level]}${formattedMessage}\x1b[0m`);
      }
      
      // File output for production
      this.writeToFile(level, formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // Specific loggers for different components
  auth(message, meta = {}) {
    this.info(`[AUTH] ${message}`, meta);
  }

  api(message, meta = {}) {
    this.info(`[API] ${message}`, meta);
  }

  ytdlp(message, meta = {}) {
    this.info(`[YTDLP] ${message}`, meta);
  }

  security(message, meta = {}) {
    this.warn(`[SECURITY] ${message}`, meta);
  }

  performance(message, meta = {}) {
    this.debug(`[PERFORMANCE] ${message}`, meta);
  }

  database(message, meta = {}) {
    this.debug(`[DATABASE] ${message}`, meta);
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        };
        
        if (res.statusCode >= 400) {
          this.warn(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
        } else {
          this.info(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
        }
      });
      
      next();
    };
  }

  // Error logging middleware
  errorLogger() {
    return (err, req, res, next) => {
      this.error(`Unhandled error: ${err.message}`, {
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip
      });
      next(err);
    };
  }
}

// Export singleton instance
module.exports = new Logger();
