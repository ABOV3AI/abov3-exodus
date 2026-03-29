/**
 * ABOV3 Model Configuration
 *
 * Defines the 8 models available through ARK Cloud:
 * - 4 ABOV3-branded models (Genesis, Exodus, Elohim, Solomon) with identity protocol
 * - 4 raw/unbranded models (passthrough to Ollama cloud)
 */

export interface ABOV3ModelConfig {
  id: string;                    // internal key
  displayName: string;           // shown in UI dropdown
  description: string;           // subtitle/tooltip
  ollamaModel: string;           // actual model string sent to Ollama API
  branded: boolean;              // whether to inject identity protocol
  tier: 'flagship' | 'workhorse' | 'reasoning' | 'efficient';
  icon: string;                  // icon/emoji for UI
  contextWindow: number;         // max context length
  capabilities: string[];        // tags: vision, tools, thinking, etc.
  hasVision: boolean;            // whether model supports vision
  hasTools: boolean;             // whether model supports tool calling
}

/**
 * ABOV3 Model Registry
 *
 * Hierarchy (most capable to most efficient):
 * - Genesis 2.1: Flagship Multimodal (qwen2.5-vl:72b - vision + tools + thinking)
 * - Exodus 2.1: Workhorse (qwen2.5:72b - all-rounder)
 * - Elohim 2.1: Flagship Reasoning (qwen2.5:32b - reasoning + agentic)
 * - Solomon 2.1: Efficient (qwen2.5:7b - fast inference)
 *
 * NOTE: Update ollamaModel values to match your Ollama Pro available models
 */
export const ABOV3_MODELS: Record<string, ABOV3ModelConfig> = {
  // === ABOV3 Branded Models (ordered by hierarchy) ===
  genesis: {
    id: 'genesis',
    displayName: 'ABOV3-Genesis 2.1',
    description: 'Flagship — largest model with full capabilities',
    ollamaModel: 'qwen3-coder:480b',  // Qwen3 Coder 480B - trying for tool calling support
    branded: true,
    tier: 'flagship',
    icon: '🔱',
    contextWindow: 128000,
    capabilities: ['tools', 'thinking', 'reasoning', 'coding', 'multilingual'],
    hasVision: false,
    hasTools: true,
  },
  exodus: {
    id: 'exodus',
    displayName: 'ABOV3-Exodus 2.1',
    description: 'Workhorse — coding specialist with tools',
    ollamaModel: 'qwen3.5:397b',  // Qwen3.5 397B - trying for tool calling support
    branded: true,
    tier: 'workhorse',
    icon: '⚡',
    contextWindow: 128000,
    capabilities: ['tools', 'thinking', 'coding', 'multilingual'],
    hasVision: false,
    hasTools: true,
  },
  elohim: {
    id: 'elohim',
    displayName: 'ABOV3-Elohim 2.1',
    description: 'Reasoning — deep reasoning + agentic',
    ollamaModel: 'gpt-oss:120b',  // GPT-OSS 120B - confirmed working with tools
    branded: true,
    tier: 'reasoning',
    icon: '🜂',
    contextWindow: 128000,
    capabilities: ['tools', 'thinking', 'reasoning', 'agentic', 'coding'],
    hasVision: false,
    hasTools: true,
  },
  solomon: {
    id: 'solomon',
    displayName: 'ABOV3-Solomon 2.1',
    description: 'Efficient — fast inference with tools',
    ollamaModel: 'gpt-oss:20b',  // GPT-OSS 20B - same family as Elohim, supports tools
    branded: true,
    tier: 'efficient',
    icon: '🕊️',
    contextWindow: 32000,
    capabilities: ['tools', 'thinking', 'fast'],
    hasVision: false,
    hasTools: true,
  },

  // === Raw / Unbranded Models (passthrough) ===
  'qwen3-coder-480b-raw': {
    id: 'qwen3-coder-480b-raw',
    displayName: 'Qwen3 Coder 480B (Raw)',
    description: 'Coding model — Raw, no ABOV3 system prompt',
    ollamaModel: 'qwen3-coder:480b',
    branded: false,
    tier: 'flagship',
    icon: '🧪',
    contextWindow: 128000,
    capabilities: ['tools', 'thinking', 'reasoning', 'coding', 'multilingual'],
    hasVision: false,
    hasTools: true,
  },
  'qwen3.5-397b-raw': {
    id: 'qwen3.5-397b-raw',
    displayName: 'Qwen3.5 397B (Raw)',
    description: 'Large model — Raw, no ABOV3 system prompt',
    ollamaModel: 'qwen3.5:397b',
    branded: false,
    tier: 'workhorse',
    icon: '🧪',
    contextWindow: 128000,
    capabilities: ['tools', 'thinking', 'coding', 'multilingual'],
    hasVision: false,
    hasTools: true,
  },
  'gpt-oss-120b-raw': {
    id: 'gpt-oss-120b-raw',
    displayName: 'GPT-OSS 120B (Raw)',
    description: 'Reasoning model — Raw, no ABOV3 system prompt',
    ollamaModel: 'gpt-oss:120b',
    branded: false,
    tier: 'reasoning',
    icon: '🧪',
    contextWindow: 128000,
    capabilities: ['tools', 'thinking', 'reasoning', 'coding'],
    hasVision: false,
    hasTools: true,
  },
  'gpt-oss-20b-raw': {
    id: 'gpt-oss-20b-raw',
    displayName: 'GPT-OSS 20B (Raw)',
    description: 'Efficient model — Raw, no ABOV3 system prompt',
    ollamaModel: 'gpt-oss:20b',
    branded: false,
    tier: 'efficient',
    icon: '🧪',
    contextWindow: 32000,
    capabilities: ['tools', 'fast'],
    hasVision: false,
    hasTools: true,
  },
};

/**
 * Get all branded ABOV3 models in hierarchy order
 */
export function getBrandedModels(): ABOV3ModelConfig[] {
  return ['genesis', 'exodus', 'elohim', 'solomon']
    .map(id => ABOV3_MODELS[id])
    .filter((m): m is ABOV3ModelConfig => !!m);
}

/**
 * Get all raw/unbranded models
 */
export function getRawModels(): ABOV3ModelConfig[] {
  return Object.values(ABOV3_MODELS).filter(m => !m.branded);
}

/**
 * Get model config by ID
 */
export function getModelConfig(modelId: string): ABOV3ModelConfig | undefined {
  return ABOV3_MODELS[modelId];
}

/**
 * Check if a model ID is an ABOV3-branded model
 */
export function isABOV3BrandedModel(modelId: string): boolean {
  return ABOV3_MODELS[modelId]?.branded === true;
}

/**
 * Resolve ABOV3 model ID to Ollama model string
 */
export function resolveOllamaModel(modelId: string): string {
  const config = ABOV3_MODELS[modelId];
  if (!config) throw new Error(`Unknown ABOV3 model: ${modelId}`);
  return config.ollamaModel;
}

/**
 * Get tier display label
 */
export function getTierLabel(tier: ABOV3ModelConfig['tier']): string {
  switch (tier) {
    case 'flagship': return 'Flagship';
    case 'workhorse': return 'Workhorse';
    case 'reasoning': return 'Reasoning';
    case 'efficient': return 'Efficient';
  }
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: ABOV3ModelConfig['tier']): string {
  switch (tier) {
    case 'flagship': return '#FFD700';    // Gold
    case 'workhorse': return '#6366f1';   // Indigo
    case 'reasoning': return '#10B981';   // Emerald
    case 'efficient': return '#8B5CF6';   // Purple
  }
}
