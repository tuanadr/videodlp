// Helper functions for processing video formats in ytdlp.js

// Duplicated from ytdlp.js to avoid circular dependency
// Ideally, these should be in a common utility file if used by many modules.
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

/**
 * Ước tính kích thước file dựa trên bitrate và thời lượng.
 * @param {number} bitrateKbps - Bitrate tính bằng Kbps.
 * @param {number} durationSeconds - Thời lượng tính bằng giây.
 * @returns {number} Kích thước file ước tính bằng bytes.
 */
function estimateFileSizeFromBitrate(bitrateKbps, durationSeconds) {
  if (!bitrateKbps || !durationSeconds) return 0;
  const compressionFactor = 0.7; // Hệ số nén trung bình
  return (bitrateKbps * 1000 * durationSeconds * compressionFactor) / 8;
}

/**
 * Ước tính bitrate dựa trên độ phân giải.
 * @param {number} resolution - Độ phân giải (chiều cao).
 * @returns {number} Bitrate ước tính bằng Kbps.
 */
function estimateBitrateFromResolution(resolution) {
  if (resolution >= 2160) return 15000; // ~15 Mbps cho 4K
  if (resolution >= 1440) return 8000;  // ~8 Mbps cho 2K
  if (resolution >= 1080) return 4000;  // ~4 Mbps cho Full HD
  if (resolution >= 720) return 2000;   // ~2 Mbps cho HD
  if (resolution >= 480) return 1000;   // ~1 Mbps cho SD
  return 700; // Default cho độ phân giải thấp hơn
}

/**
 * Xử lý các định dạng video đã được ghép sẵn (có cả video và audio).
 * @param {Array} videoAudioFormats - Danh sách các định dạng video có audio.
 * @param {Array} qualityOptions - Mảng để thêm các lựa chọn chất lượng.
 * @param {Set} availableResolutions - Set để theo dõi các độ phân giải đã có.
 * @param {number} videoDuration - Thời lượng video tính bằng giây.
 */
function processPreMergedVideoFormats(videoAudioFormats, qualityOptions, availableResolutions, videoDuration) {
  if (!videoAudioFormats || videoAudioFormats.length === 0) return;

  // console.log(`[YTDLP_HELPER] Processing ${videoAudioFormats.length} pre-merged video formats.`);
  const resolutionGroups = {};
  videoAudioFormats.forEach(format => {
    const height = format.height || 0;
    if (!resolutionGroups[height]) {
      resolutionGroups[height] = [];
    }
    resolutionGroups[height].push(format);
  });

  const resolutions = Object.keys(resolutionGroups)
    .map(Number)
    .filter(r => r > 0)
    .sort((a, b) => b - a);

  resolutions.forEach(resolution => {
    const formatsInGroup = resolutionGroups[resolution];
    const bestFormat = formatsInGroup.reduce((best, current) => 
      (!best || (current.tbr || 0) > (best.tbr || 0)) ? current : best, null
    );

    if (bestFormat) {
      availableResolutions.add(resolution);
      let fileSizeApprox = '';
      if (bestFormat.filesize_approx) {
        fileSizeApprox = formatFileSize(bestFormat.filesize_approx);
      } else if (bestFormat.filesize) {
        fileSizeApprox = formatFileSize(bestFormat.filesize);
      } else if (bestFormat.tbr && videoDuration) {
        fileSizeApprox = formatFileSize(estimateFileSizeFromBitrate(bestFormat.tbr, videoDuration));
      } else if (videoDuration) {
        const estimatedBitrate = estimateBitrateFromResolution(resolution);
        fileSizeApprox = formatFileSize(estimateFileSizeFromBitrate(estimatedBitrate, videoDuration));
      } else {
        fileSizeApprox = 'N/A';
      }

      qualityOptions.push({
        label: `${resolution}p${resolution >= 2160 ? ' (4K)' : resolution >= 1440 ? ' (2K)' : resolution >= 1080 ? ' (FHD)' : resolution >= 720 ? ' (HD)' : ''}`,
        qualityKey: `${resolution}p_merged`, // Thêm suffix để phân biệt
        type: 'video',
        format_id: bestFormat.format_id,
        ext: bestFormat.ext || 'mp4',
        height: resolution,
        details: `MP4, Video + Âm thanh (Có sẵn)`,
        isPremium: resolution > 720,
        fileSizeApprox: fileSizeApprox
      });
    }
  });
}

/**
 * Xử lý các định dạng video chỉ có hình ảnh và tạo các lựa chọn "tổng hợp" (ghép với audio).
 * @param {Array} allFormats - Danh sách tất cả các định dạng từ yt-dlp.
 * @param {Array} qualityOptions - Mảng để thêm các lựa chọn chất lượng.
 * @param {Set} availableResolutions - Set để theo dõi các độ phân giải đã có.
 * @param {number} videoDuration - Thời lượng video tính bằng giây.
 */
function processVideoOnlyAndSyntheticFormats(allFormats, qualityOptions, availableResolutions, videoDuration) {
  const uniqueAvailableHeights = [...new Set(
    allFormats
      .filter(f => f.vcodec && f.vcodec !== 'none') 
      .map(format => format.height || 0)
      .filter(height => height > 0)
  )].sort((a, b) => b - a);

  // console.log(`[YTDLP_HELPER] Actually available video resolutions (from all video formats): ${uniqueAvailableHeights.join(', ')}p`);

  uniqueAvailableHeights.filter(resolution => resolution >= 480).forEach(resolution => {
    if (!qualityOptions.some(opt => opt.height === resolution && (opt.qualityKey.endsWith('_merged') || opt.qualityKey.endsWith('_synthetic')))) {
      availableResolutions.add(resolution);
      
      let fileSizeApprox = 'N/A';
      if (videoDuration) {
        const estimatedBitrate = estimateBitrateFromResolution(resolution);
        fileSizeApprox = formatFileSize(estimateFileSizeFromBitrate(estimatedBitrate, videoDuration));
      }

      qualityOptions.push({
        label: `${resolution}p${resolution >= 2160 ? ' (4K)' : resolution >= 1440 ? ' (2K)' : resolution >= 1080 ? ' (FHD)' : resolution >= 720 ? ' (HD)' : ''}`,
        qualityKey: `${resolution}p_synthetic`, 
        type: 'video',
        format_id: `bestvideo[height<=${resolution}]+bestaudio/best[height<=${resolution}]`,
        ext: 'mp4',
        height: resolution,
        details: `MP4, Video + Âm thanh (Tự động ghép)`,
        isPremium: resolution > 720,
        fileSizeApprox: fileSizeApprox
      });
    }
  });
}

/**
 * Xử lý các định dạng chỉ âm thanh.
 * @param {Array} audioOnlyFormats - Danh sách các định dạng chỉ âm thanh.
 * @param {Array} audioOptions - Mảng để thêm các lựa chọn âm thanh.
 */
function processAudioOnlyFormats(audioOnlyFormats, audioOptions) {
  if (audioOnlyFormats && audioOnlyFormats.length > 0) {
    const bestAudioFormat = audioOnlyFormats.reduce((best, current) => 
      (!best || (current.abr || 0) > (best.abr || 0)) ? current : best, null
    );
    
    if (bestAudioFormat) {
      audioOptions.push({
        label: `Âm thanh (${(bestAudioFormat.ext || 'webm').toUpperCase()} - ${bestAudioFormat.abr || 128}kbps)`,
        qualityKey: `audio_${bestAudioFormat.ext || 'webm'}_${bestAudioFormat.abr || 128}`,
        type: 'audio',
        format_id: bestAudioFormat.format_id,
        ext: bestAudioFormat.ext || 'webm',
        details: `${(bestAudioFormat.ext || 'webm').toUpperCase()}, Chỉ âm thanh`,
        isPremium: false,
        fileSizeApprox: bestAudioFormat.filesize ? formatFileSize(bestAudioFormat.filesize) : (bestAudioFormat.filesize_approx ? formatFileSize(bestAudioFormat.filesize_approx) : 'N/A')
      });
    }
  }
  // Luôn thêm lựa chọn MP3
  audioOptions.push({
    label: 'Âm thanh (MP3 - 128kbps)',
    qualityKey: 'audio_mp3_128',
    type: 'audio',
    format_id: 'bestaudio[ext=m4a]/bestaudio', 
    ext: 'mp3', 
    details: `MP3, Chỉ âm thanh (128kbps)`,
    isPremium: false,
    fileSizeApprox: 'N/A' 
  });
}

module.exports = {
  processPreMergedVideoFormats,
  processVideoOnlyAndSyntheticFormats,
  processAudioOnlyFormats,
  formatDuration, // Exporting duplicated functions
  formatFileSize   // Exporting duplicated functions
};
