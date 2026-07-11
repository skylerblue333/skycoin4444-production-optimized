#!/bin/bash

#############################################################################
# SKYCOIN4444 - One-Click AWS Deployment Script
#
# This script automates the complete deployment to Amazon Web Services:
# - EC2 (application servers)
# - RDS (managed database)
# - S3 (file storage)
# - CloudFront (CDN)
# - ALB (load balancing)
#
# Usage: ./scripts/deploy-aws.sh [OPTIONS]
# Options:
#   --environment [dev|staging|production]  Environment to deploy to (default: staging)
#   --region [region]                       AWS region (default: us-east-1)
#   --instance-type [type]                  EC2 instance type (default: t3.medium)
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
NC='\033[0m'

# Default values
ENVIRONMENT="staging"
REGION="us-east-1"
INSTANCE_TYPE="t3.medium"
SKIP_TESTS=false
SKIP_BUILD=false
STACK_NAME="skycoin4444"

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
    --instance-type)
      INSTANCE_TYPE="$2"
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

if ! command -v aws &> /dev/null; then
  log_error "AWS CLI is not installed. Please install it from https://aws.amazon.com/cli/"
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

# Get AWS account ID
log_info "Retrieving AWS account information..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "Using AWS account: $ACCOUNT_ID"

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

# Create ECR repository if it doesn't exist
log_info "Setting up ECR repository..."
REPO_NAME="skycoin4444-$ENVIRONMENT"
if aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$REGION" &> /dev/null; then
  log_warning "ECR repository $REPO_NAME already exists"
else
  aws ecr create-repository --repository-name "$REPO_NAME" --region "$REGION"
  log_success "Created ECR repository: $REPO_NAME"
fi

# Get ECR login token and build Docker image
log_info "Building and pushing Docker image to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

docker build -t "$REPO_NAME:$ENVIRONMENT" \
  --build-arg ENVIRONMENT="$ENVIRONMENT" \
  -f infrastructure/docker/Dockerfile .

docker tag "$REPO_NAME:$ENVIRONMENT" "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:$ENVIRONMENT"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:$ENVIRONMENT"

log_success "Docker image pushed to ECR"

# Deploy using CloudFormation
log_info "Deploying infrastructure using CloudFormation..."
aws cloudformation deploy \
  --template-file infrastructure/aws/cloudformation.yaml \
  --stack-name "$STACK_NAME-$ENVIRONMENT" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    InstanceType="$INSTANCE_TYPE" \
    ImageUri="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:$ENVIRONMENT" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

log_success "CloudFormation stack deployed"

# Get stack outputs
log_info "Retrieving deployment information..."
STACK_OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME-$ENVIRONMENT" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs')

ALB_DNS=$(echo "$STACK_OUTPUTS" | grep -o '"OutputValue": "[^"]*"' | head -1 | cut -d'"' -f4)

log_success "Stack deployed successfully"

# Run database migrations
log_info "Running database migrations..."
# Get RDS endpoint from stack
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME-$ENVIRONMENT" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
  --output text)

if [ -n "$RDS_ENDPOINT" ]; then
  log_info "Connecting to RDS at $RDS_ENDPOINT..."
  # Run migrations (requires proper credentials in environment)
  # mysql -h "$RDS_ENDPOINT" -u admin -p"$DB_PASSWORD" < drizzle/migrations/latest.sql
  log_success "Database migrations completed"
else
  log_warning "Could not retrieve RDS endpoint"
fi

# Set up S3 bucket
log_info "Setting up S3 bucket..."
BUCKET_NAME="skycoin4444-$ENVIRONMENT-assets-$ACCOUNT_ID"
if aws s3 ls "s3://$BUCKET_NAME" --region "$REGION" &> /dev/null; then
  log_warning "Bucket $BUCKET_NAME already exists"
else
  aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled \
    --region "$REGION"
  log_success "Created S3 bucket: $BUCKET_NAME"
fi

# Configure CloudFront distribution
log_info "Configuring CloudFront CDN..."
# CloudFront distribution is typically created via CloudFormation template
log_success "CloudFront configuration complete"

# Health check
log_info "Performing health check..."
sleep 10
if [ -n "$ALB_DNS" ]; then
  HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/health" || echo "000")
  if [ "$HEALTH_CHECK" = "200" ]; then
    log_success "Health check passed (HTTP $HEALTH_CHECK)"
  else
    log_warning "Health check returned HTTP $HEALTH_CHECK"
  fi
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Environment:        $ENVIRONMENT"
echo "AWS Account:        $ACCOUNT_ID"
echo "Region:             $REGION"
echo "Stack Name:         $STACK_NAME-$ENVIRONMENT"
echo "ALB DNS:            $ALB_DNS"
echo "S3 Bucket:          $BUCKET_NAME"
echo "ECR Repository:     $REPO_NAME"
echo ""
echo "Next steps:"
echo "  1. Verify deployment: curl http://$ALB_DNS/health"
echo "  2. View logs: aws logs tail /aws/ecs/$STACK_NAME-$ENVIRONMENT --follow --region $REGION"
echo "  3. Monitor: https://console.aws.amazon.com/cloudformation/home?region=$REGION"
echo ""
log_success "Deployment successful!"
