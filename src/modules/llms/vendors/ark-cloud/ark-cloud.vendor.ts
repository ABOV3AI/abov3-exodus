import { apiAsync } from '~/common/util/trpc.client';

import type { IModelVendor } from '../IModelVendor';
import type { OllamaAccessSchema } from '../../server/ollama/ollama.router';
import type { ModelDescriptionSchema } from '../../server/llm.server.types';

import { arkCloudModels } from './ark-cloud.models';


/**
 * ARK Cloud Service Settings
 *
 * User key is optional - the proxy at api.abov3.ai injects the main API key.
 * User key can be used for metering/priority access.
 */
export interface DArkCloudServiceSettings {
  arkCloudUserKey: string;
}


/**
 * ABOV3 ARK Cloud Vendor
 *
 * Provides access to ABOV3's proprietary AI models:
 * - Genesis 2.1: Flagship Multimodal (235B)
 * - Exodus 2.1: Workhorse (122B)
 * - Elohim 2.1: Flagship Reasoning (120B)
 * - Solomon 2.1: Efficient (120B MoE)
 *
 * Plus all Ollama Pro cloud models.
 */
export const ModelVendorArkCloud: IModelVendor<DArkCloudServiceSettings, OllamaAccessSchema> = {
  id: 'ark-cloud',
  name: 'ABOV3 ARK Cloud',
  displayRank: 8,  // Show prominently (after main cloud providers, before local)
  location: 'cloud',
  brandColor: '#6366f1',  // ABOV3 purple
  instanceLimit: 1,
  hasFreeModels: true,  // Free tier available

  // Transport access - always uses api.abov3.ai
  // IMPORTANT: Use native endpoint because Ollama Pro redirects /v1/chat/completions
  getTransportAccess: (partialSetup): OllamaAccessSchema => ({
    dialect: 'ollama',
    ollamaHost: 'https://api.abov3.ai',
    ollamaJson: false,
    ollamaUseNativeEndpoint: true,  // Use /api/chat instead of /v1/chat/completions (required for Ollama Pro)
    // User key is optional (for metering/priority)
    ...(partialSetup?.arkCloudUserKey && { ollamaApiKey: partialSetup.arkCloudUserKey }),
  }),

  // Return ABOV3 branded models + filtered Ollama models from the cloud
  rpcUpdateModelsOrThrow: async (access) => {
    // Start with ABOV3 branded models at the top
    const models: ModelDescriptionSchema[] = [...arkCloudModels];

    // Patterns to identify raw/unbranded models that should be hidden
    const RAW_MODEL_PATTERNS = ['(Raw)', '-raw', ':raw', '_raw'];

    // Filter function to exclude raw models
    const isRawModel = (model: ModelDescriptionSchema): boolean =>
      RAW_MODEL_PATTERNS.some(pattern =>
        model.label?.toLowerCase().includes(pattern.toLowerCase()) ||
        model.id?.toLowerCase().includes(pattern.toLowerCase())
      );

    // Also fetch Ollama models from the API
    try {
      const ollamaResponse = await apiAsync.llmOllama.listModels.query({ access });
      if (ollamaResponse?.models) {
        // Add Ollama models, but skip ones that:
        // 1. Conflict with ABOV3 model IDs
        // 2. Are raw/unbranded models
        const abov3ModelIds = new Set(arkCloudModels.map(m => m.id));
        for (const model of ollamaResponse.models) {
          if (!abov3ModelIds.has(model.id) && !isRawModel(model)) {
            models.push(model);
          }
        }
      }
    } catch (e) {
      // If Ollama API fails, still return ABOV3 models
      console.warn('[ARK Cloud] Failed to fetch Ollama models:', e);
    }

    return { models };
  },

};
