/**
 * ABOV3 Ark-SLM Model Library
 *
 * Metadata for common Small Language Models (SLMs) compatible with Ark-SLM server.
 * Used to enrich model information when models are discovered from the server.
 *
 * Models are matched by ID prefix (e.g., 'llama-3.2' matches 'llama-3.2-1b-instruct-q4_0.gguf')
 */

export interface ArkSLMModelInfo {
  /** Display name */
  name: string;
  /** Model provider/family */
  provider: string;
  /** Default context window (tokens) */
  contextWindow: number;
  /** Model capabilities */
  hasVision?: boolean;
  hasTools?: boolean;
  /** Brief description */
  description?: string;
  /** Size variants available */
  sizes?: string[];
  /** Tags for filtering/display */
  tags?: string[];
}

/**
 * Model library indexed by ID prefix for matching against discovered models
 * The key is matched as a prefix against the model filename (case-insensitive)
 */
export const ARK_SLM_MODEL_LIBRARY: Record<string, ArkSLMModelInfo> = {

  // === Meta Llama Models ===
  'llama-3.2-1b': {
    name: 'Llama 3.2 1B',
    provider: 'Meta',
    contextWindow: 131072,
    hasTools: true,
    description: 'Lightweight model for on-device and edge deployments',
    sizes: ['1B'],
    tags: ['fast', 'edge', 'multilingual'],
  },
  'llama-3.2-3b': {
    name: 'Llama 3.2 3B',
    provider: 'Meta',
    contextWindow: 131072,
    hasTools: true,
    description: 'Balanced performance for local inference',
    sizes: ['3B'],
    tags: ['balanced', 'edge', 'multilingual'],
  },
  'llama-3.1-8b': {
    name: 'Llama 3.1 8B',
    provider: 'Meta',
    contextWindow: 131072,
    hasTools: true,
    description: 'High-quality instruction-following model',
    sizes: ['8B'],
    tags: ['quality', 'instruction'],
  },

  // === Microsoft Phi Models ===
  'phi-3-mini': {
    name: 'Phi-3 Mini',
    provider: 'Microsoft',
    contextWindow: 4096,
    description: 'Highly capable small model, excellent reasoning',
    sizes: ['3.8B'],
    tags: ['reasoning', 'efficient', 'coding'],
  },
  'phi-3.5-mini': {
    name: 'Phi-3.5 Mini',
    provider: 'Microsoft',
    contextWindow: 128000,
    description: 'Extended context with strong performance',
    sizes: ['3.8B'],
    tags: ['reasoning', 'long-context'],
  },
  'phi-4-mini': {
    name: 'Phi-4 Mini',
    provider: 'Microsoft',
    contextWindow: 16384,
    hasTools: true,
    description: 'Latest generation with tool support',
    sizes: ['3.8B'],
    tags: ['reasoning', 'tools', 'coding'],
  },

  // === Alibaba Qwen Models ===
  'qwen2.5-0.5b': {
    name: 'Qwen 2.5 0.5B',
    provider: 'Alibaba',
    contextWindow: 32768,
    hasTools: true,
    description: 'Ultra-lightweight model',
    sizes: ['0.5B'],
    tags: ['tiny', 'fast', 'multilingual'],
  },
  'qwen2.5-1.5b': {
    name: 'Qwen 2.5 1.5B',
    provider: 'Alibaba',
    contextWindow: 32768,
    hasTools: true,
    description: 'Small yet capable model with tool support',
    sizes: ['1.5B'],
    tags: ['small', 'tools', 'multilingual'],
  },
  'qwen2.5-3b': {
    name: 'Qwen 2.5 3B',
    provider: 'Alibaba',
    contextWindow: 32768,
    hasTools: true,
    description: 'Balanced Qwen model for local use',
    sizes: ['3B'],
    tags: ['balanced', 'tools', 'multilingual'],
  },
  'qwen2.5-7b': {
    name: 'Qwen 2.5 7B',
    provider: 'Alibaba',
    contextWindow: 131072,
    hasTools: true,
    description: 'High-quality model with extended context',
    sizes: ['7B'],
    tags: ['quality', 'long-context', 'tools'],
  },
  'qwen2.5-coder': {
    name: 'Qwen 2.5 Coder',
    provider: 'Alibaba',
    contextWindow: 131072,
    hasTools: true,
    description: 'Specialized for code generation and editing',
    sizes: ['0.5B', '1.5B', '3B', '7B', '14B', '32B'],
    tags: ['coding', 'tools'],
  },

  // === Google Gemma Models ===
  'gemma-2b': {
    name: 'Gemma 2B',
    provider: 'Google',
    contextWindow: 8192,
    description: 'Lightweight model from Google',
    sizes: ['2B'],
    tags: ['small', 'efficient'],
  },
  'gemma-7b': {
    name: 'Gemma 7B',
    provider: 'Google',
    contextWindow: 8192,
    description: 'Larger Gemma with improved capabilities',
    sizes: ['7B'],
    tags: ['quality'],
  },
  'gemma2-2b': {
    name: 'Gemma 2 2B',
    provider: 'Google',
    contextWindow: 8192,
    description: 'Second generation Gemma, improved efficiency',
    sizes: ['2B'],
    tags: ['efficient', 'improved'],
  },
  'gemma2-9b': {
    name: 'Gemma 2 9B',
    provider: 'Google',
    contextWindow: 8192,
    description: 'Larger second-gen Gemma',
    sizes: ['9B'],
    tags: ['quality'],
  },
  'gemma3': {
    name: 'Gemma 3',
    provider: 'Google',
    contextWindow: 8192,
    hasVision: true,
    description: 'Third generation with vision capabilities',
    sizes: ['270M', '1B', '4B', '12B', '27B'],
    tags: ['multimodal', 'vision'],
  },

  // === Mistral Models ===
  'mistral-7b': {
    name: 'Mistral 7B',
    provider: 'Mistral AI',
    contextWindow: 32768,
    hasTools: true,
    description: 'Efficient and powerful 7B model',
    sizes: ['7B'],
    tags: ['quality', 'efficient'],
  },
  'mistral-nemo': {
    name: 'Mistral Nemo',
    provider: 'Mistral AI',
    contextWindow: 128000,
    hasTools: true,
    description: '12B model with extended context',
    sizes: ['12B'],
    tags: ['long-context', 'tools'],
  },

  // === DeepSeek Models ===
  'deepseek-coder': {
    name: 'DeepSeek Coder',
    provider: 'DeepSeek',
    contextWindow: 16384,
    description: 'Specialized coding model',
    sizes: ['1.3B', '6.7B', '33B'],
    tags: ['coding'],
  },
  'deepseek-r1': {
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    contextWindow: 65536,
    hasTools: true,
    description: 'Reasoning-focused distilled models',
    sizes: ['1.5B', '7B', '8B', '14B', '32B', '70B', '671B'],
    tags: ['reasoning', 'thinking'],
  },

  // === Hugging Face SmolLM ===
  'smollm': {
    name: 'SmolLM',
    provider: 'Hugging Face',
    contextWindow: 2048,
    description: 'Ultra-compact models for edge devices',
    sizes: ['135M', '360M', '1.7B'],
    tags: ['tiny', 'edge'],
  },
  'smollm2': {
    name: 'SmolLM 2',
    provider: 'Hugging Face',
    contextWindow: 8192,
    hasTools: true,
    description: 'Improved compact models with tool support',
    sizes: ['135M', '360M', '1.7B'],
    tags: ['tiny', 'edge', 'tools'],
  },

  // === TinyLlama ===
  'tinyllama': {
    name: 'TinyLlama',
    provider: 'TinyLlama',
    contextWindow: 2048,
    description: 'Compact 1.1B model for fast inference',
    sizes: ['1.1B'],
    tags: ['tiny', 'fast'],
  },

  // === StableLM ===
  'stablelm': {
    name: 'StableLM',
    provider: 'Stability AI',
    contextWindow: 4096,
    description: 'Stable and reliable small models',
    sizes: ['1.6B', '3B'],
    tags: ['stable', 'efficient'],
  },
  'stablelm2': {
    name: 'StableLM 2',
    provider: 'Stability AI',
    contextWindow: 4096,
    description: 'Improved stability and performance',
    sizes: ['1.6B', '12B'],
    tags: ['stable', 'improved'],
  },

  // === OpenCoder ===
  'opencoder': {
    name: 'OpenCoder',
    provider: 'OpenCoder',
    contextWindow: 8192,
    description: 'Open-source code generation model',
    sizes: ['1.5B', '8B'],
    tags: ['coding', 'open-source'],
  },

  // === Yi Models ===
  'yi-1.5': {
    name: 'Yi 1.5',
    provider: '01.AI',
    contextWindow: 4096,
    description: 'Bilingual (Chinese-English) model',
    sizes: ['6B', '9B', '34B'],
    tags: ['bilingual', 'chinese'],
  },
  'yi-coder': {
    name: 'Yi Coder',
    provider: '01.AI',
    contextWindow: 131072,
    description: 'Code-specialized Yi model',
    sizes: ['1.5B', '9B'],
    tags: ['coding', 'long-context'],
  },

  // === Falcon Models ===
  'falcon': {
    name: 'Falcon',
    provider: 'TII',
    contextWindow: 2048,
    description: 'Technology Innovation Institute models',
    sizes: ['7B', '40B', '180B'],
    tags: ['tii'],
  },
  'falcon3': {
    name: 'Falcon 3',
    provider: 'TII',
    contextWindow: 32768,
    description: 'Latest Falcon generation',
    sizes: ['1B', '3B', '7B', '10B'],
    tags: ['tii', 'improved'],
  },

  // === IBM Granite Models ===
  'granite': {
    name: 'Granite',
    provider: 'IBM',
    contextWindow: 8192,
    hasTools: true,
    description: 'IBM enterprise-ready models',
    sizes: ['3B', '8B', '20B', '34B'],
    tags: ['enterprise', 'coding'],
  },
  'granite3': {
    name: 'Granite 3',
    provider: 'IBM',
    contextWindow: 128000,
    hasTools: true,
    description: 'Latest Granite with extended context',
    sizes: ['2B', '8B'],
    tags: ['enterprise', 'tools', 'long-context'],
  },

  // === Distilled/Custom Models (Ark-SLM trained) ===
  'ark-custom': {
    name: 'Ark Custom Model',
    provider: 'ABOV3',
    contextWindow: 4096,
    description: 'Custom model trained via ABOV3 Eden',
    tags: ['custom', 'distilled'],
  },
  'eden-distilled': {
    name: 'Eden Distilled',
    provider: 'ABOV3',
    contextWindow: 4096,
    description: 'Model distilled using ABOV3 Eden',
    tags: ['custom', 'distilled', 'specialized'],
  },
};

/**
 * Find model info by matching the model ID against the library
 * @param modelId - The model ID/filename to match
 * @returns The matched model info or undefined if no match
 */
export function findModelInfo(modelId: string): ArkSLMModelInfo | undefined {
  const lowerModelId = modelId.toLowerCase();

  // Try exact prefix matches first (longer prefixes take priority)
  const sortedKeys = Object.keys(ARK_SLM_MODEL_LIBRARY).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (lowerModelId.includes(key.toLowerCase())) {
      return ARK_SLM_MODEL_LIBRARY[key];
    }
  }

  return undefined;
}

/**
 * Get a formatted description for a model
 * @param modelId - The model ID
 * @param modelInfo - Optional pre-fetched model info
 * @returns Formatted description string
 */
export function getModelDescription(modelId: string, modelInfo?: ArkSLMModelInfo): string {
  const info = modelInfo || findModelInfo(modelId);
  if (!info) return 'Custom SLM';

  const parts: string[] = [];

  if (info.provider) parts.push(info.provider);
  if (info.description) parts.push(info.description);

  const capabilities: string[] = [];
  if (info.hasVision) capabilities.push('Vision');
  if (info.hasTools) capabilities.push('Tools');
  if (capabilities.length > 0) parts.push(`[${capabilities.join(', ')}]`);

  return parts.join(' | ') || 'Custom SLM';
}

/**
 * Get the context window for a model
 * @param modelId - The model ID
 * @returns Context window size or default
 */
export function getModelContextWindow(modelId: string): number {
  const info = findModelInfo(modelId);
  return info?.contextWindow ?? 4096;
}

/**
 * Check if a model has tool/function calling support
 * @param modelId - The model ID
 * @returns True if the model supports tools
 */
export function modelHasTools(modelId: string): boolean {
  const info = findModelInfo(modelId);
  return info?.hasTools ?? false;
}

/**
 * Check if a model has vision capabilities
 * @param modelId - The model ID
 * @returns True if the model supports vision
 */
export function modelHasVision(modelId: string): boolean {
  const info = findModelInfo(modelId);
  return info?.hasVision ?? false;
}

// Last update date for this model library
export const ARK_SLM_MODELS_LAST_UPDATE = '20260121';
