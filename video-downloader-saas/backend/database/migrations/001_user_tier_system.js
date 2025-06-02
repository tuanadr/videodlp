const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create enums for PostgreSQL
      if (queryInterface.sequelize.getDialect() === 'postgres') {
        await queryInterface.sequelize.query(
          `CREATE TYPE user_tier AS ENUM ('anonymous', 'free', 'pro');`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');`,
          { transaction }
        );
      }

      // Add new columns to Users table
      await queryInterface.addColumn('Users', 'tier', {
        type: queryInterface.sequelize.getDialect() === 'postgres' 
          ? 'user_tier' 
          : DataTypes.ENUM('anonymous', 'free', 'pro'),
        defaultValue: 'free',
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'subscription_expires_at', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'monthly_download_count', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'last_reset_date', {
        type: DataTypes.DATEONLY,
        defaultValue: Sequelize.fn('NOW'),
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'total_revenue_generated', {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'bonus_downloads', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'referral_stats', {
        type: DataTypes.JSON,
        allowNull: true
      }, { transaction });

      // Create UserAnalytics table
      await queryInterface.createTable('UserAnalytics', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        session_id: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        ip_address: {
          type: DataTypes.INET,
          allowNull: true
        },
        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        page_views: {
          type: DataTypes.INTEGER,
          defaultValue: 0
        },
        downloads_count: {
          type: DataTypes.INTEGER,
          defaultValue: 0
        },
        time_spent_seconds: {
          type: DataTypes.INTEGER,
          defaultValue: 0
        },
        revenue_generated: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      // Create AdImpressions table
      await queryInterface.createTable('AdImpressions', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        session_id: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        ad_type: {
          type: DataTypes.STRING(50),
          allowNull: false
        },
        ad_position: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        impressions: {
          type: DataTypes.INTEGER,
          defaultValue: 0
        },
        clicks: {
          type: DataTypes.INTEGER,
          defaultValue: 0
        },
        revenue: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      // Create PaymentTransactions table
      await queryInterface.createTable('PaymentTransactions', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        transaction_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        payment_method: {
          type: DataTypes.STRING(50),
          allowNull: false
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        currency: {
          type: DataTypes.STRING(3),
          defaultValue: 'VND'
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false
        },
        subscription_months: {
          type: DataTypes.INTEGER,
          defaultValue: 1
        },
        vnpay_data: {
          type: DataTypes.JSON,
          allowNull: true
        },
        momo_data: {
          type: DataTypes.JSON,
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      // DownloadHistory table removed - unlimited downloads for all tiers

      // Create indexes for better performance
      await queryInterface.addIndex('UserAnalytics', ['user_id'], { transaction });
      await queryInterface.addIndex('UserAnalytics', ['session_id'], { transaction });
      await queryInterface.addIndex('AdImpressions', ['user_id'], { transaction });
      await queryInterface.addIndex('PaymentTransactions', ['user_id'], { transaction });
      await queryInterface.addIndex('PaymentTransactions', ['transaction_id'], { transaction });
      // DownloadHistory indexes removed

      await transaction.commit();
      console.log('Migration 001_user_tier_system completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration 001_user_tier_system failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables (DownloadHistory removed)
      await queryInterface.dropTable('PaymentTransactions', { transaction });
      await queryInterface.dropTable('AdImpressions', { transaction });
      await queryInterface.dropTable('UserAnalytics', { transaction });

      // Remove columns from Users table
      await queryInterface.removeColumn('Users', 'referral_stats', { transaction });
      await queryInterface.removeColumn('Users', 'bonus_downloads', { transaction });
      await queryInterface.removeColumn('Users', 'total_revenue_generated', { transaction });
      await queryInterface.removeColumn('Users', 'last_reset_date', { transaction });
      await queryInterface.removeColumn('Users', 'monthly_download_count', { transaction });
      await queryInterface.removeColumn('Users', 'subscription_expires_at', { transaction });
      await queryInterface.removeColumn('Users', 'tier', { transaction });

      // Drop enums for PostgreSQL
      if (queryInterface.sequelize.getDialect() === 'postgres') {
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS subscription_status;`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS user_tier;`,
          { transaction }
        );
      }

      await transaction.commit();
      console.log('Migration 001_user_tier_system rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration 001_user_tier_system rollback failed:', error);
      throw error;
    }
  }
};
