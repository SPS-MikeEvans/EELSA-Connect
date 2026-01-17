
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { configureGenkit } from '@genkit-ai/core';

export default configureGenkit({
  plugins: [
    googleAI(),
  ],
  models: {
    'gemini-pro': gemini15Flash, // Use the 'gemini-1.5-flash' model
  },
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
