# ABOV3 Ark-SLM

Ark-SLM is a local inference server for running Small Language Models (SLMs) on-device, powered by llama.cpp.

## Overview

Ark-SLM enables ABOV3 Exodus to run language models locally without requiring cloud API access. It provides:

- Local model hosting with GGUF format support
- OpenAI-compatible chat completion API
- Dynamic model loading/unloading
- Low memory footprint for edge deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ABOV3 Exodus                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat UI      │  │ Model Select │  │ Settings     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                │                │               │
│           └────────────────┼────────────────┘               │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Ark-SLM Vendor Module                  │   │
│  │   - ArkSLMServiceSetup.tsx (Configuration UI)       │   │
│  │   - ark-slm.vendor.ts (Vendor definition)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Ark-SLM Router (tRPC)                  │   │
│  │   - getStatus, listModels, loadModel, unloadModel   │   │
│  │   - refreshModels                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼ HTTP
┌─────────────────────────────────────────────────────────────┐
│                   Ark-SLM Server                            │
│              (Default: http://127.0.0.1:3200)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 llama.cpp Engine                      │  │
│  │   - GGUF model loading                               │  │
│  │   - Token generation                                 │  │
│  │   - KV-cache management                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 Models Directory                      │  │
│  │   - *.gguf files                                     │  │
│  │   - Custom distilled models                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

The Ark-SLM server exposes these endpoints:

### Model Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models/status` | GET | Get server status and currently loaded model |
| `/v1/models` | GET | List all available models |
| `/models/load` | POST | Load a model by ID |
| `/models/unload` | POST | Unload the current model |
| `/models/refresh` | POST | Scan for new models in the models directory |

### Chat Completions (OpenAI-compatible)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Generate chat completions (streaming supported) |

## Files and Folders

```
src/modules/llms/
├── server/ark-slm/
│   ├── ark-slm.router.ts      # tRPC router with all endpoints
│   └── ark-slm.models.ts      # Model library with metadata
│
└── vendors/ark-slm/
    ├── ark-slm.vendor.ts      # IModelVendor implementation
    └── ArkSLMServiceSetup.tsx # Configuration UI component
```

## Model Library

The `ark-slm.models.ts` file contains metadata for popular SLM models:

- **Context window sizes** for accurate token counting
- **Capability flags** (vision, tools/functions)
- **Provider information** (Meta, Microsoft, Google, etc.)
- **Model descriptions** for UI display

Models are matched by ID prefix against discovered GGUF files.

### Supported Model Families

| Provider | Models | Sizes |
|----------|--------|-------|
| Meta | Llama 3.2, Llama 3.1 | 1B-8B |
| Microsoft | Phi-3, Phi-3.5, Phi-4 | 3.8B |
| Alibaba | Qwen 2.5, Qwen Coder | 0.5B-14B |
| Google | Gemma, Gemma 2, Gemma 3 | 2B-27B |
| Mistral AI | Mistral 7B, Mistral Nemo | 7B-12B |
| DeepSeek | DeepSeek Coder, DeepSeek R1 | 1.3B-70B |
| Hugging Face | SmolLM, SmolLM 2 | 135M-1.7B |
| ABOV3 | Custom/Distilled | Variable |

## Integration with AIX

Ark-SLM integrates with AIX via the OpenAI-compatible dialect:

1. Chat requests route through `chatGenerate.dispatch.ts`
2. The dispatcher detects `ark-slm` dialect and uses OpenAI adapter
3. Streaming responses use Server-Sent Events (SSE)
4. Responses are parsed as OpenAI chat completions

## Configuration

### Exodus Settings

In the ABOV3 Exodus Settings → Models → Ark-SLM:

- **Host URL**: Default `http://127.0.0.1:3200`
- **Status polling**: Every 10 seconds
- **Scan Models**: Discover new GGUF files

### Environment Variables

The Ark-SLM server (external) typically uses:

```bash
ARK_SLM_MODELS_DIR=/path/to/models
ARK_SLM_PORT=3200
ARK_SLM_HOST=127.0.0.1
```

## Eden Integration

Models trained/distilled via ABOV3 Eden can be deployed to Ark-SLM:

1. Eden exports models in GGUF format
2. Model files placed in Ark-SLM models directory
3. Exodus triggers "Scan Models" to discover new model
4. Model appears in model selector for inference

Custom models are tagged with `ark-custom` or `eden-distilled` prefixes.

## Troubleshooting

### Server Not Responding

1. Verify Ark-SLM server is running
2. Check the host URL in settings
3. Ensure firewall allows localhost connections

### Model Not Loading

1. Check available memory (GGUF models require RAM)
2. Verify model file integrity
3. Try a smaller quantization (q4_0 vs q8_0)

### Slow Inference

1. Use smaller models (1B-3B) for faster responses
2. Enable GPU acceleration if available
3. Reduce context window size in model settings
