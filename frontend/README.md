# IDE Frontend

SvelteKit frontend for the self-hosted web IDE.

## Features

- Monaco Editor integration
- xterm.js terminal
- File tree navigation
- Project management UI
- VS Code dark theme
- Keyboard shortcuts

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3002

## Building

```bash
npm run build
```

Output in `build/` directory.

## Dependencies

- **@sveltejs/kit** - SvelteKit framework
- **svelte** - Svelte framework
- **monaco-editor** - VS Code's editor
- **xterm** - Terminal emulator
- **xterm-addon-fit** - Auto-fit terminal addon

## Configuration

- `svelte.config.js` - SvelteKit configuration
- `vite.config.js` - Vite build configuration

## Deployment

Built with `@sveltejs/adapter-static` for static deployment.
Can be served with any static file server or PM2.
