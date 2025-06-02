#!/bin/bash

# Setup Development Database for VideoDownloader SaaS
# This script sets up PostgreSQL and Redis for local development

echo "🚀 Setting up development environment for VideoDownloader SaaS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

print_status "Docker found. Proceeding with setup..."

# Stop and remove existing containers if they exist
print_status "Cleaning up existing containers..."
docker stop videodlp-postgres videodlp-redis 2>/dev/null || true
docker rm videodlp-postgres videodlp-redis 2>/dev/null || true

# Create network if it doesn't exist
print_status "Creating Docker network..."
docker network create videodlp-network 2>/dev/null || print_warning "Network may already exist"

# Start PostgreSQL container
print_status "Starting PostgreSQL container..."
docker run -d \
  --name videodlp-postgres \
  --network videodlp-network \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_DB=videodlp_dev \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -v videodlp_postgres_data:/var/lib/postgresql/data \
  postgres:15

if [ $? -eq 0 ]; then
    print_success "PostgreSQL container started successfully"
else
    print_error "Failed to start PostgreSQL container"
    exit 1
fi

# Start Redis container
print_status "Starting Redis container..."
docker run -d \
  --name videodlp-redis \
  --network videodlp-network \
  -p 6379:6379 \
  -v videodlp_redis_data:/data \
  redis:7-alpine

if [ $? -eq 0 ]; then
    print_success "Redis container started successfully"
else
    print_error "Failed to start Redis container"
    exit 1
fi

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec videodlp-postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_success "PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Wait for Redis to be ready
print_status "Waiting for Redis to be ready..."
for i in {1..10}; do
    if docker exec videodlp-redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is ready!"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "Redis failed to start within 10 seconds"
        exit 1
    fi
    sleep 1
done

# Create additional databases if needed
print_status "Setting up additional databases..."
docker exec videodlp-postgres psql -U postgres -c "CREATE DATABASE videodlp_test;" 2>/dev/null || print_warning "Test database may already exist"

print_success "Development environment setup complete!"
echo ""
echo "📋 Connection Details:"
echo "  PostgreSQL:"
echo "    Host: localhost"
echo "    Port: 5432"
echo "    Database: videodlp_dev"
echo "    Username: postgres"
echo "    Password: dev123"
echo ""
echo "  Redis:"
echo "    Host: localhost"
echo "    Port: 6379"
echo "    Password: (none)"
echo ""
echo "🔧 To stop the services:"
echo "  docker stop videodlp-postgres videodlp-redis"
echo ""
echo "🗑️  To remove the services and data:"
echo "  docker stop videodlp-postgres videodlp-redis"
echo "  docker rm videodlp-postgres videodlp-redis"
echo "  docker volume rm videodlp_postgres_data videodlp_redis_data"
echo ""
echo "✅ You can now start your VideoDownloader SaaS backend!"
