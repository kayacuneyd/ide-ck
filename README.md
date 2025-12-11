# 🚀 Self-Hosted Web IDE

A fully-featured, self-hosted web-based code editor with Monaco Editor, integrated terminal, and multi-language support.

## ✨ Features (Phase 1)

### Editor
- 🎨 **Monaco Editor** - VS Code's editor with full syntax highlighting
- 🌳 **File Tree** - Hierarchical file navigation
- 📁 **Project Management** - Create and manage multiple projects
- 💾 **Auto-save** - Save files with Ctrl+S
- 🎯 **Language Detection** - Automatic language detection by file extension

### Terminal
- 💻 **Integrated Terminal** - Full bash terminal with xterm.js
- 🔌 **WebSocket Connection** - Real-time terminal using node-pty
- 📂 **Project Context** - Terminal opens in project directory
- 🎨 **Color Support** - Full ANSI color support

### Code Execution
- ▶️ **Run Code** - Execute JavaScript, Python, PHP directly
- 📊 **Output Panel** - View execution results in-app
- ⏱️ **Timeout Protection** - 30-second execution timeout

### Templates
- 📦 **Empty** - Basic README-only project
- ⚡ **SvelteKit** - SvelteKit starter template
- 🐘 **PHP** - PHP application template
- 🐍 **Python** - Python project template

## 📋 Prerequisites

- **Ubuntu 24.04** (or similar Linux)
- **Node.js v20+**
- **npm**
- **PM2** (process manager)
- **Nginx** (reverse proxy)
- **Python 3** (for Python code execution)
- **PHP** (for PHP code execution)

## 🛠️ Installation

### 1. Clone Repository

```bash
cd /var/www
git clone <repository-url> ide-ck
cd ide-ck
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

**.env configuration:**
```env
NODE_ENV=production
PORT=3001
PROJECTS_DIR=/var/www/projects
```

### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 4. Create Projects Directory

```bash
mkdir -p /var/www/projects
chmod 755 /var/www/projects
```

### 5. Install PM2 and serve (if not installed)

```bash
npm install -g pm2 serve
```

### 6. Start with PM2

```bash
cd /var/www/ide-ck

# Start both backend and frontend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 7. Setup Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/ide.kayacuneyt.com

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ide.kayacuneyt.com /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 8. Setup SSL (Optional but Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d ide.kayacuneyt.com

# Certbot will automatically configure nginx for HTTPS
```

## 🚀 Usage

### Development Mode

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Access at: `http://localhost:3002`

### Production Mode

```bash
pm2 status
pm2 logs ide-backend
pm2 logs ide-frontend
```

Access at: `http://ide.kayacuneyt.com`

## 📖 User Guide

### Creating a Project

1. Click **➕ Yeni Proje**
2. Enter project name (alphanumeric, dash, underscore only)
3. Choose template: `empty`, `sveltekit`, `php`, or `python`
4. Project will be created in `/var/www/projects/`

### Working with Files

- **New File**: Click **📄 Yeni Dosya**, enter filename
- **Open File**: Click on file in the tree
- **Save File**: Click **💾 Kaydet** or press `Ctrl+S`
- **Edit**: Type in Monaco Editor

### Running Code

1. Open a `.js`, `.py`, or `.php` file
2. Click **▶️ Çalıştır** or press `Ctrl+R`
3. View output in the output panel

### Using Terminal

- Terminal automatically connects to current project directory
- Run any bash command: `ls`, `npm install`, `git`, etc.
- Terminal persists across file navigation
- Click **🔄** to reconnect if disconnected

### Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S` - Save file
- `Ctrl+R` / `Cmd+R` - Run code

## 🔧 API Documentation

### Endpoints

#### Health Check
```bash
GET /api/health
```

#### List Projects
```bash
GET /api/projects
```

#### Create Project
```bash
POST /api/projects
Content-Type: application/json

{
  "name": "my-project",
  "template": "empty|sveltekit|php|python"
}
```

#### Get File Tree
```bash
GET /api/tree?project=my-project
```

#### Read File
```bash
GET /api/files?project=my-project&path=index.js
```

#### Create/Update File
```bash
POST /api/files
Content-Type: application/json

{
  "project": "my-project",
  "path": "index.js",
  "content": "console.log('hello');"
}
```

#### Delete File
```bash
DELETE /api/files?project=my-project&path=index.js
```

#### Run Code
```bash
POST /api/run
Content-Type: application/json

{
  "project": "my-project",
  "file": "index.js",
  "language": "javascript|python|php"
}
```

### WebSocket Terminal

```javascript
ws://localhost:3001?project=my-project

// Send input
{ "type": "input", "data": "ls\n" }

// Resize terminal
{ "type": "resize", "cols": 80, "rows": 30 }
```

## 🧪 Testing

### Backend Tests

```bash
# Health check
curl http://localhost:3001/api/health

# Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"test-project","template":"empty"}'

# List projects
curl http://localhost:3001/api/projects

# Create file
curl -X POST http://localhost:3001/api/files \
  -H "Content-Type: application/json" \
  -d '{"project":"test-project","path":"test.js","content":"console.log(\"hello\");"}'

# Get file tree
curl http://localhost:3001/api/tree?project=test-project

# Run code
curl -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -d '{"project":"test-project","file":"test.js","language":"javascript"}'
```

### Frontend Tests

1. ✅ Load IDE at `http://localhost:3002`
2. ✅ Create new project
3. ✅ File tree loads
4. ✅ Create new file
5. ✅ Monaco Editor syntax highlighting works
6. ✅ Save file (button + Ctrl+S)
7. ✅ Run JavaScript code
8. ✅ Run Python code
9. ✅ Run PHP code
10. ✅ Terminal connects and works
11. ✅ Switch between projects

## 🔒 Security

### Implemented
- ✅ Path traversal protection
- ✅ Project name validation (alphanumeric + dash + underscore)
- ✅ File size limits (10MB max)
- ✅ Code execution timeout (30 seconds)
- ✅ Sandboxed project directories

### To Be Added (Future)
- ⏳ Authentication & Authorization
- ⏳ Rate limiting
- ⏳ User isolation
- ⏳ CSRF protection

## 📁 Project Structure

```
/var/www/ide-ck/
├── backend/
│   ├── server.js           # Main backend server
│   ├── package.json
│   ├── .env                # Environment variables
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte    # Main IDE page
│   │   │   └── +layout.svelte
│   │   ├── app.html
│   │   └── app.css
│   ├── static/
│   ├── build/              # Production build
│   ├── package.json
│   └── svelte.config.js
├── projects/               # User projects
├── ecosystem.config.js     # PM2 configuration
├── nginx.conf              # Nginx configuration
└── README.md
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs ide-backend

# Check if port 3001 is already in use
sudo lsof -i :3001

# Restart
pm2 restart ide-backend
```

### Frontend won't load
```bash
# Check logs
pm2 logs ide-frontend

# Rebuild
cd frontend
npm run build
pm2 restart ide-frontend
```

### Terminal not connecting
```bash
# Check WebSocket connection in browser console
# Ensure backend is running
pm2 status

# Check if node-pty is installed correctly
cd backend
npm list node-pty
```

### Monaco Editor not loading
```bash
# Clear browser cache
# Check browser console for errors
# Ensure frontend build completed successfully
cd frontend
npm run build
```

## 🚧 Phase 2 & 3 (Coming Soon)

### Phase 2: GitHub AutoDeploy
- ⏳ GitHub integration
- ⏳ Push to GitHub
- ⏳ Auto-deploy to Vercel
- ⏳ Deployment status

### Phase 3: Agentic AI
- ⏳ Claude API integration
- ⏳ AI code assistant
- ⏳ Code generation
- ⏳ Code review

## 📝 License

MIT License

## 👨‍💻 Author

Built with ❤️ for self-hosted development

---

## 🆘 Support

For issues, questions, or contributions:
1. Check the troubleshooting section
2. Review logs: `pm2 logs`
3. Check nginx logs: `/var/log/nginx/ide-error.log`
4. Ensure all services are running: `pm2 status`

## 🔄 Updates

To update the IDE:

```bash
cd /var/www/ide-ck
git pull

# Update backend
cd backend
npm install
pm2 restart ide-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart ide-frontend
```

---

**Happy Coding! 🚀**
