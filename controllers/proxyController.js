import logger from '../utils/logger.js';
import { callRapidApi } from '../services/api/rapidApiService.js';
import apiKeyController from './apiKeyController.js';

const apiKeyManager = apiKeyController.apiKeyManager;

/**
 * Generic proxy for any RapidAPI service
 */
export const proxyCall = async (req, res) => {
  try {
    const { serviceName, endpoint } = req.params;
    const { method = 'GET', queryParams = {}, bodyData = null } = req.body;
    
    if (!serviceName) {
      return res.fail('Service name is required', 400);
    }
    
    logger.info(`Proxy call to ${serviceName}/${endpoint}`, {
      service: serviceName,
      endpoint,
      method
    });
    
    const result = await callRapidApi(serviceName, endpoint, method, queryParams, bodyData);
    
    return res.success({
      data: result,
      apiKeyStats: apiKeyManager.getUsageStats(serviceName)
    });
  } catch (error) {
    logger.error('Error in API proxy', { error: error.message, stack: error.stack });
    return res.fail('Failed to call API', 500, error.message);
  }
};

export default {
  proxyCall
};