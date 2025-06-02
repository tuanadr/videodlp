# PowerShell script để rebuild và chạy Video Downloader SaaS
# Sử dụng: .\rebuild-and-run.ps1

Write-Host "🚀 Video Downloader SaaS - Rebuild & Run Script" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        docker version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check if port is in use
function Test-PortInUse {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
        return $connection
    }
    catch {
        return $false
    }
}

# Check if Docker is running
Write-Host "🔍 Checking Docker status..." -ForegroundColor Yellow
if (-not (Test-DockerRunning)) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Check if ports are available
Write-Host "🔍 Checking port availability..." -ForegroundColor Yellow
if (Test-PortInUse -Port 3000) {
    Write-Host "⚠️  Port 3000 is in use. Stopping existing containers..." -ForegroundColor Yellow
    docker-compose down
}
if (Test-PortInUse -Port 5000) {
    Write-Host "⚠️  Port 5000 is in use. Stopping existing containers..." -ForegroundColor Yellow
    docker-compose down
}

# Clean up existing containers and images
Write-Host "🧹 Cleaning up existing containers and images..." -ForegroundColor Yellow
docker-compose down --remove-orphans
docker system prune -f

# Remove old images to force rebuild
Write-Host "🗑️  Removing old images..." -ForegroundColor Yellow
docker rmi video-downloader-saas-backend:latest -f 2>$null
docker rmi video-downloader-saas-frontend:latest -f 2>$null

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
$directories = @(
    "backend/downloads",
    "backend/logs", 
    "backend/database"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   Created: $dir" -ForegroundColor Gray
    }
}

# Install backend dependencies if needed
Write-Host "📦 Checking backend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "   Installing backend dependencies..." -ForegroundColor Gray
    Set-Location backend
    npm install
    Set-Location ..
}

# Install frontend dependencies if needed
Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "   Installing frontend dependencies..." -ForegroundColor Gray
    Set-Location frontend
    npm install
    Set-Location ..
}

# Build and start containers
Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes on first run..." -ForegroundColor Gray

try {
    # Build with no cache to ensure fresh build
    docker-compose build --no-cache --parallel
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed"
    }
    
    # Start containers
    docker-compose up -d
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker compose up failed"
    }
    
    Write-Host "✅ Containers started successfully!" -ForegroundColor Green
    
    # Wait for services to be ready
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Check service health
    Write-Host "🏥 Checking service health..." -ForegroundColor Yellow
    
    # Check backend health
    try {
        $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 10
        if ($backendResponse.StatusCode -eq 200) {
            Write-Host "✅ Backend is healthy" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Backend health check failed, but it might still be starting..." -ForegroundColor Yellow
    }
    
    # Check frontend health
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Host "✅ Frontend is healthy" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Frontend health check failed, but it might still be starting..." -ForegroundColor Yellow
    }
    
    # Show container status
    Write-Host "`n📊 Container Status:" -ForegroundColor Cyan
    docker-compose ps
    
    # Show logs command
    Write-Host "`n📋 Useful Commands:" -ForegroundColor Cyan
    Write-Host "   View logs:           docker-compose logs -f" -ForegroundColor Gray
    Write-Host "   View backend logs:   docker-compose logs -f backend" -ForegroundColor Gray
    Write-Host "   View frontend logs:  docker-compose logs -f frontend" -ForegroundColor Gray
    Write-Host "   Stop containers:     docker-compose down" -ForegroundColor Gray
    Write-Host "   Restart:             docker-compose restart" -ForegroundColor Gray
    
    # Show access URLs
    Write-Host "`n🌐 Access URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Green
    Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Green
    Write-Host "   API Docs: http://localhost:5000/api-docs" -ForegroundColor Green
    Write-Host "   Health:   http://localhost:5000/health" -ForegroundColor Green
    
    Write-Host "`n🎉 Video Downloader SaaS is now running!" -ForegroundColor Green
    Write-Host "   Open http://localhost:3000 in your browser to get started." -ForegroundColor White
    
    # Ask if user wants to view logs
    $viewLogs = Read-Host "`nDo you want to view live logs? (y/N)"
    if ($viewLogs -eq "y" -or $viewLogs -eq "Y") {
        Write-Host "📜 Showing live logs (Press Ctrl+C to exit)..." -ForegroundColor Yellow
        docker-compose logs -f
    }
    
}
catch {
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📜 Showing logs for debugging:" -ForegroundColor Yellow
    docker-compose logs
    exit 1
}
