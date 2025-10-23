import { apiAsync } from '~/common/util/trpc.client';

import type { AnthropicAccessSchema } from '../../server/anthropic/anthropic.router';
import type { IModelVendor } from '../IModelVendor';


// special symbols
export const isValidAnthropicApiKey = (apiKey?: string) => !!apiKey && (apiKey.startsWith('sk-') ? apiKey.length >= 39 : apiKey.length > 1);

interface DAnthropicServiceSettings {
  anthropicKey: string;
  anthropicHost: string;
  heliconeKey: string;
  // OAuth credentials for Pro/Max users
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: number;
}

export const ModelVendorAnthropic: IModelVendor<DAnthropicServiceSettings, AnthropicAccessSchema> = {
  id: 'anthropic',
  name: 'Anthropic',
  displayRank: 12,
  location: 'cloud',
  brandColor: '#cc785c',
  instanceLimit: 1,
  hasServerConfigKey: 'hasLlmAnthropic',

  // functions
  getTransportAccess: (partialSetup): AnthropicAccessSchema => ({
    dialect: 'anthropic',
    anthropicKey: partialSetup?.anthropicKey || '',
    anthropicHost: partialSetup?.anthropicHost || null,
    heliconeKey: partialSetup?.heliconeKey || null,
    // Pass OAuth credentials if available
    oauthAccessToken: partialSetup?.oauthAccessToken || null,
    oauthRefreshToken: partialSetup?.oauthRefreshToken || null,
    oauthExpiresAt: partialSetup?.oauthExpiresAt || null,
  }),


  // List Models
  rpcUpdateModelsOrThrow: async (access) => await apiAsync.llmAnthropic.listModels.query({ access }),

};
