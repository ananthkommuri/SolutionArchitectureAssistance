# Git Repository Setup Instructions

## Initialize Git Repository

Run these commands in your project directory:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: AWS Solutions Architect application with EKS deployment"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/your-username/aws-solutions-architect.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## If Using GitHub

1. Go to https://github.com
2. Click "New repository"
3. Name it "aws-solutions-architect"
4. Don't initialize with README (we already have one)
5. Copy the repository URL
6. Use the commands above with your actual repository URL

## Alternative: GitHub CLI

If you have GitHub CLI installed:

```bash
# Create repository and push
gh repo create aws-solutions-architect --public --source=. --remote=origin --push
```

## What's Included

The repository contains:
- Complete application source code
- Kubernetes deployment manifests
- Docker configuration
- AWS setup scripts
- Deployment documentation
- Proper .gitignore file

## Security Note

The .gitignore excludes sensitive files like:
- k8s/secret.yaml (contains database passwords)
- .env files
- AWS credentials

Always keep sensitive data separate from your repository.