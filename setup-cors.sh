#!/bin/bash
# Firebase Storage CORS Setup Script
# This script automates the CORS configuration process for Firebase Storage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="flashcard3-e9cf1"
BUCKET_NAME="$PROJECT_ID.firebasestorage.app"
CORS_FILE="cors.json"

echo -e "${CYAN}========================================"
echo -e "Firebase Storage CORS Setup"
echo -e "========================================${NC}"
echo ""

# Check if gcloud is installed
echo -e "${YELLOW}Step 1: Checking Google Cloud SDK...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud SDK not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please install it first:${NC}"
    echo -e "${NC}Visit: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo -e "${YELLOW}For Mac (using Homebrew):${NC}"
    echo -e "${GRAY}brew install --cask google-cloud-sdk${NC}"
    echo ""
    echo -e "${YELLOW}For Linux:${NC}"
    echo -e "${GRAY}curl https://sdk.cloud.google.com | bash${NC}"
    echo -e "${GRAY}exec -l \$SHELL${NC}"
    echo ""
    echo -e "${YELLOW}After installation, restart your terminal and run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Google Cloud SDK found!${NC}"
echo ""

# Check if gsutil is available
echo -e "${YELLOW}Step 2: Checking gsutil...${NC}"
if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}❌ gsutil not found!${NC}"
    echo -e "${YELLOW}Please ensure Google Cloud SDK is fully installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ gsutil found!${NC}"
echo ""

# Check if cors.json exists
echo -e "${YELLOW}Step 3: Checking cors.json file...${NC}"
if [ ! -f "$CORS_FILE" ]; then
    echo -e "${RED}❌ cors.json not found in current directory!${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ cors.json found!${NC}"
echo ""
echo -e "${CYAN}CORS Configuration:${NC}"
echo -e "${GRAY}$(cat $CORS_FILE)${NC}"
echo ""

# Check authentication
echo -e "${YELLOW}Step 4: Checking authentication...${NC}"
AUTH_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)

if [ -z "$AUTH_ACCOUNT" ]; then
    echo -e "${RED}❌ Not authenticated with Google Cloud!${NC}"
    echo ""
    echo -e "${YELLOW}Attempting to authenticate...${NC}"
    echo -e "${NC}A browser window will open. Please sign in with your Google account."
    echo ""
    
    gcloud auth login
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Authentication failed!${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Authentication successful!${NC}"
else
    echo -e "${GREEN}✅ Already authenticated as: $AUTH_ACCOUNT${NC}"
fi
echo ""

# Set project
echo -e "${YELLOW}Step 5: Setting project to $PROJECT_ID...${NC}"
gcloud config set project $PROJECT_ID 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to set project!${NC}"
    echo -e "${YELLOW}Please check if you have access to project: $PROJECT_ID${NC}"
    echo ""
    echo -e "${YELLOW}Available projects:${NC}"
    gcloud projects list
    exit 1
fi

echo -e "${GREEN}✅ Project set to: $PROJECT_ID${NC}"
echo ""

# Apply CORS configuration
echo -e "${YELLOW}Step 6: Applying CORS configuration to gs://$BUCKET_NAME...${NC}"
echo ""

gsutil cors set $CORS_FILE gs://$BUCKET_NAME

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Failed to apply CORS configuration!${NC}"
    echo ""
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo -e "${NC}  1. You don't have permission to modify this bucket"
    echo -e "  2. The bucket name is incorrect"
    echo -e "  3. The bucket doesn't exist"
    echo ""
    echo -e "${YELLOW}Available buckets:${NC}"
    gsutil ls
    exit 1
fi

echo ""
echo -e "${GREEN}✅ CORS configuration applied successfully!${NC}"
echo ""

# Verify CORS configuration
echo -e "${YELLOW}Step 7: Verifying CORS configuration...${NC}"
echo ""
echo -e "${CYAN}Current CORS settings for gs://$BUCKET_NAME:${NC}"

gsutil cors get gs://$BUCKET_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to verify CORS configuration!${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}========================================"
echo -e "${GREEN}✅ CORS Setup Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${NC}  1. Wait 2-3 minutes for changes to propagate"
echo -e "  2. Clear your browser cache (Ctrl+Shift+Delete)"
echo -e "  3. Restart your Expo dev server"
echo -e "  4. Test audio generation in your app"
echo ""
echo -e "${YELLOW}If you still see CORS errors:${NC}"
echo -e "${NC}  - Check Firebase Storage Rules in Firebase Console"
echo -e "  - Try using an incognito/private browser window"
echo -e "  - See CORS_SETUP_GUIDE.md for troubleshooting"
echo ""

