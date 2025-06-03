# 🐳 Docker Security & Performance Optimization Guide

## 📋 Tổng Quan

Hướng dẫn này cung cấp chi tiết về các optimizations đã được implement cho Docker containers, bao gồm security hardening, performance tuning, và troubleshooting procedures.

## 🔒 Security Enhancements

### 1. Container Security Features

#### Non-Root User Execution
```dockerfile
# Tạo user không có quyền root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Chuyển sang user không có quyền root
USER nodejs
```

#### Capability Dropping
```yaml
# docker-compose.optimized.yml
cap_drop:
  - ALL
cap_add:
  - SETUID
  - SETGID
```

#### Security Options
```yaml
security_opt:
  - no-new-privileges:true
```

#### Read-Only Root Filesystem
```yaml
read_only: true
tmpfs:
  - /tmp
  - /var/run/postgresql
```

### 2. Secrets Management

#### Docker Secrets Implementation
```yaml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

#### Environment Variables Security
- Không lưu trữ secrets trong environment variables
- Sử dụng Docker secrets hoặc external secret managers
- Implement secret rotation policies

### 3. Network Security

#### Internal Networking
```yaml
networks:
  app-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: videodlp-bridge
```

#### Port Exposure Control
- Chỉ expose ports cần thiết
- Sử dụng internal networking cho inter-service communication
- Implement reverse proxy cho external access

## ⚡ Performance Optimizations

### 1. Multi-Stage Builds

#### Backend Optimization
```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
# Install production dependencies only

# Stage 2: Build
FROM node:18-alpine AS build
# Build application

# Stage 3: Runtime
FROM node:18-alpine AS production
# Copy only necessary files
```

#### Benefits
- Smaller final image size (60-80% reduction)
- Faster deployment times
- Reduced attack surface
- Better layer caching

### 2. Resource Limits

#### Memory Limits
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

#### Node.js Optimizations
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV UV_THREADPOOL_SIZE=4
```

### 3. Caching Strategies

#### Docker Layer Caching
```dockerfile
# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code last
COPY . .
```

#### Application Caching
- Redis for session storage
- Nginx for static file caching
- Database query result caching

## 🔍 Monitoring & Logging

### 1. Docker Security Monitoring

#### Automated Security Audits
```javascript
// backend/utils/dockerMonitor.js
const dockerMonitor = require('./utils/dockerMonitor');

// Khởi động monitoring
await dockerMonitor.startPeriodicAudit(300000); // 5 minutes
```

#### Security Metrics
- Container privilege escalation detection
- Resource usage monitoring
- Network traffic analysis
- File system integrity checks

### 2. Health Checks

#### Container Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1
```

#### Application Health Monitoring
```javascript
// Health check endpoint với detailed status
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      filesystem: 'accessible'
    }
  };
  res.status(200).json(status);
});
```

## 🛠️ Troubleshooting Guide

### 1. Common Issues & Solutions

#### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.optimized.yml logs backend

# Common causes:
# - Missing secrets files
# - Port conflicts
# - Resource constraints
# - Permission issues
```

#### Database Connection Issues
```bash
# Check PostgreSQL health
docker-compose -f docker-compose.optimized.yml exec postgres pg_isready

# Check connection from backend
docker-compose -f docker-compose.optimized.yml exec backend \
  node -e "require('./database').testConnection()"
```

#### Memory Issues
```bash
# Monitor resource usage
docker stats --no-stream

# Check container limits
docker inspect videodlp-backend | grep -A 10 "Memory"
```

#### Permission Denied Errors
```bash
# Check file permissions
ls -la secrets/
ls -la data/

# Fix permissions
chmod 600 secrets/*
chmod 755 data/
```

### 2. Performance Troubleshooting

#### Slow Container Startup
```bash
# Check image layers
docker history videodlp-backend:latest

# Optimize Dockerfile:
# - Use .dockerignore
# - Minimize layers
# - Use multi-stage builds
```

#### High Memory Usage
```bash
# Monitor memory usage
docker-compose -f docker-compose.optimized.yml exec backend \
  node -e "console.log(process.memoryUsage())"

# Solutions:
# - Increase memory limits
# - Optimize application code
# - Enable garbage collection
```

#### Network Latency
```bash
# Test network connectivity
docker-compose -f docker-compose.optimized.yml exec backend \
  ping postgres

# Check DNS resolution
docker-compose -f docker-compose.optimized.yml exec backend \
  nslookup postgres
```

### 3. Security Incident Response

#### Suspected Container Compromise
```bash
# 1. Isolate container
docker-compose -f docker-compose.optimized.yml stop backend

# 2. Collect forensic data
docker logs videodlp-backend > incident-logs.txt
docker inspect videodlp-backend > incident-inspect.json

# 3. Check for indicators of compromise
grep -i "error\|warning\|attack" incident-logs.txt

# 4. Rebuild from clean image
docker-compose -f docker-compose.optimized.yml build --no-cache backend
```

#### Vulnerability Response
```bash
# 1. Scan for vulnerabilities
trivy image videodlp-backend:latest

# 2. Update base images
docker pull node:18-alpine
docker pull postgres:15-alpine

# 3. Rebuild containers
docker-compose -f docker-compose.optimized.yml build --no-cache
```

## 📊 Performance Monitoring

### 1. Key Metrics to Monitor

#### Container Metrics
- CPU usage percentage
- Memory usage and limits
- Disk I/O operations
- Network traffic
- Container restart count

#### Application Metrics
- Response time percentiles
- Error rates
- Database connection pool usage
- Cache hit rates
- Active user sessions

### 2. Monitoring Tools Setup

#### Prometheus & Grafana
```yaml
# Add to docker-compose.optimized.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

#### Log Aggregation
```yaml
# ELK Stack for log aggregation
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
  environment:
    - discovery.type=single-node

logstash:
  image: docker.elastic.co/logstash/logstash:8.5.0
  volumes:
    - ./monitoring/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

kibana:
  image: docker.elastic.co/kibana/kibana:8.5.0
  ports:
    - "5601:5601"
```

## 🔄 Backup & Recovery

### 1. Automated Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# backup-database.sh
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker-compose -f docker-compose.optimized.yml exec -T postgres \
  pg_dump -U videodlp_user videodlp > "$BACKUP_DIR/database.sql"

# Backup Redis
docker-compose -f docker-compose.optimized.yml exec -T redis \
  redis-cli BGSAVE
```

#### Volume Backups
```bash
# Backup persistent volumes
tar -czf "$BACKUP_DIR/volumes.tar.gz" data/

# Backup secrets (encrypted)
gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
  --output "$BACKUP_DIR/secrets.gpg" secrets/
```

### 2. Disaster Recovery

#### Recovery Procedures
```bash
# 1. Stop services
docker-compose -f docker-compose.optimized.yml down

# 2. Restore volumes
tar -xzf backups/latest/volumes.tar.gz

# 3. Restore database
docker-compose -f docker-compose.optimized.yml up -d postgres
sleep 30
docker-compose -f docker-compose.optimized.yml exec -T postgres \
  psql -U videodlp_user videodlp < backups/latest/database.sql

# 4. Start all services
docker-compose -f docker-compose.optimized.yml up -d
```

#### Recovery Testing
```bash
# Regular recovery testing script
./test-recovery.sh
```

## 📈 Scaling Strategies

### 1. Horizontal Scaling

#### Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.optimized.yml videodlp

# Scale services
docker service scale videodlp_backend=3
```

#### Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: videodlp-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: videodlp-backend
  template:
    metadata:
      labels:
        app: videodlp-backend
    spec:
      containers:
      - name: backend
        image: videodlp-backend:latest
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
```

### 2. Load Balancing

#### Nginx Load Balancer
```nginx
upstream backend {
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://backend;
    }
}
```

## 🔧 Maintenance Procedures

### 1. Regular Maintenance Tasks

#### Weekly Tasks
- [ ] Review security logs
- [ ] Check resource usage trends
- [ ] Update container images
- [ ] Test backup procedures
- [ ] Review performance metrics

#### Monthly Tasks
- [ ] Security vulnerability scan
- [ ] Capacity planning review
- [ ] Disaster recovery testing
- [ ] Documentation updates
- [ ] Performance optimization review

### 2. Update Procedures

#### Rolling Updates
```bash
# 1. Build new images
docker-compose -f docker-compose.optimized.yml build

# 2. Update one service at a time
docker-compose -f docker-compose.optimized.yml up -d --no-deps backend

# 3. Verify health
./monitor-optimized.sh

# 4. Update remaining services
docker-compose -f docker-compose.optimized.yml up -d
```

#### Rollback Procedures
```bash
# Quick rollback to previous version
docker-compose -f docker-compose.optimized.yml down
docker tag videodlp-backend:previous videodlp-backend:latest
docker-compose -f docker-compose.optimized.yml up -d
```

---

## 📞 Support & Contact

Để được hỗ trợ thêm về Docker security và performance optimization:

1. **Documentation**: Tham khảo các file README trong từng service
2. **Monitoring**: Sử dụng `./monitor-optimized.sh` để kiểm tra status
3. **Security Audit**: Chạy `./security-audit.sh` định kỳ
4. **Logs**: Kiểm tra logs trong `data/logs/` directory

**Lưu ý**: Luôn test các thay đổi trong môi trường development trước khi apply vào production.