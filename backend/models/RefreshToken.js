const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../database');

class RefreshToken extends Model {
  // Kiểm tra token đã hết hạn chưa
  isExpired() {
    return this.expiresAt < new Date();
  }

  // Thu hồi token
  async revoke() {
    this.isRevoked = true;
    return this.save();
  }

  // Tìm token hợp lệ
  static async findValidToken(token) {
    const { Op } = require('sequelize');
    return this.findOne({
      where: {
        token,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user'
        }
      ]
    });
  }

  // Tạo token mới
  static async createToken(user, token, expiresAt, userAgent, ipAddress) {
    return this.create({
      userId: user.id,
      token,
      expiresAt,
      userAgent,
      ipAddress
    });
  }
}

RefreshToken.init({
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'RefreshToken',
  timestamps: true,
  indexes: [
    {
      fields: ['token']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

module.exports = RefreshToken;