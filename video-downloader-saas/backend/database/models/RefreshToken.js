const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
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
    timestamps: true,
    createdAt: true,
    updatedAt: true,
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

  // Instance methods
  RefreshToken.prototype.isExpired = function() {
    return this.expiresAt < new Date();
  };

  RefreshToken.prototype.revoke = async function() {
    this.isRevoked = true;
    return this.save();
  };

  // Static methods
  RefreshToken.createToken = async function(user, token, expiresAt, userAgent, ipAddress) {
    return this.create({
      userId: user.id,
      token,
      expiresAt,
      userAgent,
      ipAddress
    });
  };

  RefreshToken.findValidToken = async function(token) {
    return this.findOne({
      where: {
        token,
        isRevoked: false,
        expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'User'
        }
      ]
    });
  };

  return RefreshToken;
};