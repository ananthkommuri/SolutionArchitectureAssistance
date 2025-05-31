export interface AWSService {
  name: string;
  category: string;
  basePricing: {
    unit: string;
    pricePerUnit: number;
    region: string;
  };
  configurations: {
    [key: string]: {
      multiplier: number;
      description: string;
    };
  };
}

// AWS service pricing data (simplified for demo - in production this would come from AWS Pricing API)
const AWS_SERVICES: Record<string, AWSService> = {
  "EC2": {
    name: "Amazon EC2",
    category: "Compute",
    basePricing: {
      unit: "hour",
      pricePerUnit: 0.0464, // t3.large on-demand
      region: "us-east-1"
    },
    configurations: {
      "t3.micro": { multiplier: 0.2, description: "1 vCPU, 1 GB RAM" },
      "t3.small": { multiplier: 0.4, description: "1 vCPU, 2 GB RAM" },
      "t3.medium": { multiplier: 0.8, description: "2 vCPU, 4 GB RAM" },
      "t3.large": { multiplier: 1.0, description: "2 vCPU, 8 GB RAM" },
      "t3.xlarge": { multiplier: 2.0, description: "4 vCPU, 16 GB RAM" },
      "m5.large": { multiplier: 1.2, description: "2 vCPU, 8 GB RAM (balanced)" },
      "c5.large": { multiplier: 1.1, description: "2 vCPU, 4 GB RAM (compute optimized)" }
    }
  },
  "RDS": {
    name: "Amazon RDS",
    category: "Database",
    basePricing: {
      unit: "hour",
      pricePerUnit: 0.145, // db.t3.medium PostgreSQL
      region: "us-east-1"
    },
    configurations: {
      "db.t3.micro": { multiplier: 0.3, description: "1 vCPU, 1 GB RAM" },
      "db.t3.small": { multiplier: 0.5, description: "1 vCPU, 2 GB RAM" },
      "db.t3.medium": { multiplier: 1.0, description: "2 vCPU, 4 GB RAM" },
      "db.t3.large": { multiplier: 2.0, description: "2 vCPU, 8 GB RAM" },
      "multi-az": { multiplier: 2.0, description: "Multi-AZ deployment" }
    }
  },
  "ALB": {
    name: "Application Load Balancer",
    category: "Networking",
    basePricing: {
      unit: "hour",
      pricePerUnit: 0.0225,
      region: "us-east-1"
    },
    configurations: {
      "standard": { multiplier: 1.0, description: "Standard load balancer" },
      "high-availability": { multiplier: 1.5, description: "Multi-AZ load balancer" }
    }
  },
  "CloudFront": {
    name: "Amazon CloudFront",
    category: "Content Delivery",
    basePricing: {
      unit: "GB",
      pricePerUnit: 0.085,
      region: "global"
    },
    configurations: {
      "standard": { multiplier: 1.0, description: "Standard distribution" },
      "premium": { multiplier: 1.25, description: "Premium edge locations" }
    }
  },
  "S3": {
    name: "Amazon S3",
    category: "Storage",
    basePricing: {
      unit: "GB/month",
      pricePerUnit: 0.023,
      region: "us-east-1"
    },
    configurations: {
      "standard": { multiplier: 1.0, description: "Standard storage class" },
      "ia": { multiplier: 0.6, description: "Infrequent Access" },
      "glacier": { multiplier: 0.2, description: "Glacier storage" }
    }
  },
  "Lambda": {
    name: "AWS Lambda",
    category: "Compute",
    basePricing: {
      unit: "1M requests",
      pricePerUnit: 0.20,
      region: "us-east-1"
    },
    configurations: {
      "128mb": { multiplier: 1.0, description: "128 MB memory" },
      "256mb": { multiplier: 2.0, description: "256 MB memory" },
      "512mb": { multiplier: 4.0, description: "512 MB memory" },
      "1024mb": { multiplier: 8.0, description: "1024 MB memory" }
    }
  },
  "DynamoDB": {
    name: "Amazon DynamoDB",
    category: "Database",
    basePricing: {
      unit: "RCU/WCU",
      pricePerUnit: 0.25,
      region: "us-east-1"
    },
    configurations: {
      "on-demand": { multiplier: 1.25, description: "On-demand billing" },
      "provisioned": { multiplier: 1.0, description: "Provisioned throughput" }
    }
  },
  "ElastiCache": {
    name: "Amazon ElastiCache",
    category: "Caching",
    basePricing: {
      unit: "hour",
      pricePerUnit: 0.068, // cache.t3.medium
      region: "us-east-1"
    },
    configurations: {
      "cache.t3.micro": { multiplier: 0.3, description: "0.5 GB memory" },
      "cache.t3.small": { multiplier: 0.5, description: "1.37 GB memory" },
      "cache.t3.medium": { multiplier: 1.0, description: "3.09 GB memory" }
    }
  }
};

export function calculateServiceCost(
  serviceName: string, 
  configuration: string, 
  usage: number = 730 // default hours per month
): number {
  const service = AWS_SERVICES[serviceName];
  if (!service) {
    throw new Error(`Service ${serviceName} not found in pricing data`);
  }

  const config = service.configurations[configuration];
  if (!config) {
    throw new Error(`Configuration ${configuration} not found for service ${serviceName}`);
  }

  const basePrice = service.basePricing.pricePerUnit;
  const adjustedPrice = basePrice * config.multiplier;
  
  return Math.round(adjustedPrice * usage * 100) / 100; // Round to 2 decimal places
}

export function getServiceInfo(serviceName: string): AWSService | undefined {
  return AWS_SERVICES[serviceName];
}

export function getAllServices(): Record<string, AWSService> {
  return AWS_SERVICES;
}

export function estimateDataTransferCosts(gbPerMonth: number): number {
  // AWS data transfer out pricing (simplified)
  if (gbPerMonth <= 1) return 0; // First 1 GB free
  if (gbPerMonth <= 10 * 1024) return (gbPerMonth - 1) * 0.09; // Next 10 TB
  return (gbPerMonth - 1) * 0.085; // 10 TB+
}

export function generatePricingBreakdown(services: any[]): {
  breakdown: { service: string; cost: number; details: string }[];
  total: number;
} {
  const breakdown = services.map(service => ({
    service: service.name,
    cost: service.monthlyCost,
    details: service.description || service.configuration?.instanceType || 'Standard configuration'
  }));

  const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

  return { breakdown, total };
}
