#!/bin/bash

#############################################################################
# SKYCOIN4444 - Android Google Play Deployment Script
#
# This script automates Android app building and submission to Google Play:
# - Build optimized Android app using EAS Build
# - Generate Play Store metadata
# - Submit to Google Play Console
# - Monitor review status
#
# Usage: ./scripts/deploy-android.sh [OPTIONS]
# Options:
#   --build-type [debug|release]            Build type (default: release)
#   --submit-to-playstore                   Submit to Play Store after build
#   --skip-build                            Skip building, only submit
#   --help                                  Show this help message
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
BUILD_TYPE="release"
SUBMIT_TO_PLAYSTORE=false
SKIP_BUILD=false
APP_NAME="SKYCOIN4444"
PACKAGE_ID="com.innovativeit.skycoin4444"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --build-type)
      BUILD_TYPE="$2"
      shift 2
      ;;
    --submit-to-playstore)
      SUBMIT_TO_PLAYSTORE=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +2
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v eas &> /dev/null; then
  log_error "EAS CLI is not installed. Please install it: npm install -g eas-cli"
  exit 1
fi

if ! command -v expo &> /dev/null; then
  log_error "Expo CLI is not installed. Please install it: npm install -g expo-cli"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  log_warning "jq is not installed. Some features may not work. Install from: https://stedolan.github.io/jq/"
fi

log_success "Prerequisites checked"

# Navigate to mobile app directory
cd apps/mobile || {
  log_error "Mobile app directory not found"
  exit 1
}

# Load environment variables
log_info "Loading environment variables..."
if [ -f "../../.env.production" ]; then
  export $(cat "../../.env.production" | grep -v '^#' | xargs)
fi

# Build Android app unless skipped
if [ "$SKIP_BUILD" = false ]; then
  log_info "Building Android app using EAS Build..."
  log_info "Build type: $BUILD_TYPE"
  
  eas build --platform android \
    --build-type "$BUILD_TYPE" \
    --non-interactive || {
    log_error "EAS Build failed"
    exit 1
  }
  
  log_success "Android app built successfully"
  
  # Get build ID
  BUILD_ID=$(eas build:list --platform android --limit 1 --json 2>/dev/null | jq -r '.[0].id' 2>/dev/null || echo "unknown")
  log_info "Build ID: $BUILD_ID"
else
  log_info "Skipping build, using existing build"
fi

# Submit to Google Play
if [ "$SUBMIT_TO_PLAYSTORE" = true ]; then
  log_info "Submitting to Google Play Store..."
  
  # Validate Google Play credentials
  if [ -z "$GOOGLE_PLAY_KEY_FILE" ]; then
    log_error "Google Play key file not found in GOOGLE_PLAY_KEY_FILE environment variable"
    log_info "Please set GOOGLE_PLAY_KEY_FILE to path of your Google Play service account JSON"
    exit 1
  fi
  
  if [ ! -f "$GOOGLE_PLAY_KEY_FILE" ]; then
    log_error "Google Play key file not found: $GOOGLE_PLAY_KEY_FILE"
    exit 1
  fi
  
  # Submit build
  eas submit --platform android \
    --latest \
    --non-interactive || {
    log_error "Google Play submission failed"
    exit 1
  }
  
  log_success "Submitted to Google Play Store"
  
  # Get submission ID
  SUBMISSION_ID=$(eas submission:list --platform android --limit 1 --json 2>/dev/null | jq -r '.[0].id' 2>/dev/null || echo "unknown")
  log_info "Submission ID: $SUBMISSION_ID"
  
  # Monitor review status
  log_info "Monitoring Google Play review status..."
  log_info "You can check status at: https://play.google.com/console"
  
else
  log_info "Skipping Google Play submission (use --submit-to-playstore to submit)"
fi

# Generate Play Store metadata
log_info "Generating Google Play Store metadata..."

cat > play-store-metadata.json << EOF
{
  "appName": "$APP_NAME",
  "packageId": "$PACKAGE_ID",
  "versionCode": 1,
  "versionName": "1.0.0",
  "description": "Enterprise-grade Web3 ecosystem combining cryptocurrency, blockchain, AI, education, and social networking",
  "shortDescription": "Web3 ecosystem with blockchain, AI, and social features",
  "keywords": [
    "blockchain",
    "cryptocurrency",
    "web3",
    "ecosystem",
    "skycoin",
    "enterprise"
  ],
  "supportUrl": "https://github.com/skylerblue333/skycoin4444-production-optimized",
  "privacyUrl": "https://skycoin4444.com/privacy",
  "websiteUrl": "https://skycoin4444.com",
  "copyright": "© 2026 Innovative Information Technology Resolutions LLC. All rights reserved.",
  "category": "Business",
  "contentRating": {
    "violence": 0,
    "profanity": 0,
    "sexualContent": 0,
    "substanceAbuse": 0,
    "gambling": 0
  },
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE"
  ]
}
EOF

log_success "Generated Google Play Store metadata"

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ANDROID DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "App Name:           $APP_NAME"
echo "Package ID:         $PACKAGE_ID"
echo "Build Type:         $BUILD_TYPE"
if [ "$BUILD_ID" != "unknown" ]; then
  echo "Build ID:           $BUILD_ID"
fi
if [ "$SUBMISSION_ID" != "unknown" ]; then
  echo "Submission ID:      $SUBMISSION_ID"
fi
echo ""
echo "Next steps:"
echo "  1. Monitor review: https://play.google.com/console"
echo "  2. Check build status: eas build:list --platform android"
echo "  3. View submission status: eas submission:list --platform android"
echo ""
log_success "Android deployment complete!"

cd ../..
