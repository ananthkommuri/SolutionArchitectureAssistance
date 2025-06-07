#!/bin/bash

# AWS Elastic Beanstalk Deployment

set -e

APP_NAME="aws-architect-app"
ENV_NAME="aws-architect-env"
AWS_REGION="us-east-1"
SOLUTION_STACK="64bit Amazon Linux 2 v5.8.4 running Node.js 18"

echo "Deploying to AWS Elastic Beanstalk..."

# Create application
echo "Creating Beanstalk application..."
aws elasticbeanstalk create-application \
    --application-name $APP_NAME \
    --description "AWS Solutions Architect Application" \
    --region $AWS_REGION 2>/dev/null || echo "Application exists"

# Create application zip
echo "Creating deployment package..."
zip -r app.zip . -x "node_modules/*" ".git/*" "*.log" "k8s/*"

# Upload application version
echo "Uploading application version..."
S3_BUCKET="elasticbeanstalk-$AWS_REGION-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://$S3_BUCKET 2>/dev/null || echo "Bucket exists"
aws s3 cp app.zip s3://$S3_BUCKET/app.zip

# Create application version
aws elasticbeanstalk create-application-version \
    --application-name $APP_NAME \
    --version-label "v1-$(date +%Y%m%d-%H%M%S)" \
    --source-bundle S3Bucket=$S3_BUCKET,S3Key=app.zip \
    --region $AWS_REGION

# Create environment
echo "Creating Beanstalk environment..."
aws elasticbeanstalk create-environment \
    --application-name $APP_NAME \
    --environment-name $ENV_NAME \
    --solution-stack-name "$SOLUTION_STACK" \
    --option-settings \
        Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=t3.small \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080 \
    --region $AWS_REGION

echo "Waiting for environment to be ready..."
aws elasticbeanstalk wait environment-ready --environment-name $ENV_NAME --region $AWS_REGION

# Get environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names $ENV_NAME \
    --query 'Environments[0].CNAME' \
    --output text \
    --region $AWS_REGION)

echo ""
echo "Elastic Beanstalk deployment successful!"
echo ""
echo "Application URL: http://$ENV_URL"
echo "Environment: $ENV_NAME"
echo ""
echo "Cost: Approximately $15-30/month"

# Cleanup
rm -f app.zip