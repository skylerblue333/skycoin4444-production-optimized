#!/bin/bash

#############################################################################
# SKYCOIN4444 - iOS App Store Deployment Script
#
# This script automates iOS app building and submission to Apple App Store:
# - Build optimized iOS app using EAS Build
# - Generate app store metadata
# - Submit to App Store Connect
# - Monitor review status
#
# Usage: ./scripts/deploy-ios.sh [OPTIONS]
# Options:
#   --build-type [debug|release]            Build type (default: release)
#   --submit-to-appstore                    Submit to App Store after build
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
SUBMIT_TO_APPSTORE=false
SKIP_BUILD=false
APP_NAME="SKYCOIN4444"
BUNDLE_ID="com.innovativeit.skycoin4444"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --build-type)
      BUILD_TYPE="$2"
      shift 2
      ;;
    --submit-to-appstore)
      SUBMIT_TO_APPSTORE=true
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

if ! command -v xcode-select &> /dev/null; then
  log_warning "Xcode command line tools not found. Some features may not work."
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

# Build iOS app unless skipped
if [ "$SKIP_BUILD" = false ]; then
  log_info "Building iOS app using EAS Build..."
  log_info "Build type: $BUILD_TYPE"
  
  eas build --platform ios \
    --build-type "$BUILD_TYPE" \
    --non-interactive || {
    log_error "EAS Build failed"
    exit 1
  }
  
  log_success "iOS app built successfully"
  
  # Get build ID
  BUILD_ID=$(eas build:list --platform ios --limit 1 --json | jq -r '.[0].id')
  log_info "Build ID: $BUILD_ID"
else
  log_info "Skipping build, using existing build"
fi

# Submit to App Store
if [ "$SUBMIT_TO_APPSTORE" = true ]; then
  log_info "Submitting to App Store..."
  
  # Validate app store credentials
  if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ]; then
    log_error "Apple ID credentials not found in environment variables"
    log_info "Please set APPLE_ID and APPLE_PASSWORD environment variables"
    exit 1
  fi
  
  # Submit build
  eas submit --platform ios \
    --latest \
    --non-interactive || {
    log_error "App Store submission failed"
    exit 1
  }
  
  log_success "Submitted to App Store"
  
  # Get submission ID
  SUBMISSION_ID=$(eas submission:list --platform ios --limit 1 --json | jq -r '.[0].id')
  log_info "Submission ID: $SUBMISSION_ID"
  
  # Monitor review status
  log_info "Monitoring App Store review status..."
  log_info "You can check status at: https://appstoreconnect.apple.com"
  
else
  log_info "Skipping App Store submission (use --submit-to-appstore to submit)"
fi

# Generate app store metadata
log_info "Generating App Store metadata..."

cat > app-store-metadata.json << EOF
{
  "appName": "$APP_NAME",
  "bundleId": "$BUNDLE_ID",
  "version": "1.0.0",
  "buildNumber": "1",
  "description": "Enterprise-grade Web3 ecosystem combining cryptocurrency, blockchain, AI, education, and social networking",
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
  "copyright": "© 2026 Innovative Information Technology Resolutions LLC. All rights reserved.",
  "category": "Business",
  "ratingConfig": {
    "alcoholTobacco": 0,
    "contests": 0,
    "gambling": 0,
    "unrestrictedWebAccess": 1,
    "medicalTreatmentInfo": 0,
    "profanity": 0,
    "sexualContent": 0,
    "sexualContentGraphic": 0,
    "violenceCartoon": 0,
    "violenceRealistic": 0,
    "violenceRealisticProlonged": 0
  }
}
EOF

log_success "Generated app store metadata"

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}iOS DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "App Name:           $APP_NAME"
echo "Bundle ID:          $BUNDLE_ID"
echo "Build Type:         $BUILD_TYPE"
if [ -n "$BUILD_ID" ]; then
  echo "Build ID:           $BUILD_ID"
fi
if [ -n "$SUBMISSION_ID" ]; then
  echo "Submission ID:      $SUBMISSION_ID"
fi
echo ""
echo "Next steps:"
echo "  1. Monitor review: https://appstoreconnect.apple.com"
echo "  2. Check build status: eas build:list --platform ios"
echo "  3. View submission status: eas submission:list --platform ios"
echo ""
log_success "iOS deployment complete!"

cd ../..
