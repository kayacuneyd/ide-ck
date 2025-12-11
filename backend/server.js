import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { spawn } from 'node-pty';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, relative, normalize, sep } from 'path';
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const PROJECTS_DIR = process.env.PROJECTS_DIR || resolve(__dirname, '../projects');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Security: Path validation
function validateProjectName(name) {
  const regex = /^[a-zA-Z0-9_-]+$/;
  if (!regex.test(name)) {
    throw new Error('Geçersiz proje adı. Sadece harf, rakam, tire ve alt çizgi kullanılabilir.');
  }
  return true;
}

function validatePath(projectPath, targetPath) {
  const normalizedProject = normalize(resolve(projectPath));
  const normalizedTarget = normalize(resolve(targetPath));

  // Path traversal kontrolü
  const relativePath = relative(normalizedProject, normalizedTarget);
  if (relativePath.startsWith('..') || resolve(normalizedTarget).indexOf(normalizedProject) !== 0) {
    throw new Error('Path traversal tespit edildi!');
  }

  return normalizedTarget;
}

function getProjectPath(projectName) {
  validateProjectName(projectName);
  return join(PROJECTS_DIR, projectName);
}

// Template oluşturma fonksiyonları
async function createEmptyTemplate(projectPath) {
  await mkdir(projectPath, { recursive: true });
  await writeFile(join(projectPath, 'README.md'), '# My Project\n\nStart coding!');
}

async function createSvelteKitTemplate(projectPath) {
  await mkdir(projectPath, { recursive: true });

  const packageJson = {
    name: 'my-sveltekit-app',
    version: '0.0.1',
    private: true,
    scripts: {
      dev: 'vite dev',
      build: 'vite build',
      preview: 'vite preview'
    },
    devDependencies: {
      '@sveltejs/adapter-auto': '^2.0.0',
      '@sveltejs/kit': '^1.20.4',
      'svelte': '^4.0.5',
      'vite': '^4.4.2'
    }
  };

  await writeFile(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
  await writeFile(join(projectPath, 'README.md'), '# SvelteKit App\n\nRun `npm install` then `npm run dev`');

  // Temel dosya yapısı
  await mkdir(join(projectPath, 'src', 'routes'), { recursive: true });
  await writeFile(
    join(projectPath, 'src', 'routes', '+page.svelte'),
    '<script>\n  let count = 0;\n</script>\n\n<h1>Welcome to SvelteKit!</h1>\n<button on:click={() => count++}>Count: {count}</button>\n'
  );
}

async function createPHPTemplate(projectPath) {
  await mkdir(projectPath, { recursive: true });

  const indexPhp = `<?php
// Simple PHP Application
echo "<!DOCTYPE html>";
echo "<html><head><title>PHP App</title></head><body>";
echo "<h1>Hello from PHP!</h1>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "</body></html>";
?>`;

  await writeFile(join(projectPath, 'index.php'), indexPhp);
  await writeFile(join(projectPath, 'README.md'), '# PHP Project\n\nRun with: `php -S localhost:8000`');
}

async function createPythonTemplate(projectPath) {
  await mkdir(projectPath, { recursive: true });

  const mainPy = `#!/usr/bin/env python3
"""Simple Python Application"""

def main():
    print("Hello from Python!")
    print("Ready to code!")

if __name__ == "__main__":
    main()
`;

  await writeFile(join(projectPath, 'main.py'), mainPy);
  await writeFile(join(projectPath, 'requirements.txt'), '# Add your dependencies here\n');
  await writeFile(join(projectPath, 'README.md'), '# Python Project\n\nRun with: `python main.py`');
}

// API Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all projects
app.get('/api/projects', async (req, res) => {
  try {
    // Projects dizini yoksa oluştur
    if (!existsSync(PROJECTS_DIR)) {
      await mkdir(PROJECTS_DIR, { recursive: true });
      return res.json([]);
    }

    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = join(PROJECTS_DIR, entry.name);
        const stats = await stat(projectPath);

        projects.push({
          name: entry.name,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }
    }

    res.json(projects);
  } catch (error) {
    console.error('Projeler listelenirken hata:', error);
    res.status(500).json({ error: 'Projeler listelenemedi' });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, template = 'empty' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Proje adı gerekli' });
    }

    validateProjectName(name);

    const projectPath = getProjectPath(name);

    // Proje zaten var mı kontrol et
    if (existsSync(projectPath)) {
      return res.status(400).json({ error: 'Bu isimde bir proje zaten mevcut' });
    }

    // Template'e göre proje oluştur
    switch (template) {
      case 'sveltekit':
        await createSvelteKitTemplate(projectPath);
        break;
      case 'php':
        await createPHPTemplate(projectPath);
        break;
      case 'python':
        await createPythonTemplate(projectPath);
        break;
      case 'empty':
      default:
        await createEmptyTemplate(projectPath);
    }

    console.log(`Proje oluşturuldu: ${name} (${template})`);
    res.json({ success: true, name, template });
  } catch (error) {
    console.error('Proje oluşturulurken hata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file tree
app.get('/api/tree', async (req, res) => {
  try {
    const { project } = req.query;

    if (!project) {
      return res.status(400).json({ error: 'Proje adı gerekli' });
    }

    const projectPath = getProjectPath(project);

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Proje bulunamadı' });
    }

    // Recursive file tree oluştur
    async function buildTree(dirPath, depth = 0, maxDepth = 5) {
      if (depth > maxDepth) return [];

      const items = [];
      const entries = await readdir(dirPath, { withFileTypes: true });

      // Ignore list
      const ignoredDirs = ['.git', 'node_modules', 'dist', 'build', '.svelte-kit', '__pycache__', '.venv'];

      for (const entry of entries) {
        // Hidden files ve ignored directories'i atla
        if (entry.name.startsWith('.') && !entry.name.startsWith('.env')) continue;
        if (ignoredDirs.includes(entry.name)) continue;

        const fullPath = join(dirPath, entry.name);
        const relativePath = relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          const children = await buildTree(fullPath, depth + 1, maxDepth);
          items.push({
            name: entry.name,
            type: 'directory',
            path: relativePath,
            children
          });
        } else {
          items.push({
            name: entry.name,
            type: 'file',
            path: relativePath
          });
        }
      }

      // Sort: directories first, then files
      return items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
    }

    const tree = await buildTree(projectPath);
    res.json(tree);
  } catch (error) {
    console.error('File tree oluşturulurken hata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read file content
app.get('/api/files', async (req, res) => {
  try {
    const { project, path: filePath } = req.query;

    if (!project || !filePath) {
      return res.status(400).json({ error: 'Proje ve dosya yolu gerekli' });
    }

    const projectPath = getProjectPath(project);
    const fullPath = validatePath(projectPath, join(projectPath, filePath));

    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    const stats = await stat(fullPath);

    // File size kontrolü (max 10MB)
    if (stats.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Dosya çok büyük (max 10MB)' });
    }

    const content = await readFile(fullPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('Dosya okunurken hata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update file
app.post('/api/files', async (req, res) => {
  try {
    const { project, path: filePath, content } = req.body;

    if (!project || !filePath || content === undefined) {
      return res.status(400).json({ error: 'Proje, dosya yolu ve içerik gerekli' });
    }

    const projectPath = getProjectPath(project);
    const fullPath = validatePath(projectPath, join(projectPath, filePath));

    // Dizini oluştur (yoksa)
    const fileDir = dirname(fullPath);
    await mkdir(fileDir, { recursive: true });

    // Dosyayı yaz
    await writeFile(fullPath, content, 'utf-8');

    console.log(`Dosya kaydedildi: ${project}/${filePath}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Dosya yazılırken hata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file or folder
app.delete('/api/files', async (req, res) => {
  try {
    const { project, path: filePath } = req.query;

    if (!project || !filePath) {
      return res.status(400).json({ error: 'Proje ve dosya yolu gerekli' });
    }

    const projectPath = getProjectPath(project);
    const fullPath = validatePath(projectPath, join(projectPath, filePath));

    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    // Recursive delete
    await rm(fullPath, { recursive: true, force: true });

    console.log(`Silindi: ${project}/${filePath}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Dosya silinirken hata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run code
app.post('/api/run', async (req, res) => {
  try {
    const { project, file, language } = req.body;

    if (!project || !file || !language) {
      return res.status(400).json({ error: 'Proje, dosya ve dil gerekli' });
    }

    const projectPath = getProjectPath(project);
    const fullPath = validatePath(projectPath, join(projectPath, file));

    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    // Language'e göre komut belirle
    let command, args;
    switch (language) {
      case 'javascript':
        command = 'node';
        args = [fullPath];
        break;
      case 'python':
        command = 'python3';
        args = [fullPath];
        break;
      case 'php':
        command = 'php';
        args = [fullPath];
        break;
      default:
        return res.status(400).json({ error: 'Desteklenmeyen dil' });
    }

    // Spawn process
    const childProcess = spawn(command, args, {
      cwd: projectPath,
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Timeout (30 saniye)
    const timeout = setTimeout(() => {
      killed = true;
      childProcess.kill();
    }, 30000);

    childProcess.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.on('exit', (exitCode) => {
      clearTimeout(timeout);

      if (killed) {
        return res.json({
          stdout: stdout,
          stderr: 'Process timeout (30 saniye)',
          exitCode: -1
        });
      }

      res.json({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: exitCode || 0
      });
    });

  } catch (error) {
    console.error('Kod çalıştırılırken hata:', error);
    res.status(500).json({ error: error.message });
  }
});

// HTTP server oluştur
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

// Active terminals
const terminals = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const project = url.searchParams.get('project');

  if (!project) {
    ws.close(1008, 'Proje adı gerekli');
    return;
  }

  try {
    validateProjectName(project);
    const projectPath = getProjectPath(project);

    if (!existsSync(projectPath)) {
      ws.close(1008, 'Proje bulunamadı');
      return;
    }

    console.log(`Terminal bağlantısı: ${project}`);

    // PTY oluştur
    const ptyProcess = spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: projectPath,
      env: process.env
    });

    const terminalId = `${project}-${Date.now()}`;
    terminals.set(terminalId, ptyProcess);

    // PTY'den gelen veriyi WebSocket'e gönder
    ptyProcess.onData((data) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(data);
      }
    });

    // PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal kapandı: ${project} (exit: ${exitCode}, signal: ${signal})`);
      terminals.delete(terminalId);
      ws.close();
    });

    // WebSocket'ten gelen veriyi PTY'ye yaz
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'input') {
          ptyProcess.write(message.data);
        } else if (message.type === 'resize') {
          ptyProcess.resize(message.cols, message.rows);
        }
      } catch (error) {
        console.error('WebSocket mesaj hatası:', error);
      }
    });

    // WebSocket close
    ws.on('close', () => {
      console.log(`WebSocket kapandı: ${project}`);
      if (terminals.has(terminalId)) {
        ptyProcess.kill();
        terminals.delete(terminalId);
      }
    });

    // WebSocket error
    ws.on('error', (error) => {
      console.error('WebSocket hatası:', error);
    });

  } catch (error) {
    console.error('Terminal oluşturma hatası:', error);
    ws.close(1011, error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, kapatılıyor...');

  // Tüm terminalleri kapat
  terminals.forEach((pty, id) => {
    pty.kill();
  });

  server.close(() => {
    console.log('Server kapatıldı');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 IDE Backend Server Running             ║
╠════════════════════════════════════════════╣
║  Port:         ${PORT}                        ║
║  Projects Dir: ${PROJECTS_DIR}
║  Time:         ${new Date().toLocaleString()} ║
╚════════════════════════════════════════════╝
  `);
});
