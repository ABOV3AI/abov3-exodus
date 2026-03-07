/**
 * ABOV3 Training System Types
 *
 * Type definitions for the training/distillation system that integrates
 * with ABOV3 Eden MCP tools for model training and ABOV3 Ark-SLM for hosting.
 */

import type { DLLMId } from '~/common/stores/llms/llms.types';


// === Training Job Types ===

/**
 * Training job status lifecycle
 */
export type TrainingStatus =
  | 'idle'           // Job created, not started
  | 'generating'     // Generating training data from teacher model
  | 'validating'     // Validating generated dataset
  | 'training'       // Training/distilling the model
  | 'evaluating'     // Evaluating trained model
  | 'exporting'      // Exporting to GGUF format
  | 'deploying'      // Deploying to Ark-SLM
  | 'completed'      // Job finished successfully
  | 'paused'         // Job paused by user
  | 'error';         // Job failed with error

/**
 * Training type determines the approach used
 */
export type TrainingType =
  | 'distillation'   // Full knowledge distillation from teacher
  | 'lora'           // LoRA adapter training
  | 'full-finetune'; // Full model fine-tuning (requires more resources)

/**
 * GGUF quantization levels for export
 */
export type GGUFQuantization =
  | 'q4_0'   // 4-bit, fastest, smallest
  | 'q4_1'   // 4-bit with better quality
  | 'q5_0'   // 5-bit
  | 'q5_1'   // 5-bit with better quality
  | 'q8_0'   // 8-bit, good balance
  | 'f16'    // 16-bit float, high quality
  | 'f32';   // 32-bit float, original quality

/**
 * Output format options
 */
export type OutputFormat = 'gguf' | 'safetensors' | 'pytorch';


// === Training Configuration ===

/**
 * Training configuration parameters
 */
export interface TrainingConfig {
  // Training approach
  trainingType: TrainingType;

  // Workflow options
  generateDataOnly: boolean;        // Only generate data, skip training/export/deploy
  skipDataGeneration: boolean;      // Skip data generation (use uploaded dataset)
  uploadedDatasetPath?: string;     // Path to uploaded dataset file

  // Output directory
  outputDirectory: string;          // Directory where training data and models are saved

  // Checkpointing
  saveCheckpoints: boolean;         // Save checkpoints during training for pause/resume
  checkpointInterval: number;       // Save checkpoint every N steps

  // Hyperparameters
  epochs: number;
  batchSize: number;
  learningRate: number;
  warmupSteps: number;

  // LoRA-specific (when trainingType === 'lora')
  loraRank?: number;
  loraAlpha?: number;
  loraDropout?: number;
  targetModules?: string[];

  // Dataset generation
  numSamples: number;
  temperature: number;
  diversity: 'low' | 'medium' | 'high';

  // Output
  quantization: GGUFQuantization;
  outputFormats: OutputFormat[];

  // Deployment
  autoDeployToArk: boolean;
  arkSLMHost?: string;
}

/**
 * Default training configuration
 */
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  trainingType: 'lora',
  generateDataOnly: false,
  skipDataGeneration: false,
  outputDirectory: '',  // User must provide full path
  saveCheckpoints: true,
  checkpointInterval: 100,
  epochs: 3,
  batchSize: 4,
  learningRate: 1e-5,
  warmupSteps: 100,
  loraRank: 8,
  loraAlpha: 16,
  loraDropout: 0.05,
  numSamples: 1000,
  temperature: 0.7,
  diversity: 'medium',
  quantization: 'q4_0',
  outputFormats: ['gguf'],
  autoDeployToArk: true,
};


// === Training Job ===

/**
 * Training metrics captured during and after training
 */
export interface TrainingMetrics {
  // Training metrics
  trainingLoss?: number;
  validationLoss?: number;
  learningRateHistory?: number[];

  // Evaluation metrics
  perplexity?: number;
  bleuScore?: number;
  rougeScore?: number;
  exactMatch?: number;

  // Resource metrics
  peakMemoryMB?: number;
  totalTimeSeconds?: number;
  tokensPerSecond?: number;
}

/**
 * Training job log entry
 */
export interface TrainingLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * A training job represents a single training/distillation task
 */
export interface TrainingJob {
  // Identity
  id: string;
  name: string;
  description?: string;

  // Configuration
  requirements: string;           // User's requirements/prompts for the model
  teacherModelId: DLLMId;         // Model used as teacher for data generation
  baseModelId?: string;           // Base model for fine-tuning (optional)
  baseModelPath?: string;         // Path to uploaded base model
  config: TrainingConfig;

  // Status
  status: TrainingStatus;
  progress: number;               // 0-100 percentage
  currentStep?: string;           // Human-readable current step

  // Results
  metrics?: TrainingMetrics;
  outputPath?: string;            // Path to trained model
  ggufPath?: string;              // Path to exported GGUF
  deployedModelId?: string;       // ID in Ark-SLM if deployed
  datasetPath?: string;           // Path to generated/uploaded dataset

  // Checkpointing (for pause/resume)
  checkpointPath?: string;        // Path to latest checkpoint
  lastCompletedStep?: TrainingStatus; // Last successfully completed step
  currentEpoch?: number;          // Current training epoch (for resume)
  currentStepNumber?: number;     // Current training step within epoch

  // Logs
  logs: TrainingLogEntry[];

  // Error handling
  error?: string;
  errorDetails?: string;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}


// === Dataset Types ===

/**
 * A single training data sample
 */
export interface DatasetSample {
  id: string;
  input: string;                  // Input prompt/question
  output: string;                 // Expected output/answer
  metadata?: {
    teacherModelId: string;
    temperature: number;
    generatedAt: number;
    tokenCount?: number;
    instruction?: string;         // System instruction for this sample
  };
}

/**
 * Training dataset
 */
export interface TrainingDataset {
  id: string;
  jobId: string;
  name: string;
  samples: DatasetSample[];
  createdAt: number;
  sizeBytes: number;
  validated: boolean;
  validationErrors?: string[];
}


// === Eden MCP Tool Schemas ===

/**
 * API credentials for teacher model access
 * Passed from Exodus to Eden for data generation
 */
export interface TeacherModelCredentials {
  // Provider type
  provider: 'openai' | 'anthropic' | 'ollama' | 'openrouter' | 'azure' | 'abov3' | 'mistral' | 'groq' | 'deepseek' | 'gemini' | 'other';

  // API Key (for cloud providers)
  apiKey?: string;

  // Base URL (for custom endpoints like Ollama, LocalAI, ABOV3)
  baseUrl?: string;

  // Model ID to use (the actual model name the provider understands)
  modelId: string;

  // OAuth tokens (for ABOV3, Anthropic with OAuth - e.g., Claude Pro/Max)
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;

  // Additional provider-specific options
  organizationId?: string;  // OpenAI org
  heliconeKey?: string;     // Helicone proxy key
}

/**
 * Eden tool: Generate training data
 */
export interface EdenGenerateDataParams {
  requirements: string;
  teacherModelId: string;
  numSamples: number;
  outputPath: string;
  temperature?: number;
  diversity?: 'low' | 'medium' | 'high';

  // API credentials passed from Exodus
  credentials?: TeacherModelCredentials;
}

/**
 * Eden tool: Validate dataset
 */
export interface EdenValidateDatasetParams {
  datasetPath: string;
  checkDuplicates?: boolean;
  sampleSize?: number;
}

/**
 * Eden tool: Distill model
 */
export interface EdenDistillModelParams {
  datasetPath: string;
  baseModelPath: string;
  outputPath: string;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  distillationType?: 'full' | 'response' | 'logits';
  // Checkpointing
  saveCheckpoints?: boolean;
  checkpointInterval?: number;
  checkpointDir?: string;
  resumeFromCheckpoint?: string;  // Path to checkpoint to resume from
}

/**
 * Eden tool: Train LoRA adapter
 */
export interface EdenTrainLoRAParams {
  datasetPath: string;
  baseModelPath: string;
  outputPath: string;
  loraRank?: number;
  loraAlpha?: number;
  loraDropout?: number;
  targetModules?: string[];
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  // Checkpointing
  saveCheckpoints?: boolean;
  checkpointInterval?: number;
  checkpointDir?: string;
  resumeFromCheckpoint?: string;  // Path to checkpoint to resume from
}

/**
 * Eden tool: Evaluate model
 */
export interface EdenEvaluateModelParams {
  modelPath: string;
  testDatasetPath: string;
  metrics?: ('perplexity' | 'bleu' | 'rouge' | 'exact_match')[];
  numSamples?: number;
}

/**
 * Eden tool: Compare models
 */
export interface EdenCompareModelsParams {
  teacherModelId: string;
  studentModelPath: string;
  testPrompts: string[];
}

/**
 * Eden tool: Export to GGUF
 */
export interface EdenExportGGUFParams {
  modelPath: string;
  outputPath: string;
  quantization?: GGUFQuantization;
  splitSize?: number; // Max file size in GB
}

/**
 * Eden tool: Deploy to Ark-SLM
 */
export interface EdenDeployToArkParams {
  ggufPath: string;
  modelName: string;
  arkHost?: string;
  autoLoad?: boolean;
}


// === Progress Events ===

/**
 * Progress event from Eden during training
 */
export interface TrainingProgressEvent {
  jobId: string;
  status: TrainingStatus;
  progress: number;
  currentStep?: string;
  metrics?: Partial<TrainingMetrics>;
  log?: TrainingLogEntry;
}


// === Store State Types ===

/**
 * Training wizard step
 */
export type WizardStep =
  | 'requirements'    // Step 1: Enter requirements
  | 'teacher'         // Step 2: Select teacher model
  | 'base'            // Step 3: Select/upload base model
  | 'configuration';  // Step 4: Configure training

/**
 * Training app view mode
 */
export type TrainingViewMode =
  | 'wizard'          // Creating a new training job
  | 'progress'        // Viewing active job progress
  | 'history';        // Viewing training history
