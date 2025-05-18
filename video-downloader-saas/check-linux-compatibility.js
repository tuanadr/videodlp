/**
 * Script kiểm tra tính tương thích của mã nguồn với Linux
 * Tìm kiếm các vấn đề tiềm ẩn có thể gây lỗi khi chuyển từ Windows sang Linux
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');

const execPromise = util.promisify(exec);

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

// Các mẫu regex để tìm kiếm các vấn đề tiềm ẩn
const patterns = {
  windowsPaths: /['"](([A-Z]:|\\\\|\.\\)[\\\/][^"']*)['"]/g,
  absolutePaths: /['"](\/[^"']*)['"]/g,
  backslashes: /\\/g,
  caseInsensitiveRequire: /require\(['"](.*?)['"].*?\)/g,
  hardcodedIPs: /(\b(?:\d{1,3}\.){3}\d{1,3}\b)/g,
  hardcodedPorts: /(localhost|127\.0\.0\.1):(\d{2,5})/g,
  environmentVariables: /process\.env\.([A-Z_0-9]+)/g
};

// Danh sách các thư mục và file cần bỏ qua
const ignoreDirs = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage'
];

const ignoreFiles = [
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  '.gitignore',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production'
];

// Danh sách các phần mở rộng file cần kiểm tra
const checkExtensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.yml',
  '.yaml',
  '.md',
  '.html',
  '.css',
  '.scss',
  '.less'
];

// Biến lưu trữ kết quả
const issues = {
  windowsPaths: [],
  absolutePaths: [],
  backslashes: [],
  caseInsensitiveRequire: [],
  hardcodedIPs: [],
  hardcodedPorts: [],
  missingEnvVars: []
};

let totalFiles = 0;
let checkedFiles = 0;
let totalIssues = 0;

/**
 * Kiểm tra một file
 * @param {string} filePath - Đường dẫn đến file cần kiểm tra
 */
async function checkFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!checkExtensions.includes(ext)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    checkedFiles++;

    // Kiểm tra đường dẫn kiểu Windows
    const windowsPathMatches = content.match(patterns.windowsPaths);
    if (windowsPathMatches) {
      windowsPathMatches.forEach(match => {
        issues.windowsPaths.push({ file: relativePath, match });
        totalIssues++;
      });
    }

    // Kiểm tra đường dẫn tuyệt đối
    const absolutePathMatches = content.match(patterns.absolutePaths);
    if (absolutePathMatches) {
      absolutePathMatches.forEach(match => {
        issues.absolutePaths.push({ file: relativePath, match });
        totalIssues++;
      });
    }

    // Kiểm tra dấu gạch ngược
    if (patterns.backslashes.test(content)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (patterns.backslashes.test(line)) {
          issues.backslashes.push({ 
            file: relativePath, 
            line: index + 1, 
            content: line.trim() 
          });
          totalIssues++;
        }
      });
    }

    // Kiểm tra require không phân biệt chữ hoa/chữ thường
    const requireMatches = content.match(patterns.caseInsensitiveRequire);
    if (requireMatches) {
      requireMatches.forEach(match => {
        const modulePath = match.match(/['"](.+?)['"]/)[1];
        if (modulePath.startsWith('.') && !modulePath.startsWith('node_modules')) {
          issues.caseInsensitiveRequire.push({ file: relativePath, match, modulePath });
          totalIssues++;
        }
      });
    }

    // Kiểm tra IP cứng
    const ipMatches = content.match(patterns.hardcodedIPs);
    if (ipMatches) {
      ipMatches.forEach(match => {
        if (match !== '127.0.0.1' && match !== '0.0.0.0') {
          issues.hardcodedIPs.push({ file: relativePath, match });
          totalIssues++;
        }
      });
    }

    // Kiểm tra cổng cứng
    const portMatches = content.match(patterns.hardcodedPorts);
    if (portMatches) {
      portMatches.forEach(match => {
        issues.hardcodedPorts.push({ file: relativePath, match });
        totalIssues++;
      });
    }

    // Kiểm tra biến môi trường
    const envVarMatches = content.match(patterns.environmentVariables);
    if (envVarMatches) {
      const uniqueEnvVars = [...new Set(envVarMatches.map(match => match.match(/process\.env\.([A-Z_0-9]+)/)[1]))];
      
      // Kiểm tra xem biến môi trường có trong .env.example không
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envCoolifyPath = path.join(process.cwd(), '.env.coolify');
      
      let envExampleContent = '';
      let envCoolifyContent = '';
      
      if (fs.existsSync(envExamplePath)) {
        envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
      }
      
      if (fs.existsSync(envCoolifyPath)) {
        envCoolifyContent = fs.readFileSync(envCoolifyPath, 'utf8');
      }
      
      uniqueEnvVars.forEach(envVar => {
        if (!envExampleContent.includes(envVar) && !envCoolifyContent.includes(envVar)) {
          issues.missingEnvVars.push({ file: relativePath, envVar });
          totalIssues++;
        }
      });
    }
  } catch (error) {
    console.error(`${colors.red}Lỗi khi kiểm tra file ${filePath}:${colors.reset}`, error);
  }
}

/**
 * Quét đệ quy một thư mục
 * @param {string} dir - Thư mục cần quét
 */
async function scanDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(file)) {
          await scanDirectory(filePath);
        }
      } else {
        if (!ignoreFiles.includes(file)) {
          totalFiles++;
          await checkFile(filePath);
        }
      }
    }
  } catch (error) {
    console.error(`${colors.red}Lỗi khi quét thư mục ${dir}:${colors.reset}`, error);
  }
}

/**
 * In kết quả kiểm tra
 */
function printResults() {
  console.log(`\n${colors.blue}=== Kết quả kiểm tra tính tương thích với Linux ===${colors.reset}`);
  console.log(`${colors.cyan}Đã kiểm tra ${checkedFiles}/${totalFiles} files${colors.reset}`);
  console.log(`${colors.cyan}Tổng số vấn đề phát hiện: ${totalIssues}${colors.reset}\n`);
  
  if (issues.windowsPaths.length > 0) {
    console.log(`${colors.yellow}Đường dẫn kiểu Windows (${issues.windowsPaths.length}):${colors.reset}`);
    issues.windowsPaths.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${colors.reset} ${issue.match}`);
    });
    console.log('');
  }
  
  if (issues.absolutePaths.length > 0) {
    console.log(`${colors.yellow}Đường dẫn tuyệt đối (${issues.absolutePaths.length}):${colors.reset}`);
    issues.absolutePaths.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${colors.reset} ${issue.match}`);
    });
    console.log('');
  }
  
  if (issues.backslashes.length > 0) {
    console.log(`${colors.yellow}Dấu gạch ngược (${issues.backslashes.length}):${colors.reset}`);
    issues.backslashes.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${issue.line}:${colors.reset} ${issue.content}`);
    });
    console.log('');
  }
  
  if (issues.caseInsensitiveRequire.length > 0) {
    console.log(`${colors.yellow}Require không phân biệt chữ hoa/chữ thường (${issues.caseInsensitiveRequire.length}):${colors.reset}`);
    issues.caseInsensitiveRequire.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${colors.reset} ${issue.match}`);
    });
    console.log('');
  }
  
  if (issues.hardcodedIPs.length > 0) {
    console.log(`${colors.yellow}IP cứng (${issues.hardcodedIPs.length}):${colors.reset}`);
    issues.hardcodedIPs.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${colors.reset} ${issue.match}`);
    });
    console.log('');
  }
  
  if (issues.hardcodedPorts.length > 0) {
    console.log(`${colors.yellow}Cổng cứng (${issues.hardcodedPorts.length}):${colors.reset}`);
    issues.hardcodedPorts.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${colors.reset} ${issue.match}`);
    });
    console.log('');
  }
  
  if (issues.missingEnvVars.length > 0) {
    console.log(`${colors.yellow}Biến môi trường thiếu trong .env.example hoặc .env.coolify (${issues.missingEnvVars.length}):${colors.reset}`);
    issues.missingEnvVars.forEach(issue => {
      console.log(`  ${colors.red}${issue.file}:${colors.reset} ${issue.envVar}`);
    });
    console.log('');
  }
  
  console.log(`${colors.blue}=== Đề xuất ====${colors.reset}`);
  
  if (totalIssues > 0) {
    console.log(`${colors.yellow}1. Sử dụng module pathUtils.js để xử lý các đường dẫn:${colors.reset}`);
    console.log(`   const { normalizePath } = require('./utils/pathUtils');`);
    console.log(`   const filePath = normalizePath('/path/to/file');`);
    console.log('');
    
    console.log(`${colors.yellow}2. Sử dụng path.join() thay vì nối chuỗi đường dẫn:${colors.reset}`);
    console.log(`   const path = require('path');`);
    console.log(`   const filePath = path.join(__dirname, 'path', 'to', 'file');`);
    console.log('');
    
    console.log(`${colors.yellow}3. Sử dụng biến môi trường cho các giá trị cấu hình:${colors.reset}`);
    console.log(`   const port = process.env.PORT || 5000;`);
    console.log(`   const apiUrl = process.env.API_URL || 'http://localhost:5000';`);
    console.log('');
    
    console.log(`${colors.yellow}4. Thêm các biến môi trường vào .env.example và .env.coolify:${colors.reset}`);
    console.log(`   PORT=5000`);
    console.log(`   API_URL=http://localhost:5000`);
    console.log('');
    
    console.log(`${colors.yellow}5. Sử dụng findFileIgnoreCase() để xử lý vấn đề phân biệt chữ hoa/chữ thường:${colors.reset}`);
    console.log(`   const { findFileIgnoreCase } = require('./utils/pathUtils');`);
    console.log(`   const filePath = findFileIgnoreCase(__dirname, 'fileName.js');`);
  } else {
    console.log(`${colors.green}Không phát hiện vấn đề nào. Mã nguồn đã sẵn sàng để triển khai trên Linux!${colors.reset}`);
  }
}

/**
 * Hàm chính
 */
async function main() {
  const startTime = Date.now();
  
  console.log(`${colors.blue}=== Bắt đầu kiểm tra tính tương thích với Linux ===${colors.reset}`);
  console.log(`${colors.cyan}Thư mục gốc: ${process.cwd()}${colors.reset}`);
  
  // Kiểm tra xem đang chạy trên Windows hay Linux
  const platform = process.platform;
  console.log(`${colors.cyan}Hệ điều hành hiện tại: ${platform}${colors.reset}`);
  
  // Quét thư mục backend
  console.log(`${colors.cyan}Đang quét thư mục backend...${colors.reset}`);
  await scanDirectory(path.join(process.cwd(), 'backend'));
  
  // Quét thư mục frontend
  console.log(`${colors.cyan}Đang quét thư mục frontend...${colors.reset}`);
  await scanDirectory(path.join(process.cwd(), 'frontend'));
  
  // In kết quả
  printResults();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`${colors.blue}=== Hoàn tất kiểm tra (${duration.toFixed(2)}s) ===${colors.reset}`);
}

// Chạy hàm chính
main().catch(error => {
  console.error(`${colors.red}Lỗi:${colors.reset}`, error);
  process.exit(1);
});