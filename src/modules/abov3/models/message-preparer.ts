/**
 * ABOV3 Message Preparer
 *
 * Utility functions for preparing messages before sending to Ollama,
 * including identity protocol injection for branded models.
 */

import { ABOV3_MODELS, type ABOV3ModelConfig } from './abov3-models.config';
import { buildIdentityProtocol } from './identity-protocol';


/**
 * Check if a model ID is a known ABOV3 model (branded or raw)
 */
export function isABOV3Model(modelId: string): boolean {
  return modelId in ABOV3_MODELS;
}

/**
 * Get the ABOV3 model configuration for a model ID
 */
export function getABOV3ModelConfig(modelId: string): ABOV3ModelConfig | undefined {
  return ABOV3_MODELS[modelId];
}

/**
 * Resolve an ABOV3 model ID to the actual Ollama model string
 */
export function resolveToOllamaModel(modelId: string): string {
  const config = ABOV3_MODELS[modelId];
  if (!config) {
    // Not an ABOV3 model, return as-is (might be a regular Ollama model)
    return modelId;
  }
  return config.ollamaModel;
}

/**
 * Get the identity protocol system message for a branded model
 * Returns null for raw/unbranded models
 */
export function getIdentitySystemMessage(modelId: string): string | null {
  const config = ABOV3_MODELS[modelId];
  if (!config || !config.branded) {
    return null;
  }
  return buildIdentityProtocol(config.displayName);
}

/**
 * Check if identity protocol should be injected for this model
 */
export function shouldInjectIdentity(modelId: string): boolean {
  const config = ABOV3_MODELS[modelId];
  return config?.branded === true;
}

/**
 * Prepare a system message by optionally prepending the identity protocol
 *
 * @param modelId The ABOV3 model ID
 * @param existingSystemMessage The existing system message (if any)
 * @returns The combined system message with identity protocol (if branded)
 */
export function prepareSystemMessage(
  modelId: string,
  existingSystemMessage: string | null | undefined
): string {
  const identityProtocol = getIdentitySystemMessage(modelId);

  if (!identityProtocol) {
    // Raw model - return existing message as-is
    return existingSystemMessage || '';
  }

  if (!existingSystemMessage) {
    // Branded model with no existing system message
    return identityProtocol;
  }

  // Branded model with existing system message - combine them
  // Identity protocol goes first, followed by user's system message
  return `${identityProtocol}\n\n---\n\n${existingSystemMessage}`;
}

/**
 * Get model capabilities for display
 */
export function getModelCapabilities(modelId: string): string[] {
  const config = ABOV3_MODELS[modelId];
  return config?.capabilities || [];
}

/**
 * Get context window size for a model
 */
export function getContextWindow(modelId: string): number {
  const config = ABOV3_MODELS[modelId];
  return config?.contextWindow || 8192;
}

/**
 * Check if model supports vision
 */
export function supportsVision(modelId: string): boolean {
  const config = ABOV3_MODELS[modelId];
  return config?.hasVision === true;
}

/**
 * Check if model supports tool calling
 */
export function supportsTools(modelId: string): boolean {
  const config = ABOV3_MODELS[modelId];
  return config?.hasTools === true;
}

/**
 * Reverse lookup: Get ABOV3 display name from Ollama model string
 * Used to display the branded name instead of the raw Ollama model name
 */
export function getDisplayNameFromOllamaModel(ollamaModel: string): string | null {
  // Search through all ABOV3 models to find one with matching ollamaModel
  for (const [_id, config] of Object.entries(ABOV3_MODELS)) {
    if (config.ollamaModel === ollamaModel) {
      return config.displayName;
    }
  }
  return null;
}

/**
 * Get the branded display name for a model, falling back to the original name
 * Handles both ABOV3 model IDs and raw Ollama model strings
 */
export function getBrandedDisplayName(modelIdOrOllamaModel: string): string {
  // First check if it's a known ABOV3 model ID
  const config = ABOV3_MODELS[modelIdOrOllamaModel];
  if (config) {
    return config.displayName;
  }

  // Then check if it's an Ollama model string that maps to an ABOV3 model
  const displayName = getDisplayNameFromOllamaModel(modelIdOrOllamaModel);
  if (displayName) {
    return displayName;
  }

  // Return the original name if no mapping found
  return modelIdOrOllamaModel;
}
