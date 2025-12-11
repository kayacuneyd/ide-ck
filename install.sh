#!/bin/bash

# IDE Installation Script
# This script automates the installation process

set -e

echo "=================================="
echo "  IDE Installation Script"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}Please do not run as root${NC}"
  exit 1
fi

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}Node.js 20+ is required. Current version: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}PM2 not found. Installing...${NC}"
  sudo npm install -g pm2 serve
fi
echo -e "${GREEN}✓ PM2 installed${NC}"

# Create projects directory
echo ""
echo "Creating projects directory..."
sudo mkdir -p /var/www/projects
sudo chown -R $USER:$USER /var/www/projects
chmod 755 /var/www/projects
echo -e "${GREEN}✓ Projects directory created${NC}"

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env
  echo -e "${GREEN}✓ .env file created${NC}"
else
  echo -e "${YELLOW}⚠ .env file already exists${NC}"
fi

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Build frontend
echo ""
echo "Building frontend..."
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

# Create logs directory
echo ""
echo "Creating logs directory..."
cd ..
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"

# Start with PM2
echo ""
echo "Starting services with PM2..."
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ Services started${NC}"

# Display status
echo ""
echo "=================================="
pm2 status
echo "=================================="
echo ""

# Test backend
echo "Testing backend..."
sleep 2
HEALTH=$(curl -s http://localhost:3001/api/health || echo "FAILED")
if [[ $HEALTH == *"ok"* ]]; then
  echo -e "${GREEN}✓ Backend is running${NC}"
else
  echo -e "${RED}✗ Backend test failed${NC}"
fi

# Check frontend
if curl -s http://localhost:3002 > /dev/null; then
  echo -e "${GREEN}✓ Frontend is running${NC}"
else
  echo -e "${RED}✗ Frontend test failed${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Configure Nginx: sudo cp nginx.conf /etc/nginx/sites-available/ide.kayacuneyt.com"
echo "2. Enable site: sudo ln -s /etc/nginx/sites-available/ide.kayacuneyt.com /etc/nginx/sites-enabled/"
echo "3. Test Nginx: sudo nginx -t"
echo "4. Reload Nginx: sudo systemctl reload nginx"
echo "5. Setup SSL: sudo certbot --nginx -d ide.kayacuneyt.com"
echo ""
echo "Access the IDE:"
echo "  Local: http://localhost:3002"
echo "  Production: http://ide.kayacuneyt.com"
echo ""
echo "Useful commands:"
echo "  pm2 status       - View process status"
echo "  pm2 logs         - View logs"
echo "  pm2 restart all  - Restart services"
echo ""
