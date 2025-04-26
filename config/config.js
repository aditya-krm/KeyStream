import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Configuration object
const config = {
  server: {
    port: process.env.PORT || 3004,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  paths: {
    root: rootDir,
    data: path.join(rootDir, 'data'),
    logs: path.join(rootDir, 'logs'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: process.env.LOG_MAX_FILES || '14d', // Keep logs for 14 days
    maxSize: process.env.LOG_MAX_SIZE || '20m',   // 20 megabytes
    consoleOutput: process.env.CONSOLE_LOGGING !== 'false', // Default to true
  },
  apiKeys: {
    dataFile: path.join(rootDir, 'data', 'apiKeys.json'),
    defaultMaxUsage: 100,
  },
  services: {
    linkedIn: {
      serviceName: 'linkedin-scraper',
      defaultHost: 'fresh-linkedin-profile-data.p.rapidapi.com'
    },
    googleTranslate: {
      serviceName: 'google-translate',
      defaultHost: 'google-translate113.p.rapidapi.com'
    }
  }
};

export default config;