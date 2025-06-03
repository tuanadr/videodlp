# PowerShell script to replace frontend with new improved version
# This script backs up the current frontend and replaces it with the new version

Write-Host "=== Thay thế Frontend với phiên bản cải tiến ===" -ForegroundColor Green

# Create backup directory
$backupDir = "src/backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "Tạo thư mục backup: $backupDir" -ForegroundColor Yellow

if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Backup current files
Write-Host "Backup các file hiện tại..." -ForegroundColor Yellow

$filesToBackup = @(
    "src/App.js",
    "src/index.js",
    "src/components/layout/Layout.js",
    "src/components/layout/Header.js",
    "src/components/layout/Footer.js",
    "src/pages/HomePage.js",
    "src/pages/DownloadPage.js",
    "src/pages/NotFoundPage.js"
)

foreach ($file in $filesToBackup) {
    if (Test-Path $file) {
        $backupPath = Join-Path $backupDir (Split-Path $file -Leaf)
        Copy-Item $file $backupPath -Force
        Write-Host "  Backed up: $file" -ForegroundColor Gray
    }
}

# Replace files with new versions
Write-Host "Thay thế với phiên bản mới..." -ForegroundColor Yellow

$replacements = @{
    "src/App.new.js" = "src/App.js"
    "src/index.new.js" = "src/index.js"
    "src/components/layout/Layout.new.js" = "src/components/layout/Layout.js"
    "src/components/layout/Header.new.js" = "src/components/layout/Header.js"
    "src/components/layout/Footer.new.js" = "src/components/layout/Footer.js"
    "src/pages/HomePage.new.js" = "src/pages/HomePage.js"
    "src/pages/DownloadPage.new.js" = "src/pages/DownloadPage.js"
    "src/pages/NotFoundPage.new.js" = "src/pages/NotFoundPage.js"
}

foreach ($replacement in $replacements.GetEnumerator()) {
    $source = $replacement.Key
    $destination = $replacement.Value
    
    if (Test-Path $source) {
        Copy-Item $source $destination -Force
        Write-Host "  Replaced: $destination" -ForegroundColor Green
        
        # Remove the .new file
        Remove-Item $source -Force
    } else {
        Write-Host "  Warning: Source file not found: $source" -ForegroundColor Red
    }
}

# Create missing directories if needed
$dirsToCreate = @(
    "src/components/seo",
    "src/components/auth"
)

foreach ($dir in $dirsToCreate) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created directory: $dir" -ForegroundColor Green
    }
}

# Install additional dependencies if needed
Write-Host "Kiểm tra dependencies..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json
$requiredDeps = @{
    "react-helmet-async" = "^2.0.5"
    "web-vitals" = "^3.3.1"
}

$needsInstall = $false
foreach ($dep in $requiredDeps.GetEnumerator()) {
    if (-not $packageJson.dependencies.PSObject.Properties[$dep.Key]) {
        Write-Host "  Missing dependency: $($dep.Key)" -ForegroundColor Yellow
        $needsInstall = $true
    }
}

if ($needsInstall) {
    Write-Host "Cài đặt dependencies thiếu..." -ForegroundColor Yellow
    npm install react-helmet-async@^2.0.5 web-vitals@^3.3.1
}

Write-Host ""
Write-Host "=== Hoàn thành thay thế frontend ===" -ForegroundColor Green
Write-Host "Backup được lưu tại: $backupDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Các cải tiến đã được áp dụng:" -ForegroundColor Cyan
Write-Host "  ✓ Layout component với Header + Footer" -ForegroundColor Green
Write-Host "  ✓ SEO optimization với meta tags động" -ForegroundColor Green
Write-Host "  ✓ Enhanced AuthContext integration" -ForegroundColor Green
Write-Host "  ✓ Improved error handling" -ForegroundColor Green
Write-Host "  ✓ Better user experience" -ForegroundColor Green
Write-Host "  ✓ React Router với Link components" -ForegroundColor Green
Write-Host "  ✓ Responsive design với Tailwind CSS" -ForegroundColor Green
Write-Host ""
Write-Host "Để test frontend mới, chạy:" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Để build production:" -ForegroundColor Yellow
Write-Host "  npm run build" -ForegroundColor White
