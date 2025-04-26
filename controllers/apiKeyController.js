import ApiKeyManager from '../models/apiKeyManager.js';
import logger from '../utils/logger.js';

// Initialize ApiKeyManager
const apiKeyManager = new ApiKeyManager();

/**
 * Get statistics for all API keys or a specific service
 */
export const getApiKeyStats = (req, res) => {
  try {
    const { serviceName } = req.params;
    const stats = apiKeyManager.getUsageStats(serviceName);
    
    if (serviceName && (!stats || (Array.isArray(stats) && stats.length === 0))) {
      return res.fail(`Service '${serviceName}' not found`, 404);
    }
    
    return res.success({ 
      serviceName,
      stats
    });
  } catch (error) {
    logger.error('Error getting API key stats', { error: error.message });
    return res.fail('Failed to get API key stats', 500, error.message);
  }
};

/**
 * Add a new service
 */
export const addService = (req, res) => {
  try {
    const { serviceName, host, maxUsage, resetFrequency } = req.body;
    
    if (!serviceName || !host) {
      return res.fail('Service name and host are required', 400);
    }
    
    // Validate reset frequency if provided
    if (resetFrequency && !['never', 'hourly', 'daily', 'weekly', 'monthly'].includes(resetFrequency)) {
      return res.fail('Invalid reset frequency. Must be one of: never, hourly, daily, weekly, monthly', 400);
    }
    
    const added = apiKeyManager.addService(
      serviceName, 
      host, 
      maxUsage || 100, 
      resetFrequency || 'never'
    );
    
    if (added) {
      return res.success({
        service: {
          name: serviceName,
          host: host,
          maxUsage: maxUsage || 100,
          resetFrequency: resetFrequency || 'never'
        }
      }, 'Service added successfully', 201);
    } else {
      return res.success({
        service: {
          name: serviceName,
          host: host,
          maxUsage: maxUsage || 100,
          resetFrequency: resetFrequency || 'never'
        }
      }, 'Service configuration updated');
    }
  } catch (error) {
    logger.error('Error adding service', { error: error.message, stack: error.stack });
    return res.fail('Failed to add service', 500, error.message);
  }
};

/**
 * Add a new API key to a service
 */
export const addApiKey = (req, res) => {
  try {
    const { serviceName } = req.params;
    const { apiKey, remainingUses } = req.body;
    
    if (!apiKey) {
      return res.fail('API key is required', 400);
    }
    
    // Legacy endpoint compatibility
    const serviceToUse = serviceName || 'linkedin-scraper';
    
    // Pass remainingUses if provided
    const added = apiKeyManager.addApiKey(serviceToUse, apiKey, remainingUses);
    
    if (added) {
      return res.success({
        serviceStats: apiKeyManager.getUsageStats(serviceToUse)
      }, `API key added successfully to service '${serviceToUse}'`, 201);
    } else {
      return res.fail(`API key already exists or service '${serviceToUse}' not found`, 409, {
        serviceStats: apiKeyManager.getUsageStats(serviceToUse)
      });
    }
  } catch (error) {
    logger.error('Error adding API key', { error: error.message, stack: error.stack });
    return res.fail('Failed to add API key', 500, error.message);
  }
};

/**
 * Update remaining uses for a key
 */
export const updateRemainingUses = (req, res) => {
  try {
    const { serviceName, apiKey } = req.params;
    const { remainingUses } = req.body;
    
    if (remainingUses === undefined || remainingUses < 0) {
      return res.fail('Valid remainingUses value is required', 400);
    }
    
    const updated = apiKeyManager.setRemainingUses(serviceName, apiKey, remainingUses);
    
    if (updated) {
      return res.success({
        serviceStats: apiKeyManager.getUsageStats(serviceName)
      }, `API key remaining uses updated for '${serviceName}'`);
    } else {
      return res.fail(`API key not found or service '${serviceName}' not found`, 404, {
        serviceStats: apiKeyManager.getUsageStats(serviceName)
      });
    }
  } catch (error) {
    logger.error('Error updating remaining uses', { error: error.message, stack: error.stack });
    return res.fail('Failed to update API key remaining uses', 500, error.message);
  }
};

export default {
  getApiKeyStats,
  addService,
  addApiKey,
  updateRemainingUses,
  apiKeyManager // Export for use in other controllers
};