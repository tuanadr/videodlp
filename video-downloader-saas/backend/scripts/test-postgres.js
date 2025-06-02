#!/usr/bin/env node

/**
 * PostgreSQL Connection Test Script
 * Tests database connection and runs initial setup
 */

require('dotenv').config();
const { sequelize, initDatabase, runMigrations } = require('../database');

async function testPostgreSQLConnection() {
  console.log('🔍 Testing PostgreSQL Connection...\n');
  
  // Display configuration
  console.log('📋 Database Configuration:');
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   Port: ${process.env.DB_PORT || 5432}`);
  console.log(`   Database: ${process.env.DB_NAME || 'Not set'}`);
  console.log(`   User: ${process.env.DB_USER || 'Not set'}`);
  console.log(`   SSL: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'}\n`);
  
  try {
    // Test basic connection
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!\n');
    
    // Get database info
    const [results] = await sequelize.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', results[0].version);
    
    // Check if database exists and get basic info
    const [dbInfo] = await sequelize.query(`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `);
    
    console.log('🗄️  Database Info:');
    console.log(`   Database: ${dbInfo[0].database_name}`);
    console.log(`   User: ${dbInfo[0].current_user}`);
    console.log(`   Server: ${dbInfo[0].server_address || 'localhost'}:${dbInfo[0].server_port || 5432}\n`);
    
    // Initialize database
    console.log('🚀 Initializing database...');
    const initSuccess = await initDatabase();
    
    if (initSuccess) {
      console.log('✅ Database initialization successful!\n');
      
      // Run migrations
      console.log('🔄 Running migrations...');
      const migrationSuccess = await runMigrations();
      
      if (migrationSuccess) {
        console.log('✅ Migrations completed successfully!\n');
        
        // Check tables
        console.log('📋 Checking created tables...');
        const [tables] = await sequelize.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        
        console.log('📊 Created tables:');
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
        
        // Check ENUM types
        console.log('\n🏷️  Checking ENUM types...');
        const [enums] = await sequelize.query(`
          SELECT typname 
          FROM pg_type 
          WHERE typtype = 'e' 
          ORDER BY typname
        `);
        
        console.log('📊 Created ENUM types:');
        enums.forEach(enumType => {
          console.log(`   - ${enumType.typname}`);
        });
        
        console.log('\n🎉 PostgreSQL setup completed successfully!');
        console.log('💡 Your application is ready to use PostgreSQL database.');
        
      } else {
        console.error('❌ Migration failed!');
        process.exit(1);
      }
    } else {
      console.error('❌ Database initialization failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error details:', error.message);
    
    // Provide helpful suggestions
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Make sure PostgreSQL server is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Verify the database exists and user has proper permissions');
    console.log('4. Check if the host and port are correct');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('5. PostgreSQL server might not be running on the specified host/port');
    } else if (error.code === '3D000') {
      console.log('5. Database does not exist - create it first');
    } else if (error.code === '28P01') {
      console.log('5. Authentication failed - check username/password');
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testPostgreSQLConnection()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testPostgreSQLConnection;
