# ABOV3 Pauline TTS - Quick Start Guide

Professional text-to-speech for ABOV3 Exodus in 3 simple steps.

## Step 1: Deploy the Service

```bash
# Navigate to inference_server directory
cd ../inference_server

# Deploy ABOV3 Pauline TTS with Docker
docker-compose -f docker-compose.pauline.yml up -d

# Wait 2-3 minutes for models to download, then verify
curl http://localhost:8004/api/ui/initial-data
```

## Step 2: Configure in Exodus

1. Open ABOV3 Exodus at http://localhost:3000
2. Go to **Settings** → **Preferences** → **Voice**
3. Scroll to **ABOV3 Pauline Configuration**
4. Enter endpoint: `http://localhost:8004`
5. Click **Test ABOV3 Pauline TTS**
6. Select your preferred voice (28 available, Emily is default)

## Step 3: Start Using TTS

- Select text in any conversation and use the voice synthesis feature
- Or use the built-in TTS controls in the chat interface
- Adjust tempo and speed in settings as needed

## Requirements

**Minimum (CPU mode - slow):**
- 8GB RAM
- 10GB disk space
- Docker installed

**Recommended (GPU mode - fast):**
- NVIDIA GPU with 6GB+ VRAM
- 12GB RAM
- 10GB disk space
- Docker with NVIDIA Container Toolkit

## Troubleshooting

**Service won't start:**
```bash
docker logs abov3-pauline-tts
```

**Can't connect from Exodus:**
- Verify service is running: `docker ps | grep pauline`
- Test endpoint: `curl http://localhost:8004/api/ui/initial-data`
- Check endpoint URL in Exodus settings

**Need GPU acceleration:**
```bash
# Verify GPU is available
nvidia-smi

# Rebuild with CUDA support (default)
docker-compose -f docker-compose.pauline.yml down
docker-compose -f docker-compose.pauline.yml up -d
```

## Advanced Configuration

See [docs/config-pauline-tts.md](docs/config-pauline-tts.md) for:
- ROCm (AMD GPU) setup
- Custom port configuration
- Production deployment
- API reference
- Security considerations

## Docker Image Variants

- **CUDA (NVIDIA)**: `ghcr.io/abov3ai/abov3-pauline-tts:main` (default)
- **ROCm (AMD)**: `ghcr.io/abov3ai/abov3-pauline-tts:main-rocm`
- **CPU**: `ghcr.io/abov3ai/abov3-pauline-tts:main-cpu`

## Features

✅ 28 professional voices
✅ Real-time streaming
✅ GPU acceleration (CUDA/ROCm)
✅ Self-hosted privacy
✅ Customizable tempo and speed
✅ One-command deployment

## Support

- **Full Documentation**: [docs/config-pauline-tts.md](docs/config-pauline-tts.md)
- **Issues**: https://github.com/ABOV3AI/abov3-pauline-tts/issues
- **ABOV3 Support**: support@abov3.com
