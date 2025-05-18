# Khắc phục lỗi Sequelize "Naming collision between attribute 'subscription' and association 'subscription' on model User"

## Vấn đề

Khi khởi động backend trên Coolify, chúng ta gặp lỗi:

```
TypeError: Cannot read properties of undefined (reading 'define')
```

Lỗi này bắt nguồn từ:

```
Error: Naming collision between attribute 'subscription' and association 'subscription' on model User
```

Lỗi xảy ra trong file models/index.js tại dòng 19 khi Sequelize cố gắng thiết lập mối quan hệ cho model User.

## Nguyên nhân

Có một xung đột tên giữa:

1. **Trường dữ liệu `subscription` trong model User** (dòng 99-102 trong User.js):
```javascript
subscription: {
  type: DataTypes.ENUM('free', 'premium'),
  defaultValue: 'free'
}
```

2. **Mối quan hệ giữa User và Subscription** (dòng 19-22 trong index.js):
```javascript
User.hasOne(Subscription, {
  foreignKey: 'userId',
  as: 'subscription'
});
```

Cả hai đều sử dụng tên "subscription", gây ra xung đột trong Sequelize.

## Giải pháp

Chúng tôi đã thay đổi alias của mối quan hệ từ `subscription` thành `subscriptionDetails`:

```javascript
User.hasOne(Subscription, {
  foreignKey: 'userId',
  as: 'subscriptionDetails'
});
```

Việc thay đổi này là an toàn vì sau khi kiểm tra toàn bộ mã nguồn, chúng tôi không tìm thấy nơi nào đang sử dụng mối quan hệ `subscription` để truy cập đối tượng Subscription liên kết với User. Tất cả các nơi sử dụng `user.subscription` đều đang truy cập trường dữ liệu `subscription` trong model User, không phải mối quan hệ.

## Các file đã sửa

1. **models/index.js**: Thay đổi alias của mối quan hệ từ `subscription` thành `subscriptionDetails`.

## Cách sử dụng mối quan hệ trong tương lai

Nếu bạn muốn truy cập đối tượng Subscription liên kết với User, hãy sử dụng:

```javascript
user.subscriptionDetails
```

thay vì:

```javascript
user.subscription
```

Ví dụ:

```javascript
// Lấy thông tin chi tiết về gói đăng ký của người dùng
const user = await User.findByPk(userId, {
  include: [
    {
      model: Subscription,
      as: 'subscriptionDetails'
    }
  ]
});

// Truy cập thông tin gói đăng ký
console.log(user.subscriptionDetails.stripeSubscriptionId);
```

## Lưu ý

Trường `subscription` trong model User vẫn giữ nguyên và tiếp tục được sử dụng như trước đây. Đây là trường ENUM đơn giản lưu loại gói dịch vụ của người dùng, có thể là 'free' hoặc 'premium'.

```javascript
// Kiểm tra nếu người dùng có gói Premium
if (user.subscription === 'premium') {
  // Xử lý cho người dùng Premium
}