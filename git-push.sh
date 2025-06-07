#!/bin/bash

# Git Push Script for AWS Solutions Architect Application

echo "Preparing to push AWS Solutions Architect application to Git..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Add all files
echo "Adding files to git..."
git add .

# Create commit
echo "Creating commit..."
git commit -m "AWS Solutions Architect app with EKS deployment

Features:
- AI-powered architecture recommendations using Amazon Bedrock
- Real-time AWS pricing calculations
- CloudFormation/Terraform template generation
- Complete EKS deployment configuration
- PostgreSQL database integration
- Docker containerization
- Public load balancer access

Deployment options:
- EKS production deployment (~$200/month)
- App Runner simplified deployment (~$25-50/month)
- Local development setup"

# Instructions for user
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Copy the repository URL"
echo "3. Run these commands:"
echo ""
echo "git remote add origin YOUR_REPO_URL"
echo "git branch -M main"
echo "git push -u origin main"
echo ""
echo "Replace YOUR_REPO_URL with your actual GitHub repository URL"