const fs = require('fs');
const path = require('path');

// Danh sách các tệp cần cập nhật
const filesToUpdate = [
  {
    source: 'server.js.new',
    target: 'server.js'
  },
  {
    source: 'middleware/auth.js.new',
    target: 'middleware/auth.js'
  }
];

// Hàm cập nhật tệp
const updateFile = (source, target) => {
  try {
    const sourcePath = path.join(__dirname, '..', source);
    const targetPath = path.join(__dirname, '..', target);
    
    // Kiểm tra xem tệp nguồn có tồn tại không
    if (!fs.existsSync(sourcePath)) {
      console.error(`Tệp nguồn không tồn tại: ${sourcePath}`);
      return false;
    }
    
    // Đọc nội dung tệp nguồn
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Ghi nội dung vào tệp đích
    fs.writeFileSync(targetPath, content, 'utf8');
    
    console.log(`Đã cập nhật tệp: ${target}`);
    return true;
  } catch (error) {
    console.error(`Lỗi khi cập nhật tệp ${target}:`, error);
    return false;
  }
};

// Hàm chính để cập nhật tất cả các tệp
const applyChanges = () => {
  console.log('Bắt đầu cập nhật các tệp...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesToUpdate) {
    const result = updateFile(file.source, file.target);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`Hoàn tất cập nhật: ${successCount} tệp thành công, ${failCount} tệp thất bại`);
  
  // Cập nhật .env.example để thêm cấu hình SQLite
  try {
    const envPath = path.join(__dirname, '..', '.env.example');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Kiểm tra xem đã có cấu hình SQLite chưa
    if (!envContent.includes('# SQLite Configuration')) {
      // Thêm cấu hình SQLite
      const sqliteConfig = `
# SQLite Configuration
# Đường dẫn đến tệp cơ sở dữ liệu SQLite
# NODE_ENV=development - database.sqlite
# NODE_ENV=test - database_test.sqlite
# NODE_ENV=production - database_production.sqlite
`;
      
      // Thay thế cấu hình MongoDB
      envContent = envContent.replace('# MongoDB Configuration', '# SQLite Configuration');
      envContent = envContent.replace('MONGO_URI=mongodb://localhost:27017/videodownloader', '# Đã chuyển sang sử dụng SQLite');
      
      // Ghi nội dung mới vào tệp
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Đã cập nhật .env.example với cấu hình SQLite');
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật .env.example:', error);
  }
  
  console.log('Quá trình cập nhật hoàn tất');
};

// Chạy hàm cập nhật
applyChanges();