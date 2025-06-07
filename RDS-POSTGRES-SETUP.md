# Amazon RDS PostgreSQL Setup

## Step 1: Create RDS Database

Run the script to create your PostgreSQL database:
```bash
./k8s/create-rds-postgres.sh
```

This creates:
- RDS PostgreSQL instance (db.t3.micro)
- Security group allowing PostgreSQL access
- Database named `awsarchitect`
- Encrypted storage with 7-day backup retention

**Cost:** Approximately $15-25/month

## Step 2: Store Credentials in Secrets Manager

After RDS creation completes, you'll get a DATABASE_URL. Run:
```bash
./k8s/setup-secrets-manager.sh
```

Enter:
- **DATABASE_URL**: The RDS connection string from step 1
- **AWS_ACCESS_KEY_ID**: Your AWS access key for Bedrock
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret key
- **AWS_REGION**: us-east-1 (or your region)

## Step 3: Deploy to App Runner

```bash
./k8s/apprunner-deploy-with-secrets.sh
```

This configures App Runner with secure access to your RDS database.

## Database Migration

After deployment, run database migrations:
```bash
npm run db:push
```

This creates the required tables:
- users
- chat_sessions  
- messages
- architectures

## Benefits of RDS PostgreSQL

- **Managed service** - Automatic backups, patches, monitoring
- **High availability** - Multi-AZ deployment options
- **Scalable** - Easy to upgrade instance size
- **Secure** - Encryption at rest and in transit
- **Cost effective** - Pay for what you use

Your AWS Solutions Architect application now has persistent database storage with enterprise-grade PostgreSQL infrastructure.