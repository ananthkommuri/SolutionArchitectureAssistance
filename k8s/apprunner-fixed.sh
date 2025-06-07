#!/bin/bash

# Fixed App Runner Deployment with Proper ECR Authentication

set -e

AWS_REGION="us-east-1"
ECR_REPO_NAME="aws-architect-apprunner"
SERVICE_NAME="aws-architect-service"

echo "Deploying to App Runner with proper ECR authentication..."

# Get account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# Create ECR repository
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION 2>/dev/null || echo "Repository exists"

# Build and push image
echo "Building and pushing Docker image..."
docker build -t $ECR_REPO_NAME:latest .
docker tag $ECR_REPO_NAME:latest $ECR_URI:latest

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
docker push $ECR_URI:latest

# Create App Runner access role with correct trust policy
echo "Creating App Runner access role..."
cat > access-role-trust-policy.json << EOF
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

aws iam create-role \
  --role-name AppRunnerECRAccessRole \
  --assume-role-policy-document file://access-role-trust-policy.json 2>/dev/null || echo "Role exists"

aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess 2>/dev/null || echo "Policy attached"

# Wait for role propagation
sleep 30

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/AppRunnerECRAccessRole"

# Create service using AWS CLI with proper authentication
echo "Creating App Runner service..."
SERVICE_ARN=$(aws apprunner create-service \
  --service-name "$SERVICE_NAME" \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$ECR_URI':latest",
      "ImageConfiguration": {
        "Port": "5000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "AWS_REGION": "'$AWS_REGION'"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": false
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }' \
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
echo "App Runner deployment successful!"
echo ""
echo "Application URL: https://$SERVICE_URL"
echo "Service ARN: $SERVICE_ARN"
echo ""
echo "Your AWS Solutions Architect application is now live!"

# Cleanup
rm -f access-role-trust-policy.json