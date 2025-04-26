import logger from '../utils/logger.js';
import config from '../config/config.js';
import apiKeyController from './apiKeyController.js';

const apiKeyManager = apiKeyController.apiKeyManager;
const { serviceName } = config.services.linkedIn;

/**
 * Fetch LinkedIn profile data
 */
export const getLinkedInProfile = async (req, res) => {
  try {
    // Extract the profile URL from parameters
    const profileUrl = req.params.profileUrl;
    
    // Check if URL is provided
    if (!profileUrl) {
      return res.fail('LinkedIn profile URL is required', 400);
    }

    // Format the URL correctly
    const formattedUrl = profileUrl.startsWith('http') 
      ? profileUrl 
      : `https://www.linkedin.com/in/${profileUrl}/`;
    
    // Fetch profile data
    const profileData = await fetchLinkedInProfile(formattedUrl);
    
    // Return the profile data
    return res.success({ 
      profile: profileData,
      apiKeyStats: apiKeyManager.getUsageStats(serviceName)
    });
    
  } catch (error) {
    logger.error('Error fetching LinkedIn profile', { 
      error: error.message, 
      profileUrl: req.params.profileUrl
    });
    return res.fail('Failed to fetch LinkedIn profile', 500, error.message);
  }
};

// Helper function to fetch LinkedIn profile
const fetchLinkedInProfile = async (profileUrl) => {
  // Get the next API key and host for LinkedIn service
  const { key, host, remainingUsage } = apiKeyManager.getNextApiKey(serviceName);
  
  // Construct API URL with parameters
  const baseUrl = "https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile";
  const url = `${baseUrl}?linkedin_url=${encodeURIComponent(
    profileUrl
  )}&include_skills=false&include_certifications=false&include_publications=false&include_honors=false&include_volunteers=false&include_projects=false&include_patents=false&include_courses=false&include_organizations=false&include_profile_status=false&include_company_public_url=false`;

  // Set up request options
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
    logger.error("Error fetching LinkedIn profile", { 
      error: error.message, 
      profileUrl
    });
    throw error;
  }
};

export default {
  getLinkedInProfile
};