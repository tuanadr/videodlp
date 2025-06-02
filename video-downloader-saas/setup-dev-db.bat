@echo off
REM Setup Development Database for VideoDownloader SaaS (Windows)
REM This script sets up PostgreSQL and Redis for local development

echo 🚀 Setting up development environment for VideoDownloader SaaS...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

echo ✅ Docker found. Proceeding with setup...

REM Stop and remove existing containers if they exist
echo 🧹 Cleaning up existing containers...
docker stop videodlp-postgres videodlp-redis >nul 2>&1
docker rm videodlp-postgres videodlp-redis >nul 2>&1

REM Create network if it doesn't exist
echo 🌐 Creating Docker network...
docker network create videodlp-network >nul 2>&1

REM Start PostgreSQL container
echo 🐘 Starting PostgreSQL container...
docker run -d ^
  --name videodlp-postgres ^
  --network videodlp-network ^
  -e POSTGRES_PASSWORD=dev123 ^
  -e POSTGRES_DB=videodlp_dev ^
  -e POSTGRES_USER=postgres ^
  -p 5432:5432 ^
  -v videodlp_postgres_data:/var/lib/postgresql/data ^
  postgres:15

if %errorlevel% neq 0 (
    echo ❌ Failed to start PostgreSQL container
    pause
    exit /b 1
)

echo ✅ PostgreSQL container started successfully

REM Start Redis container
echo 📦 Starting Redis container...
docker run -d ^
  --name videodlp-redis ^
  --network videodlp-network ^
  -p 6379:6379 ^
  -v videodlp_redis_data:/data ^
  redis:7-alpine

if %errorlevel% neq 0 (
    echo ❌ Failed to start Redis container
    pause
    exit /b 1
)

echo ✅ Redis container started successfully

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

:wait_postgres
docker exec videodlp-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_postgres
)

echo ✅ PostgreSQL is ready!

REM Wait for Redis to be ready
echo ⏳ Waiting for Redis to be ready...
timeout /t 2 /nobreak >nul

:wait_redis
docker exec videodlp-redis redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_redis
)

echo ✅ Redis is ready!

REM Create additional databases if needed
echo 🔧 Setting up additional databases...
docker exec videodlp-postgres psql -U postgres -c "CREATE DATABASE videodlp_test;" >nul 2>&1

echo.
echo ✅ Development environment setup complete!
echo.
echo 📋 Connection Details:
echo   PostgreSQL:
echo     Host: localhost
echo     Port: 5432
echo     Database: videodlp_dev
echo     Username: postgres
echo     Password: dev123
echo.
echo   Redis:
echo     Host: localhost
echo     Port: 6379
echo     Password: (none)
echo.
echo 🔧 To stop the services:
echo   docker stop videodlp-postgres videodlp-redis
echo.
echo 🗑️  To remove the services and data:
echo   docker stop videodlp-postgres videodlp-redis
echo   docker rm videodlp-postgres videodlp-redis
echo   docker volume rm videodlp_postgres_data videodlp_redis_data
echo.
echo ✅ You can now start your VideoDownloader SaaS backend!
echo.
pause
