import { apiAsync } from '~/common/util/trpc.client';

import type { ABOV3AccessSchema } from '../../server/abov3/abov3.router';
import type { IModelVendor } from '../IModelVendor';


// special symbols
export const isValidABOV3ApiKey = (apiKey?: string) => !!apiKey && (apiKey.startsWith('sk-') ? apiKey.length >= 39 : apiKey.length > 1);

interface DABOV3ServiceSettings {
  abov3Key: string;
  abov3Host: string;
  heliconeKey: string;
  // OAuth credentials for Pro/Max users
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: number;
}

export const ModelVendorABOV3: IModelVendor<DABOV3ServiceSettings, ABOV3AccessSchema> = {
  id: 'abov3',
  name: 'ABOV3',
  displayRank: 1,
  location: 'cloud',
  brandColor: '#0066cc',
  instanceLimit: 1,
  hasServerConfigKey: 'hasLlmAbov3',

  // functions
  getTransportAccess: (partialSetup): ABOV3AccessSchema => ({
    dialect: 'abov3',
    abov3Key: partialSetup?.abov3Key || '',
    abov3Host: partialSetup?.abov3Host || null,
    heliconeKey: partialSetup?.heliconeKey || null,
    // Pass OAuth credentials if available
    oauthAccessToken: partialSetup?.oauthAccessToken || null,
    oauthRefreshToken: partialSetup?.oauthRefreshToken || null,
    oauthExpiresAt: partialSetup?.oauthExpiresAt || null,
  }),


  // List Models
  rpcUpdateModelsOrThrow: async (access) => await apiAsync.llmAbov3.listModels.query({ access }),

};
