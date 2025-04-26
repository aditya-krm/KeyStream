import winston from 'winston';
import 'winston-daily-rotate-file';
import config from '../config/config.js';

// Custom format for logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create file transport for rotating logs
const fileTransport = new winston.transports.DailyRotateFile({
  dirname: config.paths.logs,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  level: config.logging.level
});

// Create console transport (if enabled)
const transports = [fileTransport];

if (config.logging.consoleOutput) {
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    ),
    level: config.logging.level
  }));
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports,
  exitOnError: false
});

// HTTP request logging middleware (returns a middleware function)
logger.httpLogger = () => {
  return (req, res, next) => {
    // Skip logging for health checks or other noisy endpoints
    if (req.url === '/health' || req.url === '/favicon.ico') {
      return next();
    }
    
    const startTime = Date.now();
    const requestData = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const logLevel = res.statusCode >= 500 ? 'error' : 
                       res.statusCode >= 400 ? 'warn' : 
                       'http';
      
      logger.log(logLevel, `HTTP ${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`, {
        ...requestData,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`
      });
    });
    
    next();
  };
};

export default logger;