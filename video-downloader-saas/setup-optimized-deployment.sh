#!/bin/bash

# =============================================================================
# OPTIMIZED DEPLOYMENT SETUP SCRIPT
# =============================================================================

set -e  # Exit on any error

echo "🚀 Setting up optimized Docker deployment for VideoDownloader SaaS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_header "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed ✓"
}

# Generate secure random passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Create secrets directory and files
setup_secrets() {
    print_header "Setting up secrets..."
    
    # Create secrets directory
    mkdir -p secrets
    chmod 700 secrets
    
    # Generate passwords if they don't exist
    if [ ! -f secrets/postgres_password.txt ]; then
        POSTGRES_PASSWORD=$(generate_password)
        echo "$POSTGRES_PASSWORD" > secrets/postgres_password.txt
        print_status "Generated PostgreSQL password"
    else
        POSTGRES_PASSWORD=$(cat secrets/postgres_password.txt)
        print_status "Using existing PostgreSQL password"
    fi
    
    if [ ! -f secrets/jwt_secret.txt ]; then
        JWT_SECRET=$(generate_password)$(generate_password)  # Extra long for JWT
        echo "$JWT_SECRET" > secrets/jwt_secret.txt
        print_status "Generated JWT secret"
    else
        print_status "Using existing JWT secret"
    fi
    
    if [ ! -f secrets/database_url.txt ]; then
        DATABASE_URL="postgresql://videodlp_user:$POSTGRES_PASSWORD@postgres:5432/videodlp"
        echo "$DATABASE_URL" > secrets/database_url.txt
        print_status "Generated database URL"
    else
        print_status "Using existing database URL"
    fi
    
    # Set proper permissions
    chmod 600 secrets/*
    print_status "Set secure permissions on secrets"
}

# Create data directories
setup_directories() {
    print_header "Setting up data directories..."
    
    # Create data directories
    mkdir -p data/{postgres,redis,downloads,logs,temp}
    
    # Set proper permissions
    chmod 755 data
    chmod 755 data/*
    
    # Create subdirectories for downloads
    mkdir -p data/downloads/{videos,audio,temp}
    mkdir -p data/logs/{app,nginx,postgres}
    
    print_status "Created data directories with proper permissions"
}

# Create environment file
setup_environment() {
    print_header "Setting up environment configuration..."
    
    if [ ! -f .env.optimized ]; then
        cat > .env.optimized << EOF
# =============================================================================
# OPTIMIZED DEPLOYMENT ENVIRONMENT CONFIGURATION
# =============================================================================

# Application URLs
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000
FRONTEND_PORT=3000

# Redis Configuration
REDIS_PASSWORD=$(generate_password)

# Performance Settings
NODE_OPTIONS=--max-old-space-size=512
UV_THREADPOOL_SIZE=4

# Security Settings
NODE_TLS_REJECT_UNAUTHORIZED=1
HELMET_ENABLED=true

# Logging
LOG_LEVEL=INFO
ENABLE_REQUEST_LOGGING=true

# Database Settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=10485760
MAX_FILES_PER_REQUEST=5

# Session Settings
SESSION_TIMEOUT=1800000
CLEANUP_INTERVAL=3600000

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Backup Settings
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=7

EOF
        print_status "Created environment configuration file"
    else
        print_status "Using existing environment configuration"
    fi
}

# Create backup script
setup_backup_script() {
    print_header "Setting up backup script..."
    
    cat > backup-optimized.sh << 'EOF'
#!/bin/bash

# Backup script for optimized deployment
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."

# Backup database
docker-compose -f docker-compose.optimized.yml exec -T postgres pg_dump -U videodlp_user videodlp > "$BACKUP_DIR/database.sql"

# Backup data directories
tar -czf "$BACKUP_DIR/data.tar.gz" data/

# Backup secrets (encrypted)
tar -czf "$BACKUP_DIR/secrets.tar.gz" secrets/

# Backup configuration
cp .env.optimized "$BACKUP_DIR/"
cp docker-compose.optimized.yml "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"

# Clean old backups (keep last 7 days)
find ./backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

EOF
    
    chmod +x backup-optimized.sh
    print_status "Created backup script"
}

# Create monitoring script
setup_monitoring_script() {
    print_header "Setting up monitoring script..."
    
    cat > monitor-optimized.sh << 'EOF'
#!/bin/bash

# Monitoring script for optimized deployment
echo "=== VideoDownloader SaaS - System Status ==="
echo "Timestamp: $(date)"
echo

# Check container status
echo "=== Container Status ==="
docker-compose -f docker-compose.optimized.yml ps
echo

# Check resource usage
echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
echo

# Check logs for errors
echo "=== Recent Errors ==="
docker-compose -f docker-compose.optimized.yml logs --tail=10 --since=1h | grep -i error || echo "No errors found"
echo

# Check disk usage
echo "=== Disk Usage ==="
df -h data/
echo

# Check network connectivity
echo "=== Network Connectivity ==="
docker-compose -f docker-compose.optimized.yml exec backend curl -s http://localhost:5000/health || echo "Backend health check failed"
docker-compose -f docker-compose.optimized.yml exec frontend curl -s http://localhost:80/health.txt || echo "Frontend health check failed"

EOF
    
    chmod +x monitor-optimized.sh
    print_status "Created monitoring script"
}

# Create deployment script
setup_deployment_script() {
    print_header "Setting up deployment script..."
    
    cat > deploy-optimized.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Deploying VideoDownloader SaaS (Optimized)..."

# Load environment variables
if [ -f .env.optimized ]; then
    export $(cat .env.optimized | grep -v '^#' | xargs)
fi

# Build and deploy
echo "Building containers..."
docker-compose -f docker-compose.optimized.yml build --no-cache

echo "Starting services..."
docker-compose -f docker-compose.optimized.yml up -d

echo "Waiting for services to be ready..."
sleep 30

# Run health checks
echo "Running health checks..."
./monitor-optimized.sh

echo "✅ Deployment completed successfully!"
echo "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "Backend API: http://localhost:5000"

EOF
    
    chmod +x deploy-optimized.sh
    print_status "Created deployment script"
}

# Create security audit script
setup_security_audit() {
    print_header "Setting up security audit script..."
    
    cat > security-audit.sh << 'EOF'
#!/bin/bash

echo "🔒 Running Security Audit..."

# Check for running containers as root
echo "=== Root User Check ==="
docker-compose -f docker-compose.optimized.yml exec backend whoami
docker-compose -f docker-compose.optimized.yml exec frontend whoami

# Check file permissions
echo "=== File Permissions Check ==="
ls -la secrets/
ls -la data/

# Check for exposed ports
echo "=== Exposed Ports Check ==="
docker-compose -f docker-compose.optimized.yml ps

# Check container capabilities
echo "=== Container Capabilities ==="
docker inspect $(docker-compose -f docker-compose.optimized.yml ps -q) | grep -A 10 "CapAdd\|CapDrop"

# Check for vulnerabilities (if trivy is installed)
if command -v trivy &> /dev/null; then
    echo "=== Vulnerability Scan ==="
    trivy image videodlp-backend:latest
    trivy image videodlp-frontend:latest
else
    echo "Install trivy for vulnerability scanning: https://github.com/aquasecurity/trivy"
fi

EOF
    
    chmod +x security-audit.sh
    print_status "Created security audit script"
}

# Main setup function
main() {
    print_header "Starting optimized deployment setup..."
    
    check_dependencies
    setup_secrets
    setup_directories
    setup_environment
    setup_backup_script
    setup_monitoring_script
    setup_deployment_script
    setup_security_audit
    
    print_status "Setup completed successfully! 🎉"
    echo
    print_header "Next steps:"
    echo "1. Review and customize .env.optimized if needed"
    echo "2. Run: ./deploy-optimized.sh"
    echo "3. Monitor: ./monitor-optimized.sh"
    echo "4. Backup: ./backup-optimized.sh"
    echo "5. Security audit: ./security-audit.sh"
    echo
    print_warning "Make sure to:"
    echo "- Keep secrets/ directory secure and backed up"
    echo "- Regularly update container images"
    echo "- Monitor logs and resource usage"
    echo "- Run security audits periodically"
}

# Run main function
main "$@"