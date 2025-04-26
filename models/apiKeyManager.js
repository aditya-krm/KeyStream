import fs from 'fs';
import logger from '../utils/logger.js';
import config from '../config/config.js';

class ApiKeyManager {
  constructor(configPath = config.apiKeys.dataFile) {
    this.configPath = configPath;
    this.config = this.loadConfig();
    this.checkAndResetUsages(); // Check for resets during initialization
  }

  loadConfig() {
    try {
      // Ensure the directory exists
      const dataDir = config.paths.data;
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create default config if file doesn't exist
      if (!fs.existsSync(this.configPath)) {
        const defaultConfig = { 
          services: {},
          defaultServiceConfig: {
            maxUsage: config.apiKeys.defaultMaxUsage,
            resetFrequency: "never" // Default is never reset
          }
        };
        fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
        return defaultConfig;
      }
      
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading API key config', { error: error.message, stack: error.stack });
      return { 
        services: {},
        defaultServiceConfig: {
          maxUsage: config.apiKeys.defaultMaxUsage,
          resetFrequency: "never" // Default is never reset
        }
      };
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      logger.error('Error saving API key config', { error: error.message, stack: error.stack });
    }
  }

  // Check if any keys need their usage counts reset based on time
  checkAndResetUsages() {
    const now = new Date();
    let configChanged = false;

    // Loop through all services
    for (const serviceName in this.config.services) {
      const service = this.config.services[serviceName];
      const { resetFrequency } = service;

      // Skip if reset is not configured
      if (!resetFrequency || resetFrequency === 'never') continue;

      // Check each key in the service
      for (const keyEntry of service.keys) {
        if (!keyEntry.lastResetTime) {
          // Initialize reset time if not set
          keyEntry.lastResetTime = now.toISOString();
          configChanged = true;
          continue;
        }

        const lastReset = new Date(keyEntry.lastResetTime);
        let shouldReset = false;

        // Check if reset is needed based on frequency
        switch (resetFrequency) {
          case 'hourly':
            shouldReset = 
              now.getHours() !== lastReset.getHours() || 
              now.getDate() !== lastReset.getDate() ||
              now.getMonth() !== lastReset.getMonth() ||
              now.getFullYear() !== lastReset.getFullYear();
            break;
          case 'daily':
            shouldReset = 
              now.getDate() !== lastReset.getDate() ||
              now.getMonth() !== lastReset.getMonth() ||
              now.getFullYear() !== lastReset.getFullYear();
            break;
          case 'weekly':
            const diffDays = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
            shouldReset = diffDays >= 7;
            break;
          case 'monthly':
            shouldReset = 
              now.getMonth() !== lastReset.getMonth() ||
              now.getFullYear() !== lastReset.getFullYear();
            break;
        }

        if (shouldReset) {
          logger.info(`Resetting usage for key ${keyEntry.key.substr(0, 8)}...`, {
            service: serviceName,
            resetType: resetFrequency,
            keyId: keyEntry.key.substr(0, 8)
          });
          keyEntry.usageCount = 0;
          keyEntry.lastResetTime = now.toISOString();
          configChanged = true;
        }
      }
    }

    if (configChanged) {
      this.saveConfig();
    }
  }

  getNextApiKey(serviceName) {
    // Check for resets before selecting a key
    this.checkAndResetUsages();

    // Handle legacy config format (backward compatibility)
    if (!this.config.services) {
      if (!this.config.keys || this.config.keys.length === 0) {
        logger.error('No API keys configured');
        throw new Error('No API keys configured');
      }

      // Sort keys by usage count
      const sortedKeys = [...this.config.keys].sort((a, b) => a.usageCount - b.usageCount);
      
      // Get the key with the lowest usage
      const nextKey = sortedKeys[0];
      
      if (nextKey.usageCount >= this.config.maxUsage) {
        logger.warn('All API keys have reached maximum usage!');
      }
      
      return nextKey.key;
    }

    // New multi-service format
    const service = this.config.services[serviceName];
    
    if (!service || !service.keys || service.keys.length === 0) {
      logger.error(`No API keys configured for service: ${serviceName}`);
      throw new Error(`No API keys configured for service: ${serviceName}`);
    }

    // Filter out keys that have reached max usage if any are available
    const availableKeys = service.keys.filter(k => k.usageCount < service.maxUsage);
    
    // If no available keys, fall back to all keys
    const keysToUse = availableKeys.length > 0 ? availableKeys : service.keys;
    
    // Sort keys by usage count
    const sortedKeys = [...keysToUse].sort((a, b) => a.usageCount - b.usageCount);
    
    // Get the key with the lowest usage
    const nextKey = sortedKeys[0];
    const maxUsage = service.maxUsage || this.config.defaultServiceConfig.maxUsage;
    const remainingUsage = maxUsage - nextKey.usageCount;
    
    if (remainingUsage <= 0) {
      logger.warn(`All API keys for ${serviceName} have reached maximum usage!`, {
        service: serviceName
      });
    } else {
      logger.debug(`Using key ${nextKey.key.substr(0, 8)}... for ${serviceName}`, {
        service: serviceName,
        keyId: nextKey.key.substr(0, 8),
        usageCount: nextKey.usageCount,
        remainingUsage
      });
    }
    
    return {
      key: nextKey.key,
      host: service.host,
      remainingUsage: remainingUsage
    };
  }

  incrementKeyUsage(serviceName, usedKey) {
    // Handle legacy config format (backward compatibility)
    if (!this.config.services) {
      const keyEntry = this.config.keys.find(k => k.key === usedKey);
      if (keyEntry) {
        keyEntry.usageCount += 1;
        const remainingUsage = this.config.maxUsage - keyEntry.usageCount;
        logger.debug(`Key ${usedKey.substr(0, 8)}... used`, {
          keyId: usedKey.substr(0, 8),
          usageCount: keyEntry.usageCount,
          remainingUsage
        });
        this.saveConfig();
      }
      return;
    }

    // New multi-service format
    const service = this.config.services[serviceName];
    
    if (!service) return false;
    
    const keyEntry = service.keys.find(k => k.key === usedKey);
    if (keyEntry) {
      keyEntry.usageCount += 1;
      keyEntry.lastUsedTime = new Date().toISOString(); // Track last usage time
      
      const maxUsage = service.maxUsage || this.config.defaultServiceConfig.maxUsage;
      const remainingUsage = maxUsage - keyEntry.usageCount;
      
      logger.debug(`Key ${usedKey.substr(0, 8)}... for ${serviceName} used`, {
        service: serviceName,
        keyId: usedKey.substr(0, 8),
        usageCount: keyEntry.usageCount,
        remainingUsage
      });
      this.saveConfig();
      return true;
    }
    return false;
  }

  addService(serviceName, host, maxUsage = 100, resetFrequency = 'never') {
    if (!this.config.services) {
      this.config.services = {};
    }
    
    if (!this.config.services[serviceName]) {
      this.config.services[serviceName] = {
        host,
        maxUsage,
        resetFrequency,
        keys: []
      };
      this.saveConfig();
      logger.info(`Service ${serviceName} added successfully`, {
        service: serviceName,
        host,
        maxUsage,
        resetFrequency
      });
      return true;
    }
    
    // Update service config if it already exists
    const service = this.config.services[serviceName];
    service.host = host;
    service.maxUsage = maxUsage;
    service.resetFrequency = resetFrequency;
    this.saveConfig();
    
    logger.info(`Service ${serviceName} configuration updated`, {
      service: serviceName,
      host,
      maxUsage,
      resetFrequency
    });
    return false; // Service already existed
  }

  addApiKey(serviceName, newKey, initialRemaining = null) {
    // Handle legacy config format (backward compatibility)
    if (!this.config.services) {
      if (!this.config.keys.some(k => k.key === newKey)) {
        // Calculate initial usage count if initialRemaining is provided
        let usageCount = 0;
        if (initialRemaining !== null && initialRemaining >= 0) {
          usageCount = this.config.maxUsage - initialRemaining;
        }
        
        this.config.keys.push({ 
          key: newKey, 
          usageCount: usageCount,
          lastResetTime: new Date().toISOString(),
          lastUsedTime: null
        });
        this.saveConfig();
        logger.info(`API key added to legacy config`, {
          keyId: newKey.substr(0, 8),
          initialRemaining
        });
        return true;
      }
      return false;
    }

    // New multi-service format
    const service = this.config.services[serviceName];
    
    if (!service) {
      logger.warn(`Failed to add API key: Service ${serviceName} not found`);
      return false;
    }
    
    if (!service.keys.some(k => k.key === newKey)) {
      // Calculate initial usage count if initialRemaining is provided
      let usageCount = 0;
      if (initialRemaining !== null && initialRemaining >= 0) {
        usageCount = service.maxUsage - initialRemaining;
      }
      
      service.keys.push({ 
        key: newKey, 
        usageCount: usageCount,
        lastResetTime: new Date().toISOString(),
        lastUsedTime: null
      });
      this.saveConfig();
      logger.info(`API key added to service ${serviceName}`, {
        service: serviceName,
        keyId: newKey.substr(0, 8),
        initialRemaining
      });
      return true;
    }
    logger.warn(`API key already exists for service ${serviceName}`, {
      service: serviceName,
      keyId: newKey.substr(0, 8)
    });
    return false;
  }

  // Update the remaining uses for a specific key
  setRemainingUses(serviceName, apiKey, remainingUses) {
    if (!this.config.services) {
      logger.warn(`Cannot set remaining uses: Legacy config format not supported for this operation`);
      return false;
    }
    
    const service = this.config.services[serviceName];
    if (!service) {
      logger.warn(`Service ${serviceName} not found`);
      return false;
    }
    
    const keyEntry = service.keys.find(k => k.key === apiKey);
    if (!keyEntry) {
      logger.warn(`API key not found in service ${serviceName}`, {
        service: serviceName,
        keyId: apiKey.substr(0, 8)
      });
      return false;
    }
    
    // Set usage count based on remaining uses
    keyEntry.usageCount = service.maxUsage - remainingUses;
    if (keyEntry.usageCount < 0) keyEntry.usageCount = 0;
    
    this.saveConfig();
    logger.info(`Remaining uses updated for key in service ${serviceName}`, {
      service: serviceName,
      keyId: apiKey.substr(0, 8),
      remainingUses,
      newUsageCount: keyEntry.usageCount
    });
    return true;
  }

  getUsageStats(serviceName = null) {
    // Handle legacy config format (backward compatibility)
    if (!this.config.services) {
      return this.config.keys.map(k => ({
        key: `${k.key.substr(0, 8)}...`,
        usageCount: k.usageCount,
        remainingUsage: this.config.maxUsage - k.usageCount
      }));
    }

    // If a specific service is requested
    if (serviceName) {
      const service = this.config.services[serviceName];
      if (!service) return [];
      
      return {
        host: service.host,
        maxUsage: service.maxUsage,
        resetFrequency: service.resetFrequency,
        keys: service.keys.map(k => ({
          key: `${k.key.substr(0, 8)}...`,
          usageCount: k.usageCount,
          remainingUsage: service.maxUsage - k.usageCount,
          lastReset: k.lastResetTime,
          lastUsed: k.lastUsedTime
        }))
      };
    }

    // Return stats for all services
    const stats = {};
    
    for (const [serviceName, service] of Object.entries(this.config.services)) {
      stats[serviceName] = {
        host: service.host,
        maxUsage: service.maxUsage,
        resetFrequency: service.resetFrequency,
        keys: service.keys.map(k => ({
          key: `${k.key.substr(0, 8)}...`,
          usageCount: k.usageCount,
          remainingUsage: service.maxUsage - k.usageCount,
          lastReset: k.lastResetTime,
          lastUsed: k.lastUsedTime
        }))
      };
    }
    
    return stats;
  }

  // Helper method to migrate from old format to new format
  migrateToMultiService(serviceName, host) {
    if (!this.config.services) {
      const oldKeys = this.config.keys || [];
      const oldMaxUsage = this.config.maxUsage || config.apiKeys.defaultMaxUsage;
      
      this.config = {
        services: {
          [serviceName]: {
            host,
            maxUsage: oldMaxUsage,
            resetFrequency: 'never',
            keys: oldKeys
          }
        },
        defaultServiceConfig: {
          maxUsage: oldMaxUsage,
          resetFrequency: 'never'
        }
      };
      
      this.saveConfig();
      logger.info(`Migrated from legacy config to multi-service format`, {
        service: serviceName,
        host,
        keysCount: oldKeys.length
      });
      return true;
    }
    return false;
  }
}

export default ApiKeyManager;