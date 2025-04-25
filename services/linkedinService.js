import ApiKeyManager from '../apiKeyManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiKeyManager = new ApiKeyManager(path.join(__dirname, '..', 'apiKeys.json'));

// Migrate legacy config to multi-service format if needed
apiKeyManager.migrateToMultiService('linkedin-scraper', 'fresh-linkedin-profile-data.p.rapidapi.com');

export const fetchLinkedInProfile = async (profileUrl) => {
  const serviceName = 'linkedin-scraper';
  const { key, host, remainingUsage } = apiKeyManager.getNextApiKey(serviceName);
  const baseUrl =
    "https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile";
  const url = `${baseUrl}?linkedin_url=${encodeURIComponent(
    profileUrl
  )}&include_skills=false&include_certifications=false&include_publications=false&include_honors=false&include_volunteers=false&include_projects=false&include_patents=false&include_courses=false&include_organizations=false&include_profile_status=false&include_company_public_url=false`;

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": host,
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    // Increment the usage counter for the API key
    apiKeyManager.incrementKeyUsage(serviceName, key);

    if (result.data) {
      const {
        full_name,
        headline,
        profile_image_url,
        educations,
        experiences,
      } = result.data;

      return {
        fullName: full_name || "",
        headline: headline || "",
        profileImageUrl: profile_image_url || "",
        education: educations || [],
        experience: experiences || [],
        apiKeyRemaining: remainingUsage - 1 // Account for this usage
      };
    }

    throw new Error("No data received from API");
  } catch (error) {
    console.error("Error fetching LinkedIn profile:", error);
    throw error;
  }
};

export const getApiKeyStats = (serviceName = null) => {
  return apiKeyManager.getUsageStats(serviceName);
};

export const addNewApiKey = (serviceName, apiKey, initialRemaining = null) => {
  return apiKeyManager.addApiKey(serviceName, apiKey, initialRemaining);
};

export const addNewService = (serviceName, host, maxUsage, resetFrequency) => {
  return apiKeyManager.addService(serviceName, host, maxUsage, resetFrequency);
};

// Export the function to set remaining uses for a key
export const setRemainingUses = (serviceName, apiKey, remainingUses) => {
  return apiKeyManager.setRemainingUses(serviceName, apiKey, remainingUses);
};

// Utility function to call any RapidAPI service
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
  
  // Add body data for POST requests
  if ((method === 'POST' || method === 'PUT') && bodyData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(bodyData);
  }

  try {
    // Make the API request
    const response = await fetch(url.toString(), options);
    
    // If the request was successful, increment the usage counter
    apiKeyManager.incrementKeyUsage(serviceName, key);
    
    // Parse and return the response
    const result = await response.json();
    
    // Add remaining usage info to the result
    return {
      ...result,
      _apiKeyRemaining: remainingUsage - 1 // Account for this usage
    };
  } catch (error) {
    console.error(`Error calling ${serviceName} API:`, error);
    throw error;
  }
};
