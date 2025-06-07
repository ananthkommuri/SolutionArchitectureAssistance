#!/bin/bash

# App Runner Deployment with Full Permissions Setup

set -e

AWS_REGION="us-east-1"
ECR_REPO_NAME="aws-architect-apprunner"
SERVICE_NAME="aws-architect-service"

echo "Setting up App Runner with full permissions..."

# Get account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# Create ECR repository
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION 2>/dev/null || echo "Repository exists"

# Build and push image
echo "Building Docker image..."
docker build -t $ECR_REPO_NAME:latest .
docker tag $ECR_REPO_NAME:latest $ECR_URI:latest

echo "Pushing to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
docker push $ECR_URI:latest

# Delete existing role if it exists to recreate with correct permissions
aws iam detach-role-policy \
    --role-name AppRunnerECRAccessRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess 2>/dev/null || true

aws iam delete-role --role-name AppRunnerECRAccessRole 2>/dev/null || true

echo "Creating comprehensive App Runner service role..."

# Create proper trust policy for App Runner
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
    --role-name AppRunnerECRAccessRole \
    --assume-role-policy-document file://trust-policy.json

# Attach the official App Runner ECR policy
aws iam attach-role-policy \
    --role-name AppRunnerECRAccessRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

# Create additional policy for full ECR access
cat > ecr-full-access.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeRepositories",
        "ecr:DescribeImages",
        "ecr:DescribeImageScanFindings"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create and attach the custom policy
aws iam create-policy \
    --policy-name AppRunnerECRFullAccess \
    --policy-document file://ecr-full-access.json 2>/dev/null || echo "Policy exists"

aws iam attach-role-policy \
    --role-name AppRunnerECRAccessRole \
    --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/AppRunnerECRFullAccess

# Wait for role propagation
echo "Waiting for IAM propagation..."
sleep 60

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/AppRunnerECRAccessRole"

# Delete existing service if it exists
EXISTING_SERVICE=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text 2>/dev/null || echo "")
if [ ! -z "$EXISTING_SERVICE" ]; then
    echo "Deleting existing service..."
    aws apprunner delete-service --service-arn $EXISTING_SERVICE
    aws apprunner wait service-deleted --service-arn $EXISTING_SERVICE
fi

# Create App Runner service with explicit authentication configuration
echo "Creating App Runner service with authentication..."

# Use a step-by-step approach with explicit configuration
cat > service-config.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI:latest",
      "ImageConfiguration": {
        "Port": "5000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "AWS_REGION": "$AWS_REGION"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": false
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }
}
EOF

SERVICE_ARN=$(aws apprunner create-service \
    --cli-input-json file://service-config.json \
    --query 'Service.ServiceArn' \
    --output text)

echo "Waiting for service to be ready (this may take 5-10 minutes)..."
aws apprunner wait service-running --service-arn $SERVICE_ARN

# Get service URL
SERVICE_URL=$(aws apprunner describe-service \
    --service-arn $SERVICE_ARN \
    --query 'Service.ServiceUrl' \
    --output text)

echo ""
echo "App Runner deployment successful!"
echo ""
echo "Application URL: https://$SERVICE_URL"
echo "Service ARN: $SERVICE_ARN"
echo ""
echo "Your AWS Solutions Architect application is live and accessible worldwide!"
echo "Cost: Approximately $25-50/month based on usage"

# Cleanup temporary files
rm -f trust-policy.json ecr-full-access.json service-config.json