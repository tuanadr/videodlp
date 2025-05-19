/**
 * Mô-đun giám sát tài nguyên hệ thống
 * Giúp giám sát và quản lý tài nguyên hệ thống để tránh quá tải
 */

const os = require('os');

// Cấu hình mặc định
const DEFAULT_CONFIG = {
  checkInterval: 60000, // Kiểm tra mỗi 60 giây
  cpuThreshold: 80, // Ngưỡng CPU (%)
  memoryThreshold: 80, // Ngưỡng bộ nhớ (%)
  logInterval: 300000, // Log mỗi 5 phút
  enableAutoScaling: false // Tự động điều chỉnh tài nguyên
};

// Biến lưu trữ trạng thái
let isOverloaded = false;
let lastLogTime = 0;
let config = { ...DEFAULT_CONFIG };
let intervalId = null;

/**
 * Lấy thông tin sử dụng CPU
 * @returns {number} Phần trăm sử dụng CPU
 */
function getCpuUsage() {
  const cpus = os.cpus();
  
  // Tính tổng thời gian CPU
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  
  // Tính phần trăm sử dụng
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle / total);
  
  return parseFloat(usage.toFixed(2));
}

/**
 * Lấy thông tin sử dụng bộ nhớ
 * @returns {number} Phần trăm sử dụng bộ nhớ
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;
  
  return parseFloat(memUsage.toFixed(2));
}

/**
 * Kiểm tra xem hệ thống có bị quá tải không
 * @returns {boolean} True nếu hệ thống bị quá tải
 */
function checkOverload() {
  const cpuUsage = getCpuUsage();
  const memoryUsage = getMemoryUsage();
  
  // Kiểm tra xem có vượt quá ngưỡng không
  const cpuOverloaded = cpuUsage > config.cpuThreshold;
  const memoryOverloaded = memoryUsage > config.memoryThreshold;
  
  // Cập nhật trạng thái
  isOverloaded = cpuOverloaded || memoryOverloaded;
  
  // Log thông tin nếu cần
  const now = Date.now();
  if (now - lastLogTime > config.logInterval) {
    console.log(`[SYSTEM_LOAD] CPU: ${cpuUsage}%, Memory: ${memoryUsage}%, Overloaded: ${isOverloaded}`);
    lastLogTime = now;
  }
  
  return isOverloaded;
}

/**
 * Thực hiện các biện pháp để giảm thiểu quá tải
 */
function mitigateOverload() {
  if (!isOverloaded) return;
  
  // Thực hiện dọn dẹp bộ nhớ
  if (global.gc) {
    try {
      global.gc();
    } catch (error) {
      console.error('Lỗi khi dọn dẹp bộ nhớ:', error);
    }
  }
  
  // Các biện pháp khác có thể thêm ở đây
}

/**
 * Khởi động giám sát hệ thống
 * @param {Object} customConfig Cấu hình tùy chỉnh
 */
function startMonitoring(customConfig = {}) {
  // Cập nhật cấu hình
  config = { ...DEFAULT_CONFIG, ...customConfig };
  
  // Dừng interval hiện tại nếu có
  if (intervalId) {
    clearInterval(intervalId);
  }
  
  // Khởi động interval mới
  intervalId = setInterval(() => {
    checkOverload();
    mitigateOverload();
  }, config.checkInterval);
  
  console.log('Đã khởi động giám sát tài nguyên hệ thống');
  
  // Kiểm tra ngay lập tức
  checkOverload();
}

/**
 * Dừng giám sát hệ thống
 */
function stopMonitoring() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Đã dừng giám sát tài nguyên hệ thống');
  }
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  checkOverload,
  getCpuUsage,
  getMemoryUsage,
  isSystemOverloaded: () => isOverloaded
};