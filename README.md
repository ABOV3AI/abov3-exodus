# ABOV3 Exodus 🚀

**Advanced AI Workspace for Multi-Model Reasoning, Coding, and Research**

ABOV3 Exodus is a next-generation AI workspace built for professionals who demand more from their AI tools. Fork of the exceptional [Big-AGI](https://github.com/enricoros/big-AGI) project, enhanced with additional features and ABOV3 branding.

**What makes ABOV3 Exodus different:**
**Intelligence** with Beam & Merge for multi-model reasoning and bleeding-edge AI models - **Control** with personas, data ownership, unlimited usage with your API keys, and *no vendor lock-in* - **Speed** with a local-first, over-powered, zero-latency web application.

**Who uses ABOV3 Exodus:**
Built for engineers, founders, researchers, self-hosters, and IT departments who need power, reliability, and transparency.

---

## 🚀 Get Started

**Self-Host & Develop:**
Full control over your AI workspace. Deploy locally or on your infrastructure.

```bash
# Clone the repository
git clone https://github.com/ABOV3AI/abov3-exodus.git
cd abov3-exodus

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000 to start using ABOV3 Exodus.

**Deploy with Docker:**
```bash
docker-compose up -d
```

See [Installation Guide](docs/installation.md) for detailed setup instructions.

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

## 📚 Documentation

- **[Installation Guide](docs/installation.md)** - Setup and deployment
- **[Environment Variables](docs/environment-variables.md)** - Configuration options
- **[Docker Deployment](docs/deploy-docker.md)** - Containerized deployment
- **[Kubernetes Deployment](docs/deploy-k8s.md)** - K8s configuration
- **[Customization Guide](docs/customizations.md)** - Branding and features
- **[Configuration Guides](docs/)** - Provider-specific setup

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

## 🤝 Attribution

ABOV3 Exodus is built upon the outstanding [Big-AGI](https://github.com/enricoros/big-AGI) project by [Enrico Ros](https://github.com/enricoros).

**Original Project:**
- **Repository**: https://github.com/enricoros/big-AGI
- **Author**: Enrico Ros
- **License**: MIT License
- **Website**: https://big-agi.com

We are deeply grateful to Enrico Ros and the Big-AGI community for creating such an exceptional foundation. Big-AGI pioneered many advanced AI interaction patterns including multi-model reasoning (Beam), persona systems, and local-first architecture.

**ABOV3 Modifications:**
- Complete UI rebrand with ABOV3 visual identity
- Custom persona icon system with animations
- Additional project management features
- Enhanced file system integration
- Production-ready configuration

Both projects are licensed under the MIT License. See [LICENSE](LICENSE) and [ATTRIBUTION.md](ATTRIBUTION.md) for full details.

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

**Copyright:**
- 2025 ABOV3 Genesis (modifications)
- 2023-2025 Enrico Ros (original Big-AGI)

---

## 🔗 Links

- **ABOV3 Website**: https://abov3.com
- **Original Big-AGI**: https://big-agi.com
- **Repository**: https://github.com/ABOV3AI/abov3-exodus
- **Issues**: https://github.com/ABOV3AI/abov3-exodus/issues
- **Privacy Policy**: https://abov3.com/privacy
- **Terms of Service**: https://abov3.com/terms

---

## 🌟 Support

**Found a bug?** [Open an issue](https://github.com/ABOV3AI/abov3-exodus/issues)
**Have a feature request?** [Start a discussion](https://github.com/ABOV3AI/abov3-exodus/discussions)
**Want to contribute?** Pull requests are welcome!

---

Built with ❤️ by ABOV3 Genesis
Based on Big-AGI by Enrico Ros
