/**
 * Training Executor
 *
 * Orchestrates the training workflow by calling ABOV3 Eden MCP tools.
 * Handles the full pipeline: data generation -> training -> export -> deployment
 */

import { getMCPRuntime } from '~/modules/mcp/mcp.runtime';
import { findLLMOrThrow, findModelsServiceOrNull, llmsStoreState } from '~/common/stores/llms/store-llms';
import type { DModelsService } from '~/common/stores/llms/llms.service.types';
import type { ModelVendorId } from '~/modules/llms/vendors/vendors.registry';

import { trainingActions } from './store-training';
import type {
  TeacherModelCredentials,
  EdenDeployToArkParams,
  EdenDistillModelParams,
  EdenEvaluateModelParams,
  EdenExportGGUFParams,
  EdenGenerateDataParams,
  EdenTrainLoRAParams,
  EdenValidateDatasetParams,
  TrainingJob,
} from './training.types';


// === OAuth Debugging ===

interface OAuthDebugInfo {
  summary: string;
  services: {
    id: string;
    vId: string;
    hasOAuth: boolean;
    hasApiKey: boolean;
    setupKeys: string;
    oauthExpiry?: string;
  }[];
}

/**
 * Debug function to check OAuth status across all services
 * Returns structured data for logging
 */
export function debugOAuthStatusWithReturn(): OAuthDebugInfo {
  const { sources } = llmsStoreState();
  console.log(`[Training Debug] Total services: ${sources.length}`);

  const result: OAuthDebugInfo = {
    summary: `${sources.length} services found`,
    services: [],
  };

  let hasAnyOAuth = false;
  let hasAnyABOV3 = false;

  for (const service of sources) {
    const setup = service.setup || {};
    const setupObj = setup as Record<string, unknown>;
    const hasOAuth = !!setupObj.oauthAccessToken;
    const hasApiKey = !!setupObj.abov3Key || !!setupObj.anthropicKey || !!setupObj.oaiKey;

    console.log(`[Training Debug] Service: id=${service.id}, vId=${service.vId}, hasOAuth=${hasOAuth}, hasApiKey=${hasApiKey}`);

    if (service.vId === 'abov3') hasAnyABOV3 = true;
    if (hasOAuth) hasAnyOAuth = true;

    const serviceInfo = {
      id: service.id,
      vId: service.vId,
      hasOAuth,
      hasApiKey,
      setupKeys: Object.keys(setup).join(', ') || 'empty',
      oauthExpiry: undefined as string | undefined,
    };

    if (service.vId === 'abov3' || service.vId === 'anthropic') {
      console.log(`[Training Debug]   -> Setup keys: ${serviceInfo.setupKeys}`);
      if (setupObj.oauthAccessToken) {
        console.log(`[Training Debug]   -> OAuth token present (length=${(setupObj.oauthAccessToken as string).length})`);
      }
      if (setupObj.oauthExpiresAt) {
        const expires = new Date(setupObj.oauthExpiresAt as number);
        const isExpired = Date.now() > (setupObj.oauthExpiresAt as number);
        serviceInfo.oauthExpiry = `${expires.toISOString()} (${isExpired ? 'EXPIRED' : 'valid'})`;
        console.log(`[Training Debug]   -> OAuth expires: ${serviceInfo.oauthExpiry}`);
      }
    }

    result.services.push(serviceInfo);
  }

  // Update summary
  result.summary = `${sources.length} services, ABOV3=${hasAnyABOV3}, OAuth=${hasAnyOAuth}`;

  return result;
}

/**
 * Legacy version that just logs (for backwards compatibility)
 */
export function debugOAuthStatus(): void {
  debugOAuthStatusWithReturn();
}

// === Eden MCP Tool Names ===
// Tool names follow pattern: mcp_{serverName}_{toolName}
// Server name varies based on how Eden is registered (e.g., "Eden", "abov3-eden", "eden")

// Tool name variations to try (with and without eden_ prefix)
const EDEN_TOOL_VARIATIONS = {
  GENERATE_DATA: ['eden_generate_data', 'generate_data', 'generateData', 'generate-data'],
  VALIDATE_DATASET: ['eden_validate_dataset', 'validate_dataset', 'validateDataset', 'validate-dataset'],
  DISTILL_MODEL: ['eden_distill_model', 'distill_model', 'distillModel', 'distill-model'],
  TRAIN_LORA: ['eden_train_lora', 'train_lora', 'trainLora', 'train-lora'],
  EVALUATE_MODEL: ['eden_evaluate_model', 'evaluate_model', 'evaluateModel', 'evaluate-model'],
  EXPORT_GGUF: ['eden_export_gguf', 'export_gguf', 'exportGguf', 'export-gguf'],
  DEPLOY_TO_ARK: ['eden_deploy_to_ark', 'deploy_to_ark', 'deployToArk', 'deploy-to-ark'],
};

// For backwards compatibility
const EDEN_TOOL_NAMES = {
  GENERATE_DATA: 'eden_generate_data',
  VALIDATE_DATASET: 'eden_validate_dataset',
  DISTILL_MODEL: 'eden_distill_model',
  TRAIN_LORA: 'eden_train_lora',
  EVALUATE_MODEL: 'eden_evaluate_model',
  EXPORT_GGUF: 'eden_export_gguf',
  DEPLOY_TO_ARK: 'eden_deploy_to_ark',
};

// Common server name patterns to try (order matters - most likely first)
const EDEN_SERVER_PATTERNS = ['Eden', 'eden', 'abov3-eden', 'ABOV3-Eden', 'abov3_eden', 'ABOV3_Eden'];


// === Credential Extraction ===

/**
 * Maps vendor IDs to TeacherModelCredentials provider types
 */
function mapVendorToProvider(vendorId: ModelVendorId): TeacherModelCredentials['provider'] {
  switch (vendorId) {
    case 'openai':
      return 'openai';
    case 'anthropic':
      return 'anthropic';
    case 'ollama':
      return 'ollama';
    case 'openrouter':
      return 'openrouter';
    case 'azure':
      return 'azure';
    case 'abov3':
      return 'abov3';
    case 'mistral':
      return 'mistral';
    case 'groq':
      return 'groq';
    case 'deepseek':
      return 'deepseek';
    case 'googleai':
      return 'gemini';
    default:
      return 'other';
  }
}

/**
 * Extract teacher model credentials from the LLM store
 * This retrieves the API key and endpoint configuration for a given model
 */
export function getTeacherModelCredentials(teacherModelId: string): TeacherModelCredentials | null {
  try {
    // Find the LLM in the store
    const llm = findLLMOrThrow(teacherModelId);
    console.log(`[Training] Found LLM: id=${llm.id}, sId=${llm.sId}, vId=${llm.vId}`);

    const service = findModelsServiceOrNull<Record<string, unknown>>(llm.sId);

    if (!service) {
      console.warn(`[Training] Service not found for model ${teacherModelId} (serviceId=${llm.sId})`);
      return null;
    }

    console.log(`[Training] Found service: id=${service.id}, vId=${service.vId}, label=${service.label || 'no label'}`);

    const setup = service.setup || {};
    const provider = mapVendorToProvider(llm.vId);

    // Debug: Log available setup keys and check for OAuth
    const setupKeys = Object.keys(setup);
    console.log(`[Training] Service ${service.id} (vendor=${llm.vId}) setup keys:`, setupKeys);

    // Explicitly check for oauth-related keys
    const oauthKeys = setupKeys.filter(k => k.toLowerCase().includes('oauth') || k.toLowerCase().includes('token'));
    if (oauthKeys.length > 0) {
      console.log(`[Training] Found OAuth-related keys: ${oauthKeys.join(', ')}`);
      // Log presence of values (not the actual values)
      for (const key of oauthKeys) {
        console.log(`[Training]   - ${key}: ${typeof setup[key]} ${setup[key] ? '(has value)' : '(empty)'}`);
      }
    } else {
      console.warn(`[Training] No OAuth-related keys found in setup! Available keys: ${setupKeys.join(', ') || 'none'}`);
    }

    // Build credentials based on vendor type
    const credentials: TeacherModelCredentials = {
      provider,
      modelId: llm.id, // Use the full LLM ID which includes the model reference
    };

    // Extract vendor-specific credentials
    switch (llm.vId) {
      case 'openai':
        credentials.apiKey = setup.oaiKey as string || undefined;
        if (setup.oaiHost) credentials.baseUrl = setup.oaiHost as string;
        if (setup.oaiOrg) credentials.organizationId = setup.oaiOrg as string;
        if (setup.heliKey) credentials.heliconeKey = setup.heliKey as string;
        break;

      case 'anthropic':
        // Anthropic: Use OAuth via AIX infrastructure (routed through Exodus proxy)
        credentials.apiKey = setup.anthropicKey as string || undefined;
        if (setup.anthropicHost) credentials.baseUrl = setup.anthropicHost as string;
        if (setup.heliconeKey) credentials.heliconeKey = setup.heliconeKey as string;

        // Check for OAuth on this service
        if (setup.oauthAccessToken) {
          credentials.accessToken = setup.oauthAccessToken as string;
          credentials.refreshToken = setup.oauthRefreshToken as string || undefined;
          credentials.expiresAt = setup.oauthExpiresAt as number || undefined;
          console.log(`[Training] Anthropic: Using OAuth token (via AIX infrastructure)`);
        }

        // If no credentials on this service, check other ABOV3/Anthropic services
        if (!credentials.apiKey && !credentials.accessToken) {
          console.log(`[Training] Anthropic: No credentials on primary service, checking other services...`);
          const { sources } = llmsStoreState();
          for (const svc of sources) {
            if (svc.vId === 'abov3' || svc.vId === 'anthropic') {
              const svcSetup = svc.setup as Record<string, unknown> || {};
              // Prefer OAuth for training (routed through AIX)
              if (svcSetup.oauthAccessToken) {
                credentials.accessToken = svcSetup.oauthAccessToken as string;
                credentials.refreshToken = svcSetup.oauthRefreshToken as string || undefined;
                credentials.expiresAt = svcSetup.oauthExpiresAt as number || undefined;
                console.log(`[Training] Anthropic: Using OAuth from service ${svc.id}`);
                break;
              }
              // Fall back to API key if no OAuth
              if (svcSetup.anthropicKey || svcSetup.abov3Key) {
                credentials.apiKey = (svcSetup.anthropicKey || svcSetup.abov3Key) as string;
                console.log(`[Training] Anthropic: Found API key on service ${svc.id}`);
                break;
              }
            }
          }
        }

        // Log what we're using
        if (credentials.accessToken) {
          console.log(`[Training] Anthropic: Using OAuth (will route through AIX)`);
        } else if (credentials.apiKey) {
          console.log(`[Training] Anthropic: Using API key`);
        }
        break;

      case 'ollama':
        credentials.baseUrl = setup.ollamaHost as string || 'http://127.0.0.1:11434';
        // Ollama doesn't need API key
        break;

      case 'openrouter':
        credentials.apiKey = setup.oaiKey as string || undefined;
        credentials.baseUrl = setup.oaiHost as string || 'https://openrouter.ai/api';
        break;

      case 'abov3':
        // ABOV3: Use OAuth via AIX infrastructure (routed through Exodus proxy)
        // OAuth tokens work because they're routed through the same path as chat
        credentials.apiKey = setup.abov3Key as string || undefined;
        if (setup.abov3Host) credentials.baseUrl = setup.abov3Host as string;
        if (setup.heliconeKey) credentials.heliconeKey = setup.heliconeKey as string;

        // Check for OAuth on this service
        if (setup.oauthAccessToken) {
          credentials.accessToken = setup.oauthAccessToken as string;
          credentials.refreshToken = setup.oauthRefreshToken as string || undefined;
          credentials.expiresAt = setup.oauthExpiresAt as number || undefined;
          console.log(`[Training] ABOV3: Using OAuth token (via AIX infrastructure)`);
        }

        // If no credentials on this service, check other ABOV3/Anthropic services
        if (!credentials.apiKey && !credentials.accessToken) {
          console.log(`[Training] ABOV3: No credentials on primary service, checking other services...`);
          const { sources } = llmsStoreState();
          for (const svc of sources) {
            if (svc.vId === 'abov3' || svc.vId === 'anthropic') {
              const svcSetup = svc.setup as Record<string, unknown> || {};
              // Prefer OAuth for training (routed through AIX)
              if (svcSetup.oauthAccessToken) {
                credentials.accessToken = svcSetup.oauthAccessToken as string;
                credentials.refreshToken = svcSetup.oauthRefreshToken as string || undefined;
                credentials.expiresAt = svcSetup.oauthExpiresAt as number || undefined;
                console.log(`[Training] ABOV3: Using OAuth from service ${svc.id}`);
                break;
              }
              // Fall back to API key if no OAuth
              if (svcSetup.abov3Key || svcSetup.anthropicKey) {
                credentials.apiKey = (svcSetup.abov3Key || svcSetup.anthropicKey) as string;
                console.log(`[Training] ABOV3: Found API key on service ${svc.id}`);
                break;
              }
            }
          }
        }

        // Log what we're using
        if (credentials.accessToken) {
          console.log(`[Training] ABOV3: Using OAuth (will route through AIX)`);
        } else if (credentials.apiKey) {
          console.log(`[Training] ABOV3: Using API key`);
        } else {
          console.warn(`[Training] ABOV3: No API key or OAuth token found!`);
        }
        break;

      case 'mistral':
        credentials.apiKey = setup.mistralKey as string || undefined;
        break;

      case 'groq':
        credentials.apiKey = setup.groqKey as string || undefined;
        break;

      case 'deepseek':
        credentials.apiKey = setup.deepseekKey as string || undefined;
        break;

      case 'googleai':
        credentials.apiKey = setup.geminiKey as string || setup.googleAIKey as string || undefined;
        break;

      case 'azure':
        credentials.apiKey = setup.azureKey as string || undefined;
        credentials.baseUrl = setup.azureEndpoint as string || undefined;
        break;

      default:
        // Try common patterns for other vendors
        credentials.apiKey = (setup.apiKey as string) || (setup.oaiKey as string) || undefined;
        if (setup.host) credentials.baseUrl = setup.host as string;
        if (setup.baseUrl) credentials.baseUrl = setup.baseUrl as string;
    }

    // Extract the actual model name from the LLM ID (format is typically vendorId/modelRef)
    // The initialParameters might have a llmRef that's the actual model name
    if (llm.initialParameters?.llmRef) {
      credentials.modelId = llm.initialParameters.llmRef as string;
    }

    console.log(`[Training] Got credentials for ${teacherModelId}: provider=${credentials.provider}, hasApiKey=${!!credentials.apiKey}, hasAccessToken=${!!credentials.accessToken}, hasRefreshToken=${!!credentials.refreshToken}, hasBaseUrl=${!!credentials.baseUrl}`);

    return credentials;
  } catch (error) {
    console.error(`[Training] Failed to get credentials for ${teacherModelId}:`, error);
    return null;
  }
}

/**
 * List all available MCP tools for debugging
 */
function listAvailableTools(mcpRuntime: ReturnType<typeof getMCPRuntime>): string[] {
  const tools = mcpRuntime.getAvailableTools();
  return tools
    .filter(t => t.type === 'function_call')
    .map(t => t.function_call?.name || '')
    .filter(Boolean);
}

/**
 * Find the correct tool ID by checking available tools
 * Tries multiple naming patterns for flexibility
 */
function findEdenToolId(mcpRuntime: ReturnType<typeof getMCPRuntime>, toolKey: keyof typeof EDEN_TOOL_VARIATIONS): string | null {
  const variations = EDEN_TOOL_VARIATIONS[toolKey];

  // Try each server pattern with each tool name variation
  for (const serverPattern of EDEN_SERVER_PATTERNS) {
    for (const toolName of variations) {
      // Try with original server name
      const toolId1 = `mcp_${serverPattern}_${toolName}`;
      if (mcpRuntime.isMCPTool(toolId1)) {
        return toolId1;
      }

      // Try with sanitized server name (replace non-alphanumeric with underscore)
      const sanitized = serverPattern.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (sanitized !== serverPattern) {
        const toolId2 = `mcp_${sanitized}_${toolName}`;
        if (mcpRuntime.isMCPTool(toolId2)) {
          return toolId2;
        }
      }
    }
  }

  // Fallback: search through ALL available tools to find one matching our variations
  // This handles cases where the server name is unexpected (e.g., "My Eden Server")
  const allTools = listAvailableTools(mcpRuntime);
  for (const toolId of allTools) {
    const toolIdLower = toolId.toLowerCase();
    // Check if any variation matches the end of the tool ID
    for (const variation of variations) {
      const variationLower = variation.toLowerCase().replace(/-/g, '_');
      // Match if tool ID ends with the variation (after the mcp_servername_ prefix)
      if (toolIdLower.endsWith('_' + variationLower) || toolIdLower.includes('_' + variationLower)) {
        return toolId;
      }
    }
  }

  return null;
}

/**
 * Get all Eden tool IDs, logging what we find
 */
function getEdenToolIds(mcpRuntime: ReturnType<typeof getMCPRuntime>): Record<keyof typeof EDEN_TOOL_NAMES, string> {
  const result: Partial<Record<keyof typeof EDEN_TOOL_NAMES, string>> = {};

  // First, log all available tools for debugging
  const availableTools = listAvailableTools(mcpRuntime);
  console.log('[Training] Available MCP tools:', availableTools);

  for (const key of Object.keys(EDEN_TOOL_VARIATIONS) as (keyof typeof EDEN_TOOL_VARIATIONS)[]) {
    const toolId = findEdenToolId(mcpRuntime, key);
    if (toolId) {
      result[key] = toolId;
      console.log(`[Training] Found tool ${key}: ${toolId}`);
    } else {
      console.log(`[Training] Missing tool ${key}, tried variations:`, EDEN_TOOL_VARIATIONS[key]);
    }
  }

  return result as Record<keyof typeof EDEN_TOOL_NAMES, string>;
}


// === Helper Functions ===

/**
 * Execute an Eden MCP tool with error handling
 */
/**
 * Known Python dependency errors and their user-friendly messages
 */
const PYTHON_DEPENDENCY_ERRORS: Record<string, { message: string; installCommand: string }> = {
  'torch': {
    message: 'PyTorch is required for training',
    installCommand: 'pip install torch',
  },
  'transformers': {
    message: 'Hugging Face Transformers is required for training',
    installCommand: 'pip install transformers',
  },
  'peft': {
    message: 'PEFT (Parameter-Efficient Fine-Tuning) is required for LoRA training',
    installCommand: 'pip install peft',
  },
  'datasets': {
    message: 'Hugging Face Datasets is required for training',
    installCommand: 'pip install datasets',
  },
  'accelerate': {
    message: 'Accelerate is required for efficient training',
    installCommand: 'pip install accelerate',
  },
  'bitsandbytes': {
    message: 'BitsAndBytes is required for quantization',
    installCommand: 'pip install bitsandbytes',
  },
};

/**
 * Parse error messages to provide better user feedback
 */
function parseToolError(errorText: string, stepName: string): { message: string; details?: string; installCommand?: string } {
  // Check for Python import errors
  const importMatch = errorText.match(/ImportError|ModuleNotFoundError|No module named ['"](\w+)['"]/i);
  if (importMatch) {
    const moduleName = importMatch[1] || '';
    const depInfo = PYTHON_DEPENDENCY_ERRORS[moduleName];
    if (depInfo) {
      return {
        message: `${stepName} failed: ${depInfo.message}`,
        details: `Missing Python package: ${moduleName}`,
        installCommand: depInfo.installCommand,
      };
    }
    return {
      message: `${stepName} failed: Missing Python dependency`,
      details: errorText,
      installCommand: 'pip install torch transformers peft datasets accelerate bitsandbytes',
    };
  }

  // Check for "Missing dependencies" message from Eden
  if (errorText.includes('Missing dependencies') || errorText.includes('pip install')) {
    return {
      message: `${stepName} failed: Python ML dependencies not installed`,
      details: errorText,
      installCommand: 'pip install torch transformers peft datasets accelerate bitsandbytes',
    };
  }

  // Check for Python not found
  if (errorText.includes('python') && (errorText.includes('not found') || errorText.includes('ENOENT'))) {
    return {
      message: `${stepName} failed: Python not found`,
      details: 'Python 3.8+ is required for training. Make sure Python is installed and in your PATH.',
    };
  }

  // Check for CUDA/GPU errors
  if (errorText.includes('CUDA') || errorText.includes('GPU') || errorText.includes('out of memory')) {
    return {
      message: `${stepName} failed: GPU/CUDA error`,
      details: errorText,
    };
  }

  // Generic error
  return {
    message: `${stepName} failed`,
    details: errorText,
  };
}

async function executeEdenTool(
  jobId: string,
  toolId: string,
  params: Record<string, unknown>,
  stepName: string,
): Promise<string> {
  const mcpRuntime = getMCPRuntime();

  trainingActions.appendLog(jobId, 'info', `Starting: ${stepName}`);

  try {
    const result = await mcpRuntime.executeTool(toolId, params);

    // Handle both string and structured results
    const resultText = typeof result === 'string'
      ? result
      : result.map(item => item.type === 'text' ? item.text : '[image]').join('\n');

    // Check if the result contains an error (some tools return errors in the result)
    // NOTE: The error throw must be OUTSIDE the try/catch to avoid being swallowed
    let toolErrorText: string | null = null;
    try {
      const parsed = JSON.parse(resultText);
      if (parsed.error) {
        toolErrorText = parsed.error;
      }
    } catch {
      // Not JSON or no error field, continue
    }

    // If the tool returned an error in its JSON response, fail the step
    if (toolErrorText) {
      const { message, details, installCommand } = parseToolError(toolErrorText, stepName);
      trainingActions.appendLog(jobId, 'error', message);
      if (details) trainingActions.appendLog(jobId, 'debug', details);
      if (installCommand) {
        trainingActions.appendLog(jobId, 'warn', `Install missing dependencies with: ${installCommand}`);
      }
      throw new Error(message);
    }

    trainingActions.appendLog(jobId, 'info', `Completed: ${stepName}`);
    return resultText;
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    const { message, details, installCommand } = parseToolError(errorText, stepName);

    trainingActions.appendLog(jobId, 'error', message);
    if (details && details !== errorText) {
      trainingActions.appendLog(jobId, 'debug', details);
    }
    if (installCommand) {
      trainingActions.appendLog(jobId, 'warn', `Install missing dependencies with: ${installCommand}`);
    }

    throw new Error(message);
  }
}


/**
 * Check if Eden server is connected and has required tools
 */
export function checkEdenTools(): { available: boolean; missingTools: string[]; availableTools: string[]; foundTools: Record<string, string> } {
  const mcpRuntime = getMCPRuntime();
  const missingTools: string[] = [];
  const foundToolsMap: Record<string, string> = {};

  // Log available tools for debugging
  const availableToolsList = listAvailableTools(mcpRuntime);
  console.log('[Training] checkEdenTools - All available MCP tools:', availableToolsList);

  // Also show registered servers
  const servers = mcpRuntime.getRegisteredServers();
  console.log('[Training] checkEdenTools - Registered MCP servers:', servers);

  for (const key of Object.keys(EDEN_TOOL_VARIATIONS) as (keyof typeof EDEN_TOOL_VARIATIONS)[]) {
    const toolId = findEdenToolId(mcpRuntime, key);
    if (!toolId) {
      missingTools.push(key);
    } else {
      foundToolsMap[key] = toolId;
    }
  }

  console.log('[Training] checkEdenTools - Found:', foundToolsMap);
  console.log('[Training] checkEdenTools - Missing:', missingTools);

  return {
    available: missingTools.length === 0,
    missingTools,
    availableTools: availableToolsList,
    foundTools: foundToolsMap,
  };
}

/**
 * Get detailed debug info about available MCP tools and servers
 * Useful for troubleshooting connection issues
 */
export function getEdenDebugInfo(): {
  servers: { name: string; connected: boolean }[];
  allTools: string[];
  edenToolsFound: Record<string, string>;
  edenToolsMissing: string[];
  searchPatterns: { serverPatterns: string[]; toolVariations: Record<string, string[]> };
} {
  const mcpRuntime = getMCPRuntime();
  const servers = mcpRuntime.getRegisteredServers();
  const allTools = listAvailableTools(mcpRuntime);

  const edenToolsFound: Record<string, string> = {};
  const edenToolsMissing: string[] = [];

  for (const key of Object.keys(EDEN_TOOL_VARIATIONS) as (keyof typeof EDEN_TOOL_VARIATIONS)[]) {
    const toolId = findEdenToolId(mcpRuntime, key);
    if (toolId) {
      edenToolsFound[key] = toolId;
    } else {
      edenToolsMissing.push(key);
    }
  }

  return {
    servers,
    allTools,
    edenToolsFound,
    edenToolsMissing,
    searchPatterns: {
      serverPatterns: EDEN_SERVER_PATTERNS,
      toolVariations: EDEN_TOOL_VARIATIONS,
    },
  };
}


// === Training Workflow Steps ===

/**
 * Helper to get the output directory for a job
 */
function getJobOutputDir(job: TrainingJob): string {
  const baseDir = job.config.outputDirectory || './training_output';
  return `${baseDir}/${job.id}`;
}

/**
 * Step 1: Generate training data using teacher model
 */
async function generateTrainingData(job: TrainingJob, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<string> {
  trainingActions.updateJobStatus(job.id, 'generating', 5, 'Generating training data...');

  // Get credentials for the teacher model from Exodus's LLM store
  const credentials = getTeacherModelCredentials(job.teacherModelId);
  if (!credentials) {
    throw new Error(`Could not get credentials for teacher model: ${job.teacherModelId}. Make sure the model is configured in Settings > Models.`);
  }

  // Log credential info (without exposing the actual key)
  trainingActions.appendLog(job.id, 'info', `Using teacher model: ${credentials.provider}/${credentials.modelId}`);
  trainingActions.appendLog(job.id, 'debug', `Credentials: provider=${credentials.provider}, hasApiKey=${!!credentials.apiKey}, hasAccessToken=${!!credentials.accessToken}, baseUrl=${credentials.baseUrl || 'default'}`);

  // Early validation for ABOV3/Anthropic - fail fast with helpful error
  if ((credentials.provider === 'abov3' || credentials.provider === 'anthropic') &&
      !credentials.apiKey && !credentials.accessToken) {
    const errorMsg = `No authentication found for ${credentials.provider}. ` +
      `Please either login with OAuth in Settings > Models > ABOV3, or enter an API key.`;
    console.error(`[Training] ${errorMsg}`);
    trainingActions.appendLog(job.id, 'error', errorMsg);
    throw new Error(errorMsg);
  }

  // Debug: Log the full credentials object being sent (masking sensitive values)
  console.log(`[Training] Sending credentials to Eden:`, {
    provider: credentials.provider,
    modelId: credentials.modelId,
    hasApiKey: !!credentials.apiKey,
    apiKeyLength: credentials.apiKey?.length || 0,
    hasAccessToken: !!credentials.accessToken,
    accessTokenLength: credentials.accessToken?.length || 0,
    hasRefreshToken: !!credentials.refreshToken,
    expiresAt: credentials.expiresAt ? new Date(credentials.expiresAt).toISOString() : 'none',
    baseUrl: credentials.baseUrl || 'default',
    hasOrganizationId: !!credentials.organizationId,
    hasHeliconeKey: !!credentials.heliconeKey,
  });

  // Use the configured output directory
  const outputDir = getJobOutputDir(job);
  const datasetPath = `${outputDir}/dataset.jsonl`;
  trainingActions.appendLog(job.id, 'info', `Output directory: ${outputDir}`);

  const params: EdenGenerateDataParams = {
    requirements: job.requirements,
    teacherModelId: job.teacherModelId,
    numSamples: job.config.numSamples,
    outputPath: datasetPath,
    // Pass credentials from Exodus to Eden
    credentials,
    temperature: job.config.temperature,
    diversity: job.config.diversity,
  };

  const result = await executeEdenTool(
    job.id,
    toolIds.GENERATE_DATA,
    params as unknown as Record<string, unknown>,
    `Generating ${job.config.numSamples} training samples`,
  );

  trainingActions.updateJobStatus(job.id, 'generating', 30, 'Training data generated');

  // Parse result to get dataset path and samples
  try {
    const parsed = JSON.parse(result);

    // Store samples in the training store for preview
    if (parsed.samples && Array.isArray(parsed.samples)) {
      const datasetSamples = parsed.samples.map((s: { id?: string; instruction: string; input: string; output: string }, idx: number) => ({
        id: s.id || `sample-${idx}`,
        input: s.input || '',
        output: s.output || '',
        metadata: {
          teacherModelId: job.teacherModelId,
          temperature: job.config.temperature,
          generatedAt: Date.now(),
          instruction: s.instruction, // Store instruction in metadata
        },
      }));

      // Add dataset to store
      const datasetId = trainingActions.addDataset({
        jobId: job.id,
        name: `${job.name} Dataset`,
        samples: datasetSamples,
        sizeBytes: JSON.stringify(datasetSamples).length,
        validated: false,
      });

      trainingActions.appendLog(job.id, 'info', `Stored ${datasetSamples.length} samples for preview (datasetId: ${datasetId})`);
      console.log(`[Training] Stored ${datasetSamples.length} samples in dataset ${datasetId}`);
    }

    // Store the dataset path in the job for resume purposes
    const finalPath = parsed.datasetPath || params.outputPath;
    trainingActions.updateJob(job.id, {
      datasetPath: finalPath,
      lastCompletedStep: 'generating',
    });

    return finalPath;
  } catch (e) {
    console.warn(`[Training] Failed to parse result:`, e);
    // Store the path anyway
    trainingActions.updateJob(job.id, {
      datasetPath: params.outputPath,
      lastCompletedStep: 'generating',
    });
    return params.outputPath;
  }
}


/**
 * Step 2: Validate the generated dataset
 */
async function validateDataset(job: TrainingJob, datasetPath: string, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<void> {
  trainingActions.updateJobStatus(job.id, 'validating', 35, 'Validating dataset...');

  const params: EdenValidateDatasetParams = {
    datasetPath,
    checkDuplicates: true,
    sampleSize: Math.min(100, job.config.numSamples),
  };

  const result = await executeEdenTool(
    job.id,
    toolIds.VALIDATE_DATASET,
    params as unknown as Record<string, unknown>,
    'Validating training dataset',
  );

  trainingActions.appendLog(job.id, 'debug', `Validation result: ${result}`);
  trainingActions.updateJobStatus(job.id, 'validating', 40, 'Dataset validated');
}


/**
 * Step 3a: Run LoRA training
 */
async function runLoRATraining(job: TrainingJob, datasetPath: string, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<string> {
  trainingActions.updateJobStatus(job.id, 'training', 45, 'Training LoRA adapter...');

  const outputDir = getJobOutputDir(job);
  const outputPath = `${outputDir}/lora_adapter`;
  const checkpointDir = `${outputDir}/checkpoints`;

  const params: EdenTrainLoRAParams = {
    datasetPath,
    baseModelPath: job.baseModelPath || 'default', // Eden will use default if not specified
    outputPath,
    loraRank: job.config.loraRank,
    loraAlpha: job.config.loraAlpha,
    loraDropout: job.config.loraDropout,
    targetModules: job.config.targetModules,
    epochs: job.config.epochs,
    batchSize: job.config.batchSize,
    learningRate: job.config.learningRate,
    // Checkpointing
    saveCheckpoints: job.config.saveCheckpoints,
    checkpointInterval: job.config.checkpointInterval,
    checkpointDir: checkpointDir,
    resumeFromCheckpoint: job.checkpointPath, // Resume from last checkpoint if available
  };

  // Log checkpoint info
  if (job.config.saveCheckpoints) {
    trainingActions.appendLog(job.id, 'info', `Checkpoints will be saved to: ${checkpointDir}`);
    trainingActions.appendLog(job.id, 'info', `Checkpoint interval: every ${job.config.checkpointInterval} steps`);
  }
  if (job.checkpointPath) {
    trainingActions.appendLog(job.id, 'info', `Resuming from checkpoint: ${job.checkpointPath}`);
  }

  // LoRA training with progress updates
  for (let epoch = 1; epoch <= job.config.epochs; epoch++) {
    const progress = 45 + Math.floor((epoch / job.config.epochs) * 30);
    trainingActions.updateJobStatus(job.id, 'training', progress, `Training epoch ${epoch}/${job.config.epochs}...`);

    // Simulate progress - in real implementation, Eden would send progress updates
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const result = await executeEdenTool(
    job.id,
    toolIds.TRAIN_LORA,
    params as unknown as Record<string, unknown>,
    `LoRA training (${job.config.epochs} epochs)`,
  );

  trainingActions.updateJobStatus(job.id, 'training', 75, 'LoRA training complete');

  // Store the model output path and mark training as completed step
  trainingActions.updateJob(job.id, {
    outputPath,
    lastCompletedStep: 'training',
  });

  try {
    const parsed = JSON.parse(result);
    // Update checkpoint path if returned
    if (parsed.checkpointPath) {
      trainingActions.updateJob(job.id, { checkpointPath: parsed.checkpointPath });
    }
    return parsed.modelPath || outputPath;
  } catch {
    return outputPath;
  }
}


/**
 * Step 3b: Run full distillation
 */
async function runDistillation(job: TrainingJob, datasetPath: string, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<string> {
  trainingActions.updateJobStatus(job.id, 'training', 45, 'Running distillation...');

  const outputDir = getJobOutputDir(job);
  const outputPath = `${outputDir}/distilled_model`;
  const checkpointDir = `${outputDir}/checkpoints`;

  const params: EdenDistillModelParams = {
    datasetPath,
    baseModelPath: job.baseModelPath || 'default',
    outputPath,
    epochs: job.config.epochs,
    batchSize: job.config.batchSize,
    learningRate: job.config.learningRate,
    distillationType: 'response',
    // Checkpointing
    saveCheckpoints: job.config.saveCheckpoints,
    checkpointInterval: job.config.checkpointInterval,
    checkpointDir: checkpointDir,
    resumeFromCheckpoint: job.checkpointPath, // Resume from last checkpoint if available
  };

  // Log checkpoint info
  if (job.config.saveCheckpoints) {
    trainingActions.appendLog(job.id, 'info', `Checkpoints will be saved to: ${checkpointDir}`);
  }
  if (job.checkpointPath) {
    trainingActions.appendLog(job.id, 'info', `Resuming from checkpoint: ${job.checkpointPath}`);
  }

  const result = await executeEdenTool(
    job.id,
    toolIds.DISTILL_MODEL,
    params as unknown as Record<string, unknown>,
    `Full distillation (${job.config.epochs} epochs)`,
  );

  trainingActions.updateJobStatus(job.id, 'training', 75, 'Distillation complete');

  // Store the model output path and mark training as completed step
  trainingActions.updateJob(job.id, {
    outputPath,
    lastCompletedStep: 'training',
  });

  try {
    const parsed = JSON.parse(result);
    if (parsed.checkpointPath) {
      trainingActions.updateJob(job.id, { checkpointPath: parsed.checkpointPath });
    }
    return parsed.modelPath || outputPath;
  } catch {
    return outputPath;
  }
}


/**
 * Step 4: Evaluate the trained model
 */
async function evaluateModel(job: TrainingJob, modelPath: string, testDatasetPath: string, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<void> {
  trainingActions.updateJobStatus(job.id, 'evaluating', 78, 'Evaluating model...');

  const params: EdenEvaluateModelParams = {
    modelPath,
    testDatasetPath,
    metrics: ['perplexity', 'bleu'],
    numSamples: 50,
  };

  const result = await executeEdenTool(
    job.id,
    toolIds.EVALUATE_MODEL,
    params as unknown as Record<string, unknown>,
    'Model evaluation',
  );

  // Parse and store metrics
  try {
    const metrics = JSON.parse(result);
    trainingActions.updateJobMetrics(job.id, {
      perplexity: metrics.perplexity,
      bleuScore: metrics.bleu,
    });
  } catch {
    trainingActions.appendLog(job.id, 'warn', 'Could not parse evaluation metrics');
  }

  trainingActions.updateJobStatus(job.id, 'evaluating', 82, 'Evaluation complete');
}


/**
 * Step 5: Export to GGUF format
 */
async function exportToGGUF(job: TrainingJob, modelPath: string, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<string> {
  trainingActions.updateJobStatus(job.id, 'exporting', 85, 'Exporting to GGUF...');

  const outputDir = getJobOutputDir(job);
  const ggufFileName = `${job.name.replace(/\s+/g, '_').toLowerCase()}-${job.config.quantization}.gguf`;
  const outputPath = `${outputDir}/${ggufFileName}`;

  const params: EdenExportGGUFParams = {
    modelPath,
    outputPath,
    quantization: job.config.quantization,
  };

  const result = await executeEdenTool(
    job.id,
    toolIds.EXPORT_GGUF,
    params as unknown as Record<string, unknown>,
    `Exporting to GGUF (${job.config.quantization})`,
  );

  trainingActions.updateJob(job.id, { ggufPath: outputPath, lastCompletedStep: 'exporting' });
  trainingActions.updateJobStatus(job.id, 'exporting', 92, 'GGUF export complete');

  try {
    const parsed = JSON.parse(result);
    return parsed.ggufPath || outputPath;
  } catch {
    return outputPath;
  }
}


/**
 * Step 6: Deploy to Ark-SLM
 */
async function deployToArkSLM(job: TrainingJob, ggufPath: string, toolIds: Record<keyof typeof EDEN_TOOL_NAMES, string>): Promise<string> {
  trainingActions.updateJobStatus(job.id, 'deploying', 95, 'Deploying to Ark-SLM...');

  const modelName = `${job.name.replace(/\s+/g, '-').toLowerCase()}-${job.config.quantization}`;

  const params: EdenDeployToArkParams = {
    ggufPath,
    modelName,
    arkHost: job.config.arkSLMHost || 'http://127.0.0.1:3200',
    autoLoad: true,
  };

  const result = await executeEdenTool(
    job.id,
    toolIds.DEPLOY_TO_ARK,
    params as unknown as Record<string, unknown>,
    `Deploying to Ark-SLM as "${modelName}"`,
  );

  let deployedModelId = modelName;
  try {
    const parsed = JSON.parse(result);
    deployedModelId = parsed.modelId || modelName;
  } catch {
    // Use default model name
  }

  trainingActions.updateJob(job.id, { deployedModelId });
  trainingActions.updateJobStatus(job.id, 'deploying', 98, 'Deployment complete');

  return deployedModelId;
}


// === Main Training Executor ===

/**
 * Execute a complete training job
 */
export async function executeTrainingJob(jobId: string): Promise<void> {
  // Get the job from store
  const state = trainingActions.getState();
  const job = state.jobs.find(j => j.id === jobId);

  if (!job) {
    console.error(`Training job ${jobId} not found`);
    return;
  }

  trainingActions.appendLog(jobId, 'info', `Starting training job: ${job.name}`);
  trainingActions.updateJob(jobId, { startedAt: Date.now() });

  // Debug: Log OAuth status across all services before starting
  console.log('[Training] === Debugging OAuth Status at Job Start ===');
  const oauthDebug = debugOAuthStatusWithReturn();
  console.log('[Training] === End OAuth Debug ===');

  // Also log to the job's logs so it's visible in the UI
  trainingActions.appendLog(jobId, 'debug', `OAuth Debug: ${oauthDebug.summary}`);
  if (oauthDebug.services.length === 0) {
    trainingActions.appendLog(jobId, 'warn', 'No model services found in store - this is unusual');
  }
  for (const svc of oauthDebug.services) {
    if (svc.vId === 'abov3' || svc.vId === 'anthropic') {
      trainingActions.appendLog(jobId, 'debug',
        `Service ${svc.id} (${svc.vId}): OAuth=${svc.hasOAuth}, APIKey=${svc.hasApiKey}, setupKeys=${svc.setupKeys}`);
    }
  }

  try {
    // Check Eden tools availability and get tool IDs
    const { available, missingTools, availableTools } = checkEdenTools();
    if (!available) {
      const availableInfo = availableTools.length > 0
        ? `\n\nAvailable MCP tools: ${availableTools.join(', ')}`
        : '\n\nNo MCP tools found. Make sure Eden server is connected in Settings > MCP Servers.';
      throw new Error(`Missing Eden tools: ${missingTools.join(', ')}.${availableInfo}`);
    }

    // Get the resolved tool IDs for this session
    const mcpRuntime = getMCPRuntime();
    const toolIds = getEdenToolIds(mcpRuntime);

    // Verify all required tools are available
    const requiredTools: (keyof typeof EDEN_TOOL_NAMES)[] = ['GENERATE_DATA', 'VALIDATE_DATASET', 'EVALUATE_MODEL', 'EXPORT_GGUF'];
    if (job.config.trainingType === 'lora') {
      requiredTools.push('TRAIN_LORA');
    } else {
      requiredTools.push('DISTILL_MODEL');
    }
    if (job.config.autoDeployToArk) {
      requiredTools.push('DEPLOY_TO_ARK');
    }

    for (const toolKey of requiredTools) {
      if (!toolIds[toolKey]) {
        throw new Error(`Required Eden tool not found: ${EDEN_TOOL_NAMES[toolKey]}`);
      }
    }

    trainingActions.appendLog(jobId, 'debug', `Found Eden tools: ${Object.values(toolIds).filter(Boolean).join(', ')}`);

    // Step 1: Generate or load training data
    let datasetPath: string;
    if (job.config.skipDataGeneration && job.config.uploadedDatasetPath) {
      // Use uploaded dataset
      datasetPath = job.config.uploadedDatasetPath;
      trainingActions.appendLog(jobId, 'info', `Using uploaded dataset: ${datasetPath}`);
      trainingActions.updateJobStatus(jobId, 'generating', 30, 'Using uploaded dataset');
    } else {
      // Generate new training data
      datasetPath = await generateTrainingData(job, toolIds);
    }

    // Step 2: Validate dataset
    await validateDataset(job, datasetPath, toolIds);

    // If generateDataOnly mode, stop here
    if (job.config.generateDataOnly) {
      trainingActions.updateJobStatus(jobId, 'completed', 100, 'Data generation completed');
      trainingActions.appendLog(jobId, 'info', 'Data generation completed (training skipped as requested)');
      trainingActions.appendLog(jobId, 'info', `Dataset saved to: ${datasetPath}`);
      return;
    }

    // Step 3: Train (LoRA or full distillation)
    let modelPath: string;
    if (job.config.trainingType === 'lora') {
      modelPath = await runLoRATraining(job, datasetPath, toolIds);
    } else {
      modelPath = await runDistillation(job, datasetPath, toolIds);
    }

    // Step 4: Evaluate
    await evaluateModel(job, modelPath, datasetPath, toolIds);

    // Step 5: Export to GGUF
    const ggufPath = await exportToGGUF(job, modelPath, toolIds);

    // Step 6: Deploy to Ark-SLM (if enabled)
    if (job.config.autoDeployToArk) {
      await deployToArkSLM(job, ggufPath, toolIds);
    }

    // Mark as completed
    trainingActions.updateJobStatus(jobId, 'completed', 100, 'Training completed successfully');
    trainingActions.appendLog(jobId, 'info', 'Training job completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    trainingActions.updateJob(jobId, {
      error: errorMessage,
      errorDetails: error instanceof Error ? error.stack : undefined,
    });
    trainingActions.updateJobStatus(jobId, 'error');
    trainingActions.appendLog(jobId, 'error', `Training failed: ${errorMessage}`);
  }
}


/**
 * Start a training job in the background
 */
export function startTrainingJob(jobId: string): void {
  // Run asynchronously without blocking
  executeTrainingJob(jobId).catch(error => {
    console.error(`Training job ${jobId} failed:`, error);
  });
}


/**
 * Pause a training job (if supported by Eden)
 */
export function pauseTrainingJob(jobId: string): void {
  const state = trainingActions.getState();
  const job = state.jobs.find(j => j.id === jobId);

  if (!job) return;

  trainingActions.updateJobStatus(jobId, 'paused');
  trainingActions.appendLog(jobId, 'info', 'Training paused by user');

  // Log what will be needed to resume
  if (job.lastCompletedStep) {
    trainingActions.appendLog(jobId, 'info', `Last completed step: ${job.lastCompletedStep}`);
  }
  if (job.checkpointPath) {
    trainingActions.appendLog(jobId, 'info', `Checkpoint available: ${job.checkpointPath}`);
  }
  if (job.datasetPath) {
    trainingActions.appendLog(jobId, 'info', `Dataset available: ${job.datasetPath}`);
  }

  // TODO: In real implementation, would send pause signal to Eden MCP server
  // to stop the current training gracefully and save a checkpoint
}


/**
 * Resume a paused or failed training job from the last checkpoint
 */
export function resumeTrainingJob(jobId: string): void {
  const state = trainingActions.getState();
  const job = state.jobs.find(j => j.id === jobId);

  if (!job) return;

  if (job.status !== 'paused' && job.status !== 'error') {
    trainingActions.appendLog(jobId, 'warn', `Cannot resume job with status: ${job.status}`);
    return;
  }

  const lastStep = job.lastCompletedStep;

  // Log resume info
  trainingActions.appendLog(jobId, 'info', `Resuming training from ${lastStep || 'beginning'}...`);

  if (job.checkpointPath) {
    trainingActions.appendLog(jobId, 'info', `Using checkpoint: ${job.checkpointPath}`);
  }

  // Clear error state if resuming from error
  if (job.status === 'error') {
    trainingActions.updateJob(jobId, {
      error: undefined,
      errorDetails: undefined,
    });
  }

  // Resume the training job - it will check lastCompletedStep to skip completed work
  executeTrainingJobWithResume(jobId).catch(error => {
    console.error(`Training job ${jobId} resume failed:`, error);
  });
}


/**
 * Execute training job with resume support
 * Skips steps that have already been completed based on lastCompletedStep
 */
async function executeTrainingJobWithResume(jobId: string): Promise<void> {
  const state = trainingActions.getState();
  const job = state.jobs.find(j => j.id === jobId);

  if (!job) {
    console.error(`Training job ${jobId} not found`);
    return;
  }

  const lastStep = job.lastCompletedStep;
  trainingActions.appendLog(jobId, 'info', `Resuming training job: ${job.name}`);
  trainingActions.updateJob(jobId, { startedAt: job.startedAt || Date.now() });

  try {
    // Check Eden tools availability and get tool IDs
    const { available, missingTools, availableTools } = checkEdenTools();
    if (!available) {
      throw new Error(`Missing Eden tools: ${missingTools.join(', ')}`);
    }

    const mcpRuntime = getMCPRuntime();
    const toolIds = getEdenToolIds(mcpRuntime);

    // Determine where to resume from based on lastCompletedStep
    let datasetPath = job.datasetPath || '';
    let modelPath = job.outputPath || '';

    // Step 1 & 2: Generate and validate data (skip if already done)
    if (!lastStep || lastStep === 'idle') {
      // Need to start from beginning
      if (job.config.skipDataGeneration && job.config.uploadedDatasetPath) {
        datasetPath = job.config.uploadedDatasetPath;
        trainingActions.appendLog(jobId, 'info', `Using uploaded dataset: ${datasetPath}`);
      } else {
        datasetPath = await generateTrainingData(job, toolIds);
      }
      await validateDataset(job, datasetPath, toolIds);
    } else if (lastStep === 'generating') {
      // Data generated, need to validate
      if (!datasetPath) {
        throw new Error('Dataset path not found. Cannot resume from generating step.');
      }
      trainingActions.appendLog(jobId, 'info', `Resuming with existing dataset: ${datasetPath}`);
      await validateDataset(job, datasetPath, toolIds);
    } else {
      trainingActions.appendLog(jobId, 'info', `Skipping data generation/validation (already completed)`);
    }

    // Check if data-only mode
    if (job.config.generateDataOnly) {
      trainingActions.updateJobStatus(jobId, 'completed', 100, 'Data generation completed');
      return;
    }

    // Step 3: Training (skip if already done)
    if (!lastStep || lastStep === 'idle' || lastStep === 'generating' || lastStep === 'validating') {
      // Need to train
      if (!datasetPath) {
        datasetPath = job.datasetPath || `${getJobOutputDir(job)}/dataset.jsonl`;
      }
      if (job.config.trainingType === 'lora') {
        modelPath = await runLoRATraining(job, datasetPath, toolIds);
      } else {
        modelPath = await runDistillation(job, datasetPath, toolIds);
      }
    } else {
      trainingActions.appendLog(jobId, 'info', `Skipping training (already completed)`);
      if (!modelPath) {
        modelPath = job.outputPath || `${getJobOutputDir(job)}/lora_adapter`;
      }
    }

    // Step 4: Evaluate (skip if already done)
    if (!lastStep || lastStep === 'idle' || lastStep === 'generating' || lastStep === 'validating' || lastStep === 'training') {
      if (!datasetPath) datasetPath = job.datasetPath || '';
      await evaluateModel(job, modelPath, datasetPath, toolIds);
    } else {
      trainingActions.appendLog(jobId, 'info', `Skipping evaluation (already completed)`);
    }

    // Step 5: Export to GGUF (skip if already done)
    let ggufPath = job.ggufPath || '';
    if (!lastStep || lastStep !== 'exporting' && lastStep !== 'deploying' && lastStep !== 'completed') {
      ggufPath = await exportToGGUF(job, modelPath, toolIds);
    } else {
      trainingActions.appendLog(jobId, 'info', `Skipping GGUF export (already completed)`);
      if (!ggufPath) {
        ggufPath = `${getJobOutputDir(job)}/${job.name.replace(/\s+/g, '_').toLowerCase()}-${job.config.quantization}.gguf`;
      }
    }

    // Step 6: Deploy to Ark-SLM (if enabled and not done)
    if (job.config.autoDeployToArk && lastStep !== 'completed') {
      await deployToArkSLM(job, ggufPath, toolIds);
    }

    // Mark as completed
    trainingActions.updateJobStatus(jobId, 'completed', 100, 'Training completed successfully');
    trainingActions.appendLog(jobId, 'info', 'Training job completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    trainingActions.updateJob(jobId, {
      error: errorMessage,
      errorDetails: error instanceof Error ? error.stack : undefined,
    });
    trainingActions.updateJobStatus(jobId, 'error');
    trainingActions.appendLog(jobId, 'error', `Training failed: ${errorMessage}`);
  }
}


/**
 * Cancel a training job
 */
export function cancelTrainingJob(jobId: string): void {
  trainingActions.updateJob(jobId, { error: 'Cancelled by user' });
  trainingActions.updateJobStatus(jobId, 'error');
  trainingActions.appendLog(jobId, 'warn', 'Training cancelled by user');
  // In real implementation, would send cancel signal to Eden
}
