# IDE Backend Server

Node.js + Express backend server for the self-hosted web IDE.

## Features

- RESTful API for project and file management
- WebSocket terminal with node-pty
- Code execution (JavaScript, Python, PHP)
- Security measures (path traversal protection, validation)
- Template support (Empty, SvelteKit, PHP, Python)

## API Endpoints

See main README.md for full API documentation.

## Environment Variables

```env
NODE_ENV=production
PORT=3001
PROJECTS_DIR=/var/www/projects
```

## Running

```bash
# Development
npm run dev

# Production
npm start

# With PM2
pm2 start server.js --name ide-backend
```

## Dependencies

- **express** - Web framework
- **ws** - WebSocket server
- **node-pty** - PTY (pseudo-terminal) for terminal
- **cors** - CORS middleware
- **dotenv** - Environment variables

## Security

- Path traversal protection
- Project name validation
- File size limits (10MB)
- Execution timeout (30s)
- Sandboxed project directories
