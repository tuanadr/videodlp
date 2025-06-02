# Simple PowerShell script to run Video Downloader SaaS locally
Write-Host "🚀 Starting Video Downloader SaaS..." -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start the services
Write-Host "🔄 Starting services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Green
    Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Green
    Write-Host "   Health:   http://localhost:5000/health" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Useful Commands:" -ForegroundColor Cyan
    Write-Host "   View logs:     docker-compose logs -f" -ForegroundColor Gray
    Write-Host "   Stop:          docker-compose down" -ForegroundColor Gray
    Write-Host "   Restart:       docker-compose restart" -ForegroundColor Gray
    Write-Host ""
    
    $viewLogs = Read-Host "View logs now? (y/N)"
    if ($viewLogs -eq "y" -or $viewLogs -eq "Y") {
        docker-compose logs -f
    }
} else {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    Write-Host "📜 Showing logs:" -ForegroundColor Yellow
    docker-compose logs
}
