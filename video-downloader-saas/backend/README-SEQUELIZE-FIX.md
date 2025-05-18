# Khắc phục lỗi Sequelize trên Coolify

## Vấn đề

Khi triển khai ứng dụng trên Coolify, bạn có thể gặp lỗi sau:

```
/app/node_modules/sequelize/lib/model.js:666
    options = Utils.merge(_.cloneDeep(globalOptions.define), options);
                                                    ^

TypeError: Cannot read properties of undefined (reading 'define')
    at User.init (/app/node_modules/sequelize/lib/model.js:666:53)
    at Object.<anonymous> (/app/models/User.js:69:6)
```

Lỗi này xảy ra do sự không nhất quán trong cách import và export sequelize giữa các file.

## Nguyên nhân

Trong file `database.js`, chúng ta đã thay đổi cách export từ:

```javascript
module.exports = sequelize;
```

sang:

```javascript
module.exports = {
  sequelize,
  initDatabase,
  testConnection
};
```

Nhưng trong các file model, chúng ta vẫn đang import sequelize trực tiếp:

```javascript
const sequelize = require('../database');
```

Điều này có nghĩa là `sequelize` trong các file model là một object chứa các thuộc tính `sequelize`, `initDatabase` và `testConnection`, chứ không phải là instance Sequelize trực tiếp.

## Giải pháp

Chúng ta đã sửa các file model để import sequelize đúng cách:

1. File `User.js`:
   ```javascript
   const { sequelize } = require('../database');
   ```

2. File `Video.js`:
   ```javascript
   const { sequelize } = require('../database');
   ```

3. File `Subscription.js`:
   ```javascript
   const { sequelize } = require('../database');
   ```

4. File `RefreshToken.js`:
   ```javascript
   const { sequelize } = require('../database');
   ```

5. File `models/index.js`:
   ```javascript
   const { sequelize } = require('../database');
   ```

## Kiểm tra

Sau khi thực hiện các thay đổi trên, ứng dụng sẽ hoạt động bình thường trên Coolify. Nếu bạn vẫn gặp vấn đề, hãy kiểm tra:

1. Đảm bảo tất cả các file model đều import sequelize đúng cách
2. Kiểm tra logs của container backend để xem có lỗi nào khác không
3. Đảm bảo các biến môi trường đã được thiết lập đúng

## Tại sao lỗi này chỉ xảy ra trên Coolify?

Lỗi này có thể chỉ xảy ra trên Coolify vì:

1. **Khác biệt về môi trường**: Render.com có thể có cấu hình Node.js khác với Coolify
2. **Khác biệt về phiên bản**: Phiên bản Node.js hoặc Sequelize có thể khác nhau
3. **Khác biệt về cách xử lý module**: Cách Node.js xử lý module có thể khác nhau giữa các môi trường

## Phòng ngừa trong tương lai

Để tránh lỗi tương tự trong tương lai, hãy đảm bảo:

1. Luôn nhất quán trong cách import và export module
2. Kiểm tra kỹ ứng dụng trong môi trường tương tự với môi trường sản xuất trước khi triển khai
3. Sử dụng TypeScript để phát hiện lỗi sớm hơn