/**
 * ABOV3 Ark-SLM Vendor
 * Local SLM inference server powered by llama.cpp
 */

import { apiAsync } from '~/common/util/trpc.client';

import type { IModelVendor } from '../IModelVendor';
import type { ArkSLMAccessSchema } from '../../server/ark-slm/ark-slm.router';


export interface DArkSLMServiceSettings {
  arkSLMHost: string;
}


export const ModelVendorArkSLM: IModelVendor<DArkSLMServiceSettings, ArkSLMAccessSchema> = {
  id: 'ark-slm',
  name: 'ABOV3 Ark-SLM',
  displayRank: 52, // Just above local models
  location: 'local',
  instanceLimit: 1, // Single instance - one server

  // Functions
  getTransportAccess: (partialSetup): ArkSLMAccessSchema => ({
    dialect: 'ark-slm',
    arkSLMHost: partialSetup?.arkSLMHost || 'http://127.0.0.1:3200',
  }),

  // List Models
  rpcUpdateModelsOrThrow: async (access) => await apiAsync.llmArkSLM.listModels.query({ access }),

};
