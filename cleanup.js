/**
 * Script để loại bỏ các tệp tin và thư mục không cần thiết
 * Chạy: node cleanup.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const exists = promisify(fs.exists);

// Danh sách các tệp tin cần loại bỏ
const filesToRemove = [
  // Tệp tin liên quan đến Coolify
  'video-downloader-saas/nginx/coolify-nginx.conf',
  'video-downloader-saas/backend/README-COOLIFY-503-FIX.md',
  'video-downloader-saas/backend/README-COOLIFY-503-FIX-UPDATED.md',
  'video-downloader-saas/backend/README-COOLIFY-404-FIX.md',
  'video-downloader-saas/backend/README-COOLIFY-NIXPACKS-CONFIG.md',
  'video-downloader-saas/backend/README-COOLIFY-TRAEFIK-CONFIG.md',
  'video-downloader-saas/backend/README-COOLIFY-DNS-PORT-CONFIG.md',
  'video-downloader-saas/backend/README-COOLIFY-DOCKER-COMPOSE.md',
  'video-downloader-saas/backend/.env.coolify',
  'video-downloader-saas/COOLIFY-GUIDE.md',
  'video-downloader-saas/README-COOLIFY.md',
  
  // Tệp tin cấu hình không cần thiết
  'video-downloader-saas/backend/docker-compose.yaml',
  'video-downloader-saas/backend/coolify.json',
  'video-downloader-saas/coolify.json',
  'video-downloader-saas/docker-compose.yml',
  
  // Tệp tin liên quan đến VPS
  'video-downloader-saas/README-VPS.md',
  'video-downloader-saas/VPS-GUIDE.md',
  'video-downloader-saas/SQLITE-VPS-GUIDE.md',
  'video-downloader-saas/setup-vps.sh',
  'video-downloader-saas/setup-vps.sh.newX',
  'video-downloader-saas/setup-vps.sh.new',
  'video-downloader-saas/prepare-for-coolify.sh',
  'video-downloader-saas/apply-changes.sh',
  'video-downloader-saas/install-dependencies.sh',
  'video-downloader-saas/check-linux-compatibility.js',
  
  // Tệp tin backend không cần thiết
  'video-downloader-saas/backend/server.js.new',
  'video-downloader-saas/backend/README-SEQUELIZE-FIX.md',
  'video-downloader-saas/backend/README-SEQUELIZE-NAMING-FIX.md',
  
  // Tệp tin frontend không cần thiết
  'video-downloader-saas/frontend/.env.coolify',
  'video-downloader-saas/frontend/fix-nginx.sh',
  
  // Tệp tin tạm thời
  'video-downloader-saas/cleanup-list.md'
];

// Danh sách các thư mục cần loại bỏ
const dirsToRemove = [
  // Thư mục node_modules (sẽ được cài đặt lại trong quá trình build)
  'video-downloader-saas/backend/node_modules',
  'video-downloader-saas/frontend/node_modules',
  
  // Thư mục trùng lặp
  'video-downloader-saas/backend/video-downloader-saas'
];

// Danh sách các mẫu tệp tin cần tìm và loại bỏ
const filePatterns = [
  '.DS_Store',
  '*.log'
];

/**
 * Xóa một tệp tin nếu tồn tại
 */
async function removeFile(filePath) {
  try {
    if (await exists(filePath)) {
      await unlink(filePath);
      console.log(`✅ Đã xóa tệp tin: ${filePath}`);
    } else {
      console.log(`⚠️ Tệp tin không tồn tại: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Lỗi khi xóa tệp tin ${filePath}:`, error);
  }
}

/**
 * Xóa một thư mục và tất cả nội dung bên trong
 */
async function removeDirectory(dirPath) {
  try {
    if (!(await exists(dirPath))) {
      console.log(`⚠️ Thư mục không tồn tại: ${dirPath}`);
      return;
    }
    
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemStat = await stat(itemPath);
      
      if (itemStat.isDirectory()) {
        await removeDirectory(itemPath);
      } else {
        await unlink(itemPath);
      }
    }
    
    await rmdir(dirPath);
    console.log(`✅ Đã xóa thư mục: ${dirPath}`);
  } catch (error) {
    console.error(`❌ Lỗi khi xóa thư mục ${dirPath}:`, error);
  }
}

/**
 * Tìm và xóa các tệp tin theo mẫu
 */
async function findAndRemoveFiles(directory, pattern) {
  try {
    if (!(await exists(directory))) {
      return;
    }
    
    const items = await readdir(directory);
    
    for (const item of items) {
      const itemPath = path.join(directory, item);
      const itemStat = await stat(itemPath);
      
      if (itemStat.isDirectory()) {
        await findAndRemoveFiles(itemPath, pattern);
      } else if (item.match(pattern.replace('*', '.*'))) {
        await unlink(itemPath);
        console.log(`✅ Đã xóa tệp tin: ${itemPath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Lỗi khi tìm và xóa tệp tin theo mẫu ${pattern}:`, error);
  }
}

/**
 * Hàm chính
 */
async function main() {
  console.log('🧹 Bắt đầu dọn dẹp các tệp tin và thư mục không cần thiết...');
  
  // Xóa các tệp tin cụ thể
  for (const file of filesToRemove) {
    await removeFile(file);
  }
  
  // Xóa các thư mục cụ thể
  for (const dir of dirsToRemove) {
    await removeDirectory(dir);
  }
  
  // Tìm và xóa các tệp tin theo mẫu
  const rootDir = 'video-downloader-saas';
  for (const pattern of filePatterns) {
    console.log(`🔍 Tìm và xóa các tệp tin theo mẫu: ${pattern}`);
    await findAndRemoveFiles(rootDir, pattern);
  }
  
  console.log('✨ Hoàn tất dọn dẹp!');
}

// Chạy hàm chính
main().catch(error => {
  console.error('❌ Lỗi:', error);
  process.exit(1);
});