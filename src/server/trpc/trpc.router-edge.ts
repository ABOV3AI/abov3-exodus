import { createTRPCRouter } from './trpc.server';

import { aixRouter } from '~/modules/aix/server/api/aix.router';
import { backendRouter } from '~/modules/backend/backend.router';
import { elevenlabsRouter } from '~/modules/elevenlabs/elevenlabs.router';
import { paulineRouter } from '~/modules/pauline/pauline.router';
import { googleSearchRouter } from '~/modules/google/search.router';
import { llmABOV3Router } from '~/modules/llms/server/abov3/abov3.router';
import { llmAnthropicRouter } from '~/modules/llms/server/anthropic/anthropic.router';
import { llmArkSLMRouter } from '~/modules/llms/server/ark-slm/ark-slm.router';
import { llmGeminiRouter } from '~/modules/llms/server/gemini/gemini.router';
import { llmOllamaRouter } from '~/modules/llms/server/ollama/ollama.router';
import { llmOpenAIRouter } from '~/modules/llms/server/openai/openai.router';
import { youtubeRouter } from '~/modules/youtube/youtube.router';
import { visionRouter } from '~/modules/vision/vision.router';
import { webToolsRouter } from '~/modules/web-tools/web-tools.router';

/**
 * Primary rooter, and will be sitting on an Edge Runtime.
 */
export const appRouterEdge = createTRPCRouter({
  aix: aixRouter,
  backend: backendRouter,
  elevenlabs: elevenlabsRouter,
  pauline: paulineRouter,
  googleSearch: googleSearchRouter,
  llmAbov3: llmABOV3Router,
  llmAnthropic: llmAnthropicRouter,
  llmArkSLM: llmArkSLMRouter,
  llmGemini: llmGeminiRouter,
  llmOllama: llmOllamaRouter,
  llmOpenAI: llmOpenAIRouter,
  vision: visionRouter,
  youtube: youtubeRouter,
  webTools: webToolsRouter,
});

// export type definition of API
export type AppRouterEdge = typeof appRouterEdge;