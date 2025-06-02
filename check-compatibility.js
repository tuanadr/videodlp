/**
 * Script kiểm tra tính tương thích của dự án với Easypanel
 * 
 * Script này sẽ kiểm tra các yếu tố sau:
 * 1. Dockerfile của backend và frontend
 * 2. Cấu hình cơ sở dữ liệu
 * 3. Biến môi trường
 * 4. Các dependencies cần thiết
 * 
 * Cách sử dụng:
 * node check-compatibility.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Danh sách kiểm tra
const checks = {
  dockerfiles: {
    backend: false,
    frontend: false
  },
  database: {
    sqlite: false,
    postgres: false
  },
  redis: false,
  envFiles: {
    backendExample: false,
    frontendExample: false
  },
  dependencies: {
    sequelize: false,
    redis: false,
    bull: false
  }
};

// Màu sắc cho console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Hàm kiểm tra tệp tin tồn tại
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Hàm kiểm tra nội dung tệp tin
function checkFileContent(filePath, searchString) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

// Hàm kiểm tra package.json
function checkPackageJson(filePath, dependency) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    return (
      (packageJson.dependencies && packageJson.dependencies[dependency]) ||
      (packageJson.devDependencies && packageJson.devDependencies[dependency])
    );
  } catch (error) {
    return false;
  }
}

// Hàm in kết quả
function printResult(name, result, details = '') {
  const icon = result ? '✅' : '❌';
  const color = result ? colors.green : colors.red;
  console.log(`${color}${icon} ${name}${colors.reset}${details ? `: ${details}` : ''}`);
}

// Hàm chính
function main() {
  console.log(`${colors.cyan}=== Kiểm tra tính tương thích với Easypanel ===${colors.reset}\n`);
  
  // Kiểm tra Dockerfile
  console.log(`${colors.magenta}Kiểm tra Dockerfile:${colors.reset}`);
  checks.dockerfiles.backend = checkFileExists('video-downloader-saas/backend/Dockerfile');
  printResult('Backend Dockerfile', checks.dockerfiles.backend);
  
  checks.dockerfiles.frontend = checkFileExists('video-downloader-saas/frontend/Dockerfile');
  printResult('Frontend Dockerfile', checks.dockerfiles.frontend);
  
  // Kiểm tra cấu hình cơ sở dữ liệu
  console.log(`\n${colors.magenta}Kiểm tra cấu hình cơ sở dữ liệu:${colors.reset}`);
  const databaseFile = 'video-downloader-saas/backend/database.js';
  checks.database.sqlite = checkFileContent(databaseFile, 'dialect: \'sqlite\'');
  printResult('Hỗ trợ SQLite', checks.database.sqlite);
  
  checks.database.postgres = checkFileContent(databaseFile, 'dialect: \'postgres\'');
  printResult('Hỗ trợ PostgreSQL', checks.database.postgres);
  
  // Kiểm tra Redis
  checks.redis = checkFileContent('video-downloader-saas/backend/server.js', 'redisClient');
  printResult('Hỗ trợ Redis', checks.redis);
  
  // Kiểm tra file .env.example
  console.log(`\n${colors.magenta}Kiểm tra file .env.example:${colors.reset}`);
  checks.envFiles.backendExample = checkFileExists('video-downloader-saas/backend/.env.example');
  printResult('Backend .env.example', checks.envFiles.backendExample);
  
  checks.envFiles.frontendExample = checkFileExists('video-downloader-saas/frontend/.env.example');
  printResult('Frontend .env.example', checks.envFiles.frontendExample);
  
  // Kiểm tra các biến môi trường cần thiết
  if (checks.envFiles.backendExample) {
    console.log(`\n${colors.magenta}Kiểm tra biến môi trường backend:${colors.reset}`);
    const backendEnvFile = 'video-downloader-saas/backend/.env.example';
    
    const hasPostgresVars = checkFileContent(backendEnvFile, 'DB_HOST') && 
                           checkFileContent(backendEnvFile, 'DB_PORT') &&
                           checkFileContent(backendEnvFile, 'DB_NAME');
    printResult('Biến môi trường PostgreSQL', hasPostgresVars);
    
    const hasRedisVars = checkFileContent(backendEnvFile, 'REDIS_HOST');
    printResult('Biến môi trường Redis', hasRedisVars);
  }
  
  // Kiểm tra dependencies
  console.log(`\n${colors.magenta}Kiểm tra dependencies:${colors.reset}`);
  const backendPackageJson = 'video-downloader-saas/backend/package.json';
  
  checks.dependencies.sequelize = checkPackageJson(backendPackageJson, 'sequelize');
  printResult('Sequelize', checks.dependencies.sequelize);
  
  checks.dependencies.redis = checkPackageJson(backendPackageJson, 'redis');
  printResult('Redis', checks.dependencies.redis);
  
  checks.dependencies.bull = checkPackageJson(backendPackageJson, 'bull');
  printResult('Bull (xử lý hàng đợi)', checks.dependencies.bull);
  
  // Kiểm tra tài liệu hướng dẫn
  console.log(`\n${colors.magenta}Kiểm tra tài liệu hướng dẫn:${colors.reset}`);
  const hasDeploymentGuide = checkFileExists('video-downloader-saas/EASYPANEL-DEPLOYMENT.md');
  printResult('Hướng dẫn triển khai', hasDeploymentGuide);
  
  const hasSetupScript = checkFileExists('video-downloader-saas/setup-easypanel.js');
  printResult('Script thiết lập tự động', hasSetupScript);
  
  // Tổng kết
  console.log(`\n${colors.cyan}=== Tổng kết ===${colors.reset}`);
  
  // Đếm số lượng kiểm tra đã pass
  let passedChecks = 0;
  let totalChecks = 0;
  
  passedChecks += checks.dockerfiles.backend ? 1 : 0;
  passedChecks += checks.dockerfiles.frontend ? 1 : 0;
  totalChecks += 2;
  
  passedChecks += checks.database.sqlite ? 1 : 0;
  passedChecks += checks.database.postgres ? 1 : 0;
  totalChecks += 2;
  
  passedChecks += checks.redis ? 1 : 0;
  totalChecks += 1;
  
  passedChecks += checks.envFiles.backendExample ? 1 : 0;
  passedChecks += checks.envFiles.frontendExample ? 1 : 0;
  totalChecks += 2;
  
  passedChecks += checks.dependencies.sequelize ? 1 : 0;
  passedChecks += checks.dependencies.redis ? 1 : 0;
  passedChecks += checks.dependencies.bull ? 1 : 0;
  totalChecks += 3;
  
  passedChecks += hasDeploymentGuide ? 1 : 0;
  passedChecks += hasSetupScript ? 1 : 0;
  totalChecks += 2;
  
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  
  let compatibilityLevel;
  let colorLevel;
  
  if (percentage >= 90) {
    compatibilityLevel = 'Rất cao';
    colorLevel = colors.green;
  } else if (percentage >= 70) {
    compatibilityLevel = 'Cao';
    colorLevel = colors.cyan;
  } else if (percentage >= 50) {
    compatibilityLevel = 'Trung bình';
    colorLevel = colors.yellow;
  } else {
    compatibilityLevel = 'Thấp';
    colorLevel = colors.red;
  }
  
  console.log(`Đã pass ${passedChecks}/${totalChecks} kiểm tra (${percentage}%)`);
  console.log(`Mức độ tương thích với Easypanel: ${colorLevel}${compatibilityLevel}${colors.reset}`);
  
  if (percentage < 100) {
    console.log(`\n${colors.yellow}Khuyến nghị:${colors.reset}`);
    
    if (!checks.dockerfiles.backend || !checks.dockerfiles.frontend) {
      console.log('- Tạo Dockerfile cho cả backend và frontend');
    }
    
    if (!checks.database.postgres) {
      console.log('- Cập nhật database.js để hỗ trợ PostgreSQL');
    }
    
    if (!checks.redis) {
      console.log('- Thêm hỗ trợ Redis trong server.js');
    }
    
    if (!checks.envFiles.backendExample || !checks.envFiles.frontendExample) {
      console.log('- Tạo file .env.example cho cả backend và frontend');
    }
    
    if (!checks.dependencies.redis || !checks.dependencies.bull) {
      console.log('- Thêm dependencies redis và bull vào package.json');
    }
    
    if (!hasDeploymentGuide) {
      console.log('- Tạo hướng dẫn triển khai trên Easypanel');
    }
    
    if (!hasSetupScript) {
      console.log('- Tạo script thiết lập tự động cho Easypanel');
    }
  } else {
    console.log(`\n${colors.green}Dự án đã sẵn sàng để triển khai trên Easypanel!${colors.reset}`);
  }
}

// Chạy hàm chính
main();