#!/bin/bash

# Setup AWS Secrets Manager for App Runner Database Connection

set -e

SECRET_NAME="aws-architect-app/database"
AWS_REGION="us-east-1"

echo "Setting up AWS Secrets Manager for database connection..."

# Create the secret with database connection details
echo "Creating database secret in Secrets Manager..."

# You'll need to replace these values with your actual database details
read -p "Enter your DATABASE_URL: " DATABASE_URL
read -p "Enter your AWS_ACCESS_KEY_ID: " AWS_ACCESS_KEY_ID
read -p "Enter your AWS_SECRET_ACCESS_KEY: " AWS_SECRET_ACCESS_KEY
read -p "Enter your AWS_REGION (default: us-east-1): " USER_AWS_REGION

# Use provided region or default
AWS_REGION=${USER_AWS_REGION:-$AWS_REGION}

# Create secret JSON
SECRET_VALUE=$(cat <<EOF
{
  "DATABASE_URL": "$DATABASE_URL",
  "AWS_ACCESS_KEY_ID": "$AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY": "$AWS_SECRET_ACCESS_KEY",
  "AWS_REGION": "$AWS_REGION"
}
EOF
)

# Create or update the secret
aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Database and AWS credentials for AWS Architect Application" \
    --secret-string "$SECRET_VALUE" \
    --region $AWS_REGION 2>/dev/null || \
aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_VALUE" \
    --region $AWS_REGION

echo "Secret created/updated successfully!"

# Get the secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --query 'ARN' \
    --output text \
    --region $AWS_REGION)

echo ""
echo "Secret ARN: $SECRET_ARN"
echo ""
echo "Use this ARN in your App Runner service configuration."
echo "The secret contains:"
echo "- DATABASE_URL"
echo "- AWS_ACCESS_KEY_ID"
echo "- AWS_SECRET_ACCESS_KEY"
echo "- AWS_REGION"