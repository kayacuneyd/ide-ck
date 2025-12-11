<script>
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';

  // State management
  let projects = [];
  let currentProject = '';
  let fileTree = [];
  let currentFile = '';
  let currentFilePath = '';
  let editorContent = '';
  let editorLanguage = 'javascript';
  let runOutput = '';
  let showOutput = false;
  let isLoading = false;

  // Editor and Terminal instances
  let editor = null;
  let terminal = null;
  let terminalSocket = null;
  let editorContainer = null;
  let terminalContainer = null;

  // API Configuration
  const isDev = window.location.hostname === 'localhost';
  const API_URL = isDev ? 'http://localhost:3001/api' : '/api';
  const WS_URL = isDev ? 'ws://localhost:3001' : `ws://${window.location.host}`;

  // Monaco Editor ve Xterm dinamik import
  let monaco = null;
  let Terminal = null;
  let FitAddon = null;

  // Language detection
  function detectLanguage(filename) {
    const ext = filename.split('.').pop();
    const langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      txt: 'plaintext',
      sh: 'shell',
      yml: 'yaml',
      yaml: 'yaml'
    };
    return langMap[ext] || 'plaintext';
  }

  // API Functions
  async function fetchProjects() {
    try {
      const response = await fetch(`${API_URL}/projects`);
      if (!response.ok) throw new Error('Projeler yüklenemedi');
      projects = await response.json();
    } catch (error) {
      console.error('Projeler yüklenemedi:', error);
      alert('Projeler yüklenemedi: ' + error.message);
    }
  }

  async function createProject() {
    const name = prompt('Proje adı:');
    if (!name) return;

    const template = prompt('Template (empty/sveltekit/php/python):', 'empty');

    try {
      isLoading = true;
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Proje oluşturulamadı');
      }

      await fetchProjects();
      currentProject = name;
      await loadFileTree();
      connectTerminal();
    } catch (error) {
      console.error('Proje oluşturma hatası:', error);
      alert('Hata: ' + error.message);
    } finally {
      isLoading = false;
    }
  }

  async function loadFileTree() {
    if (!currentProject) return;

    try {
      const response = await fetch(`${API_URL}/tree?project=${currentProject}`);
      if (!response.ok) throw new Error('File tree yüklenemedi');
      fileTree = await response.json();
    } catch (error) {
      console.error('File tree hatası:', error);
    }
  }

  async function loadFile(path) {
    if (!currentProject) return;

    try {
      isLoading = true;
      const response = await fetch(`${API_URL}/files?project=${currentProject}&path=${encodeURIComponent(path)}`);

      if (!response.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      const data = await response.json();
      currentFilePath = path;
      currentFile = path.split('/').pop();
      editorContent = data.content;
      editorLanguage = detectLanguage(currentFile);

      // Monaco editor'ü güncelle
      if (editor && monaco) {
        const model = monaco.editor.createModel(editorContent, editorLanguage);
        editor.setModel(model);
      }

      showOutput = false;
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      alert('Dosya yüklenemedi: ' + error.message);
    } finally {
      isLoading = false;
    }
  }

  async function saveFile() {
    if (!currentProject || !currentFilePath) {
      alert('Önce bir dosya açmalısınız');
      return;
    }

    try {
      isLoading = true;
      const content = editor ? editor.getValue() : editorContent;

      const response = await fetch(`${API_URL}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject,
          path: currentFilePath,
          content
        })
      });

      if (!response.ok) throw new Error('Dosya kaydedilemedi');

      console.log('Dosya kaydedildi:', currentFilePath);
      // Visual feedback
      showNotification('Dosya kaydedildi ✓');
    } catch (error) {
      console.error('Dosya kaydetme hatası:', error);
      alert('Dosya kaydedilemedi: ' + error.message);
    } finally {
      isLoading = false;
    }
  }

  async function createFile() {
    if (!currentProject) {
      alert('Önce bir proje seçmelisiniz');
      return;
    }

    const filename = prompt('Dosya adı (örn: index.js):');
    if (!filename) return;

    try {
      isLoading = true;
      const response = await fetch(`${API_URL}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject,
          path: filename,
          content: ''
        })
      });

      if (!response.ok) throw new Error('Dosya oluşturulamadı');

      await loadFileTree();
      await loadFile(filename);
    } catch (error) {
      console.error('Dosya oluşturma hatası:', error);
      alert('Dosya oluşturulamadı: ' + error.message);
    } finally {
      isLoading = false;
    }
  }

  async function runCode() {
    if (!currentProject || !currentFilePath) {
      alert('Önce bir dosya açmalısınız');
      return;
    }

    // Önce kaydet
    await saveFile();

    try {
      isLoading = true;
      const language = editorLanguage === 'typescript' ? 'javascript' : editorLanguage;

      if (!['javascript', 'python', 'php'].includes(language)) {
        alert('Bu dosya türü çalıştırılamıyor. Desteklenen: JS, Python, PHP');
        return;
      }

      const response = await fetch(`${API_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject,
          file: currentFilePath,
          language
        })
      });

      if (!response.ok) throw new Error('Kod çalıştırılamadı');

      const result = await response.json();
      runOutput = (result.stdout || '') + (result.stderr || '');
      showOutput = true;
    } catch (error) {
      console.error('Kod çalıştırma hatası:', error);
      runOutput = 'Hata: ' + error.message;
      showOutput = true;
    } finally {
      isLoading = false;
    }
  }

  // Terminal Functions
  function connectTerminal() {
    if (!currentProject) return;

    // Önceki bağlantıyı kapat
    if (terminalSocket) {
      terminalSocket.close();
    }

    try {
      const wsUrl = `${WS_URL}?project=${currentProject}`;
      terminalSocket = new WebSocket(wsUrl);

      terminalSocket.onopen = () => {
        console.log('Terminal bağlandı');
      };

      terminalSocket.onmessage = (event) => {
        if (terminal) {
          terminal.write(event.data);
        }
      };

      terminalSocket.onerror = (error) => {
        console.error('Terminal hatası:', error);
      };

      terminalSocket.onclose = () => {
        console.log('Terminal bağlantısı kapandı');
      };
    } catch (error) {
      console.error('Terminal bağlantı hatası:', error);
    }
  }

  // Visual feedback
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4EC9B0;
      color: #1e1e1e;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  // File tree rendering
  function renderFileTree(items, depth = 0) {
    return items.map(item => ({
      ...item,
      depth
    }));
  }

  $: flatFileTree = fileTree.length > 0 ? flattenTree(fileTree, 0) : [];

  function flattenTree(items, depth) {
    let result = [];
    for (const item of items) {
      result.push({ ...item, depth });
      if (item.type === 'directory' && item.children) {
        result = result.concat(flattenTree(item.children, depth + 1));
      }
    }
    return result;
  }

  // Keyboard shortcuts
  function handleKeyboard(event) {
    // Ctrl+S or Cmd+S: Save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveFile();
    }
    // Ctrl+R or Cmd+R: Run
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      runCode();
    }
  }

  // Project selection
  function selectProject(projectName) {
    currentProject = projectName;
    loadFileTree();
    connectTerminal();
  }

  // Component lifecycle
  onMount(async () => {
    // Load Monaco Editor
    try {
      monaco = await import('monaco-editor');

      // Monaco Editor'ü başlat
      if (editorContainer) {
        editor = monaco.editor.create(editorContainer, {
          value: editorContent,
          language: editorLanguage,
          theme: 'vs-dark',
          fontSize: 14,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2
        });
      }
    } catch (error) {
      console.error('Monaco Editor yüklenemedi:', error);
    }

    // Load Xterm
    try {
      const xtermModule = await import('xterm');
      const fitAddonModule = await import('xterm-addon-fit');
      Terminal = xtermModule.Terminal;
      FitAddon = fitAddonModule.FitAddon;

      // Import CSS
      await import('xterm/css/xterm.css');

      // Terminal'i başlat
      if (terminalContainer && Terminal && FitAddon) {
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Courier New", monospace',
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4'
          },
          cols: 80,
          rows: 20
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(terminalContainer);
        fitAddon.fit();

        // Terminal input handler
        terminal.onData((data) => {
          if (terminalSocket && terminalSocket.readyState === WebSocket.OPEN) {
            terminalSocket.send(JSON.stringify({ type: 'input', data }));
          }
        });

        // Resize handler
        window.addEventListener('resize', () => fitAddon.fit());
      }
    } catch (error) {
      console.error('Terminal yüklenemedi:', error);
    }

    // Load projects
    await fetchProjects();

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
    if (terminal) {
      terminal.dispose();
    }
    if (terminalSocket) {
      terminalSocket.close();
    }
    document.removeEventListener('keydown', handleKeyboard);
  });
</script>

<svelte:head>
  <style>
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  </style>
</svelte:head>

<div class="ide-container">
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-section">
      <button on:click={createProject} title="Yeni Proje (Empty/SvelteKit/PHP/Python)">
        ➕ Yeni Proje
      </button>
      <button on:click={createFile} disabled={!currentProject} title="Yeni Dosya">
        📄 Yeni Dosya
      </button>
      <button on:click={saveFile} disabled={!currentFile} title="Kaydet (Ctrl+S)">
        💾 Kaydet
      </button>
      <button on:click={runCode} disabled={!currentFile} title="Çalıştır (Ctrl+R)">
        ▶️ Çalıştır
      </button>
      <button disabled title="Deploy (Phase 2)">
        🚀 Deploy
      </button>
    </div>
    <div class="toolbar-section">
      {#if currentFile}
        <span class="current-file">📄 {currentFile}</span>
      {/if}
      {#if isLoading}
        <span class="loading">⏳</span>
      {/if}
    </div>
  </div>

  <!-- Main Content -->
  <div class="main-content">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="section">
        <div class="section-title">PROJELER</div>
        <div class="projects-list">
          {#if projects.length === 0}
            <div class="empty-message">Proje yok. Yeni proje oluşturun.</div>
          {:else}
            {#each projects as project}
              <div
                class="project-item"
                class:active={project.name === currentProject}
                on:click={() => selectProject(project.name)}
                on:keypress={(e) => e.key === 'Enter' && selectProject(project.name)}
                role="button"
                tabindex="0"
              >
                📦 {project.name}
              </div>
            {/each}
          {/if}
        </div>
      </div>

      {#if currentProject}
        <div class="section">
          <div class="section-title">DOSYALAR - {currentProject.toUpperCase()}</div>
          <div class="file-tree">
            {#if flatFileTree.length === 0}
              <div class="empty-message">Dosya yok</div>
            {:else}
              {#each flatFileTree as item}
                <div
                  class="tree-item"
                  class:active={item.path === currentFilePath}
                  style="padding-left: {item.depth * 20 + 10}px"
                  on:click={() => item.type === 'file' && loadFile(item.path)}
                  on:keypress={(e) => e.key === 'Enter' && item.type === 'file' && loadFile(item.path)}
                  role="button"
                  tabindex="0"
                >
                  {item.type === 'directory' ? '📁' : '📄'} {item.name}
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Editor Area -->
    <div class="editor-area">
      <div class="editor-wrapper" style="flex: 1; display: flex; flex-direction: column;">
        <div bind:this={editorContainer} style="flex: 1; min-height: 0;"></div>

        {#if showOutput}
          <div class="output-panel">
            <div class="output-header">
              <span>📊 Output</span>
              <button on:click={() => showOutput = false}>✕</button>
            </div>
            <pre class="output-content">{runOutput}</pre>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Terminal -->
  <div class="terminal-section">
    <div class="terminal-header">
      <span>💻 Terminal {currentProject ? `- ${currentProject}` : ''}</span>
      {#if currentProject}
        <button on:click={connectTerminal} title="Yeniden Bağlan">🔄</button>
      {/if}
    </div>
    <div bind:this={terminalContainer} class="terminal-container"></div>
  </div>
</div>

<style>
  .ide-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    padding: 8px 16px;
    height: 48px;
  }

  .toolbar-section {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .toolbar button {
    background: #0e639c;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    transition: background 0.2s;
  }

  .toolbar button:hover:not(:disabled) {
    background: #1177bb;
  }

  .toolbar button:disabled {
    background: #3e3e42;
    color: #858585;
    cursor: not-allowed;
  }

  .current-file {
    color: #4EC9B0;
    font-size: 13px;
    font-weight: 500;
  }

  .loading {
    font-size: 16px;
  }

  .main-content {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .sidebar {
    width: 250px;
    background: #252526;
    border-right: 1px solid #3e3e42;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .section {
    display: flex;
    flex-direction: column;
  }

  .section-title {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 600;
    color: #858585;
    letter-spacing: 0.5px;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
  }

  .projects-list, .file-tree {
    flex: 1;
    overflow-y: auto;
  }

  .project-item, .tree-item {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    border-bottom: 1px solid #2d2d30;
    transition: background 0.2s;
    user-select: none;
  }

  .project-item:hover, .tree-item:hover {
    background: #2a2d2e;
  }

  .project-item.active, .tree-item.active {
    background: #37373d;
    color: #ffffff;
    font-weight: 500;
  }

  .empty-message {
    padding: 16px;
    color: #858585;
    font-size: 12px;
    text-align: center;
  }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: #1e1e1e;
  }

  .editor-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .output-panel {
    height: 200px;
    background: #1e1e1e;
    border-top: 1px solid #3e3e42;
    display: flex;
    flex-direction: column;
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    font-size: 12px;
    font-weight: 600;
  }

  .output-header button {
    background: transparent;
    border: none;
    color: #d4d4d4;
    padding: 4px 8px;
    cursor: pointer;
  }

  .output-header button:hover {
    background: #3e3e42;
  }

  .output-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    color: #d4d4d4;
    background: #1e1e1e;
    margin: 0;
    white-space: pre-wrap;
  }

  .terminal-section {
    height: 250px;
    background: #1e1e1e;
    border-top: 1px solid #3e3e42;
    display: flex;
    flex-direction: column;
  }

  .terminal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    font-size: 12px;
    font-weight: 600;
  }

  .terminal-header button {
    background: transparent;
    border: none;
    color: #d4d4d4;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 14px;
  }

  .terminal-header button:hover {
    background: #3e3e42;
  }

  .terminal-container {
    flex: 1;
    padding: 8px;
  }
</style>
