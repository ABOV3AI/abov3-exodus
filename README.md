# ABOV3 Exodus 🚀

**Advanced AI Workspace for Multi-Model Reasoning, Coding, and Research**

ABOV3 Exodus is a next-generation AI workspace built for professionals who demand more from their AI tools.

**What makes ABOV3 Exodus different:**
**Intelligence** with Beam & Merge for multi-model reasoning and bleeding-edge AI models - **Control** with personas, data ownership, unlimited usage with your API keys, and *no vendor lock-in* - **Speed** with a local-first, over-powered, zero-latency web application.

**Who uses ABOV3 Exodus:**
Built for engineers, founders, researchers, self-hosters, and IT departments who need power, reliability, and transparency.

---

## 🚀 Installation

### Quick Start with Docker (Recommended for Non-Technical Users)

**One-click installation** for easy setup:

#### Windows
```batch
# Simple Mode (no database, browser storage)
install-simple.bat

# Full Mode (with database, authentication, multi-user)
install-full.bat
```

#### Mac/Linux
```bash
# Simple Mode (no database, browser storage)
./install-simple.sh

# Full Mode (with database, authentication, multi-user)
./install-full.sh
```

📖 **See [EASY-INSTALL.md](EASY-INSTALL.md) for detailed installation guide**

**Docker Requirements:**
- Docker Desktop installed and running
- 2GB free disk space
- 5-15 minutes setup time

### Manual Installation (For Developers)

#### Prerequisites

- **Node.js**: Version 18.17 or later
- **npm**: Version 9 or later (comes with Node.js)
- **Git**: For cloning the repository

#### Quick Start (Development)

Full control over your AI workspace. Deploy locally for development:

```bash
# 1. Clone the repository
git clone https://github.com/ABOV3AI/abov3-exodus.git
cd abov3-exodus

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

Visit **http://localhost:3000** to start using ABOV3 Exodus.

#### Production Deployment

For production use, build and run the optimized version:

```bash
# 1. Build production version
npm run build

# 2. Start production server
npm start
```

The production server will run on **http://localhost:3000** with optimized performance.

### Deploy with Docker

```bash
# Using Docker Compose
docker-compose up -d

# Or using Docker directly
docker build -t abov3-exodus .
docker run -p 3000:3000 abov3-exodus
```

### Environment Configuration

Create a `.env.local` file in the root directory for API keys (optional):

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google (Gemini)
GOOGLE_API_KEY=AI...

# Other providers as needed
```

**Note**: API keys can also be configured through the UI in Settings → Services.

---

## ✨ Features

### 🎯 Multi-Model AI (Beam)
- **Parallel Processing**: Run multiple AI models simultaneously
- **Compare & Merge**: Intelligent fusion of responses from different models
- **Save Presets**: Reuse your best model combinations

### 🤖 100+ AI Models Supported
- **OpenAI**: GPT-4, GPT-4 Turbo, o1, o3
- **Anthropic**: Claude 4.5 Sonnet, Claude 3.5 Haiku, Claude Opus
- **Google**: Gemini 2.0, Gemini 2.5 Flash, Gemini 2.0 Flash Thinking
- **Open Source**: Ollama, LM Studio, LocalAI
- **Cloud Providers**: Azure OpenAI, AWS Bedrock, OpenRouter
- And many more...

### 🎭 Advanced Persona System
- Pre-built professional personas (Developer, Scientist, Executive, etc.)
- Custom persona creator with AI-assisted generation
- Context-aware responses based on selected persona

### 🖼️ Image Generation & Editing
- Integrated image generation with DALL-E and other providers
- Multi-image editing and enhancement
- Built-in prompt engineering assistance

### 🔍 Web Search & Browse
- Real-time web search with citations
- Page content extraction and analysis
- YouTube transcript integration

### 🎙️ ABOV3 Pauline TTS (New!)
- **Self-Hosted TTS**: Professional text-to-speech with 28 voices
- **GPU Accelerated**: CUDA, ROCm, and CPU support
- **High Quality**: Natural-sounding voice synthesis
- **Real-time Streaming**: Low-latency audio generation
- **Privacy-First**: All processing happens locally
- **Easy Setup**: One-command Docker deployment

**Quick Start:**
```bash
# Deploy ABOV3 Pauline TTS
cd inference_server
docker-compose -f docker-compose.pauline.yml up -d

# Configure in Settings → Preferences → Voice
# Endpoint: http://localhost:8004
```

📖 **See [docs/config-pauline-tts.md](docs/config-pauline-tts.md) for detailed setup guide**

### 🏛️ ABOV3 Ark LocalAI (New!)
- **Self-Hosted LLMs**: Run Mistral models locally with full privacy
- **GPU Accelerated**: CUDA, ROCm, and CPU support
- **3 Curated Models**: OpenHermes-2.5, Mistral-OpenOrca, Nous-Hermes-2
- **Model Gallery**: Easy installation via UI or API
- **OpenAI Compatible**: Drop-in replacement for OpenAI API
- **No Cloud Dependencies**: All inference happens on your hardware

**Quick Start:**
```bash
# Deploy ABOV3 Ark LocalAI
cd inference_server
docker-compose -f docker-compose.ark.yml up -d

# Configure in Settings → Models → LocalAI
# Endpoint: http://localhost:8080

# Install models via Gallery Admin in Exodus UI
```

📖 **See [docs/config-ark-localai.md](docs/config-ark-localai.md) for detailed setup guide**

### 📁 File Operations
- **Read/Write Files**: AI can read and modify files in your project
- **Directory Management**: Create directories and organize files
- **Project Integration**: Select any local directory for AI assistance
- **Browser-Native**: Uses File System Access API (Chrome, Edge, Safari)
- **Visual Indicator**: Green chip shows when file tools are active

**How to use:**
1. Go to Projects in the sidebar
2. Click "Add Project" and select a directory
3. Green project indicator appears in status bar
4. AI can now use `read_file`, `write_file`, `list_files`, `create_directory` tools

### 💾 Data Ownership & Privacy
- **Local-First Architecture**: Your data stays on your device
- **No Vendor Lock-In**: Use your own API keys
- **Full Export/Import**: Backup and restore conversations
- **IndexedDB Storage**: Fast, efficient local storage

### ⚡ Performance Optimized
- Zero-latency UI updates
- Streaming responses from all providers
- Efficient token counting and cost tracking
- Mobile-responsive design

### 🎨 Professional UI
- ABOV3-branded modern interface
- Custom animated persona icons
- Dark mode optimized
- Split-pane multi-conversation support

---

## 🏗️ Project Structure

```
abov3-exodus/
├── src/
│   ├── apps/          # Feature applications (chat, call, beam, draw, etc.)
│   ├── modules/       # Reusable business logic (AIX, LLMs, etc.)
│   ├── common/        # Shared infrastructure and utilities
│   └── server/        # Backend API layer with tRPC
├── docs/              # Documentation
├── public/            # Static assets
└── pages/             # Next.js pages routing
```

**Technologies:**
- **Frontend**: Next.js 15, React 18, Material-UI Joy
- **State**: Zustand with IndexedDB persistence
- **API**: tRPC with React Query
- **Runtime**: Edge Runtime for AI ops, Node.js for data processing

---

## 📝 License

ABOV3 Exodus Enterprise License - Copyright © 2025 ABOV3, Inc. All rights reserved.

This software is provided under the ABOV3 Exodus Enterprise License. See [LICENSE](LICENSE) for full terms.

**For Commercial Use:**
- SaaS/Hosting services
- Redistribution
- Commercial derivatives

Contact: licensing@abov3.com or visit https://abov3.com/enterprise

---

## 🔗 Links

- **ABOV3 Website**: https://abov3.com
- **Repository**: https://github.com/ABOV3AI/abov3-exodus
- **Issues**: https://github.com/ABOV3AI/abov3-exodus/issues
- **Enterprise Licensing**: licensing@abov3.com
- **Legal**: legal@abov3.com
- **Privacy Policy**: https://abov3.com/privacy
- **Terms of Service**: https://abov3.com/terms

---

## 🌟 Support

**Found a bug?** [Open an issue](https://github.com/ABOV3AI/abov3-exodus/issues)
**Have a feature request?** [Start a discussion](https://github.com/ABOV3AI/abov3-exodus/discussions)
**Want to contribute?** Pull requests are welcome!

---

Built with ❤️ by ABOV3 Exodus
