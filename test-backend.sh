#!/bin/bash

# Backend API Test Script
# Tests all endpoints to verify functionality

set -e

API_URL="http://localhost:3001/api"

echo "=================================="
echo "  Backend API Tests"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test health check
echo "1. Testing health check..."
HEALTH=$(curl -s ${API_URL}/health)
if [[ $HEALTH == *"ok"* ]]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi

# Create test project
echo ""
echo "2. Creating test project..."
CREATE=$(curl -s -X POST ${API_URL}/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"test-api","template":"empty"}')
if [[ $CREATE == *"success"* ]]; then
  echo -e "${GREEN}✓ Project created${NC}"
else
  echo -e "${RED}✗ Project creation failed${NC}"
  exit 1
fi

# List projects
echo ""
echo "3. Listing projects..."
PROJECTS=$(curl -s ${API_URL}/projects)
if [[ $PROJECTS == *"test-api"* ]]; then
  echo -e "${GREEN}✓ Projects listed${NC}"
else
  echo -e "${RED}✗ Projects listing failed${NC}"
  exit 1
fi

# Create JavaScript file
echo ""
echo "4. Creating JavaScript file..."
CREATE_FILE=$(curl -s -X POST ${API_URL}/files \
  -H "Content-Type: application/json" \
  -d '{"project":"test-api","path":"test.js","content":"console.log(42);"}')
if [[ $CREATE_FILE == *"success"* ]]; then
  echo -e "${GREEN}✓ JavaScript file created${NC}"
else
  echo -e "${RED}✗ File creation failed${NC}"
  exit 1
fi

# Get file tree
echo ""
echo "5. Getting file tree..."
TREE=$(curl -s "${API_URL}/tree?project=test-api")
if [[ $TREE == *"test.js"* ]]; then
  echo -e "${GREEN}✓ File tree retrieved${NC}"
else
  echo -e "${RED}✗ File tree failed${NC}"
  exit 1
fi

# Read file
echo ""
echo "6. Reading file..."
READ=$(curl -s "${API_URL}/files?project=test-api&path=test.js")
if [[ $READ == *"console.log"* ]]; then
  echo -e "${GREEN}✓ File read successfully${NC}"
else
  echo -e "${RED}✗ File read failed${NC}"
  exit 1
fi

# Run JavaScript
echo ""
echo "7. Running JavaScript..."
RUN_JS=$(curl -s -X POST ${API_URL}/run \
  -H "Content-Type: application/json" \
  -d '{"project":"test-api","file":"test.js","language":"javascript"}')
if [[ $RUN_JS == *"exitCode"* ]]; then
  echo -e "${GREEN}✓ JavaScript executed${NC}"
else
  echo -e "${RED}✗ JavaScript execution failed${NC}"
  exit 1
fi

# Create Python file
echo ""
echo "8. Testing Python execution..."
curl -s -X POST ${API_URL}/files \
  -H "Content-Type: application/json" \
  -d '{"project":"test-api","path":"test.py","content":"print(123)"}' > /dev/null
RUN_PY=$(curl -s -X POST ${API_URL}/run \
  -H "Content-Type: application/json" \
  -d '{"project":"test-api","file":"test.py","language":"python"}')
if [[ $RUN_PY == *"123"* ]]; then
  echo -e "${GREEN}✓ Python executed${NC}"
else
  echo -e "${RED}✗ Python execution failed${NC}"
  exit 1
fi

# Create PHP file
echo ""
echo "9. Testing PHP execution..."
curl -s -X POST ${API_URL}/files \
  -H "Content-Type: application/json" \
  -d '{"project":"test-api","path":"test.php","content":"<?php echo 456; ?>"}' > /dev/null
RUN_PHP=$(curl -s -X POST ${API_URL}/run \
  -H "Content-Type: application/json" \
  -d '{"project":"test-api","file":"test.php","language":"php"}')
if [[ $RUN_PHP == *"456"* ]]; then
  echo -e "${GREEN}✓ PHP executed${NC}"
else
  echo -e "${RED}✗ PHP execution failed${NC}"
  exit 1
fi

# Delete file
echo ""
echo "10. Deleting file..."
DELETE=$(curl -s -X DELETE "${API_URL}/files?project=test-api&path=test.js")
if [[ $DELETE == *"success"* ]]; then
  echo -e "${GREEN}✓ File deleted${NC}"
else
  echo -e "${RED}✗ File deletion failed${NC}"
  exit 1
fi

echo ""
echo "=================================="
echo -e "${GREEN}All tests passed! ✓${NC}"
echo "=================================="
