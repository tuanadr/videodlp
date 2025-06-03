# =============================================================================
# OPTIMIZED DEPLOYMENT SETUP SCRIPT (PowerShell)
# =============================================================================

Write-Host "🚀 Setting up optimized Docker deployment for VideoDownloader SaaS..." -ForegroundColor Blue

# Function to generate random password
function Generate-Password {
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $password = ""
    for ($i = 0; $i -lt 25; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

# Check if Docker is installed
Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Create secrets directory and files
Write-Host "🔐 Setting up secrets..." -ForegroundColor Yellow

if (!(Test-Path "secrets")) {
    New-Item -ItemType Directory -Path "secrets" | Out-Null
}

# Generate passwords if they don't exist
if (!(Test-Path "secrets/postgres_password.txt")) {
    $postgresPassword = Generate-Password
    $postgresPassword | Out-File -FilePath "secrets/postgres_password.txt" -Encoding UTF8 -NoNewline
    Write-Host "✅ Generated PostgreSQL password" -ForegroundColor Green
} else {
    $postgresPassword = Get-Content "secrets/postgres_password.txt" -Raw
    Write-Host "✅ Using existing PostgreSQL password" -ForegroundColor Green
}

if (!(Test-Path "secrets/jwt_secret.txt")) {
    $jwtSecret = (Generate-Password) + (Generate-Password)  # Extra long for JWT
    $jwtSecret | Out-File -FilePath "secrets/jwt_secret.txt" -Encoding UTF8 -NoNewline
    Write-Host "✅ Generated JWT secret" -ForegroundColor Green
} else {
    Write-Host "✅ Using existing JWT secret" -ForegroundColor Green
}

if (!(Test-Path "secrets/database_url.txt")) {
    $databaseUrl = "postgresql://videodlp_user:$postgresPassword@postgres:5432/videodlp"
    $databaseUrl | Out-File -FilePath "secrets/database_url.txt" -Encoding UTF8 -NoNewline
    Write-Host "✅ Generated database URL" -ForegroundColor Green
} else {
    Write-Host "✅ Using existing database URL" -ForegroundColor Green
}

# Create data directories
Write-Host "📁 Setting up data directories..." -ForegroundColor Yellow

$dataDirs = @("data", "data/postgres", "data/redis", "data/downloads", "data/logs", "data/temp")
foreach ($dir in $dataDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# Create subdirectories
$subDirs = @("data/downloads/videos", "data/downloads/audio", "data/downloads/temp", "data/logs/app", "data/logs/nginx", "data/logs/postgres")
foreach ($dir in $subDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

Write-Host "✅ Created data directories" -ForegroundColor Green

# Create environment file
Write-Host "⚙️ Setting up environment configuration..." -ForegroundColor Yellow

if (!(Test-Path ".env.optimized")) {
    $redisPassword = Generate-Password
    
    $envContent = @"
# =============================================================================
# OPTIMIZED DEPLOYMENT ENVIRONMENT CONFIGURATION
# =============================================================================

# Application URLs
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000
FRONTEND_PORT=3000

# Redis Configuration
REDIS_PASSWORD=$redisPassword

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
"@
    
    $envContent | Out-File -FilePath ".env.optimized" -Encoding UTF8
    Write-Host "✅ Created environment configuration file" -ForegroundColor Green
} else {
    Write-Host "✅ Using existing environment configuration" -ForegroundColor Green
}

Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Blue
Write-Host "1. Review and customize .env.optimized if needed"
Write-Host "2. Run: docker-compose -f docker-compose.optimized.yml up -d"
Write-Host "3. Monitor: docker-compose -f docker-compose.optimized.yml logs -f"
Write-Host ""
Write-Host "⚠️ Make sure to:" -ForegroundColor Yellow
Write-Host "- Keep secrets/ directory secure and backed up"
Write-Host "- Regularly update container images"
Write-Host "- Monitor logs and resource usage"