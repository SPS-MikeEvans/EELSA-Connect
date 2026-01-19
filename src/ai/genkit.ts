
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export default genkit({
  plugins: [
    googleAI(),
  ],
  model: gemini15Flash,
});
