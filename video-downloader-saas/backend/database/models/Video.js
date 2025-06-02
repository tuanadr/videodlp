const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Video = sequelize.define('Video', {
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Vui lòng nhập tiêu đề video' },
        len: { args: [1, 200], msg: 'Tiêu đề không được vượt quá 200 ký tự' }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Vui lòng nhập URL video' },
        isUrl: { msg: 'Vui lòng nhập URL hợp lệ' }
      }
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true
    },
    formats: {
      type: DataTypes.JSON,
      allowNull: true
    },
    formatId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    downloadPath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    createdAt: true,
    updatedAt: true
  });

  return Video;
};