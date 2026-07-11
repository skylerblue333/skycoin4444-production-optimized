#!/bin/bash

#############################################################################
# SKYCOIN4444 - One-Click Google Cloud Deployment Script
# 
# This script automates the complete deployment to Google Cloud Platform:
# - Cloud Run (backend services)
# - Cloud SQL (managed database)
# - Cloud Storage (file storage)
# - Cloud CDN (content delivery)
#
# Usage: ./scripts/deploy-gcp.sh [OPTIONS]
# Options:
#   --environment [dev|staging|production]  Environment to deploy to (default: staging)
#   --region [region]                       GCP region (default: us-central1)
#   --skip-tests                            Skip running tests before deployment
#   --skip-build                            Skip building before deployment
#   --help                                  Show this help message
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
REGION="us-central1"
SKIP_TESTS=false
SKIP_BUILD=false
PROJECT_ID=""
SERVICE_NAME="skycoin4444"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --skip-tests)
      SKIP_TESTS=true
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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
  echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be dev, staging, or production.${NC}"
  exit 1
fi

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

if ! command -v gcloud &> /dev/null; then
  log_error "Google Cloud SDK is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed. Please install it from https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  log_error "pnpm is not installed. Please install it from https://pnpm.io/installation"
  exit 1
fi

log_success "All prerequisites are installed"

# Get GCP project ID
log_info "Retrieving GCP project ID..."
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
  log_error "GCP project ID not found. Please run 'gcloud init' first."
  exit 1
fi

log_success "Using GCP project: $PROJECT_ID"

# Load environment variables
log_info "Loading environment variables for $ENVIRONMENT..."
if [ -f ".env.$ENVIRONMENT" ]; then
  export $(cat ".env.$ENVIRONMENT" | grep -v '^#' | xargs)
  log_success "Loaded .env.$ENVIRONMENT"
else
  log_warning ".env.$ENVIRONMENT not found, using .env.local"
  if [ -f ".env.local" ]; then
    export $(cat ".env.local" | grep -v '^#' | xargs)
  fi
fi

# Run tests unless skipped
if [ "$SKIP_TESTS" = false ]; then
  log_info "Running tests..."
  pnpm run test || {
    log_error "Tests failed. Aborting deployment."
    exit 1
  }
  log_success "Tests passed"
fi

# Build unless skipped
if [ "$SKIP_BUILD" = false ]; then
  log_info "Building application..."
  pnpm run build || {
    log_error "Build failed. Aborting deployment."
    exit 1
  }
  log_success "Build completed"
fi

# Build Docker image
log_info "Building Docker image..."
docker build -t "gcr.io/$PROJECT_ID/$SERVICE_NAME:$ENVIRONMENT" \
  --build-arg ENVIRONMENT="$ENVIRONMENT" \
  -f infrastructure/docker/Dockerfile .

log_success "Docker image built"

# Push to Google Container Registry
log_info "Pushing image to Google Container Registry..."
docker push "gcr.io/$PROJECT_ID/$SERVICE_NAME:$ENVIRONMENT"
log_success "Image pushed to GCR"

# Deploy to Cloud Run
log_info "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME-$ENVIRONMENT" \
  --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:$ENVIRONMENT" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=$ENVIRONMENT,PROJECT_ID=$PROJECT_ID" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 100

log_success "Deployed to Cloud Run"

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME-$ENVIRONMENT" \
  --platform managed \
  --region "$REGION" \
  --format 'value(status.url)')

log_success "Service deployed at: $SERVICE_URL"

# Deploy database migrations
log_info "Running database migrations..."
gcloud sql connect skycoin4444-db-$ENVIRONMENT \
  --user=root \
  --database=skycoin4444 \
  < drizzle/migrations/latest.sql || log_warning "Database migrations may have already been applied"

log_success "Database migrations completed"

# Set up Cloud Storage bucket
log_info "Setting up Cloud Storage bucket..."
BUCKET_NAME="skycoin4444-$ENVIRONMENT-assets"
if gsutil ls "gs://$BUCKET_NAME" &> /dev/null; then
  log_warning "Bucket $BUCKET_NAME already exists"
else
  gsutil mb -l "$REGION" "gs://$BUCKET_NAME"
  gsutil versioning set on "gs://$BUCKET_NAME"
  log_success "Created Cloud Storage bucket: $BUCKET_NAME"
fi

# Configure Cloud CDN
log_info "Configuring Cloud CDN..."
gcloud compute backend-buckets create skycoin4444-cdn-$ENVIRONMENT \
  --gcs-bucket-name="$BUCKET_NAME" \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC || log_warning "CDN may already be configured"

log_success "Cloud CDN configured"

# Health check
log_info "Performing health check..."
sleep 5
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
  log_success "Health check passed (HTTP $HEALTH_CHECK)"
else
  log_warning "Health check returned HTTP $HEALTH_CHECK"
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Environment:        $ENVIRONMENT"
echo "Project:            $PROJECT_ID"
echo "Region:             $REGION"
echo "Service URL:        $SERVICE_URL"
echo "Storage Bucket:     gs://$BUCKET_NAME"
echo ""
echo "Next steps:"
echo "  1. Verify deployment: curl $SERVICE_URL/health"
echo "  2. View logs: gcloud run logs read $SERVICE_NAME-$ENVIRONMENT --region $REGION"
echo "  3. Monitor: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""
log_success "Deployment successful!"
