# 🎯 PROJE ÖZETI

VPS'imde self-hosted, web-based bir code editor (IDE) oluşturmak istiyorum. 3 fazda geliştirilecek:

**FAZ 1:** Temel IDE (Monaco Editor + Terminal + Multi-language)
**FAZ 2:** GitHub AutoDeploy (Git + GitHub API + Vercel)
**FAZ 3:** Agentic AI (Claude API ile kod ajanı)

**Önemli:** ŞİMDİLİK SADECE FAZ 1'İ TAMAMLA!

---

## 📋 TEKNİK SPESIFIKASYONLAR

### Sistem Bilgileri
- **VPS OS:** Ubuntu 24.04 (veya benzeri)
- **VPS Yolu:** `/var/www/`
- **Projects Klasörü:** `/var/www/projects/`
- **Node.js:** v20+
- **Package Manager:** npm

### Stack
- **Backend:** Node.js + Express + WebSocket (ws) + node-pty
- **Frontend:** SvelteKit
- **Editor:** Monaco Editor
- **Terminal:** xterm.js + xterm-addon-fit
- **Process Manager:** PM2

### Port Yapısı
- Backend API: `3001`
- Frontend: `3002`
- WebSocket: Backend ile aynı port (`3001`)

### Domain
- Production URL: `ide.kayacuneyt.com`
- Development: `localhost:3002`

---

## 🎯 FAZ 1: TEMEL IDE - DETAYLI GEREKSİNİMLER

### Backend Features

#### 1. Project Management
```javascript
// API Endpoints:
GET  /api/health          // Health check
GET  /api/projects        // List all projects with metadata
POST /api/projects        // Create new project with template support
                          // Templates: sveltekit, php, python, empty
```

#### 2. File System Operations
```javascript
GET    /api/tree?project=X           // Get file tree (recursive, max depth 5)
                                      // Ignore: .git, node_modules, dist, build
GET    /api/files?project=X&path=Y   // Read file content
POST   /api/files                     // Create or update file
DELETE /api/files?project=X&path=Y   // Delete file or folder
```

#### 3. Code Execution
```javascript
POST /api/run
// Body: { project, file, language }
// Supported languages: javascript, python, php
// Timeout: 30 seconds
// Return: { stdout, stderr, exitCode }
```

#### 4. WebSocket Terminal
```javascript
// Path: ws://localhost:3001?project=projectname
// Protocol: PTY (node-pty)
// Shell: bash
// Working directory: /var/www/projects/{project}
// Features:
//   - Full interactive shell
//   - Color support (xterm-color)
//   - Resize support
//   - Auto cleanup on disconnect
```

### Security Requirements
```javascript
// Path traversal protection
// Only allow access to /var/www/projects/*
// Validate all file paths before operations
// Sanitize project names (alphanumeric, dash, underscore only)
```

### Frontend Features

#### 1. Layout Structure
```
┌─────────────────────────────────────────────┐
│  Toolbar (project actions, file ops, run)   │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │  Editor Area                     │
│ (250px)  │  - Monaco Editor                 │
│          │  - Output Panel (optional)       │
│          │                                  │
├──────────┴──────────────────────────────────┤
│  Terminal (250px height)                    │
└─────────────────────────────────────────────┘
```

#### 2. Sidebar Components
```javascript
// Projects List
// - Show all projects
// - Click to select project
// - Highlight active project

// File Tree
// - Hierarchical view
// - Folders expandable
// - Files clickable to open
// - Icons: 📁 folder, 📄 file
// - Indentation: 20px per level
```

#### 3. Monaco Editor Configuration
```javascript
{
  theme: 'vs-dark',
  fontSize: 14,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  
  // Language detection by file extension:
  .js, .jsx    → javascript
  .ts, .tsx    → typescript
  .py          → python
  .php         → php
  .html        → html
  .css         → css
  .json        → json
  .md          → markdown
}
```

#### 4. Terminal Configuration
```javascript
{
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4'
  },
  cols: 80,
  rows: 30
}
```

#### 5. UI Actions
```javascript
// Toolbar buttons:
- ➕ New Project    → Prompt for name and template
- 📄 New File       → Prompt for filename, create in current project
- 💾 Save           → Save current file (Ctrl+S support)
- ▶️ Run            → Execute current file
- 🚀 Deploy         → (Faz 2'de aktif olacak, şimdilik disabled)

// Keyboard shortcuts:
- Ctrl+S / Cmd+S    → Save file
- Ctrl+R / Cmd+R    → Run code
```

---

## 📁 PROJE YAPISINI OLUŞTUR

### Backend Yapısı
```
/var/www/ide-backend/
├── server.js              # Ana backend dosyası
├── package.json
├── .env                   # Environment variables
├── .gitignore
└── README.md
```

### Frontend Yapısı
```
/var/www/ide-frontend/
├── src/
│   ├── routes/
│   │   └── +page.svelte   # Ana IDE sayfası
│   ├── app.html
│   └── app.css
├── static/
├── svelte.config.js
├── vite.config.js
├── package.json
└── README.md
```

### Projects Klasörü
```
/var/www/projects/
├── (user projects will be created here)
└── .gitkeep
```

---

## 🔧 IMPLEMENTATION STEPS

### Step 1: Backend Setup
```bash
# Komutları çalıştır:
mkdir -p /var/www/ide-backend
mkdir -p /var/www/projects
cd /var/www/ide-backend

# package.json oluştur
{
  "name": "ide-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "node-pty": "^1.0.0",
    "cors": "^2.8.5"
  }
}

# Dependencies yükle
npm install
```

### Step 2: server.js Implementation
Backend için tüm endpoint'leri ve WebSocket handler'ı implement et. Önceki mesajlarda verdiğim tam kodu kullan, ancak şunlara dikkat et:

**Önemli güvenlik kontrolleri:**
- Path traversal kontrolü
- Project name validation
- File size limits
- Timeout mechanisms

**Önemli features:**
- Graceful error handling
- Proper logging
- WebSocket reconnection support
- PTY cleanup on disconnect

### Step 3: Frontend Setup
```bash
cd /var/www
npm create svelte@latest ide-frontend
# Seçenekler:
# - Skeleton project
# - No TypeScript
# - Add ESLint, Prettier

cd ide-frontend
npm install monaco-editor xterm xterm-addon-fit
```

### Step 4: Frontend Implementation
`src/routes/+page.svelte` dosyasını implement et. Önceki mesajlarda verdiğim kodu kullan ancak şunlara dikkat et:

**State management:**
```javascript
let projects = [];              // All projects
let currentProject = '';        // Selected project
let fileTree = [];              // File tree of current project
let currentFile = '';           // Current file name
let currentFilePath = '';       // Current file path
let editorLanguage = 'javascript';
let runOutput = '';
```

**API configuration:**
```javascript
// Development
const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

// Production (nginx proxy ile handle edilecek)
const API_URL = '/api';
const WS_URL = `ws://${window.location.host}`;
```

### Step 5: Styling
VS Code dark theme benzeri, modern, clean UI:
- Background: `#1e1e1e`
- Sidebar: `#252526`
- Toolbar: `#2d2d30`
- Borders: `#3e3e42`
- Text: `#d4d4d4`
- Accent (buttons): `#0e639c`
- Hover: `#1177bb`

### Step 6: PM2 Configuration
```bash
# Backend başlat
cd /var/www/ide-backend
pm2 start server.js --name ide-backend
pm2 save

# Frontend build ve serve
cd /var/www/ide-frontend
npm run build
pm2 serve build 3002 --name ide-frontend --spa
pm2 save
pm2 startup
```

### Step 7: Nginx Configuration
```nginx
upstream ide_backend {
    server 127.0.0.1:3001;
}

upstream ide_frontend {
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name ide.kayacuneyt.com;
    
    location / {
        proxy_pass http://ide_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://ide_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket için özel location
    location ~ ^/ws {
        proxy_pass http://ide_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## ✅ TEST CHECKLIST

Aşağıdaki tüm testleri geç ve başarılı olduğunu doğrula:

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

# Run code
curl -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -d '{"project":"test-project","file":"test.js","language":"javascript"}'
```

### Frontend Manual Tests
- [ ] Projects listesi yükleniyor
- [ ] Yeni proje oluşturma çalışıyor
- [ ] File tree gösteriliyor
- [ ] Dosya açma çalışıyor
- [ ] Monaco Editor syntax highlighting doğru
- [ ] Dosya kaydetme çalışıyor (Save butonu + Ctrl+S)
- [ ] Yeni dosya oluşturma çalışıyor
- [ ] Terminal bağlantısı kuruluyor
- [ ] Terminal'de komut çalıştırma çalışıyor
- [ ] Terminal'de cd, ls, npm, git komutları çalışıyor
- [ ] Kod çalıştırma (Run butonu) çalışıyor
- [ ] JavaScript kodu çalıştırma
- [ ] Python kodu çalıştırma
- [ ] PHP kodu çalıştırma
- [ ] Output panel gösterimi doğru
- [ ] Multiple projects arası geçiş sorunsuz

### Error Handling Tests
- [ ] Olmayan dosya açma → 404 error
- [ ] Geçersiz project name → validation error
- [ ] Terminal disconnect → graceful reconnect
- [ ] Code timeout → 30 saniye sonra kill
- [ ] Large file → size limit kontrolü

---

## 🚨 ÖNEMLI NOTLAR

### Environment Variables
```bash
# /var/www/ide-backend/.env
NODE_ENV=production
PORT=3001
PROJECTS_DIR=/var/www/projects

# Faz 2'de eklenecek:
# GITHUB_TOKEN=ghp_xxxxx
# VERCEL_TOKEN=xxxxx
```

### .gitignore
```
node_modules/
.env
.DS_Store
*.log
```

### Security Considerations
```javascript
// Implement edilmesi gerekenler:
1. Path traversal protection (ZORUNLU)
2. File size limits (max 10MB per file)
3. Project name validation (alphanumeric + dash + underscore only)
4. Rate limiting (future enhancement)
5. Authentication (future enhancement)
```

### Performance Optimizations
```javascript
1. File tree depth limit (max 5 levels)
2. File tree node limit (max 1000 nodes)
3. Code execution timeout (30 seconds)
4. WebSocket ping/pong for connection health
5. Debounce file saves (300ms)
```

---

## 📝 DELIVERABLES

Faz 1 tamamlandığında elimde şunlar olmalı:

1. ✅ `/var/www/ide-backend/` - Çalışır backend
2. ✅ `/var/www/ide-frontend/` - Build edilmiş frontend
3. ✅ PM2'de çalışan 2 process (backend + frontend)
4. ✅ Nginx config dosyası
5. ✅ README.md (setup ve kullanım talimatları)
6. ✅ .env.example dosyası
7. ✅ Test edilmiş, çalışır durumda IDE
8. ✅ `http://localhost:3002` veya `https://ide.kayacuneyt.com` üzerinden erişilebilir

---

## 🎬 EXECUTION INSTRUCTIONS

### Claude Code'a talimatlar:

1. **Sırayla git:** Backend'i bitir, test et, sonra frontend'e geç
2. **Kod kalitesi:** Clean code, iyi error handling, logging ekle
3. **Commentler:** Karmaşık kısımlara Türkçe yorum ekle
4. **Test:** Her major component'ten sonra çalıştırılabilir test kodu ekle
5. **Error messages:** Türkçe ve anlaşılır olsun
6. **Console logs:** Development için yeterli log, production için minimal

### Beklentiler:
- Her dosya tam ve complete olsun (placeholder yok!)
- Tüm endpoint'ler implement edilsin
- WebSocket stable ve robust olsun
- UI responsive ve kullanılabilir olsun
- Error handling production-ready olsun

### Kısıtlamalar:
- FAZ 2 ve FAZ 3 özelliklerini ekleme (disabled buttons olarak bırak)
- Authentication ekleme (şimdilik public access)
- Database kullanma (file-based yeterli)
- Docker kullanma (direkt VPS'te çalışacak)

---

## 🚀 START COMMAND

Claude Code, yukarıdaki tüm spesifikasyonları dikkate alarak:

**ŞİMDİ FAZ 1'İ TAMAMEN IMPLEMENT ET!**

Başla ve her major step'te bana progress raporu ver.
Sorun olursa sor, yoksa devam et!

İyi çalışmalar! 💪


