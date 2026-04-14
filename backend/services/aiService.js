const axios = require('axios');
const logger = require('../config/logger');

const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:5000';

const postToAI = async (path, payload) => {
  try {
    const response = await axios.post(`${AI_BASE_URL}${path}`, payload);
    return response.data;
  } catch (error) {
    logger.error('AI request failed', { path, message: error.message });
    return { result: 'unavailable', confidence: 0 };
  }
};

module.exports = {
  predictDisease: (payload) => postToAI('/predict/disease', payload),
  predictSoil: (payload) => postToAI('/predict/soil', payload),
  predictGrading: (payload) => postToAI('/predict/grading', payload),
};
