/**
 * Training Wizard Component
 *
 * Step-by-step wizard for creating training jobs.
 * Steps: Requirements -> Teacher Model -> Base Model -> Configuration
 */

import * as React from 'react';

import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Option,
  Select,
  Slider,
  Stack,
  Step,
  StepIndicator,
  Stepper,
  Switch,
  Textarea,
  Typography,
} from '@mui/joy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import DatasetIcon from '@mui/icons-material/Dataset';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import type { DLLMId } from '~/common/stores/llms/llms.types';
import { useModelsStore } from '~/common/stores/llms/store-llms';

import { trainingActions, useDefaultTrainingConfig, useEdenServer, useTrainingUI } from '../store-training';
import { checkEdenTools, getEdenDebugInfo, startTrainingJob } from '../training.executor';
import type { GGUFQuantization, TrainingConfig, TrainingType, WizardStep } from '../training.types';
import { DEFAULT_TRAINING_CONFIG } from '../training.types';


const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: 'requirements', label: 'Requirements' },
  { key: 'teacher', label: 'Teacher Model' },
  { key: 'base', label: 'Base Model' },
  { key: 'configuration', label: 'Configuration' },
];


/**
 * Component to show Eden tools status with debug info
 */
function EdenToolsStatus(props: { edenServerConnected: boolean }) {
  const [showDebug, setShowDebug] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<ReturnType<typeof getEdenDebugInfo> | null>(null);
  const [toolsStatus, setToolsStatus] = React.useState<ReturnType<typeof checkEdenTools> | null>(null);

  // Check tools on mount and when connection changes
  React.useEffect(() => {
    const status = checkEdenTools();
    setToolsStatus(status);
  }, [props.edenServerConnected]);

  const handleShowDebug = React.useCallback(() => {
    setDebugInfo(getEdenDebugInfo());
    setShowDebug(true);
  }, []);

  if (!props.edenServerConnected) {
    return (
      <Card variant='soft' color='warning' sx={{ p: 2 }}>
        <Typography level='body-sm' color='warning' fontWeight='lg'>
          Eden Server Not Connected
        </Typography>
        <Typography level='body-xs' color='warning' sx={{ mt: 0.5 }}>
          Please add and enable the Eden MCP server in Settings &rarr; MCP Servers
          before starting training.
        </Typography>
      </Card>
    );
  }

  // Check if all tools are available
  const allToolsAvailable = toolsStatus?.available ?? false;

  if (allToolsAvailable) {
    return (
      <Card variant='soft' color='success' sx={{ p: 2 }}>
        <Typography level='body-sm' color='success' fontWeight='lg'>
          Eden Server Connected
        </Typography>
        <Typography level='body-xs' sx={{ mt: 0.5 }}>
          All {Object.keys(toolsStatus?.foundTools || {}).length} training tools are available and ready.
        </Typography>
      </Card>
    );
  }

  // Some tools are missing - show detailed info
  return (
    <Card variant='soft' color='danger' sx={{ p: 2 }}>
      <Typography level='body-sm' color='danger' fontWeight='lg'>
        Eden Training Tools Not Found
      </Typography>
      <Typography level='body-xs' color='danger' sx={{ mt: 0.5 }}>
        Eden server is connected but training tools are missing: {toolsStatus?.missingTools.join(', ')}
      </Typography>

      <Button
        size='sm'
        variant='outlined'
        color='neutral'
        sx={{ mt: 1 }}
        onClick={handleShowDebug}
      >
        Show Debug Info
      </Button>

      {showDebug && debugInfo && (
        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.level1', borderRadius: 'sm', fontSize: 'xs', fontFamily: 'monospace' }}>
          <Typography level='body-xs' fontWeight='lg'>MCP Servers:</Typography>
          <Box component='pre' sx={{ m: 0, fontSize: 'inherit', whiteSpace: 'pre-wrap' }}>
            {debugInfo.servers.length === 0
              ? 'No servers registered'
              : debugInfo.servers.map(s => `  ${s.name}: ${s.connected ? 'connected' : 'disconnected'}`).join('\n')}
          </Box>

          <Typography level='body-xs' fontWeight='lg' sx={{ mt: 1 }}>Available MCP Tools ({debugInfo.allTools.length}):</Typography>
          <Box component='pre' sx={{ m: 0, fontSize: 'inherit', whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto' }}>
            {debugInfo.allTools.length === 0
              ? 'No tools found'
              : debugInfo.allTools.map(t => `  ${t}`).join('\n')}
          </Box>

          <Typography level='body-xs' fontWeight='lg' sx={{ mt: 1 }}>Expected Server Names:</Typography>
          <Box component='pre' sx={{ m: 0, fontSize: 'inherit' }}>
            {debugInfo.searchPatterns.serverPatterns.join(', ')}
          </Box>

          <Typography level='body-xs' fontWeight='lg' sx={{ mt: 1 }}>Expected Tool Names (any of):</Typography>
          <Box component='pre' sx={{ m: 0, fontSize: 'inherit', whiteSpace: 'pre-wrap' }}>
            {Object.entries(debugInfo.searchPatterns.toolVariations)
              .map(([key, vals]) => `  ${key}: ${vals[0]}`)
              .join('\n')}
          </Box>

          <Typography level='body-xs' sx={{ mt: 1, color: 'text.secondary' }}>
            Tool ID format: mcp_&#123;serverName&#125;_&#123;toolName&#125;
          </Typography>
        </Box>
      )}
    </Card>
  );
}


export function TrainingWizard() {

  // Store state
  const { wizardStep, wizardDraft } = useTrainingUI();
  const defaultConfig = useDefaultTrainingConfig();
  const { edenServerConnected } = useEdenServer();

  // LLM models for teacher selection
  const llms = useModelsStore(state => state.llms);
  const chatCapableModels = React.useMemo(
    () => llms.filter(llm => llm.interfaces.includes('oai-chat') && !llm.hidden),
    [llms]
  );

  // Local state for wizard fields
  const [jobName, setJobName] = React.useState(wizardDraft?.name || '');
  const [requirements, setRequirements] = React.useState(wizardDraft?.requirements || '');
  const [teacherModelId, setTeacherModelId] = React.useState<DLLMId | ''>(wizardDraft?.teacherModelId || '');
  const [baseModelPath, setBaseModelPath] = React.useState(wizardDraft?.baseModelPath || '');
  const [config, setConfig] = React.useState<TrainingConfig>({
    ...DEFAULT_TRAINING_CONFIG,
    ...defaultConfig,
    ...wizardDraft?.config,
  });

  // File picker refs
  const baseModelInputRef = React.useRef<HTMLInputElement>(null);

  // Use File System Access API for directory selection (Chrome/Edge)
  const handleOutputDirBrowse = React.useCallback(async () => {
    try {
      // Check if the File System Access API is available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as unknown as { showDirectoryPicker: (options?: object) => Promise<{ name: string }> }).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents',
        });
        // Get the directory name - unfortunately we can't get the full path in browsers
        // But we can construct a reference path
        updateConfig('outputDirectory', dirHandle.name);
      } else {
        // Fallback: prompt user to enter path manually
        const path = prompt('Enter the output directory path:', config.outputDirectory);
        if (path) {
          updateConfig('outputDirectory', path);
        }
      }
    } catch (err) {
      // User cancelled the picker
      console.log('Directory picker cancelled');
    }
  }, [config.outputDirectory]);

  const handleBaseModelSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const filePath = (file as File & { path?: string }).path || file.name;
      setBaseModelPath(filePath);
    }
  }, []);

  // Current step index
  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.key === wizardStep);

  // Validation
  const isRequirementsValid = jobName.trim().length > 0 && requirements.trim().length > 10;
  const isTeacherValid = teacherModelId !== '' || config.skipDataGeneration; // Teacher not needed if using uploaded dataset
  const isBaseValid = true; // Base model is optional
  const isConfigValid =
    config.numSamples > 0 &&
    config.epochs > 0 &&
    // Output directory is required and must look like an absolute path
    config.outputDirectory.trim().length > 0 &&
    (config.outputDirectory.includes('/') || config.outputDirectory.includes('\\'));

  const canProceed = () => {
    switch (wizardStep) {
      case 'requirements':
        return isRequirementsValid;
      case 'teacher':
        return isTeacherValid;
      case 'base':
        return isBaseValid;
      case 'configuration':
        return isConfigValid && edenServerConnected;
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = React.useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      trainingActions.setWizardStep(WIZARD_STEPS[nextIndex].key);
      // Save draft
      trainingActions.updateWizardDraft({
        name: jobName,
        requirements,
        teacherModelId: teacherModelId || undefined,
        baseModelPath: baseModelPath || undefined,
        config,
      });
    }
  }, [currentStepIndex, jobName, requirements, teacherModelId, baseModelPath, config]);

  const handleBack = React.useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      trainingActions.setWizardStep(WIZARD_STEPS[prevIndex].key);
    }
  }, [currentStepIndex]);

  // Start training
  const handleStartTraining = React.useCallback(() => {
    if (!teacherModelId) return;

    const jobId = trainingActions.createJob({
      name: jobName,
      requirements,
      teacherModelId,
      baseModelPath: baseModelPath || undefined,
      config,
    });

    trainingActions.clearWizardDraft();
    trainingActions.setActiveJob(jobId);

    // Start the training job via Eden MCP tools
    startTrainingJob(jobId);
  }, [jobName, requirements, teacherModelId, baseModelPath, config]);

  // Update config helper
  const updateConfig = React.useCallback(<K extends keyof TrainingConfig>(key: K, value: TrainingConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <Box>

      {/* Stepper */}
      <Stepper sx={{ mb: 4 }}>
        {WIZARD_STEPS.map((step, index) => (
          <Step
            key={step.key}
            indicator={
              <StepIndicator
                variant={index <= currentStepIndex ? 'solid' : 'soft'}
                color={index < currentStepIndex ? 'success' : index === currentStepIndex ? 'primary' : 'neutral'}
              >
                {index < currentStepIndex ? <CheckIcon /> : index + 1}
              </StepIndicator>
            }
          >
            <Typography
              level='body-sm'
              fontWeight={index === currentStepIndex ? 'lg' : 'md'}
              color={index <= currentStepIndex ? 'primary' : 'neutral'}
            >
              {step.label}
            </Typography>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Card variant='outlined' sx={{ p: 3 }}>

        {/* Step 1: Requirements */}
        {wizardStep === 'requirements' && (
          <Stack spacing={3}>
            <Typography level='title-lg'>Define Your Model Requirements</Typography>
            <Typography level='body-sm' color='neutral'>
              Describe what you want your distilled model to do. Be specific about the tasks,
              behaviors, and capabilities you need.
            </Typography>

            <FormControl required>
              <FormLabel>Training Job Name</FormLabel>
              <Input
                placeholder='e.g., Customer Support Bot, Code Assistant'
                value={jobName}
                onChange={e => setJobName(e.target.value)}
              />
              <FormHelperText>A descriptive name for this training job</FormHelperText>
            </FormControl>

            <FormControl required>
              <FormLabel>Model Requirements</FormLabel>
              <Textarea
                minRows={6}
                maxRows={12}
                placeholder={`Describe the model's purpose and capabilities. For example:

- What tasks should the model perform?
- What is the expected input/output format?
- Any specific domain knowledge required?
- Tone and style preferences?
- Examples of ideal responses?`}
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
              />
              <FormHelperText>
                The more detailed your requirements, the better the distilled model will perform
              </FormHelperText>
            </FormControl>
          </Stack>
        )}

        {/* Step 2: Teacher Model */}
        {wizardStep === 'teacher' && (
          <Stack spacing={3}>
            <Typography level='title-lg'>Select Teacher Model</Typography>
            <Typography level='body-sm' color='neutral'>
              Choose a powerful model to generate training data. The teacher model will be used
              to create example responses based on your requirements.
            </Typography>

            <FormControl required>
              <FormLabel>Teacher Model</FormLabel>
              <Select
                placeholder='Select a model...'
                value={teacherModelId}
                onChange={(_e, value) => setTeacherModelId(value || '')}
              >
                {chatCapableModels.map(llm => (
                  <Option key={llm.id} value={llm.id}>
                    {llm.userLabel || llm.label}
                  </Option>
                ))}
              </Select>
              <FormHelperText>
                Recommended: Use a capable model like Claude, GPT-4, or similar for best results
              </FormHelperText>
            </FormControl>

            {teacherModelId && (
              <Card variant='soft' sx={{ p: 2 }}>
                <Typography level='body-sm'>
                  <strong>Selected:</strong>{' '}
                  {chatCapableModels.find(m => m.id === teacherModelId)?.userLabel ||
                    chatCapableModels.find(m => m.id === teacherModelId)?.label}
                </Typography>
                <Typography level='body-xs' color='neutral' sx={{ mt: 0.5 }}>
                  {chatCapableModels.find(m => m.id === teacherModelId)?.description}
                </Typography>
              </Card>
            )}

            {/* Validation feedback */}
            {!canProceed() && !config.skipDataGeneration && (
              <Card variant='soft' color='warning' sx={{ p: 2 }}>
                <Typography level='body-sm' color='warning' startDecorator={<WarningAmberIcon />}>
                  Please select a teacher model to generate training data.
                </Typography>
              </Card>
            )}
          </Stack>
        )}

        {/* Step 3: Base Model */}
        {wizardStep === 'base' && (
          <Stack spacing={3}>
            <Typography level='title-lg'>Select Base Model (Optional)</Typography>
            <Typography level='body-sm' color='neutral'>
              Optionally specify a base model to fine-tune. If not provided, a suitable
              default model will be used for distillation.
            </Typography>

            <FormControl>
              <FormLabel>Base Model Path</FormLabel>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Input
                  placeholder='Path to GGUF or SafeTensors model (optional)'
                  value={baseModelPath}
                  onChange={e => setBaseModelPath(e.target.value)}
                  startDecorator={<UploadFileIcon />}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant='outlined'
                  color='neutral'
                  onClick={() => baseModelInputRef.current?.click()}
                >
                  Browse
                </Button>
                <input
                  ref={baseModelInputRef}
                  type='file'
                  accept='.gguf,.safetensors,.bin,.pt,.pth'
                  style={{ display: 'none' }}
                  onChange={handleBaseModelSelect}
                />
              </Box>
              <FormHelperText>
                Leave empty to use default base model, or provide path to a custom model file
              </FormHelperText>
            </FormControl>

            <Card variant='soft' sx={{ p: 2 }}>
              <Typography level='body-sm' fontWeight='md'>
                Supported base models:
              </Typography>
              <Typography level='body-xs' component='ul' sx={{ mt: 1, pl: 2 }}>
                <li>Llama 3.2 (1B, 3B) - Recommended for fast inference</li>
                <li>Phi-3 Mini (3.8B) - Great for reasoning tasks</li>
                <li>Qwen 2.5 (0.5B - 7B) - Multilingual support</li>
                <li>Gemma 2 (2B, 9B) - Google&apos;s efficient models</li>
              </Typography>
            </Card>
          </Stack>
        )}

        {/* Step 4: Configuration */}
        {wizardStep === 'configuration' && (
          <Stack spacing={3}>
            <Typography level='title-lg'>Training Configuration</Typography>
            <Typography level='body-sm' color='neutral'>
              Configure training parameters. Default values work well for most cases.
            </Typography>

            {/* Workflow Options Card */}
            <Card variant='outlined' sx={{ p: 2 }}>
              <Typography level='title-sm' startDecorator={<DatasetIcon />} sx={{ mb: 2 }}>
                Workflow Options
              </Typography>

              <Stack spacing={2}>
                <FormControl>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <FormLabel sx={{ m: 0 }}>Generate Data Only</FormLabel>
                      <FormHelperText sx={{ m: 0 }}>
                        Only generate training data, skip training/export/deploy steps
                      </FormHelperText>
                    </Box>
                    <Switch
                      checked={config.generateDataOnly}
                      onChange={e => {
                        updateConfig('generateDataOnly', e.target.checked);
                        if (e.target.checked) updateConfig('skipDataGeneration', false);
                      }}
                      disabled={config.skipDataGeneration}
                    />
                  </Box>
                </FormControl>

                <FormControl>
                  <FormLabel>Existing Dataset Files (Optional)</FormLabel>
                  <Textarea
                    placeholder={'Leave empty to generate from teacher model\n\nOr enter paths:\nC:\\Users\\You\\datasets\\data1.jsonl\nC:\\Users\\You\\datasets\\data2.jsonl'}
                    value={config.uploadedDatasetPath || ''}
                    onChange={e => {
                      updateConfig('uploadedDatasetPath', e.target.value);
                      // Auto-set skipDataGeneration based on whether paths are provided
                      updateConfig('skipDataGeneration', e.target.value.trim().length > 0);
                    }}
                    minRows={3}
                    maxRows={5}
                    sx={{ fontFamily: 'monospace', fontSize: 'sm' }}
                    disabled={config.generateDataOnly}
                  />
                  {config.uploadedDatasetPath && config.uploadedDatasetPath.trim() ? (
                    <Typography level='body-xs' sx={{ mt: 0.5, color: 'primary.500' }}>
                      {config.uploadedDatasetPath.split(/[;\n]/).filter(p => p.trim()).length} file(s) specified - will skip data generation
                    </Typography>
                  ) : (
                    <Typography level='body-xs' sx={{ mt: 0.5, color: 'neutral.500' }}>
                      No files specified - data will be generated from the teacher model
                    </Typography>
                  )}
                  <FormHelperText>
                    If provided, these JSONL dataset files will be used for training (skipping generation).
                    If empty, training data will be generated from the teacher model using your requirements.
                    Enter full absolute paths, one per line. Format: {`{"input": "...", "output": "..."}`} per line.
                  </FormHelperText>
                </FormControl>
              </Stack>
            </Card>

            {/* Output & Checkpointing Card */}
            <Card variant='outlined' sx={{ p: 2 }}>
              <Typography level='title-sm' startDecorator={<FolderOpenIcon />} sx={{ mb: 2 }}>
                Output & Storage
              </Typography>

              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel>Output Directory (Full Path Required)</FormLabel>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Input
                      placeholder='C:\Users\You\training_output'
                      value={config.outputDirectory}
                      onChange={e => updateConfig('outputDirectory', e.target.value)}
                      startDecorator={<FolderOpenIcon />}
                      sx={{ flex: 1, fontFamily: 'monospace' }}
                    />
                    <Button
                      variant='outlined'
                      color='neutral'
                      onClick={handleOutputDirBrowse}
                      startDecorator={<FolderOpenIcon />}
                    >
                      Browse
                    </Button>
                  </Box>
                  <FormHelperText>
                    Full absolute path where training outputs will be saved.
                    Eden server needs the complete path (e.g., C:\Users\You\training_output).
                    Subdirectories for datasets, models, and checkpoints will be created automatically.
                  </FormHelperText>
                </FormControl>

                {!config.generateDataOnly && (
                  <>
                    <FormControl>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <FormLabel sx={{ m: 0 }}>Save Checkpoints</FormLabel>
                          <FormHelperText sx={{ m: 0 }}>
                            Save training progress for pause/resume capability
                          </FormHelperText>
                        </Box>
                        <Switch
                          checked={config.saveCheckpoints}
                          onChange={e => updateConfig('saveCheckpoints', e.target.checked)}
                        />
                      </Box>
                    </FormControl>

                    {config.saveCheckpoints && (
                      <FormControl>
                        <FormLabel>Checkpoint Interval (steps)</FormLabel>
                        <Slider
                          value={config.checkpointInterval}
                          onChange={(_e, value) => updateConfig('checkpointInterval', value as number)}
                          min={50}
                          max={500}
                          step={50}
                          marks={[
                            { value: 50, label: '50' },
                            { value: 100, label: '100' },
                            { value: 250, label: '250' },
                            { value: 500, label: '500' },
                          ]}
                          valueLabelDisplay='auto'
                        />
                        <FormHelperText>
                          Save a checkpoint every N training steps. Lower = more frequent saves (more disk space)
                        </FormHelperText>
                      </FormControl>
                    )}
                  </>
                )}
              </Stack>
            </Card>

            {/* Python Dependencies Warning */}
            {!config.generateDataOnly && (
              <Card variant='soft' color='warning' sx={{ p: 2 }}>
                <Typography level='title-sm' startDecorator={<WarningAmberIcon />} color='warning'>
                  Python ML Dependencies Required
                </Typography>
                <Typography level='body-xs' sx={{ mt: 1 }}>
                  Training, evaluation, and export require Python ML packages. If you see &quot;Missing dependencies&quot; errors, install them with:
                </Typography>
                <Box
                  component='pre'
                  sx={{
                    mt: 1,
                    p: 1,
                    bgcolor: 'background.level1',
                    borderRadius: 'sm',
                    fontSize: 'xs',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                  }}
                >
                  pip install torch transformers peft datasets accelerate bitsandbytes
                </Box>
                <Typography level='body-xs' sx={{ mt: 1, color: 'text.tertiary' }}>
                  GPU recommended for training. Use &quot;Generate Data Only&quot; to skip training if you only need the dataset.
                </Typography>
              </Card>
            )}

            <FormControl>
              <FormLabel>Training Type</FormLabel>
              <Select
                value={config.trainingType}
                onChange={(_e, value) => updateConfig('trainingType', value as TrainingType)}
                disabled={config.generateDataOnly}
              >
                <Option value='lora'>LoRA Adapter (Recommended)</Option>
                <Option value='distillation'>Full Distillation</Option>
                <Option value='full-finetune'>Full Fine-tune (Resource Intensive)</Option>
              </Select>
              <FormHelperText>
                LoRA is faster and uses less memory while maintaining good quality
              </FormHelperText>
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <FormControl>
                <FormLabel>Training Samples</FormLabel>
                <Slider
                  value={config.numSamples}
                  onChange={(_e, value) => updateConfig('numSamples', value as number)}
                  min={100}
                  max={10000}
                  step={100}
                  marks={[
                    { value: 100, label: '100' },
                    { value: 1000, label: '1K' },
                    { value: 5000, label: '5K' },
                    { value: 10000, label: '10K' },
                  ]}
                  valueLabelDisplay='on'
                />
              </FormControl>

              <FormControl>
                <FormLabel>Epochs</FormLabel>
                <Slider
                  value={config.epochs}
                  onChange={(_e, value) => updateConfig('epochs', value as number)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay='on'
                />
              </FormControl>
            </Box>

            {config.trainingType === 'lora' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <FormControl>
                  <FormLabel>LoRA Rank</FormLabel>
                  <Select
                    value={config.loraRank}
                    onChange={(_e, value) => updateConfig('loraRank', value as number)}
                  >
                    <Option value={4}>4 (Smallest)</Option>
                    <Option value={8}>8 (Recommended)</Option>
                    <Option value={16}>16</Option>
                    <Option value={32}>32 (Largest)</Option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>LoRA Alpha</FormLabel>
                  <Select
                    value={config.loraAlpha}
                    onChange={(_e, value) => updateConfig('loraAlpha', value as number)}
                  >
                    <Option value={8}>8</Option>
                    <Option value={16}>16 (Recommended)</Option>
                    <Option value={32}>32</Option>
                  </Select>
                </FormControl>
              </Box>
            )}

            <FormControl>
              <FormLabel>Output Quantization</FormLabel>
              <Select
                value={config.quantization}
                onChange={(_e, value) => updateConfig('quantization', value as GGUFQuantization)}
              >
                <Option value='q4_0'>Q4_0 (Smallest, Fastest)</Option>
                <Option value='q4_1'>Q4_1</Option>
                <Option value='q5_0'>Q5_0</Option>
                <Option value='q5_1'>Q5_1</Option>
                <Option value='q8_0'>Q8_0 (Balanced)</Option>
                <Option value='f16'>F16 (High Quality)</Option>
              </Select>
              <FormHelperText>
                Lower quantization = smaller file, faster inference, slightly lower quality
              </FormHelperText>
            </FormControl>

            <FormControl>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormLabel>Auto-deploy to Ark-SLM</FormLabel>
                <Switch
                  checked={config.autoDeployToArk}
                  onChange={e => updateConfig('autoDeployToArk', e.target.checked)}
                />
              </Box>
              <FormHelperText>
                Automatically deploy the trained model to Ark-SLM for immediate use
              </FormHelperText>
            </FormControl>

            <EdenToolsStatus edenServerConnected={edenServerConnected} />

            {/* Validation feedback */}
            {!canProceed() && (
              <Card variant='soft' color='warning' sx={{ p: 2 }}>
                <Typography level='body-sm' color='warning' fontWeight='lg' startDecorator={<WarningAmberIcon />}>
                  Cannot start training yet:
                </Typography>
                <Box component='ul' sx={{ m: 0, mt: 1, pl: 2 }}>
                  {!edenServerConnected && (
                    <li><Typography level='body-xs'>Eden server not connected</Typography></li>
                  )}
                  {config.outputDirectory.trim().length === 0 && (
                    <li><Typography level='body-xs'>Output directory is required</Typography></li>
                  )}
                  {config.outputDirectory.trim().length > 0 && !config.outputDirectory.includes('/') && !config.outputDirectory.includes('\\') && (
                    <li><Typography level='body-xs'>Output directory must be a full path (e.g., C:\Users\You\output)</Typography></li>
                  )}
                  {config.numSamples <= 0 && (
                    <li><Typography level='body-xs'>Number of samples must be greater than 0</Typography></li>
                  )}
                  {config.epochs <= 0 && (
                    <li><Typography level='body-xs'>Number of epochs must be greater than 0</Typography></li>
                  )}
                </Box>
              </Card>
            )}
          </Stack>
        )}

      </Card>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant='soft'
          color='neutral'
          startDecorator={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          Back
        </Button>

        {currentStepIndex < WIZARD_STEPS.length - 1 ? (
          <Button
            variant='solid'
            color='primary'
            endDecorator={<ArrowForwardIcon />}
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Next
          </Button>
        ) : (
          <Button
            variant='solid'
            color='success'
            startDecorator={<PlayArrowIcon />}
            onClick={handleStartTraining}
            disabled={!canProceed()}
          >
            Start Training
          </Button>
        )}
      </Box>

    </Box>
  );
}
