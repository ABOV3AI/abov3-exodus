/**
 * ABOV3 ARK Cloud Model Definitions
 *
 * Defines the 4 ABOV3-branded models available through ARK Cloud:
 * - Genesis, Exodus, Elohim, Solomon (with identity protocol)
 *
 * Additional Ollama models are fetched dynamically from the API.
 */

import { LLM_IF_OAI_Chat, LLM_IF_OAI_Fn, LLM_IF_OAI_Reasoning } from '~/common/stores/llms/llms.types';

import type { ModelDescriptionSchema } from '../../server/llm.server.types';


/**
 * ABOV3 ARK Cloud Models
 *
 * Hierarchy (most capable to most efficient):
 * - Genesis 2.1: Flagship (qwen3-coder:480b) - largest coding model
 * - Exodus 2.1: Workhorse (qwen3.5:397b) - large general model
 * - Elohim 2.1: Reasoning (gpt-oss:120b) - deep reasoning + agentic
 * - Solomon 2.1: Efficient (gpt-oss:20b) - fast inference with tools
 *
 * Note: GPT-OSS models (Elohim, Solomon) have confirmed native Ollama tool calling support.
 * Qwen3 models (Genesis, Exodus) being tested for tool calling.
 */
export const arkCloudModels: ModelDescriptionSchema[] = [

  // === ABOV3 Branded Models (ordered by hierarchy) ===

  {
    id: 'genesis',
    label: 'ABOV3-Genesis 2.1',
    description: 'Flagship — largest model with full capabilities',
    contextWindow: 128000,
    maxCompletionTokens: 16384,
    interfaces: [LLM_IF_OAI_Chat, LLM_IF_OAI_Fn, LLM_IF_OAI_Reasoning],
    chatPrice: { input: 'free', output: 'free' },
    defaultUserToolsEnabled: true,  // Enable MCP/tools by default for ABOV3 models
  },
  {
    id: 'exodus',
    label: 'ABOV3-Exodus 2.1',
    description: 'Workhorse — coding specialist with tools',
    contextWindow: 128000,
    maxCompletionTokens: 16384,
    interfaces: [LLM_IF_OAI_Chat, LLM_IF_OAI_Fn, LLM_IF_OAI_Reasoning],
    chatPrice: { input: 'free', output: 'free' },
    defaultUserToolsEnabled: true,  // Enable MCP/tools by default for ABOV3 models
  },
  {
    id: 'elohim',
    label: 'ABOV3-Elohim 2.1',
    description: 'Reasoning — deep reasoning + agentic capabilities',
    contextWindow: 128000,
    maxCompletionTokens: 16384,
    interfaces: [LLM_IF_OAI_Chat, LLM_IF_OAI_Fn, LLM_IF_OAI_Reasoning],
    chatPrice: { input: 'free', output: 'free' },
    defaultUserToolsEnabled: true,  // Enable MCP/tools by default for ABOV3 models
  },
  {
    id: 'solomon',
    label: 'ABOV3-Solomon 2.1',
    description: 'Efficient — fast inference with tools',
    contextWindow: 32000,
    maxCompletionTokens: 8192,
    interfaces: [LLM_IF_OAI_Chat, LLM_IF_OAI_Fn],
    chatPrice: { input: 'free', output: 'free' },
    defaultUserToolsEnabled: true,  // Enable MCP/tools by default for ABOV3 models
  },

];
