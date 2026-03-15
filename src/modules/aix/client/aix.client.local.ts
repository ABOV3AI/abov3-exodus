/**
 * Client-side local model request handler for direct browser-to-localhost communication.
 *
 * This module enables secure local model inference by bypassing the server for localhost endpoints.
 * When users configure local models (Ollama, LocalAI, LM Studio), requests go directly from
 * browser to their local machine instead of through the cloud server.
 *
 * Security benefits:
 * - No prompts/responses transmitted to cloud server
 * - Prevents SSRF attacks on server infrastructure
 * - Zero server cost for local inference
 *
 * Requirements:
 * - Local model server must have CORS enabled
 * - Browser must be able to reach localhost (same machine or network)
 */

import type { AixAPI_Access } from '../server/api/aix.wiretypes';
import { isLocalEndpoint } from '~/server/trpc/trpc.router.fetchers';


/**
 * Extracts the endpoint URL from an AixAPI_Access object.
 * Different vendors store endpoints in different fields.
 */
export function getEndpointFromAccess(access: AixAPI_Access): string | null {
  switch (access.dialect) {
    case 'ollama':
      return access.ollamaHost;

    case 'ark-slm':
      return access.arkSLMHost;

    case 'openai':
      // LocalAI and LM Studio use OpenAI-compatible endpoints
      // The baseURL field is optional for OpenAI but required for LocalAI/LM Studio
      if (access.oaiHost) {
        return access.oaiHost;
      }
      // Standard OpenAI uses cloud endpoints
      return null;

    case 'abov3':
    case 'anthropic':
    case 'gemini':
      // Cloud-only providers
      return null;

    default:
      return null;
  }
}


/**
 * Checks if an AixAPI_Access object points to a local endpoint.
 * Used to determine if requests should bypass the server.
 */
export function isAccessLocal(access: AixAPI_Access): boolean {
  const endpoint = getEndpointFromAccess(access);
  if (!endpoint) return false;

  return isLocalEndpoint(endpoint);
}


/**
 * Validates that a local model server has CORS enabled.
 * Makes a preflight OPTIONS request to check CORS headers.
 */
async function validateCORS(endpoint: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
    const allowMethods = response.headers.get('Access-Control-Allow-Methods');

    if (!allowOrigin || (allowOrigin !== '*' && allowOrigin !== window.location.origin)) {
      return {
        allowed: false,
        error: `CORS not enabled. Access-Control-Allow-Origin must be '*' or '${window.location.origin}'`,
      };
    }

    if (!allowMethods || !allowMethods.includes('POST')) {
      return {
        allowed: false,
        error: 'CORS not configured for POST requests',
      };
    }

    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      error: `Cannot reach endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}


/**
 * Generates a user-friendly error message with CORS setup instructions.
 */
export function getCORSSetupInstructions(vendor: AixAPI_Access['dialect'], endpoint: string): string {
  const baseMessage = `**Local model connection failed**: Your ${vendor} server at \`${endpoint}\` needs CORS enabled to accept requests from your browser.\n\n`;

  switch (vendor) {
    case 'ollama':
      return baseMessage +
        `**Ollama CORS Setup:**\n` +
        `1. Set environment variable: \`OLLAMA_ORIGINS=*\`\n` +
        `2. Restart Ollama\n` +
        `3. Verify with: \`curl -H "Origin: ${window.location.origin}" -X OPTIONS ${endpoint}\`\n\n` +
        `**macOS/Linux:**\n` +
        `\`\`\`bash\n` +
        `export OLLAMA_ORIGINS="*"\n` +
        `ollama serve\n` +
        `\`\`\`\n\n` +
        `**Windows PowerShell:**\n` +
        `\`\`\`powershell\n` +
        `$env:OLLAMA_ORIGINS="*"\n` +
        `ollama serve\n` +
        `\`\`\`\n\n` +
        `**Docker:**\n` +
        `\`\`\`yaml\n` +
        `environment:\n` +
        `  - OLLAMA_ORIGINS=*\n` +
        `\`\`\``;

    case 'ark-slm':
      return baseMessage +
        `**Ark-SLM CORS Setup:**\n` +
        `1. Edit Ark-SLM config to allow CORS\n` +
        `2. Add \`Access-Control-Allow-Origin: *\` header\n` +
        `3. Restart the Ark-SLM server`;

    case 'openai':
      return baseMessage +
        `**LocalAI/LM Studio CORS Setup:**\n` +
        `- **LocalAI**: Add \`--cors\` flag when starting the server\n` +
        `- **LM Studio**: CORS is enabled by default on localhost\n` +
        `\n` +
        `**LocalAI Example:**\n` +
        `\`\`\`bash\n` +
        `./local-ai --cors --address 0.0.0.0:8080\n` +
        `\`\`\``;

    default:
      return baseMessage +
        `Please refer to your local model server's documentation for CORS setup instructions.`;
  }
}


/**
 * Checks if local model inference is supported in the current environment.
 * Cloud deployments should disable local model routing for security.
 */
export function isLocalModelSupportEnabled(): boolean {
  // Check if we're in a cloud deployment
  // In cloud mode, local models should be disabled for security
  const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE;

  if (deploymentMode === 'cloud') {
    return false;
  }

  // In local/development mode (or undefined), local models are supported
  return true;
}


/**
 * Gets a user-friendly message explaining why local models aren't available.
 */
export function getLocalModelUnavailableMessage(): string {
  return `**Local models not supported in cloud deployment**

For security reasons, ABOV3 Exodus cloud deployment does not support localhost endpoints.

**Options:**
1. **Use cloud LLM providers** - OpenAI, Anthropic, Google Gemini, etc.
2. **Self-host Exodus** - Run Exodus on your own machine for local model support
3. **Expose via tunnel** - Use ngrok or CloudFlare Tunnel to expose your local model server:
   \`\`\`bash
   # Example with ngrok
   ngrok http 11434
   # Then use the ngrok URL (e.g., https://abc123.ngrok.io) as your Ollama endpoint
   \`\`\`

**Why?** Allowing localhost endpoints on a cloud server creates a security vulnerability where the server could be tricked into accessing internal services (SSRF attack).`;
}
