#!/bin/bash

# Bash script để rebuild và chạy Video Downloader SaaS
# Sử dụng: ./rebuild-and-run.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Video Downloader SaaS - Rebuild & Run Script${NC}"
echo -e "${GREEN}=================================================${NC}"

# Function to check if Docker is running
check_docker() {
    if ! docker version >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is in use. Stopping existing containers...${NC}"
        docker-compose down >/dev/null 2>&1 || true
    fi
}

# Function to create directories
create_directories() {
    echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
    local directories=("backend/downloads" "backend/logs" "backend/database")
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            echo -e "${GRAY}   Created: $dir${NC}"
        fi
    done
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Checking backend dependencies...${NC}"
    if [ ! -d "backend/node_modules" ]; then
        echo -e "${GRAY}   Installing backend dependencies...${NC}"
        cd backend
        npm install
        cd ..
    fi

    echo -e "${YELLOW}📦 Checking frontend dependencies...${NC}"
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${GRAY}   Installing frontend dependencies...${NC}"
        cd frontend
        npm install
        cd ..
    fi
}

# Function to cleanup
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up existing containers and images...${NC}"
    docker-compose down --remove-orphans >/dev/null 2>&1 || true
    docker system prune -f >/dev/null 2>&1 || true
    
    # Remove old images to force rebuild
    echo -e "${YELLOW}🗑️  Removing old images...${NC}"
    docker rmi video-downloader-saas-backend:latest -f >/dev/null 2>&1 || true
    docker rmi video-downloader-saas-frontend:latest -f >/dev/null 2>&1 || true
}

# Function to build and start
build_and_start() {
    echo -e "${YELLOW}🔨 Building and starting containers...${NC}"
    echo -e "${GRAY}   This may take a few minutes on first run...${NC}"
    
    # Build with no cache to ensure fresh build
    if ! docker-compose build --no-cache --parallel; then
        echo -e "${RED}❌ Docker build failed${NC}"
        exit 1
    fi
    
    # Start containers
    if ! docker-compose up -d; then
        echo -e "${RED}❌ Docker compose up failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Containers started successfully!${NC}"
}

# Function to check health
check_health() {
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 10
    
    echo -e "${YELLOW}🏥 Checking service health...${NC}"
    
    # Check backend health
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend health check failed, but it might still be starting...${NC}"
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend health check failed, but it might still be starting...${NC}"
    fi
}

# Function to show status and info
show_info() {
    echo -e "\n${CYAN}📊 Container Status:${NC}"
    docker-compose ps
    
    echo -e "\n${CYAN}📋 Useful Commands:${NC}"
    echo -e "${GRAY}   View logs:           docker-compose logs -f${NC}"
    echo -e "${GRAY}   View backend logs:   docker-compose logs -f backend${NC}"
    echo -e "${GRAY}   View frontend logs:  docker-compose logs -f frontend${NC}"
    echo -e "${GRAY}   Stop containers:     docker-compose down${NC}"
    echo -e "${GRAY}   Restart:             docker-compose restart${NC}"
    
    echo -e "\n${CYAN}🌐 Access URLs:${NC}"
    echo -e "${GREEN}   Frontend: http://localhost:3000${NC}"
    echo -e "${GREEN}   Backend:  http://localhost:5000${NC}"
    echo -e "${GREEN}   API Docs: http://localhost:5000/api-docs${NC}"
    echo -e "${GREEN}   Health:   http://localhost:5000/health${NC}"
    
    echo -e "\n${GREEN}🎉 Video Downloader SaaS is now running!${NC}"
    echo -e "${WHITE}   Open http://localhost:3000 in your browser to get started.${NC}"
}

# Main execution
main() {
    # Check prerequisites
    echo -e "${YELLOW}🔍 Checking Docker status...${NC}"
    check_docker
    
    # Check ports
    echo -e "${YELLOW}🔍 Checking port availability...${NC}"
    check_port 3000
    check_port 5000
    
    # Setup
    cleanup
    create_directories
    install_dependencies
    
    # Build and run
    build_and_start
    check_health
    show_info
    
    # Ask if user wants to view logs
    echo -e "\n${YELLOW}Do you want to view live logs? (y/N):${NC} \c"
    read -r view_logs
    if [[ "$view_logs" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📜 Showing live logs (Press Ctrl+C to exit)...${NC}"
        docker-compose logs -f
    fi
}

# Error handling
trap 'echo -e "\n${RED}❌ Script interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"
