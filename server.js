import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  fetchLinkedInProfile, 
  getApiKeyStats, 
  addNewApiKey, 
  addNewService,
  callRapidApi,
  setRemainingUses
} from './services/linkedinService.js';
import {
  translateText,
  batchTranslation,
  translateJson,
  translateHtml,
  detectLanguage,
  getSupportedLanguages
} from './services/googleTranslateService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'RapidAPI Proxy Service',
    endpoints: {
      getProfile: '/linkedin/:profileUrl',
      getApiKeyStats: '/api-keys',
      getServiceStats: '/services/:serviceName/stats',
      addService: '/services (POST)',
      addApiKey: '/services/:serviceName/keys (POST)',
      updateKeyRemaining: '/services/:serviceName/keys/:apiKey/remaining (PUT)',
      proxyCall: '/api/:serviceName/:endpoint(*)',
      // Google Translate endpoints
      translate: '/translate/text (POST)',
      batchTranslate: '/translate/batch (POST)',
      translateJson: '/translate/json (POST)', 
      translateHtml: '/translate/html (POST)',
      detectLanguage: '/translate/detect (POST)',
      supportedLanguages: '/translate/languages'
    }
  });
});

// Route 1: Fetch LinkedIn Profile (legacy endpoint)
app.get('/linkedin/:profileUrl', async (req, res) => {
  try {
    // Extract the profile URL from parameters
    const profileUrl = req.params.profileUrl;
    
    // Check if URL is provided
    if (!profileUrl) {
      return res.status(400).json({ error: 'LinkedIn profile URL is required' });
    }

    // Format the URL correctly
    const formattedUrl = profileUrl.startsWith('http') 
      ? profileUrl 
      : `https://www.linkedin.com/in/${profileUrl}/`;
    
    // Fetch profile data
    const profileData = await fetchLinkedInProfile(formattedUrl);
    
    // Return the profile data
    res.json({ 
      success: true,
      profile: profileData,
      apiKeyStats: getApiKeyStats('linkedin-scraper')
    });
    
  } catch (error) {
    console.error('Error in LinkedIn Profile route:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch LinkedIn profile' 
    });
  }
});

// Route 2: Get API Key Stats for all services
app.get('/api-keys', (req, res) => {
  try {
    const stats = getApiKeyStats();
    res.json({ 
      success: true,
      apiKeyStats: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get API key stats' 
    });
  }
});

// Route 3: Get API Key Stats for a specific service
app.get('/services/:serviceName/stats', (req, res) => {
  try {
    const { serviceName } = req.params;
    const stats = getApiKeyStats(serviceName);
    
    if (!stats || (Array.isArray(stats) && stats.length === 0)) {
      return res.status(404).json({ 
        success: false, 
        error: `Service '${serviceName}' not found` 
      });
    }
    
    res.json({ 
      success: true,
      service: serviceName,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get service stats' 
    });
  }
});

// Route 4: Add a new service
app.post('/services', (req, res) => {
  try {
    const { serviceName, host, maxUsage, resetFrequency } = req.body;
    
    if (!serviceName || !host) {
      return res.status(400).json({ error: 'Service name and host are required' });
    }
    
    // Validate reset frequency if provided
    if (resetFrequency && !['never', 'hourly', 'daily', 'weekly', 'monthly'].includes(resetFrequency)) {
      return res.status(400).json({ 
        error: 'Invalid reset frequency. Must be one of: never, hourly, daily, weekly, monthly' 
      });
    }
    
    const added = addNewService(
      serviceName, 
      host, 
      maxUsage || 100, 
      resetFrequency || 'never'
    );
    
    if (added) {
      res.status(201).json({ 
        success: true,
        message: 'Service added successfully',
        service: {
          name: serviceName,
          host: host,
          maxUsage: maxUsage || 100,
          resetFrequency: resetFrequency || 'never'
        }
      });
    } else {
      res.status(200).json({ 
        success: true,
        message: 'Service configuration updated',
        service: {
          name: serviceName,
          host: host,
          maxUsage: maxUsage || 100,
          resetFrequency: resetFrequency || 'never'
        }
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to add service' 
    });
  }
});

// Route 5: Add New API Key to a service
app.post('/services/:serviceName/keys', (req, res) => {
  try {
    const { serviceName } = req.params;
    const { apiKey, remainingUses } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    // Pass remainingUses if provided
    const added = addNewApiKey(serviceName, apiKey, remainingUses);
    
    if (added) {
      res.status(201).json({ 
        success: true,
        message: `API key added successfully to service '${serviceName}'`,
        serviceStats: getApiKeyStats(serviceName)
      });
    } else {
      res.status(409).json({ 
        success: false,
        message: `API key already exists or service '${serviceName}' not found`,
        serviceStats: getApiKeyStats(serviceName)
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to add API key' 
    });
  }
});

// Route 6: Update remaining uses for a key
app.put('/services/:serviceName/keys/:apiKey/remaining', (req, res) => {
  try {
    const { serviceName, apiKey } = req.params;
    const { remainingUses } = req.body;
    
    if (remainingUses === undefined || remainingUses < 0) {
      return res.status(400).json({ error: 'Valid remainingUses value is required' });
    }
    
    const updated = setRemainingUses(serviceName, apiKey, remainingUses);
    
    if (updated) {
      res.json({ 
        success: true,
        message: `API key remaining uses updated for '${serviceName}'`,
        serviceStats: getApiKeyStats(serviceName)
      });
    } else {
      res.status(404).json({ 
        success: false,
        message: `API key not found or service '${serviceName}' not found`,
        serviceStats: getApiKeyStats(serviceName)
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update API key remaining uses' 
    });
  }
});

// Route 7: Generic API Proxy endpoint
app.post('/api/:serviceName/:endpoint(*)', async (req, res) => {
  try {
    const { serviceName, endpoint } = req.params;
    const { method = 'GET', queryParams = {}, bodyData = null } = req.body;
    
    const result = await callRapidApi(serviceName, endpoint, method, queryParams, bodyData);
    
    res.json({
      success: true,
      data: result,
      apiKeyStats: getApiKeyStats(serviceName)
    });
  } catch (error) {
    console.error('Error in API proxy:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to call API'
    });
  }
});

// Google Translate Routes

// Translate text
app.post('/translate/text', async (req, res) => {
  try {
    const { text, targetLang, sourceLang = 'auto' } = req.body;
    
    if (!text || !targetLang) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text and target language are required' 
      });
    }
    
    const result = await translateText(text, targetLang, sourceLang);
    
    res.json({
      success: true,
      translation: result
    });
  } catch (error) {
    console.error('Error in translate text route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate text'
    });
  }
});

// Batch translate multiple texts
app.post('/translate/batch', async (req, res) => {
  try {
    const { texts, targetLang, sourceLang = 'auto', protectedPaths = [], commonProtectedPaths = [] } = req.body;
    
    if (!texts || !Array.isArray(texts) || !targetLang) {
      return res.status(400).json({ 
        success: false, 
        error: 'Array of texts and target language are required' 
      });
    }
    
    const result = await batchTranslation(texts, targetLang, sourceLang, protectedPaths, commonProtectedPaths);
    
    res.json({
      success: true,
      translations: result
    });
  } catch (error) {
    console.error('Error in batch translate route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate texts'
    });
  }
});

// Translate JSON content
app.post('/translate/json', async (req, res) => {
  try {
    const { json, targetLang, sourceLang = 'auto' } = req.body;
    
    if (!json || typeof json !== 'object' || !targetLang) {
      return res.status(400).json({ 
        success: false, 
        error: 'JSON object and target language are required' 
      });
    }
    
    const result = await translateJson(json, targetLang, sourceLang);
    
    res.json({
      success: true,
      translation: result
    });
  } catch (error) {
    console.error('Error in translate JSON route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate JSON'
    });
  }
});

// Translate HTML content
app.post('/translate/html', async (req, res) => {
  try {
    const { html, targetLang, sourceLang = 'auto' } = req.body;
    
    if (!html || !targetLang) {
      return res.status(400).json({ 
        success: false, 
        error: 'HTML content and target language are required' 
      });
    }
    
    const result = await translateHtml(html, targetLang, sourceLang);
    
    res.json({
      success: true,
      translation: result
    });
  } catch (error) {
    console.error('Error in translate HTML route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate HTML'
    });
  }
});

// Detect language
app.post('/translate/detect', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required' 
      });
    }
    
    const result = await detectLanguage(text);
    
    res.json({
      success: true,
      detection: result
    });
  } catch (error) {
    console.error('Error in detect language route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to detect language'
    });
  }
});

// Get supported languages
app.get('/translate/languages', async (req, res) => {
  try {
    const result = await getSupportedLanguages();
    
    res.json({
      success: true,
      languages: result
    });
  } catch (error) {
    console.error('Error in get languages route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get supported languages'
    });
  }
});

// Legacy endpoint to maintain backward compatibility
app.post('/api-keys', (req, res) => {
  try {
    const { apiKey, remainingUses } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    const added = addNewApiKey('linkedin-scraper', apiKey, remainingUses);
    
    if (added) {
      res.status(201).json({ 
        success: true,
        message: 'API key added successfully to LinkedIn service',
        apiKeyStats: getApiKeyStats('linkedin-scraper')
      });
    } else {
      res.status(409).json({ 
        success: false,
        message: 'API key already exists or LinkedIn service not found',
        apiKeyStats: getApiKeyStats('linkedin-scraper')
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to add API key' 
    });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // console.log(`API key stats: `, getApiKeyStats());
});
