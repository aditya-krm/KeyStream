import logger from '../utils/logger.js';
import config from '../config/config.js';
import { callRapidApi } from '../services/api/rapidApiService.js';
import apiKeyController from './apiKeyController.js';

const apiKeyManager = apiKeyController.apiKeyManager;
const { serviceName } = config.services.googleTranslate;

/**
 * Translate text
 */
export const translateText = async (req, res) => {
  try {
    const { text, targetLang, sourceLang = 'auto' } = req.body;
    
    if (!text || !targetLang) {
      return res.fail('Text and target language are required', 400);
    }
    
    const result = await translateTextService(text, targetLang, sourceLang);
    
    return res.success({
      translation: result
    });
  } catch (error) {
    logger.error('Error translating text', { error: error.message });
    return res.fail('Failed to translate text', 500, error.message);
  }
};

/**
 * Batch translate multiple texts
 */
export const batchTranslate = async (req, res) => {
  try {
    const { texts, targetLang, sourceLang = 'auto', protectedPaths = [], commonProtectedPaths = [] } = req.body;
    
    if (!texts || !Array.isArray(texts) || !targetLang) {
      return res.fail('Array of texts and target language are required', 400);
    }
    
    const result = await batchTranslationService(texts, targetLang, sourceLang, protectedPaths, commonProtectedPaths);
    
    return res.success({
      translations: result
    });
  } catch (error) {
    logger.error('Error in batch translate', { error: error.message });
    return res.fail('Failed to translate texts', 500, error.message);
  }
};

/**
 * Translate JSON content
 */
export const translateJson = async (req, res) => {
  try {
    const { json, targetLang, sourceLang = 'auto' } = req.body;
    
    if (!json || typeof json !== 'object' || !targetLang) {
      return res.fail('JSON object and target language are required', 400);
    }
    
    const result = await translateJsonService(json, targetLang, sourceLang);
    
    return res.success({
      translation: result
    });
  } catch (error) {
    logger.error('Error translating JSON', { error: error.message });
    return res.fail('Failed to translate JSON', 500, error.message);
  }
};

/**
 * Translate HTML content
 */
export const translateHtml = async (req, res) => {
  try {
    const { html, targetLang, sourceLang = 'auto' } = req.body;
    
    if (!html || !targetLang) {
      return res.fail('HTML content and target language are required', 400);
    }
    
    const result = await translateHtmlService(html, targetLang, sourceLang);
    
    return res.success({
      translation: result
    });
  } catch (error) {
    logger.error('Error translating HTML', { error: error.message });
    return res.fail('Failed to translate HTML', 500, error.message);
  }
};

/**
 * Detect language
 */
export const detectLanguage = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.fail('Text is required', 400);
    }
    
    const result = await detectLanguageService(text);
    
    return res.success({
      detection: result
    });
  } catch (error) {
    logger.error('Error detecting language', { error: error.message });
    return res.fail('Failed to detect language', 500, error.message);
  }
};

/**
 * Get supported languages
 */
export const getSupportedLanguages = async (req, res) => {
  try {
    const result = await getSupportedLanguagesService();
    
    return res.success({
      languages: result
    });
  } catch (error) {
    logger.error('Error getting supported languages', { error: error.message });
    return res.fail('Failed to get supported languages', 500, error.message);
  }
};

// Service functions
const translateTextService = async (text, targetLang, sourceLang = 'auto') => {
  try {
    const result = await callRapidApi(
      serviceName,
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
    logger.error('Error translating text', { error: error.message });
    throw error;
  }
};

const batchTranslationService = async (texts, targetLang, sourceLang = 'auto', protectedPaths = [], commonProtectedPaths = []) => {
  try {
    const result = await callRapidApi(
      serviceName,
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
    logger.error('Error in batch translation', { error: error.message });
    throw error;
  }
};

const translateJsonService = async (jsonData, targetLang, sourceLang = 'auto') => {
  try {
    const result = await callRapidApi(
      serviceName,
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
    logger.error('Error translating JSON', { error: error.message });
    throw error;
  }
};

const translateHtmlService = async (html, targetLang, sourceLang = 'auto') => {
  try {
    const result = await callRapidApi(
      serviceName,
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
    logger.error('Error translating HTML', { error: error.message });
    throw error;
  }
};

const detectLanguageService = async (text) => {
  try {
    const result = await callRapidApi(
      serviceName,
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
    logger.error('Error detecting language', { error: error.message });
    throw error;
  }
};

const getSupportedLanguagesService = async () => {
  try {
    const result = await callRapidApi(
      serviceName,
      'api/v1/translator/support-languages',
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
    logger.error('Error getting supported languages', { error: error.message });
    throw error;
  }
};

export default {
  translateText,
  batchTranslate,
  translateJson,
  translateHtml,
  detectLanguage,
  getSupportedLanguages
};