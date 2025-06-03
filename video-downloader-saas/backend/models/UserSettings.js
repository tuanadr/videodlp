const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

/**
 * UserSettings Model
 * Stores user preferences and settings
 */
const UserSettings = sequelize.define('UserSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  
  // General Settings
  language: {
    type: DataTypes.ENUM('vi', 'en'),
    defaultValue: 'vi',
    allowNull: false,
    validate: {
      isIn: {
        args: [['vi', 'en']],
        msg: 'Ngôn ngữ phải là vi hoặc en'
      }
    }
  },
  theme: {
    type: DataTypes.ENUM('light', 'dark', 'auto'),
    defaultValue: 'light',
    allowNull: false,
    validate: {
      isIn: {
        args: [['light', 'dark', 'auto']],
        msg: 'Giao diện phải là light, dark hoặc auto'
      }
    }
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Ho_Chi_Minh',
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Múi giờ không được để trống' },
      len: { args: [1, 50], msg: 'Múi giờ không được vượt quá 50 ký tự' }
    }
  },
  
  // Notification Settings
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  downloadNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  promotionalEmails: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  securityAlerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  // Download Settings
  defaultQuality: {
    type: DataTypes.ENUM('best', '1080p', '720p', '480p', '360p'),
    defaultValue: 'best',
    allowNull: false,
    validate: {
      isIn: {
        args: [['best', '1080p', '720p', '480p', '360p']],
        msg: 'Chất lượng mặc định không hợp lệ'
      }
    }
  },
  downloadLocation: {
    type: DataTypes.STRING(100),
    defaultValue: 'downloads',
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Thư mục tải xuống không được để trống' },
      len: { args: [1, 100], msg: 'Thư mục tải xuống không được vượt quá 100 ký tự' }
    }
  },
  autoDownload: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  maxConcurrentDownloads: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Số lượng tải đồng thời tối thiểu là 1' },
      max: { args: [10], msg: 'Số lượng tải đồng thời tối đa là 10' }
    }
  },
  
  // Privacy Settings
  profileVisibility: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'private',
    allowNull: false,
    validate: {
      isIn: {
        args: [['public', 'private']],
        msg: 'Hiển thị hồ sơ phải là public hoặc private'
      }
    }
  },
  downloadHistory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  analytics: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  // Security Settings
  twoFactorAuth: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  sessionTimeout: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Thời gian hết hạn phiên không được âm' },
      max: { args: [480], msg: 'Thời gian hết hạn phiên tối đa là 480 phút (8 giờ)' }
    }
  },
  autoLogout: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  // Additional Settings (JSON for flexibility)
  additionalSettings: {
    type: DataTypes.JSON,
    defaultValue: {},
    allowNull: true
  },
  
  // Metadata
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'user_settings',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      unique: true,
      fields: ['userId']
    },
    {
      fields: ['language']
    },
    {
      fields: ['theme']
    }
  ]
});

// Hooks
UserSettings.beforeUpdate((settings) => {
  settings.lastUpdated = new Date();
});

// Instance methods
UserSettings.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // Remove sensitive or unnecessary fields from API responses
  delete values.id;
  delete values.createdAt;
  delete values.updatedAt;
  
  return values;
};

// Static methods
UserSettings.getDefaultSettings = function() {
  return {
    language: 'vi',
    theme: 'light',
    timezone: 'Asia/Ho_Chi_Minh',
    emailNotifications: true,
    downloadNotifications: true,
    promotionalEmails: false,
    securityAlerts: true,
    defaultQuality: 'best',
    downloadLocation: 'downloads',
    autoDownload: false,
    maxConcurrentDownloads: 3,
    profileVisibility: 'private',
    downloadHistory: true,
    analytics: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    autoLogout: false,
    additionalSettings: {}
  };
};

UserSettings.createDefaultForUser = async function(userId) {
  try {
    const defaultSettings = this.getDefaultSettings();
    return await this.create({
      userId,
      ...defaultSettings
    });
  } catch (error) {
    throw new Error(`Không thể tạo cài đặt mặc định cho user ${userId}: ${error.message}`);
  }
};

module.exports = UserSettings;
