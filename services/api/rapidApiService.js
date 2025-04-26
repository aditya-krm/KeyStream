import logger from '../../utils/logger.js';
import apiKeyController from '../../controllers/apiKeyController.js';

const apiKeyManager = apiKeyController.apiKeyManager;

/**
 * Utility function to call any RapidAPI service
 * @param {string} serviceName - The name of the RapidAPI service
 * @param {string} endpoint - The endpoint to call
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} queryParams - Query parameters
 * @param {Object} bodyData - Body data for POST requests
 * @returns {Promise<Object>} - API response
 */
export const callRapidApi = async (serviceName, endpoint, method = 'GET', queryParams = {}, bodyData = null) => {
  // Get the next available API key and host for this service
  const { key, host, remainingUsage } = apiKeyManager.getNextApiKey(serviceName);
  
  // Construct the full URL with query parameters
  const baseUrl = `https://${host}/${endpoint}`;
  const url = new URL(baseUrl);
  
  // Add query parameters
  Object.entries(queryParams).forEach(([param, value]) => {
    url.searchParams.append(param, value);
  });
  
  // Set up request options
  const options = {
    method: method,
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': host,
    },
  };
  
  // Add body data for POST/PUT requests
  if ((method === 'POST' || method === 'PUT') && bodyData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(bodyData);
  }

  try {
    // Log the API request
    logger.debug(`Calling ${serviceName} API: ${method} ${url.toString()}`, {
      service: serviceName,
      endpoint,
      method,
      remainingUsage
    });
    
    // Make the API request
    const response = await fetch(url.toString(), options);
    
    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`API Error: ${response.status} ${response.statusText}`, {
        service: serviceName,
        endpoint,
        status: response.status,
        errorText: errorText.substring(0, 200) // Limit error text length
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const result = await response.json();
    
    // If the request was successful, increment the usage counter
    apiKeyManager.incrementKeyUsage(serviceName, key);
    
    // Add remaining usage info to the result
    return {
      ...result,
      _apiKeyRemaining: remainingUsage - 1 // Account for this usage
    };
  } catch (error) {
    logger.error(`Error calling ${serviceName} API`, {
      service: serviceName,
      endpoint,
      error: error.message
    });
    throw error;
  }
};