# AWS Solutions Architect Application

An AI-powered web application for AWS Solutions Architects that provides intelligent architecture recommendations, real-time pricing analysis, and infrastructure as code generation using Amazon Bedrock Claude Sonnet 4.

## Features

- **AI Architecture Recommendations**: Get intelligent AWS architecture suggestions using Amazon Bedrock
- **Real-time Pricing**: Calculate and optimize AWS service costs
- **Infrastructure as Code**: Generate CloudFormation and Terraform templates
- **Chat Interface**: Interactive conversation-based architecture design
- **Persistent Storage**: PostgreSQL database for chat history and architectures
- **Production Ready**: Docker containerization and Kubernetes deployment

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Amazon Bedrock Claude Sonnet 4
- **Deployment**: Kubernetes (EKS) + Docker
- **Infrastructure**: AWS services integration

## Quick Start

### Local Development
```bash
npm install
npm run dev
```
Application will be available at http://localhost:5000

### AWS Deployment

#### Option 1: EKS Deployment (Production)
```bash
# 1. Setup AWS infrastructure
./k8s/aws-setup-public-ip.sh

# 2. Update database configuration in k8s/secret.yaml

# 3. Deploy application
./k8s/deploy-public.sh
```

#### Option 2: App Runner (Simplified)
Use the included `apprunner.yaml` configuration in AWS App Runner console.

## Project Structure

```
├── client/              # React frontend
├── server/              # Express backend
├── shared/              # Shared types and schemas
├── k8s/                 # Kubernetes manifests
├── Dockerfile           # Container configuration
└── deployment guides    # Various deployment options
```

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (default: us-east-1)

### AWS Services Required
- Amazon Bedrock (Claude Sonnet 4 access)
- Amazon RDS (PostgreSQL)
- Amazon EKS (for Kubernetes deployment)
- Amazon ECR (container registry)

## Deployment Options

### 1. EKS Production Deployment
- Full Kubernetes orchestration
- Auto-scaling (3-10 pods)
- Load balancer with public access
- Managed database
- Cost: ~$200/month

### 2. App Runner Deployment
- Simplified AWS deployment
- Automatic scaling
- Built-in load balancing
- Cost: ~$25-50/month

### 3. Local Development
- SQLite database
- No AWS dependencies for basic testing
- Cost: Free

## Security Features

- VPC isolation
- Security groups
- Encrypted database storage
- Non-root container execution
- Environment variable secrets management

## Monitoring

- Health check endpoints
- Kubernetes liveness/readiness probes
- CloudWatch integration
- Application logging

## Contributing

1. Ensure all prerequisites are installed
2. Run local development setup
3. Test changes thoroughly
4. Follow TypeScript and React best practices

## License

MIT License - see LICENSE file for details