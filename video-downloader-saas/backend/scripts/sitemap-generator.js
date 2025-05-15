/**
 * Script tự động tạo sitemap.xml dựa trên các trang có sẵn trong ứng dụng
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load biến môi trường
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Cấu hình
const SITE_URL = process.env.FRONTEND_URL || 'https://viddown.vn';
const OUTPUT_PATH = path.resolve(__dirname, '../../frontend/public/sitemap.xml');

// Danh sách các trang công khai
const publicPages = [
  { url: '/', changefreq: 'weekly', priority: '1.0' },
  { url: '/login', changefreq: 'monthly', priority: '0.8' },
  { url: '/register', changefreq: 'monthly', priority: '0.8' },
  { url: '/tai-video-youtube', changefreq: 'weekly', priority: '0.9' },
  { url: '/tai-video-facebook', changefreq: 'weekly', priority: '0.9' },
  { url: '/tai-video-tiktok', changefreq: 'weekly', priority: '0.9' },
  { url: '/tai-video-instagram', changefreq: 'weekly', priority: '0.9' },
  { url: '/tai-nhac-soundcloud', changefreq: 'weekly', priority: '0.9' },
  { url: '/supported-sites', changefreq: 'weekly', priority: '0.7' },
];

// Tạo sitemap XML
function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Thêm các trang vào sitemap
  publicPages.forEach(page => {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${SITE_URL}${page.url}</loc>\n`;
    sitemap += `    <lastmod>${today}</lastmod>\n`;
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += '  </url>\n';
  });
  
  sitemap += '</urlset>';
  
  return sitemap;
}

// Ghi sitemap vào file
function writeSitemap() {
  const sitemap = generateSitemap();
  
  fs.writeFile(OUTPUT_PATH, sitemap, err => {
    if (err) {
      console.error('Lỗi khi ghi file sitemap.xml:', err);
      return;
    }
    console.log(`Sitemap đã được tạo thành công tại: ${OUTPUT_PATH}`);
  });
}

// Thực thi
writeSitemap();

// Export các hàm để có thể sử dụng trong các script khác
module.exports = {
  generateSitemap,
  writeSitemap
};