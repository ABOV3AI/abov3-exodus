import type { ModelVendorId } from './vendors.registry';
import { findModelVendor } from './vendors.registry';


/**
 * Map AIX dialect to ModelVendorId
 * Dialects are used in AixAPI_Access.dialect
 */
export function dialectToVendorId(dialect: string | undefined | null): ModelVendorId | null {
  if (!dialect) return null;

  // Map known dialects to vendor IDs
  const dialectMap: Record<string, ModelVendorId> = {
    'abov3': 'abov3',
    'anthropic': 'anthropic',
    'gemini': 'googleai',
    'ollama': 'ollama',
    'openai': 'openai',
    'localai': 'localai',
    'lmstudio': 'lmstudio',
    'mistral': 'mistral',
    'groq': 'groq',
    'perplexity': 'perplexity',
    'togetherai': 'togetherai',
    'deepseek': 'deepseek',
    'azure': 'azure',
    'openrouter': 'openrouter',
    'openpipe': 'openpipe',
    'xai': 'xai',
    'alibaba': 'alibaba',
  };

  return dialectMap[dialect] || null;
}


/**
 * Check if a vendor is ABOV3
 * ABOV3 models are immune to network mode restrictions
 */
export function isVendorABOV3(vendorId: ModelVendorId | undefined | null): boolean {
  return vendorId === 'abov3';
}


/**
 * Check if a dialect is ABOV3
 */
export function isDialectABOV3(dialect: string | undefined | null): boolean {
  return dialect === 'abov3';
}


/**
 * Check if a vendor is local (runs on user's machine)
 * Local vendors: ollama, localai, lmstudio
 */
export function isVendorLocal(vendorId: ModelVendorId | undefined | null): boolean {
  if (!vendorId) return false;

  const vendor = findModelVendor(vendorId);
  if (!vendor) return false;

  return vendor.location === 'local';
}


/**
 * Check if a vendor is allowed to make API calls in air-gapped mode
 * Allowed vendors:
 * - ABOV3 (immune to network restrictions)
 * - Local vendors (ollama, localai, lmstudio)
 */
export function isVendorAllowedInAirGapped(vendorId: ModelVendorId | undefined | null): boolean {
  // ABOV3 is always allowed (immune)
  if (isVendorABOV3(vendorId)) {
    return true;
  }

  // Local vendors are allowed
  if (isVendorLocal(vendorId)) {
    return true;
  }

  // All other cloud vendors are blocked in air-gapped mode
  return false;
}


/**
 * Get a user-friendly error message for blocked vendors in air-gapped mode
 */
export function getAirGappedBlockedMessage(vendorId: ModelVendorId | undefined | null): string {
  const vendor = vendorId ? findModelVendor(vendorId) : null;
  const vendorName = vendor?.name || 'This model';

  return `Network Mode: Air-Gapped - ${vendorName} requires internet access. Switch to Online mode or use ABOV3 models (Genesis, Exodus, Solomon) or local models (Ollama, LocalAI, LMStudio).`;
}
