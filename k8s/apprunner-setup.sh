#!/bin/bash

# AWS App Runner Setup - Minimal Permissions Required

set -e

AWS_REGION="us-east-1"
ECR_REPO_NAME="aws-architect-apprunner"
SERVICE_NAME="aws-architect-service"

echo "Setting up AWS App Runner deployment..."

# Create ECR repository
echo "Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION || echo "Repository exists"

# Get account ID and build image URI
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# Build and push image
echo "Building Docker image..."
docker build -t $ECR_REPO_NAME .

echo "Tagging image..."
docker tag $ECR_REPO_NAME:latest $ECR_URI:latest

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "Pushing image..."
docker push $ECR_URI:latest

# Create App Runner configuration
cat > apprunner-config.json << EOF
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

# Create App Runner service
echo "Creating App Runner service..."
SERVICE_ARN=$(aws apprunner create-service \
    --cli-input-json file://apprunner-config.json \
    --query 'Service.ServiceArn' \
    --output text)

echo "Waiting for service to be ready..."
aws apprunner wait service-running --service-arn $SERVICE_ARN

# Get service URL
SERVICE_URL=$(aws apprunner describe-service \
    --service-arn $SERVICE_ARN \
    --query 'Service.ServiceUrl' \
    --output text)

echo ""
echo "App Runner deployment complete!"
echo ""
echo "Service URL: https://$SERVICE_URL"
echo "Service ARN: $SERVICE_ARN"
echo ""
echo "Cost: Approximately $25-50/month"
echo ""
echo "To update the application:"
echo "1. Push new image to ECR"
echo "2. Start new deployment:"
echo "   aws apprunner start-deployment --service-arn $SERVICE_ARN"

# Cleanup
rm -f apprunner-config.json