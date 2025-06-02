#!/usr/bin/env node

/**
 * FFmpeg Setup and Validation Script
 * Checks FFmpeg installation and provides setup instructions
 */

require('dotenv').config();
const { spawn } = require('child_process');
const os = require('os');

class FFmpegSetup {
  constructor() {
    this.platform = os.platform();
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }

  /**
   * Main setup function
   */
  async setup() {
    console.log('🎬 FFmpeg Setup and Validation\n');
    
    try {
      // Check if FFmpeg is already installed
      const ffmpegInstalled = await this.checkFFmpegInstallation();
      const ffprobeInstalled = await this.checkFFprobeInstallation();
      
      if (ffmpegInstalled && ffprobeInstalled) {
        console.log('✅ FFmpeg is already installed and working!');
        await this.displayFFmpegInfo();
        await this.testTranscoding();
        return true;
      }
      
      // Provide installation instructions
      console.log('❌ FFmpeg not found or not working properly');
      this.provideInstallationInstructions();
      
      return false;
      
    } catch (error) {
      console.error('❌ Error during FFmpeg setup:', error.message);
      return false;
    }
  }

  /**
   * Check FFmpeg installation
   */
  async checkFFmpegInstallation() {
    console.log('🔍 Checking FFmpeg installation...');
    
    return new Promise((resolve) => {
      const process = spawn(this.ffmpegPath, ['-version']);
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg found and working');
          resolve(true);
        } else {
          console.log('❌ FFmpeg not working properly');
          resolve(false);
        }
      });
      
      process.on('error', (error) => {
        console.log('❌ FFmpeg not found:', error.message);
        resolve(false);
      });
    });
  }

  /**
   * Check FFprobe installation
   */
  async checkFFprobeInstallation() {
    console.log('🔍 Checking FFprobe installation...');
    
    return new Promise((resolve) => {
      const process = spawn(this.ffprobePath, ['-version']);
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFprobe found and working');
          resolve(true);
        } else {
          console.log('❌ FFprobe not working properly');
          resolve(false);
        }
      });
      
      process.on('error', (error) => {
        console.log('❌ FFprobe not found:', error.message);
        resolve(false);
      });
    });
  }

  /**
   * Display FFmpeg information
   */
  async displayFFmpegInfo() {
    console.log('\n📊 FFmpeg Information:');
    
    return new Promise((resolve) => {
      const process = spawn(this.ffmpegPath, ['-version']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', () => {
        // Extract version
        const versionMatch = output.match(/ffmpeg version (\S+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        
        // Check for hardware acceleration
        const hasNvenc = output.includes('--enable-nvenc');
        const hasVaapi = output.includes('--enable-vaapi');
        const hasVideoToolbox = output.includes('--enable-videotoolbox');
        const hasQsv = output.includes('--enable-libmfx');
        
        console.log(`   Version: ${version}`);
        console.log(`   Hardware Acceleration:`);
        console.log(`     NVENC (NVIDIA): ${hasNvenc ? '✅' : '❌'}`);
        console.log(`     VAAPI (Intel/AMD): ${hasVaapi ? '✅' : '❌'}`);
        console.log(`     VideoToolbox (macOS): ${hasVideoToolbox ? '✅' : '❌'}`);
        console.log(`     Quick Sync (Intel): ${hasQsv ? '✅' : '❌'}`);
        
        // Check for important codecs
        const hasX264 = output.includes('--enable-libx264');
        const hasX265 = output.includes('--enable-libx265');
        const hasVpx = output.includes('--enable-libvpx');
        
        console.log(`   Codecs:`);
        console.log(`     H.264 (libx264): ${hasX264 ? '✅' : '❌'}`);
        console.log(`     H.265 (libx265): ${hasX265 ? '✅' : '❌'}`);
        console.log(`     VP8/VP9 (libvpx): ${hasVpx ? '✅' : '❌'}`);
        
        resolve();
      });
    });
  }

  /**
   * Test basic transcoding functionality
   */
  async testTranscoding() {
    console.log('\n🧪 Testing basic transcoding functionality...');
    
    return new Promise((resolve) => {
      // Create a simple test: generate a 1-second test video
      const args = [
        '-f', 'lavfi',
        '-i', 'testsrc=duration=1:size=320x240:rate=1',
        '-f', 'null',
        '-'
      ];
      
      const process = spawn(this.ffmpegPath, args);
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Basic transcoding test passed');
        } else {
          console.log('❌ Basic transcoding test failed');
        }
        resolve(code === 0);
      });
      
      process.on('error', (error) => {
        console.log('❌ Transcoding test error:', error.message);
        resolve(false);
      });
    });
  }

  /**
   * Provide installation instructions based on platform
   */
  provideInstallationInstructions() {
    console.log('\n📋 FFmpeg Installation Instructions:\n');
    
    switch (this.platform) {
      case 'linux':
        this.provideLinuxInstructions();
        break;
      case 'darwin':
        this.provideMacOSInstructions();
        break;
      case 'win32':
        this.provideWindowsInstructions();
        break;
      default:
        this.provideGenericInstructions();
    }
    
    console.log('\n💡 After installation:');
    console.log('1. Restart your terminal/command prompt');
    console.log('2. Run this script again to verify installation');
    console.log('3. Update your .env file if FFmpeg is installed in a custom location');
  }

  /**
   * Linux installation instructions
   */
  provideLinuxInstructions() {
    console.log('🐧 Linux Installation:');
    console.log('');
    console.log('Ubuntu/Debian:');
    console.log('  sudo apt update');
    console.log('  sudo apt install ffmpeg');
    console.log('');
    console.log('CentOS/RHEL/Fedora:');
    console.log('  # Enable RPM Fusion repository first');
    console.log('  sudo dnf install ffmpeg');
    console.log('  # or for older versions:');
    console.log('  sudo yum install ffmpeg');
    console.log('');
    console.log('Arch Linux:');
    console.log('  sudo pacman -S ffmpeg');
    console.log('');
    console.log('For hardware acceleration support:');
    console.log('  sudo apt install intel-media-va-driver-non-free  # Intel');
    console.log('  sudo apt install mesa-va-drivers  # AMD');
  }

  /**
   * macOS installation instructions
   */
  provideMacOSInstructions() {
    console.log('🍎 macOS Installation:');
    console.log('');
    console.log('Using Homebrew (recommended):');
    console.log('  brew install ffmpeg');
    console.log('');
    console.log('For additional codec support:');
    console.log('  brew install ffmpeg --with-libvpx --with-libvorbis --with-fdk-aac');
    console.log('');
    console.log('Using MacPorts:');
    console.log('  sudo port install ffmpeg');
    console.log('');
    console.log('Manual installation:');
    console.log('  1. Download from https://ffmpeg.org/download.html');
    console.log('  2. Extract and add to PATH');
  }

  /**
   * Windows installation instructions
   */
  provideWindowsInstructions() {
    console.log('🪟 Windows Installation:');
    console.log('');
    console.log('Using Chocolatey (recommended):');
    console.log('  choco install ffmpeg');
    console.log('');
    console.log('Using Scoop:');
    console.log('  scoop install ffmpeg');
    console.log('');
    console.log('Manual installation:');
    console.log('  1. Download from https://ffmpeg.org/download.html#build-windows');
    console.log('  2. Extract to C:\\ffmpeg');
    console.log('  3. Add C:\\ffmpeg\\bin to your PATH environment variable');
    console.log('');
    console.log('Using Windows Package Manager:');
    console.log('  winget install ffmpeg');
  }

  /**
   * Generic installation instructions
   */
  provideGenericInstructions() {
    console.log('📦 Generic Installation:');
    console.log('');
    console.log('1. Visit https://ffmpeg.org/download.html');
    console.log('2. Download the appropriate build for your system');
    console.log('3. Extract and add to your system PATH');
    console.log('4. Verify installation with: ffmpeg -version');
  }

  /**
   * Check system requirements
   */
  checkSystemRequirements() {
    console.log('\n🔧 System Requirements Check:');
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    
    console.log(`   OS: ${os.type()} ${os.release()}`);
    console.log(`   Architecture: ${os.arch()}`);
    console.log(`   CPUs: ${cpus.length} cores`);
    console.log(`   Total Memory: ${Math.round(totalMem / 1024 / 1024 / 1024)}GB`);
    console.log(`   Free Memory: ${Math.round(freeMem / 1024 / 1024 / 1024)}GB`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (totalMem < 2 * 1024 * 1024 * 1024) {
      console.log('   ⚠️  Consider upgrading RAM for better transcoding performance');
    }
    if (cpus.length < 4) {
      console.log('   ⚠️  More CPU cores will improve transcoding speed');
    }
    console.log('   ✅ For best performance, use hardware acceleration when available');
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  const setup = new FFmpegSetup();
  
  setup.checkSystemRequirements();
  
  setup.setup()
    .then((success) => {
      if (success) {
        console.log('\n🎉 FFmpeg setup completed successfully!');
        console.log('Your system is ready for enhanced video streaming.');
        process.exit(0);
      } else {
        console.log('\n❌ FFmpeg setup incomplete.');
        console.log('Please follow the installation instructions above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = FFmpegSetup;
