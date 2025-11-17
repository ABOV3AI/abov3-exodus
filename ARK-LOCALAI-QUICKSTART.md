# ABOV3 Ark LocalAI - Quick Start Guide

Run Mistral models locally with ABOV3 Exodus in 4 simple steps.

## Step 1: Deploy ABOV3 Ark

```bash
# Navigate to inference_server directory
cd ../inference_server

# Deploy ABOV3 Ark LocalAI with Docker
docker-compose -f docker-compose.ark.yml up -d

# Wait 2-3 minutes for service to start, then verify
curl http://localhost:8080/readyz
```

## Step 2: Install a Mistral Model

**Via Exodus UI (Recommended):**
1. Open ABOV3 Exodus at http://localhost:3000
2. Settings → Models → LocalAI
3. Enter endpoint: `http://localhost:8080`
4. Click **Gallery Admin**
5. Select **mistral-hermes** → Install
6. Wait for download (~4.4GB)

**Or via command line:**
```bash
curl http://localhost:8080/models/apply \
  -H "Content-Type: application/json" \
  -d '{"id": "mistral-hermes"}'
```

## Step 3: Configure in Exodus

1. Settings → Models → LocalAI
2. Endpoint: `http://localhost:8080`
3. Click **Models 🔄** to refresh
4. Verify **mistral-hermes** appears

## Step 4: Start Chatting

1. Create new conversation
2. Select **mistral-hermes** model
3. Send message: "Hello, introduce yourself"
4. Get response from your local Mistral model!

## Requirements

**Minimum (CPU mode - slow):**
- 8GB RAM
- 10GB disk space
- Docker installed

**Recommended (GPU mode - fast):**
- NVIDIA GPU with 6GB+ VRAM
- 16GB RAM
- 10GB disk space
- Docker with NVIDIA Container Toolkit

## Available Models

| Model | Size | Best For |
|-------|------|----------|
| **mistral-hermes** | 4.4 GB | General chat, instructions |
| **mistral-openorca** | 4.4 GB | Enhanced reasoning |
| **nous-hermes-2-mistral** | 4.4 GB | Technical tasks, coding |

## Troubleshooting

**Service won't start:**
```bash
docker logs abov3-ark-localai
```

**Can't connect from Exodus:**
- Verify service: `docker ps | grep ark`
- Test endpoint: `curl http://localhost:8080/readyz`
- Check endpoint URL in settings

**Slow performance:**
- GPU mode is 10-30x faster than CPU
- Verify GPU: `nvidia-smi`
- Check logs for GPU detection

## Docker Image Variants

- **CUDA (NVIDIA)**: `ghcr.io/abov3ai/abov3-ark:main` (default)
- **ROCm (AMD)**: `ghcr.io/abov3ai/abov3-ark:main-rocm`
- **CPU**: `ghcr.io/abov3ai/abov3-ark:main-cpu`

Edit `docker-compose.ark.yml` to change variant.

## Features

✅ 3 curated Mistral models
✅ GPU acceleration (CUDA/ROCm/CPU)
✅ OpenAI-compatible API
✅ Self-hosted privacy
✅ Model gallery UI
✅ One-command deployment

## Support

- **Full Documentation**: [docs/config-ark-localai.md](docs/config-ark-localai.md)
- **ABOV3 Ark Repository**: https://github.com/ABOV3AI/abov3-ark
- **Issues**: https://github.com/ABOV3AI/abov3-ark/issues
- **ABOV3 Support**: support@abov3.com
