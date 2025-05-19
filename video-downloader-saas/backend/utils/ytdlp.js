const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const NodeCache = require('node-cache');
const { 
  processPreMergedVideoFormats,
  processVideoOnlyAndSyntheticFormats,
  processAudioOnlyFormats
} = require('./ytdlpHelper_VideoFormats');

// Cache cho kết quả getVideoInfo, cache trong 5 phút
const videoInfoCache = new NodeCache({ stdTTL: 300 });

// Thêm hàm helper để log
const logDebug = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [YTDLP] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

/**
 * Lấy thông tin video từ URL
 * @param {string} url - URL của video
 * @returns {Promise} - Promise chứa thông tin video
 */
exports.getVideoInfo = (url) => {
  return new Promise((resolve, reject) => {
    // Sửa URL TikTok không chính xác
    let correctedUrl = url;
    if (url.includes('tiktiktok.com')) {
      correctedUrl = url.replace('tiktiktok.com', 'tiktok.com');
      console.log(`[YTDLP] Corrected TikTok URL from ${url} to ${correctedUrl}`);
    }
    
    logDebug(`[getVideoInfo] Start for URL: ${correctedUrl}`);

    // Kiểm tra cache trước
    const cachedInfo = videoInfoCache.get(correctedUrl);
    if (cachedInfo) {
      logDebug(`[getVideoInfo] Cache hit for URL: ${correctedUrl}`);
      return Promise.resolve(JSON.parse(JSON.stringify(cachedInfo))); // Trả về bản copy để tránh thay đổi cache
    }
    logDebug(`[getVideoInfo] Cache miss for URL: ${correctedUrl}`);
    
    const args = [
      correctedUrl,
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      '--no-warnings', // Giảm output không cần thiết
      '--ignore-config', // Bỏ qua file config nếu có
      '--no-colors' // Tắt màu trong output
    ];

    logDebug(`Command: yt-dlp ${args.join(' ')}`);
    
    const ytDlp = spawn('yt-dlp', args);
    
    let output = '';
    let errorOutput = '';

    ytDlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logDebug(`stderr: ${data.toString()}`);
    });

    ytDlp.on('close', (code) => {
      logDebug(`[getVideoInfo] yt-dlp process closed with code ${code} for URL: ${correctedUrl}`);
      if (code !== 0) {
        const errorMessage = `yt-dlp exited with code ${code} for getVideoInfo. URL: ${correctedUrl}. Stderr: ${errorOutput}`;
        console.error(`[YTDLP_ERROR] ${errorMessage}`);
        logDebug(`[getVideoInfo] Error details`, { error: errorOutput });
        return reject(new Error(errorMessage));
      }

      try {
        const videoInfo = JSON.parse(output);
        logDebug('[getVideoInfo] Raw video info received', { id: videoInfo.id, title: videoInfo.title, url: correctedUrl });
        
        // Lọc và định dạng lại thông tin video
        const formattedInfo = {
          id: videoInfo.id,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration_string || formatDuration(videoInfo.duration),
          formats: []
        };

        // Tạo danh sách các lựa chọn chất lượng đơn giản
        const qualityOptions = [];
        const audioOptions = [];
        
        // Tập hợp các độ phân giải có sẵn
        const availableResolutions = new Set();
        
        // Lọc và phân loại các định dạng
        if (videoInfo.formats && Array.isArray(videoInfo.formats)) {
          const allFormats = videoInfo.formats;
          logDebug(`Total formats found: ${allFormats.length}`);
          // console.log(`[YTDLP] Raw formats from yt-dlp:`, JSON.stringify(allFormats.slice(0, 5), null, 2));

          const videoAudioFormats = allFormats.filter(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none');
          const videoOnlyFormats = allFormats.filter(f => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none'));
          const audioOnlyFormats = allFormats.filter(f => (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none');
          
          // console.log(`[YTDLP] Format counts: Video+Audio: ${videoAudioFormats.length}, Video-Only: ${videoOnlyFormats.length}, Audio-Only: ${audioOnlyFormats.length}`);

          // Xử lý các định dạng video có sẵn âm thanh
          processPreMergedVideoFormats(videoAudioFormats, qualityOptions, availableResolutions, videoInfo.duration);

          // Xử lý các định dạng video chỉ có hình (cần ghép với audio)
          // và thêm các lựa chọn cho độ phân giải chưa có
          processVideoOnlyAndSyntheticFormats(allFormats, qualityOptions, availableResolutions, videoInfo.duration);
          
          // Sắp xếp các lựa chọn chất lượng video theo độ phân giải giảm dần
          qualityOptions.sort((a, b) => (b.height || 0) - (a.height || 0));
          
          // Xử lý các định dạng chỉ âm thanh
          processAudioOnlyFormats(audioOnlyFormats, audioOptions);
        }
        
        // Kết hợp tất cả các lựa chọn
        formattedInfo.formats = [...qualityOptions, ...audioOptions];
        
        // Thêm thông tin về các loại định dạng (để tương thích với code cũ)
        formattedInfo.formatGroups = {
          videoAudio: {
            title: 'Video có tiếng',
            formats: qualityOptions
          },
          videoOnly: {
            title: 'Chỉ video',
            formats: [] // Không còn sử dụng
          },
          audioOnly: {
            title: 'Chỉ âm thanh',
            formats: audioOptions
          }
        };

        logDebug('[getVideoInfo] Simplified video info', {
          title: formattedInfo.title,
          url: correctedUrl,
          formatCounts: {
            videoAudio: qualityOptions.length,
            audioOnly: audioOptions.length,
            total: formattedInfo.formats.length
          },
          availableResolutions: Array.from(availableResolutions).filter(resolution => resolution >= 480).sort((a, b) => b - a)
        });

        // Lưu vào cache
        videoInfoCache.set(correctedUrl, formattedInfo);
        logDebug(`[getVideoInfo] Success for URL: ${correctedUrl}`);
        resolve(formattedInfo);
      } catch (error) {
        const parseErrorMessage = `Failed to parse video info for URL: ${correctedUrl}. Error: ${error.message}`;
        console.error(`[YTDLP_ERROR] ${parseErrorMessage}`);
        logDebug('[getVideoInfo] Parse error details', { error: error.message, output: output.substring(0, 500), url: correctedUrl });
        reject(new Error(parseErrorMessage));
      }
    });
  });
};

/**
 * Tải video từ URL với định dạng đã chọn
 * @param {string} url - URL của video
 * @param {string} formatId - ID định dạng video
 * @param {string} outputDir - Thư mục đầu ra
 * @returns {Promise} - Promise chứa đường dẫn đến file đã tải
 */
exports.downloadVideo = (url, formatId, outputDir, qualityKey = null) => {
  return new Promise((resolve, reject) => {
    // Sửa URL TikTok không chính xác
    let correctedUrl = url;
    if (url.includes('tiktiktok.com')) {
      correctedUrl = url.replace('tiktiktok.com', 'tiktok.com');
      // console.log(`[YTDLP] Corrected TikTok URL from ${url} to ${correctedUrl}`); // Already logged by logDebug
    }
    
    logDebug(`[downloadVideo] Start for URL: ${correctedUrl}`, { formatId, qualityKey, outputDir });
    
    // Tạo tên file duy nhất
    const uniqueId = Date.now();
    const outputPath = path.join(outputDir, `${uniqueId}.%(ext)s`);
    
    // Xác định các tham số tải xuống dựa trên formatId
    let downloadArgs = [];
    
    // Ưu tiên sử dụng qualityKey nếu có
    const effectiveQuality = qualityKey || formatId;
    console.log(`[YTDLP] Processing download request for quality: ${effectiveQuality}`);
    
    // Kiểm tra xem formatId có phải là một trong các lựa chọn chất lượng đơn giản không
    if (effectiveQuality.match(/^\d+p$/)) {
      // Đây là lựa chọn độ phân giải (ví dụ: 720p, 1080p)
      const resolution = parseInt(effectiveQuality.replace('p', ''));
      logDebug(`Detected resolution-based quality: ${resolution}p`);
      console.log(`[YTDLP] Using resolution-based quality: ${resolution}p`);
      
      // Xây dựng format string chính xác để đảm bảo luôn có video và audio
      // Sử dụng cú pháp đơn giản hơn và đảm bảo luôn có cả video và audio
      // Cải tiến format string để ưu tiên các định dạng có sẵn cả video và audio
      // Thêm "best" vào cuối để đảm bảo luôn có một định dạng hoạt động
      const formatString = `bestvideo[height<=${resolution}]+bestaudio/best[height<=${resolution}]/best`;
      
      downloadArgs = [
        '-f', formatString,
        '--merge-output-format', 'mp4',
        '--remux-video', 'mp4', // Remux video thành MP4 nếu cần
        '--prefer-ffmpeg', // Đảm bảo sử dụng ffmpeg để ghép video và audio
        '--verbose', // Thêm verbose để có thêm thông tin debug
        '--force-overwrites', // Ghi đè file nếu đã tồn tại
        '--keep-video', // Giữ lại file video gốc để đảm bảo có video
        '--no-keep-fragments', // Không giữ lại các fragment
        '--no-part', // Không tạo file .part
        '--embed-metadata', // Nhúng metadata vào file
        '--embed-thumbnail', // Nhúng thumbnail vào file nếu có thể
        '--merge-output-format', 'mp4' // Đảm bảo output là mp4
      ];
      
      console.log(`[YTDLP_DOWNLOAD_COMMAND] Using format string: ${formatString}`);
      console.log(`[YTDLP_DOWNLOAD_COMMAND] Ensuring video and audio are merged with ffmpeg`);
    } else if (effectiveQuality.startsWith('audio_')) {
      // Đây là lựa chọn chỉ âm thanh
      logDebug(`Detected audio-only format: ${effectiveQuality}`);
      console.log(`[YTDLP] Using audio-only format: ${effectiveQuality}`);
      
      // Xác định định dạng âm thanh
      let audioFormat = 'mp3';
      let audioBitrate = '128';
      
      const audioParts = effectiveQuality.split('_');
      if (audioParts.length >= 2) {
        audioFormat = audioParts[1] || 'mp3';
      }
      if (audioParts.length >= 3) {
        audioBitrate = audioParts[2] || '128';
      }
      
      console.log(`[YTDLP] Audio format: ${audioFormat}, bitrate: ${audioBitrate}K`);
      
      // Tải xuống âm thanh chất lượng tốt nhất và chuyển đổi sang định dạng mong muốn
      downloadArgs = [
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', audioFormat,
        '--audio-quality', `${audioBitrate}K`,
        '--no-keep-video', // Đảm bảo không giữ lại file video
        '--force-overwrites' // Ghi đè file nếu đã tồn tại
      ];
      
      // Thêm tham số để đảm bảo không tự động chuyển đổi sang MP4
      if (audioFormat === 'mp3' || audioFormat === 'webm' || audioFormat === 'm4a') {
        downloadArgs.push('--postprocessor-args', `FFmpegExtractAudio:-c:a libmp3lame -q:a 2 -f ${audioFormat}`);
      }
    } else if (effectiveQuality === 'best') {
      // Lựa chọn "Chất lượng tốt nhất có sẵn"
      logDebug('Using best available quality');
      console.log(`[YTDLP] Using best available quality`);
      
      downloadArgs = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4'
      ];
    } else if (effectiveQuality.includes('+') || effectiveQuality.includes('/')) {
      // Đây là format ID phức tạp (có thể là bestvideo+bestaudio hoặc tương tự)
      logDebug(`Using complex format ID: ${effectiveQuality}`);
      console.log(`[YTDLP] Using complex format ID: ${effectiveQuality}`);
      
      downloadArgs = [
        '-f', effectiveQuality,
        '--merge-output-format', 'mp4'
      ];
    } else {
      // Sử dụng format ID cụ thể (tương thích với code cũ)
      logDebug(`Using specific format ID: ${effectiveQuality}`);
      console.log(`[YTDLP] Using specific format ID: ${effectiveQuality}`);
      
      downloadArgs = ['-f', effectiveQuality];
    }
    
    // Thêm các tham số chung
    const args = [
      correctedUrl,
      ...downloadArgs,
      '-o', outputPath,
      '--no-playlist',
      '--print', 'after_move:filepath' // In ra đường dẫn file sau khi hoàn thành
    ];
    
    // Tìm đường dẫn đến ffmpeg
    let ffmpegPath = '';
    try {
      // Thử tìm ffmpeg trong hệ thống
      const whichCommand = process.platform === 'win32' ? 'where' : 'which';
      const ffmpegCheck = require('child_process').execSync(`${whichCommand} ffmpeg`, { encoding: 'utf8' }).trim();
      
      if (ffmpegCheck) {
        ffmpegPath = ffmpegCheck;
        console.log(`[YTDLP_FFMPEG] Found ffmpeg at: ${ffmpegPath}`);
        args.push('--ffmpeg-location', ffmpegPath);
      }
    } catch (error) {
      console.log(`[YTDLP_WARNING] Could not find ffmpeg in PATH: ${error.message}`);
      
      // Thử một số đường dẫn phổ biến
      const commonPaths = [
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg'
      ];
      
      for (const path of commonPaths) {
        if (fs.existsSync(path)) {
          ffmpegPath = path;
          console.log(`[YTDLP_FFMPEG] Found ffmpeg at common path: ${ffmpegPath}`);
          args.push('--ffmpeg-location', ffmpegPath);
          break;
        }
      }
    }
    
    // Nếu không tìm thấy ffmpeg, ghi log cảnh báo
    if (!ffmpegPath) {
      console.log(`[YTDLP_WARNING] ffmpeg not found, video merging may fail`);
    }

    const commandString = `yt-dlp ${args.join(' ')}`;
    logDebug(`Command: ${commandString}`);
    console.log(`[YTDLP_DOWNLOAD_COMMAND] Executing full command: ${commandString}`);
    
    const ytDlp = spawn('yt-dlp', args);
    
    let errorOutput = '';
    let outputFile = '';
    let stdoutData = '';
    let mergedFile = '';

    ytDlp.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      logDebug(`stdout: ${output}`);
      console.log(`[YTDLP_OUTPUT] ${output.trim()}`);
      
      // Tìm đường dẫn file từ --print filepath
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('[')) {
          // Nếu dòng không bắt đầu bằng '[', có thể là đường dẫn file
          console.log(`[YTDLP_FILE_PATH] Potential file path: ${trimmedLine}`);
          if (fs.existsSync(trimmedLine)) {
            printedFilePath = trimmedLine;
            console.log(`[YTDLP_FILE_PATH] Confirmed file path exists: ${printedFilePath}`);
          }
        }
      }
      
      // Tìm tên file đầu ra từ output
      const destinationMatches = output.match(/\[download\] Destination: (.+)/g);
      if (destinationMatches) {
        for (const match of destinationMatches) {
          const filePath = match.replace('[download] Destination: ', '').trim();
          console.log(`[YTDLP_FILE_DETECTION] Detected download destination: ${filePath}`);
          if (fs.existsSync(filePath)) {
            outputFile = filePath;
          }
        }
      }
      
      // Tìm file đầu ra sau khi merge
      const mergeMatches = output.match(/\[Merger\] Merging formats into "(.+)"/g);
      if (mergeMatches) {
        for (const match of mergeMatches) {
          const filePath = match.match(/\[Merger\] Merging formats into "(.+)"/)[1];
          console.log(`[YTDLP_FILE_DETECTION] Detected merged output file: ${filePath}`);
          if (fs.existsSync(filePath)) {
            mergedFile = filePath;
            // Cập nhật outputFile với file đã merge
            outputFile = filePath;
          }
        }
      }
      
      // Tìm thông báo hoàn thành
      if (output.includes('Deleting original file') || output.includes('has already been downloaded')) {
        console.log(`[YTDLP_PROCESS] Download and merge process completed`);
      }
      
      // Tìm thông báo lỗi
      if (output.includes('ERROR:') || output.includes('Error:')) {
        console.log(`[YTDLP_ERROR] Error detected in output: ${output.trim()}`);
      }
      
      // Tìm thông báo về ffmpeg
      if (output.includes('ffmpeg') || output.includes('Merger')) {
        console.log(`[YTDLP_FFMPEG] FFmpeg operation detected: ${output.trim()}`);
      }
    });

    ytDlp.stderr.on('data', (data) => {
      const error = data.toString();
      errorOutput += error;
      logDebug(`stderr: ${error}`);
      console.log(`[YTDLP_ERROR] ${error.trim()}`);
    });

    // Biến để lưu đường dẫn file cuối cùng từ --print filepath
    let printedFilePath = '';
    
    ytDlp.on('close', (code) => {
      logDebug(`[downloadVideo] yt-dlp process closed with code ${code} for URL: ${correctedUrl}`);
      
      if (code !== 0) {
        const errorMessage = `yt-dlp exited with code ${code} for downloadVideo. URL: ${correctedUrl}, Format: ${effectiveQuality}. Stderr: ${errorOutput}`;
        console.error(`[YTDLP_ERROR] ${errorMessage}`);
        logDebug(`[downloadVideo] Error details`, { error: errorOutput, url: correctedUrl, format: effectiveQuality });
        return reject(new Error(errorMessage));
      }

      // Tìm file đầu ra theo thứ tự ưu tiên
      let finalOutputFile = null;
      
      // 1. Ưu tiên sử dụng đường dẫn từ --print filepath
      if (printedFilePath && fs.existsSync(printedFilePath)) {
        console.log(`[YTDLP_FILE_DETECTION] Using file path from --print filepath: ${printedFilePath}`);
        finalOutputFile = printedFilePath;
      }
      // 2. Sử dụng file đã merge nếu có
      else if (mergedFile && fs.existsSync(mergedFile)) {
        console.log(`[YTDLP_FILE_DETECTION] Using merged file: ${mergedFile}`);
        finalOutputFile = mergedFile;
      }
      // 3. Sử dụng file output nếu có
      else if (outputFile && fs.existsSync(outputFile)) {
        console.log(`[YTDLP_FILE_DETECTION] Using output file: ${outputFile}`);
        finalOutputFile = outputFile;
      }
      // 4. Tìm file trong thư mục
      else {
        logDebug(`[downloadVideo] Fallback: Searching for files in directory: ${outputDir}`, { uniqueId: uniqueId.toString() });
        try {
          const files = fs.readdirSync(outputDir);
          logDebug(`[downloadVideo] Files in directory: ${files.join(', ')}`);
          
          // Tìm file mới nhất trong thư mục bắt đầu bằng uniqueId
          const downloadedFiles = files.filter(file => file.startsWith(uniqueId.toString()));
          logDebug(`[downloadVideo] Matching files with uniqueId: ${downloadedFiles.join(', ')}`);
          
          if (downloadedFiles.length > 0) {
            // Lấy thông tin về các file
            const fileInfos = downloadedFiles.map(file => {
              const filePath = path.join(outputDir, file);
              const stats = fs.statSync(filePath);
              return {
                name: file,
                path: filePath,
                mtime: stats.mtime.getTime(),
                size: stats.size,
                ext: path.extname(file).toLowerCase()
              };
            });
            
            // Ưu tiên file MP4
            const mp4Files = fileInfos.filter(file => file.ext === '.mp4');
            if (mp4Files.length > 0) {
              // Sắp xếp theo kích thước giảm dần
              mp4Files.sort((a, b) => b.size - a.size);
              finalOutputFile = mp4Files[0].path;
              console.log(`[YTDLP_FILE_DETECTION] Found MP4 file: ${finalOutputFile} (${formatFileSize(mp4Files[0].size)})`);
            }
            // Nếu không có MP4, tìm file video khác
            else {
              const videoFiles = fileInfos.filter(file =>
                ['.mkv', '.webm', '.avi', '.mov', '.mp4'].includes(file.ext)
              );
              
              if (videoFiles.length > 0) {
                // Sắp xếp theo kích thước giảm dần
                videoFiles.sort((a, b) => b.size - a.size);
                finalOutputFile = videoFiles[0].path;
                console.log(`[YTDLP_FILE_DETECTION] Found video file: ${finalOutputFile} (${formatFileSize(videoFiles[0].size)})`);
              }
              // Nếu không có file video, lấy file lớn nhất
              else {
                fileInfos.sort((a, b) => b.size - a.size);
                finalOutputFile = fileInfos[0].path;
                console.log(`[YTDLP_FILE_DETECTION] No video file found, using largest file: ${finalOutputFile} (${formatFileSize(fileInfos[0].size)})`);
              }
            }
          } else {
            const errNoMatch = `No matching files found in directory ${outputDir} with prefix ${uniqueId}`;
            console.error(`[YTDLP_ERROR] ${errNoMatch}`);
            return reject(new Error(errNoMatch));
          }
        } catch (error) {
          const errReadDir = `Error reading directory ${outputDir}: ${error.message}`;
          console.error(`[YTDLP_ERROR] ${errReadDir}`);
          return reject(new Error(errReadDir));
        }
      }

      // Nếu không tìm thấy file nào
      if (!finalOutputFile) {
        const errNoOutput = `Could not determine output file for URL: ${correctedUrl}, Format: ${effectiveQuality}`;
        console.error(`[YTDLP_ERROR] ${errNoOutput}`);
        return reject(new Error(errNoOutput));
      }

      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(finalOutputFile)) {
        const errFileNotExist = `Final output file does not exist: ${finalOutputFile}`;
        console.error(`[YTDLP_ERROR] ${errFileNotExist}`);
        return reject(new Error(errFileNotExist));
      }

      // Kiểm tra kích thước file và định dạng
      try {
        const stats = fs.statSync(finalOutputFile);
        const fileExt = path.extname(finalOutputFile).toLowerCase();
        
        console.log(`[YTDLP_FILE_INFO] File size: ${formatFileSize(stats.size)} (${stats.size} bytes), Extension: ${fileExt}`);
        
        if (stats.size === 0) {
          const errZeroSize = `Downloaded file ${finalOutputFile} is 0 bytes. Removing.`;
          console.error(`[YTDLP_ERROR] ${errZeroSize}`);
          try {
            fs.unlinkSync(finalOutputFile);
          } catch (e) { console.error(`[YTDLP_ERROR] Failed to remove zero-byte file: ${e.message}`); }
          return reject(new Error(errZeroSize));
        }
        
        // Kiểm tra nếu file không phải là video/audio
        const validVideoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
        const validAudioExts = ['.mp3', '.m4a', '.ogg', '.wav', '.flac'];
        
        if (!validVideoExts.includes(fileExt) && !validAudioExts.includes(fileExt)) {
          console.log(`[YTDLP_WARNING] File has unexpected extension: ${fileExt}`);
          
          // Kiểm tra nội dung file để xác định loại
          try {
            const fileBuffer = Buffer.alloc(4100);
            const fd = fs.openSync(finalOutputFile, 'r');
            fs.readSync(fd, fileBuffer, 0, 4100, 0);
            fs.closeSync(fd);
            
            // Kiểm tra magic numbers cho các định dạng phổ biến
            const fileHeader = fileBuffer.toString('hex', 0, 16);
            console.log(`[YTDLP_FILE_CHECK] File header: ${fileHeader}`);
            
            // Nếu là file MP4 nhưng có phần mở rộng sai
            if (fileHeader.startsWith('00000020667479704') || fileHeader.includes('667479704') || fileHeader.includes('ftyp')) {
              const newPath = finalOutputFile.replace(/\.[^/.]+$/, '') + '.mp4';
              console.log(`[YTDLP_FIX] File appears to be MP4, renaming ${finalOutputFile} to ${newPath}`);
              
              try {
                fs.renameSync(finalOutputFile, newPath);
                finalOutputFile = newPath;
                console.log(`[YTDLP_FIX] Successfully renamed file to ${finalOutputFile}`);
              } catch (renameError) {
                console.log(`[YTDLP_ERROR] Failed to rename file: ${renameError.message}`);
              }
            }
          } catch (fileReadError) {
            console.log(`[YTDLP_ERROR] Error reading file header: ${fileReadError.message}`);
          }
        }
      } catch (error) {
        console.log(`[YTDLP_ERROR] Error checking file stats: ${error.message}`);
      }

      // Thực hiện một kiểm tra cuối cùng để đảm bảo file có phần mở rộng hợp lệ
      const finalExt = path.extname(finalOutputFile).toLowerCase();
      if (finalExt === '.txt' || finalExt === '.part' || finalExt === '.ytdl' || finalExt === '') {
        const newPath = finalOutputFile.replace(/\.[^/.]+$/, '') + '.mp4';
        console.log(`[YTDLP_FIX] Final check: File has invalid extension ${finalExt}, renaming to ${newPath}`);
        
        try {
          fs.renameSync(finalOutputFile, newPath);
          finalOutputFile = newPath;
          console.log(`[YTDLP_FIX] Successfully renamed file to ${finalOutputFile}`);
        } catch (renameError) {
          console.log(`[YTDLP_ERROR] Failed to rename file: ${renameError.message}`);
        }
      }

      console.log(`[YTDLP_SUCCESS] Download completed successfully: ${finalOutputFile}`);
      resolve(finalOutputFile);
    });
    
  });
};

/**
 * Stream video trực tiếp từ URL với định dạng đã chọn
 * @param {string} url - URL của video
 * @param {string} formatId - ID định dạng video
 * @param {string} qualityKey - Khóa chất lượng (tùy chọn)
 * @returns {Promise<ChildProcess>} - Promise chứa child process đang chạy yt-dlp
 */
exports.streamVideoDirectly = (url, formatId, qualityKey = null) => {
  return new Promise((resolve, reject) => {
    // Sửa URL TikTok không chính xác
    let correctedUrl = url;
    if (url.includes('tiktiktok.com')) {
      correctedUrl = url.replace('tiktiktok.com', 'tiktok.com');
      // console.log(`[YTDLP] Corrected TikTok URL from ${url} to ${correctedUrl}`);
    }
    
    logDebug(`[streamVideoDirectly] Start for URL: ${correctedUrl}`, { formatId, qualityKey });
    
    // Xác định các tham số tải xuống dựa trên formatId
    let downloadArgs = [];
    
    // Ưu tiên sử dụng qualityKey nếu có
    const effectiveQuality = qualityKey || formatId;
    console.log(`[YTDLP] Processing stream request for quality: ${effectiveQuality}`);
    
    // Kiểm tra xem formatId có phải là một trong các lựa chọn chất lượng đơn giản không
    if (effectiveQuality.match(/^\d+p$/)) {
      // Đây là lựa chọn độ phân giải (ví dụ: 720p, 1080p)
      const resolution = parseInt(effectiveQuality.replace('p', ''));
      logDebug(`Detected resolution-based quality: ${resolution}p`);
      console.log(`[YTDLP] Using resolution-based quality: ${resolution}p`);
      
      // Sử dụng cách tiếp cận chi tiết hơn với format string
      // Ưu tiên tìm chính xác độ phân giải trước, sau đó mới tìm các độ phân giải thấp hơn
      // Thêm nhiều lựa chọn dự phòng để đảm bảo luôn tìm được định dạng phù hợp
      // Đảm bảo luôn có cả video và audio bằng cách thêm "best" vào cuối
      console.log(`[YTDLP_STREAM_COMMAND] Using more precise format string to get exact resolution: bestvideo[height=${resolution}]+bestaudio/bestvideo[height>=${resolution}][height<=${resolution+48}]+bestaudio/bestvideo[height<=${resolution}]+bestaudio/best[height<=${resolution}]/best`);
      
      // Sử dụng format string đơn giản hơn để tránh các vấn đề với ghép video và audio
      const formatString = `best[height<=${resolution}]/best`;
      
      console.log(`[YTDLP_STREAM_COMMAND] Using simplified format string: ${formatString}`);
      
      downloadArgs = [
        '-f', formatString,
        '--merge-output-format', 'mp4',
        '--no-simulate', // Đảm bảo yt-dlp thực sự tải xuống video
        '--remux-video', 'mp4', // Remux video thành MP4 nếu cần
        '--prefer-ffmpeg', // Đảm bảo sử dụng ffmpeg để ghép video và audio
        '--add-header', 'Accept:*/*', // Thêm header để tránh lỗi khi tải video
        '--ignore-errors', // Bỏ qua lỗi nhỏ
        '--force-overwrites', // Ghi đè file nếu đã tồn tại
        '--no-keep-video', // Không giữ lại file video gốc vì chỉ streaming
        '--no-keep-fragments', // Không giữ lại các fragment
        '-o', '-', // Output to stdout
        '--no-part', // Không tạo file .part
        '--no-playlist', // Không tải playlist
        '--verbose', // Thêm thông tin chi tiết để debug
        '--no-mtime' // Không thay đổi thời gian sửa đổi file
      ];
      
      console.log(`[YTDLP_STREAM_COMMAND] Using simplified format string: ${formatString}`);
      console.log(`[YTDLP_STREAM_COMMAND] Using direct format to avoid merging issues`);
    } else if (effectiveQuality.startsWith('audio_')) {
      // Đây là lựa chọn chỉ âm thanh
      logDebug(`Detected audio-only format: ${effectiveQuality}`);
      console.log(`[YTDLP] Using audio-only format: ${effectiveQuality}`);
      
      // Xác định định dạng âm thanh
      let audioFormat = 'mp3';
      let audioBitrate = '128';
      
      const audioParts = effectiveQuality.split('_');
      if (audioParts.length >= 2) {
        audioFormat = audioParts[1] || 'mp3';
      }
      if (audioParts.length >= 3) {
        audioBitrate = audioParts[2] || '128';
      }
      
      console.log(`[YTDLP] Audio format: ${audioFormat}, bitrate: ${audioBitrate}K`);
      
      // Tải xuống âm thanh chất lượng tốt nhất và chuyển đổi sang định dạng mong muốn
      downloadArgs = [
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', audioFormat,
        '--audio-quality', `${audioBitrate}K`,
        '-o', '-', // Output to stdout
        '--no-playlist' // Không tải playlist
      ];
    } else if (effectiveQuality === 'best') {
      // Lựa chọn "Chất lượng tốt nhất có sẵn"
      logDebug('Using best available quality');
      console.log(`[YTDLP] Using best available quality`);
      
      downloadArgs = [
        '-f', 'best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', '-', // Output to stdout
        '--no-playlist', // Không tải playlist
        '--no-mtime', // Không thay đổi thời gian sửa đổi file
        '--verbose' // Thêm thông tin chi tiết để debug
      ];
    } else if (effectiveQuality.includes('+') || effectiveQuality.includes('/')) {
      // Đây là format ID phức tạp (có thể là bestvideo+bestaudio hoặc tương tự)
      logDebug(`Using complex format ID: ${effectiveQuality}`);
      console.log(`[YTDLP] Using complex format ID: ${effectiveQuality}`);
      
      downloadArgs = [
        '-f', effectiveQuality,
        '--merge-output-format', 'mp4',
        '-o', '-', // Output to stdout
        '--no-playlist', // Không tải playlist
        '--no-mtime', // Không thay đổi thời gian sửa đổi file
        '--verbose' // Thêm thông tin chi tiết để debug
      ];
    } else {
      // Sử dụng format ID cụ thể (tương thích với code cũ)
      logDebug(`Using specific format ID: ${effectiveQuality}`);
      console.log(`[YTDLP] Using specific format ID: ${effectiveQuality}`);
      
      downloadArgs = [
        '-f', effectiveQuality,
        '-o', '-', // Output to stdout
        '--no-playlist', // Không tải playlist
        '--no-mtime', // Không thay đổi thời gian sửa đổi file
        '--verbose' // Thêm thông tin chi tiết để debug
      ];
    }
    
    // Tìm đường dẫn đến ffmpeg
    let ffmpegPath = '';
    try {
      // Thử tìm ffmpeg trong hệ thống
      const whichCommand = process.platform === 'win32' ? 'where' : 'which';
      const ffmpegCheck = require('child_process').execSync(`${whichCommand} ffmpeg`, { encoding: 'utf8' }).trim();
      
      if (ffmpegCheck) {
        ffmpegPath = ffmpegCheck;
        console.log(`[YTDLP_FFMPEG] Found ffmpeg at: ${ffmpegPath}`);
        downloadArgs.push('--ffmpeg-location', ffmpegPath);
      }
    } catch (error) {
      console.log(`[YTDLP_WARNING] Could not find ffmpeg in PATH: ${error.message}`);
      
      // Thử một số đường dẫn phổ biến
      const commonPaths = [
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg'
      ];
      
      for (const path of commonPaths) {
        if (fs.existsSync(path)) {
          ffmpegPath = path;
          console.log(`[YTDLP_FFMPEG] Found ffmpeg at common path: ${ffmpegPath}`);
          downloadArgs.push('--ffmpeg-location', ffmpegPath);
          break;
        }
      }
    }
    
    // Nếu không tìm thấy ffmpeg, ghi log cảnh báo
    if (!ffmpegPath) {
      console.log(`[YTDLP_WARNING] ffmpeg not found, video merging may fail`);
    }

    // Thêm các tham số chung
    const args = [
      correctedUrl,
      ...downloadArgs
    ];
    
    const commandString = `yt-dlp ${args.join(' ')}`;
    logDebug(`Command: ${commandString}`);
    console.log(`[YTDLP_STREAM_COMMAND] Executing full command: ${commandString}`);
    
    // Sử dụng spawn với stdio: 'pipe' để có thể truy cập stdout và stderr
    const ytDlp = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let errorOutput = '';
    
    ytDlp.stderr.on('data', (data) => {
      const error = data.toString();
      errorOutput += error;
      logDebug(`stderr: ${error}`);
      console.log(`[YTDLP_ERROR] ${error.trim()}`);
    });
    
    ytDlp.on('error', (processError) => {
      const errorMessage = `yt-dlp process error for streamVideoDirectly. URL: ${correctedUrl}, Format: ${effectiveQuality}. Error: ${processError.message}`;
      console.error(`[YTDLP_ERROR] ${errorMessage}`);
      logDebug('[streamVideoDirectly] Process error details', { error: processError.message, url: correctedUrl, format: effectiveQuality });
      reject(new Error(errorMessage));
    });
    
    // Trả về child process để controller có thể pipe stdout
    logDebug(`[streamVideoDirectly] Returning yt-dlp process for URL: ${correctedUrl}`);
    resolve(ytDlp);
  });
};

/**
 * Lấy danh sách các trang web được hỗ trợ
 * @returns {Promise} - Promise chứa danh sách các trang web được hỗ trợ
 */
exports.getSupportedSites = () => {
  return new Promise((resolve, reject) => {
    logDebug('[getSupportedSites] Start');
    
    const args = [
      '--list-extractors'
    ];

    const ytDlp = spawn('yt-dlp', args);
    
    let output = '';
    let errorOutput = '';

    ytDlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // logDebug(`stderr: ${data.toString()}`); // Can be very verbose
    });

    ytDlp.on('close', (code) => {
      logDebug(`[getSupportedSites] yt-dlp process closed with code ${code}`);
      if (code !== 0) {
        const errorMessage = `yt-dlp exited with code ${code} for getSupportedSites. Stderr: ${errorOutput}`;
        console.error(`[YTDLP_ERROR] ${errorMessage}`);
        logDebug('[getSupportedSites] Error details', { error: errorOutput });
        return reject(new Error(errorMessage));
      }

      // Xử lý danh sách các trang web
      const sites = output.split('\n')
        .filter(site => site.trim() !== '')
        .map(site => site.trim());

      logDebug(`[getSupportedSites] Found ${sites.length} supported sites. Success.`);
      resolve(sites);
    });
  });
};

/**
 * Liệt kê các phụ đề có sẵn cho video
 * @param {string} url - URL của video
 * @returns {Promise} - Promise chứa danh sách các phụ đề có sẵn
 */
exports.listSubtitles = (url) => {
  return new Promise((resolve, reject) => {
    // Sửa URL TikTok không chính xác
    let correctedUrl = url;
    if (url.includes('tiktiktok.com')) {
      correctedUrl = url.replace('tiktiktok.com', 'tiktok.com');
      // console.log(`[YTDLP] Corrected TikTok URL from ${url} to ${correctedUrl}`);
    }
    
    logDebug(`[listSubtitles] Start for URL: ${correctedUrl}`);
    // console.log(`[YTDLP] Listing subtitles for URL: ${correctedUrl}`); // Redundant with logDebug
    
    const args = [
      correctedUrl,
      '--list-subs',
      '--no-playlist'
    ];

    logDebug(`Command: yt-dlp ${args.join(' ')}`);
    console.log(`[YTDLP] Command: yt-dlp ${args.join(' ')}`);
    
    const ytDlp = spawn('yt-dlp', args);
    
    let output = '';
    let errorOutput = '';

    ytDlp.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.log(`[YTDLP] Subtitle listing stdout: ${dataStr}`);
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logDebug(`stderr: ${data.toString()}`);
      console.log(`[YTDLP] Subtitle listing stderr: ${data.toString()}`);
    });

    ytDlp.on('close', (code) => {
      logDebug(`[listSubtitles] yt-dlp process closed with code ${code} for URL: ${correctedUrl}`);
      if (code !== 0) {
        // Nếu không có phụ đề, yt-dlp có thể trả về mã lỗi nhưng vẫn là trường hợp thành công (không có phụ đề)
        if (output.includes('There are no subtitles') || errorOutput.includes('There are no subtitles') || output.includes('has no subtitles')) {
          logDebug(`[listSubtitles] No subtitles found for URL: ${correctedUrl}`);
          return resolve([]);
        }
        const errorMessage = `yt-dlp exited with code ${code} for listSubtitles. URL: ${correctedUrl}. Stderr: ${errorOutput}`;
        console.error(`[YTDLP_ERROR] ${errorMessage}`);
        logDebug('[listSubtitles] Error details', { error: errorOutput, url: correctedUrl });
        return reject(new Error(errorMessage));
      }

      try {
        // Log toàn bộ output để debug
        console.log(`[YTDLP] Full subtitle listing output:\n${output}`);
        
        // Phân tích kết quả để lấy danh sách phụ đề
        const subtitles = [];
        const lines = output.split('\n');
        
        // Tìm dòng bắt đầu danh sách phụ đề
        let foundSubtitlesSection = false;
        let foundLanguagesSection = false;
        
        for (const line of lines) {
          console.log(`[YTDLP] Processing line: ${line}`);
          
          if (line.includes('Available subtitles')) {
            console.log(`[YTDLP] Found subtitles section`);
            foundSubtitlesSection = true;
            continue;
          }
          
          if (foundSubtitlesSection && line.includes('Language')) {
            console.log(`[YTDLP] Found languages section`);
            foundLanguagesSection = true;
            continue;
          }
          
          if (foundLanguagesSection && line.trim() !== '') {
            console.log(`[YTDLP] Processing subtitle line: ${line}`);
            
            // Phân tích dòng phụ đề
            // Định dạng thường là: "en    English    vtt, ttml, srv3, srv2, srv1"
            const parts = line.trim().split(/\s+/);
            console.log(`[YTDLP] Line parts:`, parts);
            
            if (parts.length >= 2) {
              const langCode = parts[0];
              const langName = parts[1];
              
              // Lấy các định dạng phụ đề (nếu có)
              let formats = [];
              if (parts.length > 2) {
                // Nối các phần còn lại và tách theo dấu phẩy
                const formatString = parts.slice(2).join(' ');
                console.log(`[YTDLP] Format string: ${formatString}`);
                formats = formatString.split(/,\s*/);
              }
              
              console.log(`[YTDLP] Found subtitle: ${langCode} (${langName}) with formats: ${formats.join(', ') || 'srt (default)'}`);
              
              subtitles.push({
                langCode,
                langName,
                formats: formats.length > 0 ? formats : ['srt'] // Mặc định là srt nếu không có định dạng
              });
            }
          }
        }
        
        // Kiểm tra nếu không tìm thấy phụ đề trong output
        if (output.includes('There are no subtitles') || output.includes('has no subtitles') || (!foundSubtitlesSection && subtitles.length === 0)) {
          logDebug(`[listSubtitles] No subtitles found in output for URL: ${correctedUrl}`);
          return resolve([]);
        }
        
        logDebug(`[listSubtitles] Found ${subtitles.length} subtitles for URL: ${correctedUrl}. Success.`);
        resolve(subtitles);
      } catch (error) {
        const parseErrorMessage = `Failed to parse subtitles list for URL: ${correctedUrl}. Error: ${error.message}`;
        console.error(`[YTDLP_ERROR] ${parseErrorMessage}`);
        logDebug('[listSubtitles] Parse error details', { error: error.message, url: correctedUrl });
        reject(new Error(parseErrorMessage));
      }
    });
  });
};

/**
 * Tải một phụ đề cụ thể
 * @param {string} url - URL của video
 * @param {string} lang - Mã ngôn ngữ phụ đề
 * @param {string} format - Định dạng phụ đề (mặc định: srt)
 * @param {string} outputDir - Thư mục đầu ra
 * @param {string} baseFilename - Tên file cơ bản (không bao gồm phần mở rộng)
 * @returns {Promise} - Promise chứa đường dẫn đến file phụ đề đã tải
 */
exports.downloadSingleSubtitle = (url, lang, format = 'srt', outputDir, baseFilename) => {
  return new Promise((resolve, reject) => {
    // Sửa URL TikTok không chính xác
    let correctedUrl = url;
    if (url.includes('tiktiktok.com')) {
      correctedUrl = url.replace('tiktiktok.com', 'tiktok.com');
      // console.log(`[YTDLP] Corrected TikTok URL from ${url} to ${correctedUrl}`);
    }
    
    logDebug(`[downloadSingleSubtitle] Start for URL: ${correctedUrl}`, { lang, format, outputDir, baseFilename });
    
    // Đảm bảo thư mục đầu ra tồn tại
    if (!fs.existsSync(outputDir)) {
      console.log(`[YTDLP] Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Tạo tên file đầu ra
    const outputPath = path.join(outputDir, `${baseFilename}.%(ext)s`);
    console.log(`[YTDLP] Output path template: ${outputPath}`);
    
    const args = [
      correctedUrl,
      '--write-sub',
      '--skip-download',
      '--no-playlist',
      '--sub-lang', lang,
      '--sub-format', format,
      '-o', outputPath
    ];

    const commandString = `yt-dlp ${args.join(' ')}`;
    logDebug(`Command: ${commandString}`);
    console.log(`[YTDLP] Executing command: ${commandString}`);
    
    const ytDlp = spawn('yt-dlp', args);
    
    let output = '';
    let errorOutput = '';
    let subtitleFile = '';

    ytDlp.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      logDebug(`stdout: ${dataStr}`);
      console.log(`[YTDLP] Subtitle download stdout: ${dataStr}`);
      
      // Tìm tên file phụ đề từ output
      const match = dataStr.match(/Writing video subtitles to: (.+)/);
      if (match && match[1]) {
        subtitleFile = match[1];
        logDebug(`Detected subtitle file: ${subtitleFile}`);
        console.log(`[YTDLP] Detected subtitle file: ${subtitleFile}`);
      }
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logDebug(`stderr: ${data.toString()}`);
      console.log(`[YTDLP] Subtitle download stderr: ${data.toString()}`);
    });

    ytDlp.on('close', (code) => {
      logDebug(`[downloadSingleSubtitle] yt-dlp process closed with code ${code} for URL: ${correctedUrl}`);
      
      if (code !== 0) {
        const commonErrorMessages = [
          'Requested format is not available',
          'No subtitles found',
          'no closed captions found' 
        ];
        const isNoSubsError = commonErrorMessages.some(msg => errorOutput.toLowerCase().includes(msg) || output.toLowerCase().includes(msg));

        if (isNoSubsError) {
          const noSubsMessage = `No subtitles available for language ${lang}, format ${format} for URL: ${correctedUrl}`;
          logDebug(`[downloadSingleSubtitle] ${noSubsMessage}`);
          return reject(new Error(noSubsMessage));
        }
        
        const errorMessage = `yt-dlp exited with code ${code} for downloadSingleSubtitle. URL: ${correctedUrl}, Lang: ${lang}. Stderr: ${errorOutput}`;
        console.error(`[YTDLP_ERROR] ${errorMessage}`);
        logDebug('[downloadSingleSubtitle] Error details', { error: errorOutput, url: correctedUrl, lang, format });
        return reject(new Error(errorMessage));
      }

      if (!subtitleFile) {
        logDebug('[downloadSingleSubtitle] Subtitle file not detected from stdout, searching in directory', { outputDir, baseFilename });
        // Tìm file phụ đề trong thư mục
        try {
          const files = fs.readdirSync(outputDir);
          logDebug(`Files in directory: ${files.join(', ')}`);
          console.log(`[YTDLP] Files in directory: ${files.join(', ')}`);
          
          // Tìm file phụ đề mới nhất
          const subtitleFiles = files.filter(file =>
            file.startsWith(baseFilename) &&
            file.includes(`.${lang}.`) &&
            file.endsWith(`.${format}`)
          );
          
          console.log(`[YTDLP] Matching subtitle files: ${subtitleFiles.join(', ')}`);
          
          if (subtitleFiles.length > 0) {
            // Lấy file mới nhất
            subtitleFile = path.join(outputDir, subtitleFiles[0]);
            logDebug(`Found subtitle file: ${subtitleFile}`);
            console.log(`[YTDLP] Found subtitle file: ${subtitleFile}`);
          } else {
            const errNoMatchSub = `No matching subtitle file found in directory ${outputDir} for ${baseFilename}.${lang}.${format}`;
            logDebug(`[downloadSingleSubtitle] ${errNoMatchSub}`);
            return reject(new Error(errNoMatchSub));
          }
        } catch (error) {
          const errReadDirSub = `Error reading directory ${outputDir} for subtitles: ${error.message}`;
          logDebug(`[downloadSingleSubtitle] ${errReadDirSub}`);
          return reject(new Error(errReadDirSub));
        }
      }

      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(subtitleFile)) {
        const errSubFileNotExist = `Subtitle file does not exist: ${subtitleFile}`;
        logDebug(`[downloadSingleSubtitle] ${errSubFileNotExist}`);
        return reject(new Error(errSubFileNotExist));
      }

      // Kiểm tra kích thước file
      try {
        const stats = fs.statSync(subtitleFile);
        logDebug(`[downloadSingleSubtitle] Subtitle file size: ${stats.size} bytes for ${subtitleFile}`);
        
        if (stats.size === 0) {
          const errZeroSizeSub = `Subtitle file ${subtitleFile} is empty. Removing.`;
          logDebug(`[downloadSingleSubtitle] ${errZeroSizeSub}`);
          try {
            fs.unlinkSync(subtitleFile);
          } catch(e) { console.error(`[YTDLP_ERROR] Failed to remove zero-byte subtitle file: ${e.message}`);}
          return reject(new Error(errZeroSizeSub));
        }
      } catch (error) {
        logDebug(`[downloadSingleSubtitle] Error checking subtitle file stats for ${subtitleFile}: ${error.message}`);
        // Không reject ở đây, có thể file vẫn hợp lệ dù không lấy được stats
      }

      logDebug(`[downloadSingleSubtitle] Success: ${subtitleFile}`);
      resolve(subtitleFile);
    });
  });
};

// Các hàm formatDuration và formatFileSize được giữ lại ở cuối file
// vì chúng cũng được sử dụng bởi ytdlpHelper_VideoFormats.js (thông qua bản copy)
// và việc di chuyển chúng vào một file utils chung sẽ tốt hơn trong tương lai.

/**
 * Định dạng thời lượng video
 * @param {number} seconds - Thời lượng tính bằng giây
 * @returns {string} - Thời lượng định dạng HH:MM:SS
 */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
}

/**
 * Định dạng kích thước file
 * @param {number} bytes - Kích thước tính bằng bytes
 * @returns {string} - Kích thước định dạng với đơn vị phù hợp
 */
function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
