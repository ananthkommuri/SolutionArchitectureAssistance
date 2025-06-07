# Neon PostgreSQL + Secrets Manager Setup

## Your Database: Neon PostgreSQL (Serverless)

Your application is configured to use **Neon PostgreSQL**, which is perfect for App Runner because:
- Serverless and automatically scales
- No connection limits like traditional PostgreSQL
- Built-in connection pooling
- Cost-effective pay-per-use pricing

## Get Your Neon Database URL

1. **Go to Neon Console**: https://console.neon.tech/
2. **Select your database project**
3. **Copy the connection string** from the dashboard
4. **Format**: `postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

## Store in AWS Secrets Manager

Run the setup script and provide your Neon credentials:
```bash
./k8s/setup-secrets-manager.sh
```

**Enter when prompted:**
- **DATABASE_URL**: Your Neon connection string
- **AWS_ACCESS_KEY_ID**: Your AWS access key
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret key  
- **AWS_REGION**: us-east-1 (or your preferred region)

## Why Neon + App Runner Works Well

- **Serverless to Serverless**: Both scale automatically
- **Global edge**: Neon's read replicas work with App Runner's regions
- **Connection efficiency**: Neon handles connection pooling
- **Cost optimization**: Pay only for actual database usage

## Alternative: Switch to Amazon RDS

If you prefer Amazon RDS PostgreSQL instead:

1. **Create RDS instance** in AWS Console
2. **Update connection string** to RDS endpoint
3. **Configure VPC access** for App Runner service
4. **Update security groups** for database access

Your current Neon setup is optimal for App Runner deployment with automatic scaling and no infrastructure management required.