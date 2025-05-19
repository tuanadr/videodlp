/**
 * Script để tạo cấu hình Easypanel cho dự án VideoDownloader SaaS
 * 
 * Cách sử dụng:
 * 1. Cài đặt Easypanel trên máy chủ của bạn
 * 2. Đảm bảo bạn đã đăng nhập vào Easypanel và có quyền truy cập API
 * 3. Chạy script này với Node.js:
 *    node setup-easypanel.js --domain yourdomain.com --api-domain api.yourdomain.com
 * 
 * Yêu cầu:
 * - Node.js 14+
 * - axios
 * 
 * Cài đặt dependencies:
 * npm install axios
 */

const axios = require('axios');
const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cấu hình mặc định
const config = {
  easypanelUrl: 'http://localhost:3000',
  apiKey: '',
  projectName: 'VideoDownloader',
  domain: '',
  apiDomain: '',
  dbPassword: generatePassword(16),
  redisPassword: generatePassword(16),
  jwtSecret: generatePassword(32),
  refreshTokenSecret: generatePassword(32),
  gitRepo: '',
  branch: 'main'
};

// Đọc tham số dòng lệnh
process.argv.forEach((arg, index) => {
  if (arg === '--domain' && process.argv[index + 1]) {
    config.domain = process.argv[index + 1];
  }
  if (arg === '--api-domain' && process.argv[index + 1]) {
    config.apiDomain = process.argv[index + 1];
  }
  if (arg === '--easypanel-url' && process.argv[index + 1]) {
    config.easypanelUrl = process.argv[index + 1];
  }
  if (arg === '--api-key' && process.argv[index + 1]) {
    config.apiKey = process.argv[index + 1];
  }
  if (arg === '--project' && process.argv[index + 1]) {
    config.projectName = process.argv[index + 1];
  }
  if (arg === '--git-repo' && process.argv[index + 1]) {
    config.gitRepo = process.argv[index + 1];
  }
  if (arg === '--branch' && process.argv[index + 1]) {
    config.branch = process.argv[index + 1];
  }
});

// Tạo interface readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hàm tạo mật khẩu ngẫu nhiên
function generatePassword(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Hàm hỏi người dùng
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Hàm gọi API Easypanel
async function callEasypanelApi(endpoint, method = 'GET', data = null) {
  try {
    const url = `${config.easypanelUrl}/api/v1/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    let response;
    if (method === 'GET') {
      response = await axios.get(url, { headers });
    } else if (method === 'POST') {
      response = await axios.post(url, data, { headers });
    } else if (method === 'PUT') {
      response = await axios.put(url, data, { headers });
    } else if (method === 'DELETE') {
      response = await axios.delete(url, { headers });
    }
    
    return response.data;
  } catch (error) {
    console.error(`Lỗi khi gọi API ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Hàm chính
async function main() {
  console.log('🚀 Bắt đầu thiết lập Easypanel cho VideoDownloader SaaS...');
  
  // Kiểm tra và yêu cầu thông tin cần thiết
  if (!config.domain) {
    config.domain = await askQuestion('Nhập domain chính (ví dụ: yourdomain.com): ');
  }
  
  if (!config.apiDomain) {
    config.apiDomain = await askQuestion(`Nhập domain cho API (mặc định: api.${config.domain}): `);
    if (!config.apiDomain) {
      config.apiDomain = `api.${config.domain}`;
    }
  }
  
  if (!config.apiKey) {
    config.apiKey = await askQuestion('Nhập API key của Easypanel: ');
  }
  
  if (!config.gitRepo) {
    config.gitRepo = await askQuestion('Nhập URL của Git repository: ');
  }
  
  console.log('\n📋 Cấu hình:');
  console.log(`- Easypanel URL: ${config.easypanelUrl}`);
  console.log(`- Project: ${config.projectName}`);
  console.log(`- Domain chính: ${config.domain}`);
  console.log(`- Domain API: ${config.apiDomain}`);
  console.log(`- Git Repository: ${config.gitRepo}`);
  console.log(`- Branch: ${config.branch}`);
  console.log(`- Database Password: ${config.dbPassword}`);
  console.log(`- Redis Password: ${config.redisPassword}`);
  
  const confirm = await askQuestion('\n❓ Bạn có muốn tiếp tục với cấu hình này? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Đã hủy thiết lập.');
    rl.close();
    return;
  }
  
  try {
    // 1. Tạo project
    console.log('\n🏗️ Tạo project...');
    const project = await callEasypanelApi('projects', 'POST', {
      name: config.projectName
    });
    console.log(`✅ Đã tạo project: ${project.name} (ID: ${project.id})`);
    
    // 2. Tạo dịch vụ PostgreSQL
    console.log('\n🗄️ Tạo dịch vụ PostgreSQL...');
    const postgres = await callEasypanelApi('services', 'POST', {
      projectId: project.id,
      type: 'postgres',
      name: 'videodlp-db',
      config: {
        password: config.dbPassword,
        database: 'videodlp',
        user: 'postgres'
      }
    });
    console.log(`✅ Đã tạo dịch vụ PostgreSQL: ${postgres.name} (ID: ${postgres.id})`);
    
    // 3. Tạo dịch vụ Redis
    console.log('\n📦 Tạo dịch vụ Redis...');
    const redis = await callEasypanelApi('services', 'POST', {
      projectId: project.id,
      type: 'redis',
      name: 'videodlp-redis',
      config: {
        password: config.redisPassword
      }
    });
    console.log(`✅ Đã tạo dịch vụ Redis: ${redis.name} (ID: ${redis.id})`);
    
    // 4. Tạo dịch vụ Backend
    console.log('\n🖥️ Tạo dịch vụ Backend...');
    const backend = await callEasypanelApi('services', 'POST', {
      projectId: project.id,
      type: 'app',
      name: 'videodlp-backend',
      config: {
        source: {
          type: 'git',
          repository: config.gitRepo,
          branch: config.branch,
          directory: 'video-downloader-saas/backend'
        },
        build: {
          type: 'dockerfile',
          dockerfile: 'Dockerfile'
        },
        domain: config.apiDomain,
        port: 5000,
        env: {
          NODE_ENV: 'production',
          PORT: '5000',
          JWT_SECRET: config.jwtSecret,
          JWT_EXPIRE: '1h',
          REFRESH_TOKEN_SECRET: config.refreshTokenSecret,
          REFRESH_TOKEN_EXPIRE: '7d',
          USE_SQLITE: 'false',
          DB_HOST: 'videodlp-db',
          DB_PORT: '5432',
          DB_NAME: 'videodlp',
          DB_USER: 'postgres',
          DB_PASSWORD: config.dbPassword,
          REDIS_HOST: 'videodlp-redis',
          REDIS_PORT: '6379',
          REDIS_PASSWORD: config.redisPassword,
          FRONTEND_URL: `https://${config.domain}`,
          DOWNLOADS_DIR: './downloads',
          LOGS_DIR: './logs',
          UV_THREADPOOL_SIZE: '4'
        },
        volumes: [
          { source: './downloads', destination: '/app/downloads' },
          { source: './logs', destination: '/app/logs' },
          { source: './database', destination: '/app/database' }
        ],
        healthCheck: {
          path: '/',
          port: 5000,
          interval: '30s',
          timeout: '10s',
          retries: 3
        }
      }
    });
    console.log(`✅ Đã tạo dịch vụ Backend: ${backend.name} (ID: ${backend.id})`);
    
    // 5. Tạo dịch vụ Frontend
    console.log('\n🖼️ Tạo dịch vụ Frontend...');
    const frontend = await callEasypanelApi('services', 'POST', {
      projectId: project.id,
      type: 'app',
      name: 'videodlp-frontend',
      config: {
        source: {
          type: 'git',
          repository: config.gitRepo,
          branch: config.branch,
          directory: 'video-downloader-saas/frontend'
        },
        build: {
          type: 'dockerfile',
          dockerfile: 'Dockerfile'
        },
        domain: config.domain,
        port: 80,
        env: {
          REACT_APP_API_URL: `https://${config.apiDomain}`
        },
        healthCheck: {
          path: '/health.txt',
          port: 80,
          interval: '30s',
          timeout: '10s',
          retries: 3
        }
      }
    });
    console.log(`✅ Đã tạo dịch vụ Frontend: ${frontend.name} (ID: ${frontend.id})`);
    
    // Lưu cấu hình
    const configOutput = {
      project: {
        id: project.id,
        name: project.name
      },
      services: {
        postgres: {
          id: postgres.id,
          name: postgres.name,
          password: config.dbPassword
        },
        redis: {
          id: redis.id,
          name: redis.name,
          password: config.redisPassword
        },
        backend: {
          id: backend.id,
          name: backend.name,
          domain: config.apiDomain
        },
        frontend: {
          id: frontend.id,
          name: frontend.name,
          domain: config.domain
        }
      },
      secrets: {
        jwtSecret: config.jwtSecret,
        refreshTokenSecret: config.refreshTokenSecret
      }
    };
    
    fs.writeFileSync('easypanel-config.json', JSON.stringify(configOutput, null, 2));
    console.log('\n💾 Đã lưu cấu hình vào file easypanel-config.json');
    
    console.log('\n✨ Thiết lập hoàn tất! Bạn có thể truy cập:');
    console.log(`- Frontend: https://${config.domain}`);
    console.log(`- Backend API: https://${config.apiDomain}`);
    console.log(`- Easypanel Dashboard: ${config.easypanelUrl}`);
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình thiết lập:', error);
  } finally {
    rl.close();
  }
}

// Chạy hàm chính
main().catch(error => {
  console.error('❌ Lỗi:', error);
  rl.close();
  process.exit(1);
});