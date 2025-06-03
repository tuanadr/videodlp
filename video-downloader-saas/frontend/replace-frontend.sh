#!/bin/bash

# Bash script to replace frontend with new improved version
# This script backs up the current frontend and replaces it with the new version

echo "=== Thay thế Frontend với phiên bản cải tiến ==="

# Create backup directory
BACKUP_DIR="src/backup-$(date +%Y%m%d-%H%M%S)"
echo "Tạo thư mục backup: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# Backup current files
echo "Backup các file hiện tại..."

FILES_TO_BACKUP=(
    "src/App.js"
    "src/index.js"
    "src/components/layout/Layout.js"
    "src/components/layout/Header.js"
    "src/components/layout/Footer.js"
    "src/pages/HomePage.js"
    "src/pages/DownloadPage.js"
    "src/pages/NotFoundPage.js"
)

for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/$(basename "$file")"
        echo "  Backed up: $file"
    fi
done

# Replace files with new versions
echo "Thay thế với phiên bản mới..."

declare -A REPLACEMENTS=(
    ["src/App.new.js"]="src/App.js"
    ["src/index.new.js"]="src/index.js"
    ["src/components/layout/Layout.new.js"]="src/components/layout/Layout.js"
    ["src/components/layout/Header.new.js"]="src/components/layout/Header.js"
    ["src/components/layout/Footer.new.js"]="src/components/layout/Footer.js"
    ["src/pages/HomePage.new.js"]="src/pages/HomePage.js"
    ["src/pages/DownloadPage.new.js"]="src/pages/DownloadPage.js"
    ["src/pages/NotFoundPage.new.js"]="src/pages/NotFoundPage.js"
)

for source in "${!REPLACEMENTS[@]}"; do
    destination="${REPLACEMENTS[$source]}"
    
    if [ -f "$source" ]; then
        cp "$source" "$destination"
        echo "  Replaced: $destination"
        
        # Remove the .new file
        rm "$source"
    else
        echo "  Warning: Source file not found: $source"
    fi
done

# Create missing directories if needed
DIRS_TO_CREATE=(
    "src/components/seo"
    "src/components/auth"
)

for dir in "${DIRS_TO_CREATE[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "  Created directory: $dir"
    fi
done

# Check and install additional dependencies if needed
echo "Kiểm tra dependencies..."

if ! grep -q "react-helmet-async" package.json; then
    echo "  Installing react-helmet-async..."
    npm install react-helmet-async@^2.0.5
fi

if ! grep -q "web-vitals" package.json; then
    echo "  Installing web-vitals..."
    npm install web-vitals@^3.3.1
fi

echo ""
echo "=== Hoàn thành thay thế frontend ==="
echo "Backup được lưu tại: $BACKUP_DIR"
echo ""
echo "Các cải tiến đã được áp dụng:"
echo "  ✓ Layout component với Header + Footer"
echo "  ✓ SEO optimization với meta tags động"
echo "  ✓ Enhanced AuthContext integration"
echo "  ✓ Improved error handling"
echo "  ✓ Better user experience"
echo "  ✓ React Router với Link components"
echo "  ✓ Responsive design với Tailwind CSS"
echo ""
echo "Để test frontend mới, chạy:"
echo "  npm start"
echo ""
echo "Để build production:"
echo "  npm run build"
