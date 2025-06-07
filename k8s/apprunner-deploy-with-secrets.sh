#!/bin/bash

# Complete App Runner Deployment with Secrets Manager

set -e

APP_NAME="aws-architect-app"
SECRET_NAME="aws-architect-app/database"
AWS_REGION="us-east-1"
SERVICE_NAME="aws-architect-service"

echo "Starting App Runner deployment with Secrets Manager..."

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# Check if secret exists
SECRET_EXISTS=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region $AWS_REGION 2>/dev/null || echo "false")

if [ "$SECRET_EXISTS" = "false" ]; then
    echo "Creating database secret..."
    
    # Prompt for database credentials
    echo "Enter your database and AWS credentials:"
    read -p "DATABASE_URL: " DATABASE_URL
    read -p "AWS_ACCESS_KEY_ID: " AWS_ACCESS_KEY_ID
    read -s -p "AWS_SECRET_ACCESS_KEY: " AWS_SECRET_ACCESS_KEY
    echo
    read -p "AWS_REGION (default: us-east-1): " USER_AWS_REGION
    
    AWS_REGION=${USER_AWS_REGION:-$AWS_REGION}
    
    # Create secret
    SECRET_VALUE=$(cat <<EOF
{
  "DATABASE_URL": "$DATABASE_URL",
  "AWS_ACCESS_KEY_ID": "$AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY": "$AWS_SECRET_ACCESS_KEY",
  "AWS_REGION": "$AWS_REGION"
}
EOF
)
    
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "Database and AWS credentials for AWS Architect Application" \
        --secret-string "$SECRET_VALUE" \
        --region $AWS_REGION
else
    echo "Secret already exists: $SECRET_NAME"
fi

# Get secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --query 'ARN' \
    --output text \
    --region $AWS_REGION)

echo "Secret ARN: $SECRET_ARN"

# Create IAM role for App Runner
ROLE_NAME="AppRunnerSecretsRole"
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

# Create role
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "Role for App Runner to access Secrets Manager" 2>/dev/null || echo "Role exists"

# Attach policy for Secrets Manager access
POLICY_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:policy/AppRunnerSecretsPolicy"
POLICY_DOCUMENT=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "$SECRET_ARN"
        }
    ]
}
EOF
)

# Create policy
aws iam create-policy \
    --policy-name AppRunnerSecretsPolicy \
    --policy-document "$POLICY_DOCUMENT" \
    --description "Policy for App Runner to access secrets" 2>/dev/null || echo "Policy exists"

# Attach policy to role
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn $POLICY_ARN 2>/dev/null || echo "Policy attached"

# Wait for IAM propagation
echo "Waiting for IAM role propagation..."
sleep 30

# Create App Runner service configuration
SERVICE_CONFIG=$(cat <<EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "AutoDeploymentsEnabled": true,
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/YOUR_USERNAME/YOUR_REPO.git",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_16",
          "BuildCommand": "npm install && npm run build",
          "StartCommand": "npm start",
          "RuntimeEnvironmentVariables": {
            "NODE_ENV": "production",
            "PORT": "8080"
          },
          "RuntimeEnvironmentSecrets": {
            "DATABASE_URL": "$SECRET_ARN:DATABASE_URL::",
            "AWS_ACCESS_KEY_ID": "$SECRET_ARN:AWS_ACCESS_KEY_ID::",
            "AWS_SECRET_ACCESS_KEY": "$SECRET_ARN:AWS_SECRET_ACCESS_KEY::",
            "AWS_REGION": "$SECRET_ARN:AWS_REGION::"
          }
        }
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB",
    "InstanceRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  },
  "Tags": [
    {
      "Key": "Application",
      "Value": "AWS-Solutions-Architect"
    }
  ]
}
EOF
)

# Save configuration to file
echo "$SERVICE_CONFIG" > apprunner-service-config.json

echo ""
echo "App Runner setup complete!"
echo ""
echo "Secret ARN: $SECRET_ARN"
echo "IAM Role: arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"
echo ""
echo "To deploy via AWS Console:"
echo "1. Go to AWS App Runner"
echo "2. Create service from source code"
echo "3. Connect your GitHub repository"
echo "4. Use the apprunner-with-secrets.yaml configuration"
echo "5. Set the instance role to: $ROLE_NAME"
echo ""
echo "Configuration saved to: apprunner-service-config.json"

# Cleanup
rm -f apprunner-service-config.json