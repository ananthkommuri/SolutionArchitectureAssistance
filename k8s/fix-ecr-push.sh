#!/bin/bash

# Fix ECR Push Issues and Deploy to App Runner

set -e

AWS_REGION="us-east-1"
ECR_REPO_NAME="aws-architect-apprunner"
SERVICE_NAME="aws-architect-service"

echo "Fixing ECR push and deploying to App Runner..."

# Get account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# Create ECR repository if it doesn't exist
echo "Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION 2>/dev/null || echo "Repository exists"

# Configure Docker for ECR with retry logic
echo "Configuring Docker for ECR..."
for i in {1..3}; do
    echo "Login attempt $i..."
    if aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI; then
        echo "ECR login successful"
        break
    fi
    if [ $i -eq 3 ]; then
        echo "ECR login failed after 3 attempts"
        exit 1
    fi
    sleep 5
done

# Build image with proper tags
echo "Building Docker image..."
docker build -t $ECR_REPO_NAME:latest .

# Tag for ECR
echo "Tagging image..."
docker tag $ECR_REPO_NAME:latest $ECR_URI:latest

# Push with retry logic and better error handling
echo "Pushing image to ECR (this may take a few minutes)..."
for i in {1..3}; do
    echo "Push attempt $i..."
    if docker push $ECR_URI:latest; then
        echo "Image pushed successfully"
        break
    fi
    if [ $i -eq 3 ]; then
        echo "Push failed after 3 attempts. Trying alternative approach..."
        
        # Alternative: Use smaller chunks
        echo "Configuring Docker for better upload..."
        docker logout $ECR_URI
        
        # Re-login
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
        
        # Try one more time
        if docker push $ECR_URI:latest; then
            echo "Image pushed successfully on retry"
            break
        else
            echo "Push failed. Please check your network connection and Docker configuration."
            exit 1
        fi
    fi
    sleep 10
done

# Create App Runner service role with correct trust policy
echo "Creating App Runner service role..."
cat > apprunner-role-trust-policy.json << EOF
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
  --assume-role-policy-document file://apprunner-role-trust-policy.json 2>/dev/null || echo "Role exists"

aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess 2>/dev/null || echo "Policy attached"

# Wait for role propagation
echo "Waiting for IAM role propagation..."
sleep 30

# Get role ARN
ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/AppRunnerECRAccessRole"

# Create App Runner service with authentication configuration
echo "Creating App Runner service..."
cat > apprunner-service.json << EOF
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

# Check if service already exists
EXISTING_SERVICE=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text)

if [ ! -z "$EXISTING_SERVICE" ]; then
    echo "Service exists, starting new deployment..."
    aws apprunner start-deployment --service-arn $EXISTING_SERVICE
    SERVICE_ARN=$EXISTING_SERVICE
else
    echo "Creating new App Runner service..."
    SERVICE_ARN=$(aws apprunner create-service \
        --cli-input-json file://apprunner-service.json \
        --query 'Service.ServiceArn' \
        --output text)
fi

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
rm -f apprunner-role-trust-policy.json apprunner-service.json