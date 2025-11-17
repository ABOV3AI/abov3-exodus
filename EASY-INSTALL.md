# ABOV3 Exodus - Easy Installation Guide

**For Non-Technical Users**

This guide will help you install ABOV3 Exodus on your computer in just a few clicks. No programming knowledge required!

---

## What is ABOV3 Exodus?

ABOV3 Exodus is a powerful AI chat application that lets you:
- Chat with multiple AI models (GPT-4, Claude, Gemini, and more)
- Save and organize your conversations
- Use advanced features like multi-model reasoning
- Run locally on your computer for privacy

---

## Choose Your Installation Mode

### Simple Mode (Recommended for Beginners)
- **One-click installation**
- **No database setup needed**
- **All data stored in your browser**
- Perfect for personal use
- Takes 5-10 minutes

### Full Mode (For Advanced Users)
- **Multi-user support**
- **Cloud backup for conversations**
- **User authentication**
- **Admin panel**
- Requires database setup
- Takes 10-15 minutes

---

## Before You Start

### You Need:

1. **Docker Desktop** - Download from:
   - Windows/Mac: https://www.docker.com/products/docker-desktop
   - Install Docker Desktop and make sure it's running (you'll see a whale icon)

2. **Disk Space**: At least 2GB free

3. **Internet Connection**: For downloading the application

---

## Installation Instructions

### For Windows Users

#### Simple Mode (No Database)

1. **Download the project** to your computer
2. **Open the folder** in File Explorer:
   ```
   abov3-genesis-codeforger/inference_server/abov3-exodus/
   ```
3. **Double-click** `install-simple.bat`
4. **Wait** for the installation to complete (5-10 minutes)
5. **Done!** Your browser will open automatically to http://localhost:3006

#### Full Mode (With Database)

1. **Download the project** to your computer
2. **Open the folder** in File Explorer:
   ```
   abov3-genesis-codeforger/inference_server/abov3-exodus/
   ```
3. **Double-click** `install-full.bat`
4. **Wait** for the installation to complete (10-15 minutes)
5. **Create your account** when the browser opens
6. **Done!** Start chatting at http://localhost:3006

---

### For Mac/Linux Users

#### Simple Mode (No Database)

1. **Download the project** to your computer
2. **Open Terminal** (Applications > Utilities > Terminal)
3. **Navigate to the folder**:
   ```bash
   cd path/to/abov3-genesis-codeforger/inference_server/abov3-exodus/
   ```
4. **Run the installer**:
   ```bash
   ./install-simple.sh
   ```
5. **Wait** for installation to complete (5-10 minutes)
6. **Done!** Open http://localhost:3006 in your browser

#### Full Mode (With Database)

1. **Download the project** to your computer
2. **Open Terminal**
3. **Navigate to the folder**:
   ```bash
   cd path/to/abov3-genesis-codeforger/inference_server/abov3-exodus/
   ```
4. **Run the installer**:
   ```bash
   ./install-full.sh
   ```
5. **Wait** for installation to complete (10-15 minutes)
6. **Create your account** when the browser opens
7. **Done!** Start chatting at http://localhost:3006

---

## Managing Your Installation

### Windows

Use the `manage.bat` script:

```batch
REM Start the application
manage.bat start simple     # For simple mode
manage.bat start full        # For full mode

REM Stop the application
manage.bat stop simple
manage.bat stop full

REM View logs (helpful for troubleshooting)
manage.bat logs simple
manage.bat logs full

REM Check if it's running
manage.bat status simple
manage.bat status full

REM Update to latest version
manage.bat update simple
manage.bat update full

REM Uninstall
manage.bat uninstall simple
manage.bat uninstall full
```

**Or use these shortcuts:**
- **Start**: Double-click `manage.bat` and type `start`
- **Stop**: Double-click `manage.bat` and type `stop`

### Mac/Linux

Use the `manage.sh` script:

```bash
# Start the application
./manage.sh start simple     # For simple mode
./manage.sh start full        # For full mode

# Stop the application
./manage.sh stop simple
./manage.sh stop full

# View logs
./manage.sh logs simple
./manage.sh logs full

# Check status
./manage.sh status simple
./manage.sh status full

# Update
./manage.sh update simple
./manage.sh update full

# Uninstall
./manage.sh uninstall simple
./manage.sh uninstall full
```

---

## Upgrading from Simple to Full Mode

Already using Simple Mode and want the full features?

### Windows
Double-click `upgrade-to-full.bat`

### Mac/Linux
```bash
./upgrade-to-full.sh
```

This will:
- Keep your existing browser conversations
- Add database support
- Enable authentication and cloud backup
- Add admin panel

---

## First-Time Setup

### For Simple Mode:

1. Open http://localhost:3006
2. Click **Settings** (gear icon)
3. Go to **Models** tab
4. Add your AI API keys:
   - OpenAI (for GPT-4)
   - Anthropic (for Claude)
   - Google (for Gemini)
   - etc.
5. Start chatting!

### For Full Mode:

1. Open http://localhost:3006
2. Click **Sign Up**
3. Enter:
   - Email address
   - Password (min 8 characters)
   - Name (optional)
4. Click **Create Account**
5. **Sign In** with your new account
6. Configure AI API keys in Settings
7. Start chatting!

---

## Common Questions

### Q: Do I need to configure anything before installation?
**A:** No! The installers work out of the box with sensible defaults.

### Q: Where is my data stored?

**Simple Mode:**
- In your browser (IndexedDB)
- Clearing browser data will delete conversations

**Full Mode:**
- In a PostgreSQL database (inside Docker)
- Data persists even if you close the app
- Use `manage.bat backup full` to backup

### Q: Can I use both modes at the same time?
**A:** No, but you can switch between them easily using the upgrade script.

### Q: How do I add AI API keys?
**A:** Go to Settings > Models in the UI. You can add keys for:
- OpenAI (https://platform.openai.com/api-keys)
- Anthropic (https://console.anthropic.com/)
- Google AI (https://makersuite.google.com/app/apikey)
- And many more providers

### Q: Is my data private?
**A:** Yes! ABOV3 Exodus runs locally on your computer. Your conversations and API keys never leave your machine (except when you make API calls to AI providers).

### Q: Can I access it from other devices?

**Simple Mode:** No, data is browser-only

**Full Mode:** Yes! Access from any device on your network:
- Find your computer's IP address
- Access from other devices: http://YOUR_IP:3006

### Q: How do I stop the application?

**Windows:**
```batch
manage.bat stop simple
# or
manage.bat stop full
```

**Mac/Linux:**
```bash
./manage.sh stop simple
# or
./manage.sh stop full
```

### Q: How do I completely uninstall?

**Windows:**
```batch
manage.bat uninstall simple
# or
manage.bat uninstall full
```

**Mac/Linux:**
```bash
./manage.sh uninstall simple
# or
./manage.sh uninstall full
```

Then uninstall Docker Desktop if you don't need it.

---

## Troubleshooting

### Installation Failed

1. **Check Docker is running:**
   - Look for Docker whale icon in system tray
   - Open Docker Desktop
   - Wait for "Docker is running" message

2. **Check disk space:**
   - Need at least 2GB free

3. **Restart Docker:**
   - Right-click Docker icon > Restart
   - Wait 30 seconds
   - Try installation again

### Application Won't Open

1. **Check if it's running:**
   ```
   manage.bat status simple
   ```

2. **View logs for errors:**
   ```
   manage.bat logs simple
   ```

3. **Restart the application:**
   ```
   manage.bat restart simple
   ```

### Port 3006 Already in Use

Another application is using port 3006.

**Option 1: Stop the other application**

**Option 2: Change the port**
Edit `docker-compose-simple.yaml` or `docker-compose-full.yaml`:
```yaml
ports:
  - "3007:3000"  # Changed from 3006 to 3007
```

Then access at http://localhost:3007

### Can't Create Account (Full Mode)

1. Check database is running:
   ```
   manage.bat status full
   ```

2. Check logs:
   ```
   manage.bat logs full
   ```

3. Look for database connection errors

### Forgot Password (Full Mode)

Currently no password reset feature. Options:
1. Contact admin to reset in database
2. Or uninstall and reinstall (will lose data unless backed up)

---

## Getting Help

### View Logs
```
manage.bat logs simple   # Windows
./manage.sh logs simple  # Mac/Linux
```

Logs show detailed error messages that help diagnose issues.

### Check Status
```
manage.bat status simple   # Windows
./manage.sh status simple  # Mac/Linux
```

Shows if containers are running and healthy.

### Technical Documentation
- See `DOCKER-TECHNICAL.md` for developer info
- See `README_IMPLEMENTATION.md` for features overview
- See `IMPLEMENTATION_COMPLETE_GUIDE.md` for API docs

---

## Security Tips

### For Production Use (Full Mode):

1. **Change default passwords:**
   Edit `.env` file:
   ```
   POSTGRES_PASSWORD=use_a_strong_password_here
   NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
   ```

2. **Use HTTPS:**
   - Deploy behind a reverse proxy (nginx, Caddy)
   - Get SSL certificate (Let's Encrypt)

3. **Backup regularly:**
   ```
   manage.bat backup full   # Windows
   ./manage.sh backup full  # Mac/Linux
   ```

4. **Don't expose PostgreSQL:**
   In `docker-compose-full.yaml`, comment out:
   ```yaml
   # ports:
   #   - "5432:5432"
   ```

---

## Next Steps

### Configure Email (Full Mode)

For magic link login and notifications:

1. Sign in as admin
2. Go to **Admin Panel**
3. Click **SMTP Configuration**
4. Enter your email settings:
   - **Gmail users:** Use app password (not regular password)
   - **Host:** smtp.gmail.com
   - **Port:** 587
   - **Username:** your@gmail.com
   - **Password:** your-app-password
5. Click **Test Email** to verify
6. **Save**

### Explore Features

- **Multi-model chat:** Compare responses from different AIs
- **Beam mode:** Get multiple AI opinions simultaneously
- **Personas:** Create custom AI personalities
- **Attachments:** Upload images and documents
- **Voice input:** Dictate your messages
- **Code execution:** Run code snippets
- **Image generation:** Create images with DALL-E/Midjourney

---

## Success!

You're all set up! Enjoy using ABOV3 Exodus.

**Questions?** Check `DOCKER-TECHNICAL.md` for advanced topics.

**Happy chatting!** 🚀
