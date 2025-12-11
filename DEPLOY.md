# 🚀 Deployment Guide

Complete step-by-step guide to deploy the IDE on your VPS.

## Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v  # Should be v20+
npm -v

# Install Python 3 and PHP (for code execution)
sudo apt install -y python3 php-cli

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2 serve
```

## Step-by-Step Deployment

### 1. Clone Project

```bash
cd /var/www
sudo git clone <your-repo-url> ide-ck
sudo chown -R $USER:$USER ide-ck
cd ide-ck
```

### 2. Backend Setup

```bash
cd /var/www/ide-ck/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit if needed
nano .env
```

### 3. Frontend Setup

```bash
cd /var/www/ide-ck/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Verify build folder exists
ls -la build/
```

### 4. Create Projects Directory

```bash
sudo mkdir -p /var/www/projects
sudo chown -R $USER:$USER /var/www/projects
chmod 755 /var/www/projects
```

### 5. Create Logs Directory

```bash
mkdir -p /var/www/ide-ck/logs
```

### 6. Start with PM2

```bash
cd /var/www/ide-ck

# Start all processes
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Save configuration
pm2 save

# Setup startup script
pm2 startup
# Run the command it outputs (starts with 'sudo env PATH=...')
```

### 7. Configure Nginx

```bash
# Copy configuration
sudo cp /var/www/ide-ck/nginx.conf /etc/nginx/sites-available/ide.kayacuneyt.com

# Create symlink
sudo ln -s /etc/nginx/sites-available/ide.kayacuneyt.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

### 8. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### 9. Setup SSL (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d ide.kayacuneyt.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 10. Verify Installation

```bash
# Check PM2 processes
pm2 status
# Both ide-backend and ide-frontend should be 'online'

# Check nginx
sudo systemctl status nginx

# Check ports
sudo netstat -tlnp | grep -E '3001|3002|80|443'

# Test backend API
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}

# Test frontend
curl http://localhost:3002
# Should return HTML

# Test from browser
# http://ide.kayacuneyt.com (or https:// if SSL setup)
```

## Post-Deployment

### Monitor Logs

```bash
# Real-time logs
pm2 logs

# Backend only
pm2 logs ide-backend

# Frontend only
pm2 logs ide-frontend

# Nginx logs
sudo tail -f /var/log/nginx/ide-error.log
sudo tail -f /var/log/nginx/ide-access.log
```

### Restart Services

```bash
# Restart backend
pm2 restart ide-backend

# Restart frontend
pm2 restart ide-frontend

# Restart all
pm2 restart all

# Reload Nginx
sudo systemctl reload nginx
```

### Update Application

```bash
cd /var/www/ide-ck

# Pull latest changes
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

## Troubleshooting

### Backend Issues

```bash
# Check if running
pm2 status

# View errors
pm2 logs ide-backend --err

# Restart
pm2 restart ide-backend

# Check port
sudo lsof -i :3001
```

### Frontend Issues

```bash
# Rebuild
cd /var/www/ide-ck/frontend
npm run build

# Restart
pm2 restart ide-frontend

# Check port
sudo lsof -i :3002
```

### Nginx Issues

```bash
# Test config
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/ide-error.log

# Restart
sudo systemctl restart nginx
```

### Terminal Not Working

```bash
# Check node-pty installation
cd /var/www/ide-ck/backend
npm list node-pty

# Rebuild node-pty (if needed)
npm rebuild node-pty

# Restart backend
pm2 restart ide-backend
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/ide-ck
sudo chown -R $USER:$USER /var/www/projects

# Fix permissions
chmod -R 755 /var/www/ide-ck
chmod -R 755 /var/www/projects
```

## Security Checklist

- [ ] Firewall configured (ufw)
- [ ] SSL certificate installed
- [ ] Nginx security headers configured
- [ ] PM2 running as non-root user
- [ ] Projects directory has correct permissions
- [ ] Regular backups configured
- [ ] Monitoring setup (optional: UptimeRobot, etc.)

## Performance Tuning

### PM2 Optimization

```bash
# Monitor resources
pm2 monit

# If high memory usage, adjust max_memory_restart in ecosystem.config.js
```

### Nginx Optimization

Add to nginx.conf:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## Backup

```bash
# Backup projects
tar -czf projects-backup-$(date +%Y%m%d).tar.gz /var/www/projects

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  /var/www/ide-ck/backend/.env \
  /var/www/ide-ck/ecosystem.config.js \
  /etc/nginx/sites-available/ide.kayacuneyt.com
```

## Success Criteria

✅ PM2 shows both processes as 'online'
✅ `curl http://localhost:3001/api/health` returns success
✅ `curl http://localhost:3002` returns HTML
✅ Browser can access http://ide.kayacuneyt.com
✅ Can create a project
✅ Can create and edit files
✅ Monaco Editor loads
✅ Terminal connects and works
✅ Can run JavaScript, Python, PHP code

---

**Deployment Complete! 🎉**
