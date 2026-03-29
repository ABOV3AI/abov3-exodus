/**
 * ABOV3 Models Module
 *
 * Provides model configuration, identity protocol, and message preparation
 * for ABOV3-branded AI models running on Ollama Pro cloud.
 */

// Configuration
export {
  ABOV3_MODELS,
  type ABOV3ModelConfig,
  getBrandedModels,
  getRawModels,
  getModelConfig,
  isABOV3BrandedModel,
  resolveOllamaModel,
  getTierLabel,
  getTierColor,
} from './abov3-models.config';

// Identity Protocol
export {
  buildIdentityProtocol,
  getShortIdentity,
} from './identity-protocol';

// Message Preparation
export {
  isABOV3Model,
  getABOV3ModelConfig,
  resolveToOllamaModel,
  getIdentitySystemMessage,
  shouldInjectIdentity,
  prepareSystemMessage,
  getModelCapabilities,
  getContextWindow,
  supportsVision,
  supportsTools,
  getDisplayNameFromOllamaModel,
  getBrandedDisplayName,
} from './message-preparer';
