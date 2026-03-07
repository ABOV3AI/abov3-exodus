/**
 * ABOV3 Ark-SLM Router
 * Communicates with the local Ark-SLM inference server
 */

import * as z from 'zod/v4';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';
import { fetchJsonOrTRPCThrow } from '~/server/trpc/trpc.router.fetchers';

import { LLM_IF_OAI_Chat, LLM_IF_OAI_Vision, LLM_IF_OAI_Fn } from '~/common/stores/llms/llms.types';

import { ListModelsResponse_schema } from '../llm.server.types';
import { findModelInfo, getModelDescription, getModelContextWindow } from './ark-slm.models';


// Default host for Ark-SLM
const DEFAULT_ARK_SLM_HOST = 'http://127.0.0.1:3200';


// Ark-SLM API Response Types
interface ArkSLMModel {
  id: string;
  name: string;
  loaded: boolean;
  contextLength?: number;
  sizeBytes?: number;
}

interface ArkSLMModelsResponse {
  object: string;
  data: ArkSLMModel[];
}

interface ArkSLMStatusResponse {
  loaded: boolean;
  current_model: {
    id: string;
    name: string;
    context_length: number;
    path: string;
  } | null;
  available_models: number;
}


// Helper to build request - exported for use by AIX dispatch
export function arkSLMAccess(access: ArkSLMAccessSchema, apiPath: string): { headers: HeadersInit; url: string } {
  const host = access.arkSLMHost || DEFAULT_ARK_SLM_HOST;
  const normalizedHost = host.endsWith('/') ? host.slice(0, -1) : host;

  return {
    headers: {
      'Content-Type': 'application/json',
    },
    url: normalizedHost + apiPath,
  };
}


async function arkSLMGET<TOut extends object>(access: ArkSLMAccessSchema, apiPath: string): Promise<TOut> {
  const { headers, url } = arkSLMAccess(access, apiPath);
  return await fetchJsonOrTRPCThrow<TOut>({ url, headers, name: 'ArkSLM' });
}

async function arkSLMPOST<TOut extends object, TPostBody extends object>(
  access: ArkSLMAccessSchema,
  body: TPostBody,
  apiPath: string,
): Promise<TOut> {
  const { headers, url } = arkSLMAccess(access, apiPath);
  return await fetchJsonOrTRPCThrow<TOut, TPostBody>({ url, method: 'POST', headers, body, name: 'ArkSLM' });
}


// Input/Output Schemas

export const arkSLMAccessSchema = z.object({
  dialect: z.enum(['ark-slm']),
  arkSLMHost: z.string().trim(),
});
export type ArkSLMAccessSchema = z.infer<typeof arkSLMAccessSchema>;

const accessOnlySchema = z.object({
  access: arkSLMAccessSchema,
});

const loadModelSchema = z.object({
  access: arkSLMAccessSchema,
  modelId: z.string(),
});


export const llmArkSLMRouter = createTRPCRouter({

  /* Ark-SLM: Get server status */
  getStatus: publicProcedure
    .input(accessOnlySchema)
    .query(async ({ input }) => {
      try {
        const status = await arkSLMGET<ArkSLMStatusResponse>(input.access, '/models/status');
        return {
          online: true,
          loaded: status.loaded,
          currentModel: status.current_model,
          availableModels: status.available_models,
        };
      } catch (error) {
        return {
          online: false,
          loaded: false,
          currentModel: null,
          availableModels: 0,
        };
      }
    }),

  /* Ark-SLM: List available models */
  listModels: publicProcedure
    .input(accessOnlySchema)
    .output(ListModelsResponse_schema)
    .query(async ({ input }) => {
      // Get models from Ark-SLM
      const wireModels = await arkSLMGET<ArkSLMModelsResponse>(input.access, '/v1/models');

      return {
        models: wireModels.data.map(model => {
          // Look up model info from library for enriched metadata
          const modelInfo = findModelInfo(model.id);
          const modelDescription = getModelDescription(model.id, modelInfo);

          // Build interfaces list based on model capabilities
          const interfaces = [LLM_IF_OAI_Chat];
          if (modelInfo?.hasVision) interfaces.push(LLM_IF_OAI_Vision);
          if (modelInfo?.hasTools) interfaces.push(LLM_IF_OAI_Fn);

          // Build description with status
          const statusPrefix = model.loaded ? 'Loaded' : 'Available';
          const sizeInfo = model.sizeBytes ? `${(model.sizeBytes / 1024 / 1024 / 1024).toFixed(1)} GB` : '';
          const contextInfo = model.contextLength ? `${model.contextLength.toLocaleString()} ctx` : '';
          const statusParts = [statusPrefix, sizeInfo, contextInfo].filter(Boolean);
          const fullDescription = `${statusParts.join(' | ')}${modelDescription !== 'Custom SLM' ? ` | ${modelDescription}` : ''}`;

          return {
            id: model.id,
            label: modelInfo?.name || model.name || model.id,
            description: fullDescription,
            contextWindow: model.contextLength || getModelContextWindow(model.id),
            interfaces,
            hidden: !model.loaded, // Hide unloaded models by default
          };
        }),
      };
    }),

  /* Ark-SLM: Load a model */
  loadModel: publicProcedure
    .input(loadModelSchema)
    .mutation(async ({ input }) => {
      const result = await arkSLMPOST<{ success: boolean; model?: unknown }, { model_id: string }>(
        input.access,
        { model_id: input.modelId },
        '/models/load',
      );
      return { success: result.success };
    }),

  /* Ark-SLM: Unload current model */
  unloadModel: publicProcedure
    .input(accessOnlySchema)
    .mutation(async ({ input }) => {
      const result = await arkSLMPOST<{ success: boolean; message?: string }, Record<string, never>>(
        input.access,
        {},
        '/models/unload',
      );
      return { success: result.success, message: result.message };
    }),

  /* Ark-SLM: Refresh/discover models */
  refreshModels: publicProcedure
    .input(accessOnlySchema)
    .mutation(async ({ input }) => {
      const result = await arkSLMPOST<{ success: boolean; models_found: number }, Record<string, never>>(
        input.access,
        {},
        '/models/refresh',
      );
      return { success: result.success, modelsFound: result.models_found };
    }),

});
