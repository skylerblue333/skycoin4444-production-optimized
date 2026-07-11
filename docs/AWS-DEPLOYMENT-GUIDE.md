# SKYCOIN4444 AWS Deployment Guide

**Version:** 1.0.0-beta  
**Last Updated:** July 11, 2026  
**Environment:** Production (ECS Fargate)

---

## Prerequisites

Before starting, ensure you have:

1. **AWS Account** - Active AWS account with billing enabled
2. **AWS CLI** - Installed and configured (`aws --version`)
3. **Docker** - Installed and running (`docker --version`)
4. **Git** - Installed (`git --version`)
5. **Node.js** - v22+ installed (`node --version`)
6. **pnpm** - Installed (`pnpm --version`)
7. **GitHub Account** - With repository access
8. **Domain Name** - (Optional, for custom domain)

---

## Step 1: AWS Account Setup

### 1.1 Create AWS Account

Visit [AWS Console](https://console.aws.amazon.com) and create a new account if needed.

### 1.2 Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region: us-east-1
# Enter default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 1.3 Create IAM User for Deployment

```bash
# Create IAM user
aws iam create-user --user-name skycoin4444-deployer

# Create access key
aws iam create-access-key --user-name skycoin4444-deployer

# Attach deployment policy (use policy from skycoin4444-iam-policies.json)
aws iam put-user-policy \
  --user-name skycoin4444-deployer \
  --policy-name AWSDeploymentPolicy \
  --policy-document file://skycoin4444-iam-policies.json
```

### 1.4 Create KMS Key for Encryption

```bash
# Create KMS key
aws kms create-key \
  --description "SKYCOIN4444 encryption key" \
  --region us-east-1

# Note the KeyId from the output
export KMS_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
```

---

## Step 2: Prepare Application Code

### 2.1 Clone Repository

```bash
# Clone the production repository
git clone https://github.com/skylerblue333/skycoin4444-production-optimized.git
cd skycoin4444-production-optimized
```

### 2.2 Install Dependencies

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Verify build
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run check
```

### 2.3 Create Dockerfile

Create `infrastructure/docker/Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml package.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY pnpm-lock.yaml package.json ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "dist/index.js"]
```

### 2.4 Build and Test Docker Image Locally

```bash
# Build Docker image
docker build -t skycoin4444:latest -f infrastructure/docker/Dockerfile .

# Run container locally
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  skycoin4444:latest

# Test health endpoint
curl http://localhost:3000/health
```

---

## Step 3: Deploy CloudFormation Stack

### 3.1 Validate CloudFormation Template

```bash
# Validate template
aws cloudformation validate-template \
  --template-body file://skycoin4444-cloudformation.yaml \
  --region us-east-1
```

### 3.2 Create CloudFormation Stack

```bash
# Deploy stack
aws cloudformation create-stack \
  --stack-name skycoin4444-beta \
  --template-body file://skycoin4444-cloudformation.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=beta \
    ParameterKey=InstanceType,ParameterValue=t3.small \
    ParameterKey=DBInstanceClass,ParameterValue=db.t3.small \
    ParameterKey=DBAllocatedStorage,ParameterValue=100 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for stack creation (10-15 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name skycoin4444-beta \
  --region us-east-1

# Verify stack creation
aws cloudformation describe-stacks \
  --stack-name skycoin4444-beta \
  --region us-east-1
```

### 3.3 Get Stack Outputs

```bash
# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name skycoin4444-beta \
  --query 'Stacks[0].Outputs' \
  --region us-east-1

# Export important values
export ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name skycoin4444-beta \
  --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' \
  --output text \
  --region us-east-1)

export RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name skycoin4444-beta \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
  --output text \
  --region us-east-1)

export REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name skycoin4444-beta \
  --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
  --output text \
  --region us-east-1)

export S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name skycoin4444-beta \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text \
  --region us-east-1)

echo "ALB DNS: $ALB_DNS"
echo "RDS Endpoint: $RDS_ENDPOINT"
echo "Redis Endpoint: $REDIS_ENDPOINT"
echo "S3 Bucket: $S3_BUCKET"
```

---

## Step 4: Push Docker Image to ECR

### 4.1 Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name skycoin4444 \
  --region us-east-1

# Get repository URI
export ECR_REPOSITORY_URI=$(aws ecr describe-repositories \
  --repository-names skycoin4444 \
  --query 'repositories[0].repositoryUri' \
  --output text \
  --region us-east-1)

echo "ECR Repository URI: $ECR_REPOSITORY_URI"
```

### 4.2 Login to ECR

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
```

### 4.3 Build and Push Image

```bash
# Build image
docker build -t $ECR_REPOSITORY_URI:latest \
  -f infrastructure/docker/Dockerfile .

# Push image to ECR
docker push $ECR_REPOSITORY_URI:latest

# Verify image in ECR
aws ecr describe-images \
  --repository-name skycoin4444 \
  --region us-east-1
```

---

## Step 5: Configure Database

### 5.1 Get RDS Credentials

```bash
# Get RDS password from Secrets Manager
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id skycoin4444-beta/db/password \
  --query 'SecretString' \
  --output text \
  --region us-east-1 | jq -r '.password')

echo "Database: skycoin4444"
echo "Username: admin"
echo "Endpoint: $RDS_ENDPOINT"
echo "Port: 5432"
```

### 5.2 Run Database Migrations

```bash
# Install psql client (if not already installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client

# Create database
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U admin \
  -d postgres \
  -c "CREATE DATABASE skycoin4444;"

# Run migrations
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U admin \
  -d skycoin4444 \
  -f drizzle/migrations/0000_initial.sql

# Verify database
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U admin \
  -d skycoin4444 \
  -c "\dt"
```

---

## Step 6: Configure Environment Variables

### 6.1 Create Environment File

Create `.env.production`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/skycoin4444
REDIS_URL=redis://${REDIS_ENDPOINT}:6379
AWS_REGION=us-east-1
S3_BUCKET=${S3_BUCKET}
JWT_SECRET=$(openssl rand -base64 32)
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
```

### 6.2 Store Secrets in AWS Secrets Manager

```bash
# Create database secret
aws secretsmanager create-secret \
  --name skycoin4444-beta/db \
  --secret-string "{
    \"username\": \"admin\",
    \"password\": \"$DB_PASSWORD\",
    \"engine\": \"postgres\",
    \"host\": \"$RDS_ENDPOINT\",
    \"port\": 5432,
    \"dbname\": \"skycoin4444\"
  }" \
  --region us-east-1

# Create API keys secret
aws secretsmanager create-secret \
  --name skycoin4444-beta/api-keys \
  --secret-string "{
    \"jwt_secret\": \"$(openssl rand -base64 32)\",
    \"oauth_client_id\": \"your-oauth-client-id\",
    \"oauth_client_secret\": \"your-oauth-client-secret\"
  }" \
  --region us-east-1
```

---

## Step 7: Deploy ECS Service

### 7.1 Update Task Definition

```bash
# Get current task definition
aws ecs describe-task-definition \
  --task-definition skycoin4444-beta-task \
  --region us-east-1 > task-definition.json

# Update image URI in task definition
# Edit task-definition.json and update containerDefinitions[0].image to $ECR_REPOSITORY_URI:latest

# Register new task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1
```

### 7.2 Update ECS Service

```bash
# Update service with new task definition
aws ecs update-service \
  --cluster skycoin4444-beta-cluster \
  --service skycoin4444-beta-service \
  --task-definition skycoin4444-beta-task:2 \
  --force-new-deployment \
  --region us-east-1

# Wait for service update
aws ecs wait services-stable \
  --cluster skycoin4444-beta-cluster \
  --services skycoin4444-beta-service \
  --region us-east-1
```

### 7.3 Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster skycoin4444-beta-cluster \
  --services skycoin4444-beta-service \
  --region us-east-1

# Check running tasks
aws ecs list-tasks \
  --cluster skycoin4444-beta-cluster \
  --region us-east-1

# Check task details
aws ecs describe-tasks \
  --cluster skycoin4444-beta-cluster \
  --tasks arn:aws:ecs:us-east-1:123456789012:task/skycoin4444-beta-cluster/abc123 \
  --region us-east-1
```

---

## Step 8: Health Checks & Verification

### 8.1 Wait for ALB to be Healthy

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/skycoin4444-tg/abc123 \
  --region us-east-1

# Wait for targets to be healthy (may take 2-3 minutes)
for i in {1..30}; do
  HEALTH=$(aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/skycoin4444-tg/abc123 \
    --query 'TargetHealthDescriptions[0].TargetHealth.State' \
    --output text \
    --region us-east-1)
  
  if [ "$HEALTH" = "healthy" ]; then
    echo "✓ Targets are healthy"
    break
  fi
  
  echo "Attempt $i/30: Status = $HEALTH"
  sleep 10
done
```

### 8.2 Test Application Health

```bash
# Test health endpoint
curl http://$ALB_DNS/health

# Expected response:
# {"status":"ok","timestamp":"2026-07-11T12:00:00Z"}

# Test API endpoint
curl http://$ALB_DNS/api/health

# Test database connectivity
curl http://$ALB_DNS/api/system/health
```

### 8.3 Check Logs

```bash
# View ECS task logs
aws logs tail /ecs/skycoin4444-beta --follow --region us-east-1

# View specific log stream
aws logs tail /ecs/skycoin4444-beta/skycoin4444-app --follow --region us-east-1

# Search for errors
aws logs filter-log-events \
  --log-group-name /ecs/skycoin4444-beta \
  --filter-pattern "ERROR" \
  --region us-east-1
```

---

## Step 9: Configure Monitoring & Alerts

### 9.1 Create CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name skycoin4444-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=skycoin4444-beta-service Name=ClusterName,Value=skycoin4444-beta-cluster \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:skycoin4444-alerts \
  --region us-east-1

# High memory alarm
aws cloudwatch put-metric-alarm \
  --alarm-name skycoin4444-high-memory \
  --alarm-description "Alert when memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=skycoin4444-beta-service Name=ClusterName,Value=skycoin4444-beta-cluster \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:skycoin4444-alerts \
  --region us-east-1
```

### 9.2 Subscribe to SNS Topic

```bash
# Subscribe to alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:skycoin4444-alerts \
  --protocol email \
  --notification-endpoint iitrskylerblue4444@gmail.com \
  --region us-east-1

# Confirm subscription (check email)
```

---

## Step 10: Configure Custom Domain (Optional)

### 10.1 Create Route 53 Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name skycoin4444.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query 'HostedZones[?Name==`skycoin4444.com.`].Id' \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"
```

### 10.2 Create DNS Record

```bash
# Create A record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"skycoin4444.com\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"Z35SXDOTRQ7X7K\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": false
        }
      }
    }]
  }"

# Create CNAME for www subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"CREATE\",
      \"ResourceRecordSet\": {
        \"Name\": \"www.skycoin4444.com\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"skycoin4444.com\"}]
      }
    }]
  }"
```

---

## Step 11: Setup GitHub Actions CI/CD

### 11.1 Configure GitHub Secrets

```bash
# Add GitHub secrets
gh secret set AWS_ROLE_ARN --body "arn:aws:iam::123456789012:role/GitHubActionsRole"
gh secret set AWS_REGION --body "us-east-1"
gh secret set ECR_REPOSITORY --body "skycoin4444"
gh secret set ECS_CLUSTER --body "skycoin4444-beta-cluster"
gh secret set ECS_SERVICE --body "skycoin4444-beta-service"
gh secret set ECS_TASK_DEFINITION --body "skycoin4444-beta-task"
```

### 11.2 Add GitHub Actions Workflow

Copy `skycoin4444-github-actions-deploy.yml` to `.github/workflows/deploy.yml` in your repository.

### 11.3 Test CI/CD Pipeline

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Deploy to production"
git push origin main

# Monitor workflow in GitHub Actions
# https://github.com/skylerblue333/skycoin4444-production-optimized/actions
```

---

## Troubleshooting

### Issue: ECS Tasks Failing to Start

```bash
# Check task logs
aws ecs describe-tasks \
  --cluster skycoin4444-beta-cluster \
  --tasks arn:aws:ecs:us-east-1:123456789012:task/skycoin4444-beta-cluster/abc123 \
  --region us-east-1

# Check CloudWatch logs
aws logs tail /ecs/skycoin4444-beta --follow --region us-east-1
```

### Issue: Database Connection Errors

```bash
# Verify RDS security group
aws ec2 describe-security-groups \
  --group-ids sg-12345678 \
  --region us-east-1

# Test database connectivity
PGPASSWORD=$DB_PASSWORD psql \
  -h $RDS_ENDPOINT \
  -U admin \
  -d skycoin4444 \
  -c "SELECT 1"
```

### Issue: ALB Health Checks Failing

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/skycoin4444-tg/abc123 \
  --region us-east-1

# Check application health endpoint
curl -v http://$ALB_DNS/health
```

---

## Rollback Procedure

### Rollback to Previous Version

```bash
# Get previous task definition
PREVIOUS_TASK=$(aws ecs describe-services \
  --cluster skycoin4444-beta-cluster \
  --services skycoin4444-beta-service \
  --query 'services[0].taskDefinition' \
  --output text | sed 's/:[0-9]*$//')

# Get previous revision
PREVIOUS_REVISION=$(($(aws ecs describe-task-definition \
  --task-definition $PREVIOUS_TASK \
  --query 'taskDefinition.revision' \
  --output text) - 1))

# Update service with previous task definition
aws ecs update-service \
  --cluster skycoin4444-beta-cluster \
  --service skycoin4444-beta-service \
  --task-definition "$PREVIOUS_TASK:$PREVIOUS_REVISION" \
  --force-new-deployment \
  --region us-east-1
```

---

## Maintenance

### Regular Tasks

- **Daily:** Monitor CloudWatch dashboards and logs
- **Weekly:** Review cost reports and optimize
- **Monthly:** Update security patches and dependencies
- **Quarterly:** Conduct security audit and penetration testing
- **Annually:** Review disaster recovery procedures

---

**Document Version:** 1.0.0-beta  
**Last Updated:** July 11, 2026  
**Next Review:** After first deployment
