import { callRapidApi } from './linkedinService.js';

// Service configuration
const SERVICE_NAME = 'google-translate';

export const translateText = async (text, targetLang, sourceLang = 'auto') => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/translator/text',
      'POST',
      {},
      {
        from: sourceLang,
        to: targetLang,
        text: text
      }
    );
    
    // Extract the useful information from the response
    if (result && result.trans) {
      return {
        originalText: text,
        translatedText: result.trans,
        sourceLang: result.source || sourceLang,
        targetLang,
        apiKeyRemaining: result._apiKeyRemaining
      };
    }
    
    throw new Error('Translation failed or returned unexpected format');
  } catch (error) {
    console.error('Error translating text:', error);
    throw error;
  }
};

export const batchTranslation = async (texts, targetLang, sourceLang = 'auto', protectedPaths = [], commonProtectedPaths = []) => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/translator/json',
      'POST',
      {},
      {
        from: sourceLang,
        to: targetLang,
        protected_paths: protectedPaths,
        common_protected_paths: commonProtectedPaths,
        json: texts
      }
    );
    
    if (result && result.trans) {
      return {
        originalTexts: texts,
        translatedTexts: result.trans,
        sourceLang: result.source || sourceLang,
        targetLang,
        apiKeyRemaining: result._apiKeyRemaining
      };
    }
    
    throw new Error('Batch translation failed or returned unexpected format');
  } catch (error) {
    console.error('Error in batch translation:', error);
    throw error;
  }
};

export const translateJson = async (jsonData, targetLang, sourceLang = 'auto') => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/translator/json',
      'POST',
      {},
      {
        from: sourceLang,
        to: targetLang,
        json: jsonData
      }
    );
    
    if (result && result.trans) {
      return {
        originalData: jsonData,
        translatedData: result.trans,
        sourceLang: result.source || sourceLang,
        targetLang,
        apiKeyRemaining: result._apiKeyRemaining
      };
    }
    
    throw new Error('JSON translation failed or returned unexpected format');
  } catch (error) {
    console.error('Error translating JSON:', error);
    throw error;
  }
};

export const translateHtml = async (html, targetLang, sourceLang = 'auto') => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/translator/html',
      'POST',
      {},
      {
        from: sourceLang,
        to: targetLang,
        html: html
      }
    );
    
    if (result && result.trans) {
      return {
        originalHtml: html,
        translatedHtml: result.trans,
        sourceLang: result.source || sourceLang,
        targetLang,
        apiKeyRemaining: result._apiKeyRemaining
      };
    }
    
    throw new Error('HTML translation failed or returned unexpected format');
  } catch (error) {
    console.error('Error translating HTML:', error);
    throw error;
  }
};

export const detectLanguage = async (text) => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/detector/text',
      'POST',
      {},
      { text: text }
    );
    
    if (result && result.language) {
      return {
        text,
        detectedLanguage: result.language,
        confidence: result.confidence || 1.0, 
        apiKeyRemaining: result._apiKeyRemaining
      };
    }
    
    throw new Error('Language detection failed or returned unexpected format');
  } catch (error) {
    console.error('Error detecting language:', error);
    throw error;
  }
};

export const getSupportedLanguages = async () => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/supported-languages',
      'GET',
      {}
    );
    
    if (result && Array.isArray(result)) {
      return {
        languages: result,
        apiKeyRemaining: result._apiKeyRemaining
      };
    }
    
    throw new Error('Failed to get supported languages');
  } catch (error) {
    console.error('Error getting supported languages:', error);
    throw error;
  }
};