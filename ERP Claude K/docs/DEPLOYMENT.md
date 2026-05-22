# 🚀 Production Deployment Guide

This guide covers deploying the Enterprise ERP System to production using Docker and various cloud platforms.

## Table of Contents
1. [Docker Deployment](#docker-deployment)
2. [AWS Deployment](#aws-deployment)
3. [Google Cloud Platform](#google-cloud-platform)
4. [Azure Deployment](#azure-deployment)
5. [DigitalOcean Deployment](#digitalocean-deployment)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Backup and Recovery](#backup-and-recovery)
8. [Monitoring](#monitoring)

---

## Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Domain name pointing to your server
- Minimum 2GB RAM, 2 CPU cores

### Step 1: Clone Repository
```bash
git clone https://github.com/yourcompany/enterprise-erp.git
cd enterprise-erp
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.docker.example .env

# Edit with your values
nano .env
```

**Important**: Generate strong secrets:
```bash
# JWT Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 32
```

### Step 3: Start Services
```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Verify all services are running
docker-compose ps
```

### Step 4: Initialize Database
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec backend npm run seed
```

### Step 5: Test API
```bash
curl http://localhost:5000/api/v1/health
```

---

## AWS Deployment

### Option 1: EC2 + RDS

#### 1. Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.medium (minimum)
- Security Group: Allow ports 22, 80, 443

#### 2. Create RDS PostgreSQL Database
```bash
# Database settings
Engine: PostgreSQL 15
Instance: db.t3.micro (for testing) or db.t3.small (production)
Storage: 20GB minimum
Multi-AZ: Yes (for production)
```

#### 3. SSH into EC2 and Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/yourcompany/enterprise-erp.git
cd enterprise-erp

# Configure .env with RDS endpoint
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com

# Deploy
docker-compose up -d
```

#### 4. Setup Application Load Balancer
- Create ALB in AWS Console
- Configure target group pointing to EC2
- Add SSL certificate via ACM
- Update Security Groups

### Option 2: ECS Fargate

#### 1. Push Docker Image to ECR
```bash
# Create ECR repository
aws ecr create-repository --repository-name enterprise-erp-backend

# Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI
docker build -t enterprise-erp-backend backend/
docker tag enterprise-erp-backend:latest YOUR_ECR_URI/enterprise-erp-backend:latest
docker push YOUR_ECR_URI/enterprise-erp-backend:latest
```

#### 2. Create ECS Cluster
- Use AWS Console or CLI
- Choose Fargate launch type
- Configure task definitions with environment variables
- Setup Application Load Balancer

---

## Google Cloud Platform

### Using Cloud Run (Serverless)

#### 1. Build and Push to Container Registry
```bash
# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/erp-backend backend/

# Deploy to Cloud Run
gcloud run deploy erp-backend \
  --image gcr.io/PROJECT_ID/erp-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --set-env-vars="NODE_ENV=production,DB_HOST=CLOUD_SQL_HOST"
```

#### 2. Setup Cloud SQL (PostgreSQL)
```bash
# Create instance
gcloud sql instances create erp-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create enterprise_erp --instance=erp-db

# Connect Cloud Run to Cloud SQL
gcloud run services update erp-backend \
  --add-cloudsql-instances PROJECT_ID:us-central1:erp-db
```

---

## Azure Deployment

### Using Azure Container Instances + Azure Database

#### 1. Create Resource Group
```bash
az group create --name erp-resources --location eastus
```

#### 2. Create PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group erp-resources \
  --name erp-postgres \
  --location eastus \
  --admin-user postgres \
  --admin-password YOUR_PASSWORD \
  --sku-name Standard_B1ms \
  --version 15
```

#### 3. Deploy Container
```bash
# Push to Azure Container Registry
az acr create --resource-group erp-resources --name erpregistry --sku Basic
az acr build --registry erpregistry --image erp-backend:latest backend/

# Deploy to Container Instances
az container create \
  --resource-group erp-resources \
  --name erp-backend \
  --image erpregistry.azurecr.io/erp-backend:latest \
  --dns-name-label erp-api \
  --ports 5000 \
  --environment-variables \
    NODE_ENV=production \
    DB_HOST=erp-postgres.postgres.database.azure.com
```

---

## DigitalOcean Deployment

### Using Droplet + Managed Database

#### 1. Create Droplet
```bash
# Via CLI
doctl compute droplet create erp-server \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys YOUR_SSH_KEY_ID

# Get IP
doctl compute droplet list
```

#### 2. Create Managed PostgreSQL Database
- Use DigitalOcean Console
- Select PostgreSQL 15
- Choose basic plan (minimum $15/month)
- Note connection string

#### 3. Setup Droplet
```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone and deploy
git clone https://github.com/yourcompany/enterprise-erp.git
cd enterprise-erp
cp .env.docker.example .env

# Edit .env with Managed DB connection string
nano .env

# Deploy
docker-compose up -d
```

---

## SSL Certificate Setup

### Using Let's Encrypt (Free)

#### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

#### 2. Obtain Certificate
```bash
sudo certbot --nginx -d api.yourcompany.com
```

#### 3. Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Crontab (already configured by certbot)
0 0 * * * certbot renew --quiet
```

### Using Cloudflare (Free SSL)
1. Point domain to Cloudflare nameservers
2. Enable "Full (strict)" SSL mode
3. Use Cloudflare Origin Certificate for backend

---

## Backup and Recovery

### Automated PostgreSQL Backups

#### 1. Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="enterprise_erp"

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

#### 2. Schedule with Cron
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### Restore from Backup
```bash
# Stop backend
docker-compose stop backend

# Restore database
gunzip < backup_20240101_020000.sql.gz | docker-compose exec -T postgres psql -U postgres enterprise_erp

# Start backend
docker-compose start backend
```

---

## Monitoring

### Setup Monitoring Stack

#### 1. Using Prometheus + Grafana
```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./deployment/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

#### 2. Application Performance Monitoring
```bash
# Install PM2 monitoring (if using PM2)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Checks
```bash
# API Health
curl https://api.yourcompany.com/api/v1/health

# Database connectivity
docker-compose exec postgres pg_isready

# Check logs
docker-compose logs -f --tail=100 backend
```

---

## Performance Tuning

### PostgreSQL Optimization
```sql
-- connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

### Node.js Optimization
```bash
# Use clustering (already in server.js)
# Set NODE_ENV to production
NODE_ENV=production

# Increase max old space size if needed
NODE_OPTIONS="--max-old-space-size=2048"
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (UFW or Security Groups)
- [ ] Enable database encryption at rest
- [ ] Setup automated backups
- [ ] Configure rate limiting
- [ ] Enable 2FA for admin accounts
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Use secrets management (AWS Secrets Manager, etc.)

---

## Troubleshooting

### Issue: Database connection timeout
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker-compose exec backend psql -h postgres -U postgres -d enterprise_erp
```

### Issue: High memory usage
```bash
# Check container stats
docker stats

# Limit memory in docker-compose.yml
services:
  backend:
    mem_limit: 1g
```

### Issue: Socket.io not connecting
```bash
# Verify WebSocket support in Nginx
# Check nginx.conf has Upgrade headers

# Test WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:5000/socket.io/
```

---

## Support

For deployment issues:
- Email: devops@yourcompany.com
- Docs: https://docs.yourcompany.com/deployment
- Slack: #deployment-support

---

**Last Updated**: 2024-01-01
