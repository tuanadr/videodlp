import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/seo/SEO';

const YouTubeDownloaderPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null); 
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoId, setVideoId] = useState(null);
  const [activeTab, setActiveTab] = useState('videoAudio'); 
  const [currentFormatType, setCurrentFormatType] = useState('video'); 

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setVideoInfo(null);
    setSelectedFormat('');
    setError(null);
    setDownloadStatus(null);
    setVideoId(null);
    setCurrentFormatType('video');
    setActiveTab('videoAudio');
  };

  const handleFetchVideoInfo = async (e) => {
    if (e) e.preventDefault(); 
    if (!url) {
      setError('Vui lòng nhập URL video YouTube.');
      return;
    }
    setLoading(true);
    setError(null);
    setVideoInfo(null); 
    setDownloadStatus(null);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      const config = accessToken ? { headers: { 'Authorization': `Bearer ${accessToken}` } } : {};
      
      const res = await axios.post('/api/videos/info', { url }, config);
      const videoData = res.data.data;
      setVideoInfo(videoData);
      
      if (videoData.formats && videoData.formats.length > 0) {
        const firstVideoFormat = videoData.formats.find(f => f.isAllowed && f.type === 'video') || videoData.formats.find(f => f.type === 'video');
        if (firstVideoFormat) {
          setSelectedFormat(firstVideoFormat.format_id);
          setCurrentFormatType('video');
          setActiveTab('videoAudio');
        } else {
           const firstAudioFormat = videoData.formats.find(f => f.isAllowed && f.type === 'audio') || videoData.formats.find(f => f.type === 'audio');
           if (firstAudioFormat) {
            setSelectedFormat(firstAudioFormat.format_id);
            setCurrentFormatType('audio');
            setActiveTab('audioOnly');
           } else {
             const firstFormatOverall = videoData.formats[0];
             if (firstFormatOverall) {
                setSelectedFormat(firstFormatOverall.format_id);
                setCurrentFormatType(firstFormatOverall.type || 'video');
                setActiveTab(firstFormatOverall.type === 'audio' ? 'audioOnly' : 'videoAudio');
             }
           }
        }
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin video YouTube:', err);
      setError(err.response?.data?.message || 'Không thể lấy thông tin video. Vui lòng kiểm tra URL và thử lại.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async () => {
    if (!url) {
      setError('Vui lòng nhập URL video YouTube.');
      return;
    }
    if (!selectedFormat) {
      setError('Vui lòng chọn định dạng.');
      return;
    }
    const formatToDownload = videoInfo.formats.find(f => f.format_id === selectedFormat);
    if (!formatToDownload.isAllowed) {
        if (!isAuthenticated) {
            setError('Vui lòng đăng nhập để tải định dạng này.');
        } else {
            setError('Định dạng này yêu cầu gói Premium.');
        }
        return;
    }
    setError(null);
    setDownloadStatus('pending');
    setDownloadProgress(0);

    const payload = {
      url: url,
      formatId: selectedFormat,
      title: videoInfo?.title,
      formatType: currentFormatType,
      qualityKey: formatToDownload?.qualityKey || ''
    };

    try {
      const accessToken = localStorage.getItem('accessToken');
      const config = accessToken ? { headers: { 'Authorization': `Bearer ${accessToken}` } } : {};
      const res = await axios.post('/api/videos/download', payload, config);
      const downloadVideoId = res.data.data.videoId;
      setVideoId(downloadVideoId);
      checkDownloadStatus(downloadVideoId);
    } catch (err) {
      console.error('Lỗi khi bắt đầu tải YouTube video:', err);
      setError(err.response?.data?.message || 'Không thể bắt đầu tải video. Vui lòng thử lại.');
      setDownloadStatus('failed');
    }
  };

  const triggerDownload = async (id) => {
    setDownloadStatus('downloading_file');
    setDownloadProgress(0);
    try {
      const downloadUrl = `/api/videos/${id}/download`;
      const selectedFormatObj = videoInfo.formats.find(f => f.format_id === selectedFormat);
      const fileName = `${videoInfo?.title || 'youtube-video'}-${id}.${selectedFormatObj?.ext || (currentFormatType === 'audio' ? 'mp3' : 'mp4')}`;

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          ...(localStorage.getItem('accessToken') && {'Authorization': `Bearer ${localStorage.getItem('accessToken')}`})
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Lỗi máy chủ: ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setDownloadStatus('download_triggered');
      setDownloadProgress(100);
    } catch (fetchError) {
      console.error("Lỗi khi tải file YouTube:", fetchError);
      setError(`Không thể tải file: ${fetchError.message}. Vui lòng thử lại từ Dashboard.`);
      setDownloadStatus('failed');
    }
  };

  const checkDownloadStatus = async (id) => {
    try {
      const res = await axios.get(`/api/videos/${id}/status`);
      const { status, error: errorMessage, progress } = res.data.data;
      
      if (status === 'completed') {
        setDownloadStatus(status);
        setDownloadProgress(100);
        triggerDownload(id);
      } else if (status === 'failed') {
        setDownloadStatus(status);
        setError(errorMessage || 'Tải video thất bại. Vui lòng thử lại.');
      } else {
        setDownloadStatus(status);
        setDownloadProgress(progress || (status === 'processing' ? (downloadProgress < 30 ? 30 : downloadProgress + 10) : (downloadProgress < 5 ? 5: downloadProgress + 5) ) );
        if (downloadProgress < 95 && status !== 'completed' && status !== 'failed') { 
             setTimeout(() => checkDownloadStatus(id), 2000);
        } else if (status !== 'completed' && status !== 'failed') { 
            setTimeout(() => checkDownloadStatus(id), 3000);
        }
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra trạng thái tải xuống YouTube:', err);
      setError('Không thể kiểm tra trạng thái tải xuống. Vui lòng thử lại sau.');
      setDownloadStatus('failed');
    }
  };

  useEffect(() => {
    //
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <SEO
        title="Tải Video YouTube Full HD, 4K Miễn Phí - Nhanh và Dễ Dàng"
        description="Tải video YouTube chất lượng cao Full HD, 4K, 8K miễn phí với công cụ tải video YouTube nhanh chóng và dễ sử dụng của chúng tôi. Hỗ trợ chuyển đổi YouTube sang MP3."
        keywords="tải video youtube, youtube downloader, tải youtube mp3, youtube to mp3, tải video youtube 4k, youtube hd"
        canonicalPath="/tai-video-youtube"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "YouTube Video Downloader",
          "applicationCategory": "MultimediaApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "VND"
          },
          "description": "Công cụ tải video YouTube chất lượng cao miễn phí, hỗ trợ nhiều định dạng và chất lượng.",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "1256"
          }
        }}
      />

      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Công Cụ Tải Video YouTube Online Miễn Phí Tốt Nhất
        </h1>
        <p className="text-lg text-gray-600">
          Tải xuống video yêu thích của bạn từ YouTube một cách nhanh chóng, dễ dàng và hoàn toàn miễn phí.
        </p>
      </header>

      <section className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg mb-12">
        <form onSubmit={handleFetchVideoInfo}>
          <div className="mb-6">
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-1">Link Video YouTube</label>
            <input
              id="youtube-url"
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="Dán link video YouTube của bạn vào đây... (ví dụ: https://www.youtube.com/watch?v=...)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang lấy thông tin...
              </>
            ) : 'Lấy Thông Tin Video'}
          </button>
        </form>
        {error && !loading && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </section>

      {loading && !videoInfo && (
        <div className="text-center py-8">
          {/* Spinner đã có ở nút submit */}
        </div>
      )}

      {videoInfo && (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-xl mt-8">
          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-4 flex justify-center items-start">
              {videoInfo.thumbnail && (
                <img 
                  src={videoInfo.thumbnail} 
                  alt={videoInfo.title} 
                  className="w-full max-w-xs h-auto object-contain rounded-lg shadow-md"
                />
              )}
            </div>
            <div className="md:col-span-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{videoInfo.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Thời lượng: {videoInfo.duration || 'N/A'}</p> 
              {/* videoInfo.duration giờ đã được định dạng từ backend */}
              
              <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => {
                      setActiveTab('videoAudio');
                      setCurrentFormatType('video');
                      const firstVideoFormat = videoInfo.formats.find(f => f.type === 'video' && f.isAllowed) || videoInfo.formats.find(f => f.type === 'video');
                      if (firstVideoFormat) setSelectedFormat(firstVideoFormat.format_id); else setSelectedFormat('');
                      if(!(downloadStatus === 'pending' || downloadStatus === 'processing')){
                        setDownloadStatus(null); setError(null); setDownloadProgress(0);
                      }
                    }}
                    className={`${
                      activeTab === 'videoAudio'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Video + Âm thanh
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('audioOnly');
                      setCurrentFormatType('audio');
                      const firstAudioFormat = videoInfo.formats.find(f => f.type === 'audio' && f.isAllowed) || videoInfo.formats.find(f => f.type === 'audio');
                      if (firstAudioFormat) setSelectedFormat(firstAudioFormat.format_id); else setSelectedFormat('');
                       if(!(downloadStatus === 'pending' || downloadStatus === 'processing')){
                        setDownloadStatus(null); setError(null); setDownloadProgress(0);
                      }
                    }}
                    className={`${
                      activeTab === 'audioOnly'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Chỉ Âm thanh (MP3)
                  </button>
                </nav>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Chọn chất lượng:</h4>
                <div className="space-y-2">
                  {videoInfo.formats?.filter(f => f.type === currentFormatType).map(format => (
                    <div 
                      key={format.format_id} 
                      className={`p-3 rounded-md border flex justify-between items-center transition-all duration-150 ease-in-out
                                  ${selectedFormat === format.format_id && format.isAllowed ? 'border-red-500 bg-red-50 shadow-sm' : 'border-gray-300'} 
                                  ${!format.isAllowed ? 'opacity-50' : 'hover:border-gray-400 cursor-pointer'}`}
                      onClick={() => { 
                        if(format.isAllowed) {
                          setSelectedFormat(format.format_id);
                           if(!(downloadStatus === 'pending' || downloadStatus === 'processing')){
                            setDownloadStatus(null);
                            setError(null);
                            setDownloadProgress(0);
                          }
                        }
                      }}
                    >
                      <div>
                        <span className={`font-medium text-sm ${format.isAllowed ? 'text-gray-800' : 'text-gray-500'}`}>{format.label} ({format.ext})</span>
                        {format.fileSizeApprox && <span className="text-xs text-gray-500 ml-2">~{format.fileSizeApprox}</span>}
                      </div>
                      {!format.isAllowed && (
                        <Link 
                            to={!isAuthenticated ? "/login" : (format.requirement === 'premium' ? "/dashboard/subscription" : "#")} 
                            className="ml-2 text-xs text-white bg-primary-500 hover:bg-primary-600 px-2 py-1 rounded-md"
                            onClick={(e) => { if(format.requirement !== 'premium' && isAuthenticated) e.preventDefault();}}
                        >
                            {!isAuthenticated ? "Đăng nhập" : (format.requirement === 'premium' ? "Nâng cấp" : "Bị khóa")}
                        </Link>
                      )}
                    </div>
                  ))}
                  {videoInfo.formats?.filter(f => f.type === currentFormatType).length === 0 && (
                     <p className="text-sm text-gray-500">Không có định dạng nào khả dụng cho lựa chọn này.</p>
                  )}
                </div>
              </div>

              {selectedFormat && videoInfo.formats.find(f => f.format_id === selectedFormat)?.isAllowed && (
                <div className="mt-5">
                  <button
                    onClick={handleDownload}
                    disabled={downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file'}
                    className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-150
                                ${ (downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file')
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                                }`}
                  >
                    {(downloadStatus === 'pending' || downloadStatus === 'processing') ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý ({downloadProgress.toFixed(0)}%)...
                      </>
                    ) : downloadStatus === 'download_triggered' || downloadStatus === 'completed' ? 
                       'Đã kích hoạt tải xuống!'
                     : downloadStatus === 'downloading_file' ? 
                      'Đang tải file...'
                     : (
                      `Tải ${currentFormatType === 'audio' ? 'Âm Thanh' : 'Video'} Ngay`
                    )}
                  </button>
                  
                  {(downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file') && (
                     <div className="mt-3 text-center text-sm text-gray-600">
                       <p className="mb-1">
                         {downloadStatus === 'downloading_file' ? 'Đang tải file về máy...' : `Đang chuẩn bị tệp của bạn (${downloadProgress.toFixed(0)}%)...`}
                       </p>
                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{width: `${downloadProgress}%`}}></div>
                      </div>
                     </div>
                  )}
                   {downloadStatus === 'failed' && error && (
                    <p className="text-red-600 mt-2 text-center py-2 bg-red-100 rounded-md text-sm">{error}</p>
                  )}
                   {downloadStatus === 'download_triggered' && !error && (
                      <p className="text-green-600 mt-2 text-center py-2 bg-green-50 rounded-md text-sm">Tải xuống đã bắt đầu. Kiểm tra thư mục tải về của bạn!</p>
                   )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Thấy hữu ích? Chia sẻ ngay!</h3>
            <div className="flex justify-center space-x-3">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center">
                Chia sẻ Facebook
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Tôi vừa tìm thấy công cụ tải video YouTube tuyệt vời này!')}`} target="_blank" rel="noopener noreferrer" className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
                Chia sẻ Twitter
              </a>
            </div>
             <p className="mt-4 text-sm text-gray-600">
                Hoặc <Link to="/dashboard/referrals" className="text-primary-600 hover:underline">mời bạn bè</Link> để nhận phần thưởng!
             </p>
          </div>
        </div>
      )}

      <section className="mt-16 prose prose-lg max-w-none mx-auto px-4">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-2">Tại Sao Chọn VidDown Để Tải Video YouTube?</h2>
        <p className="text-gray-700">VidDown là giải pháp toàn diện giúp bạn tải video từ YouTube một cách nhanh chóng, an toàn và hoàn toàn miễn phí. Chúng tôi hỗ trợ nhiều định dạng và chất lượng khác nhau, từ SD đến Full HD, 4K và thậm chí 8K (nếu có). Giao diện thân thiện, dễ sử dụng giúp bạn có được video mong muốn chỉ sau vài cú nhấp chuột.</p>
        <h3 className="text-2xl font-semibold text-gray-700 mt-6 mb-3">Các tính năng nổi bật:</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Tải video YouTube với chất lượng gốc, bao gồm Full HD, 4K, 8K.</li>
            <li>Chuyển đổi video YouTube sang MP3 chất lượng cao.</li>
            <li>Không cần cài đặt phần mềm, hoạt động trực tiếp trên trình duyệt.</li>
            <li>Tốc độ tải nhanh và ổn định.</li>
            <li>Hoàn toàn miễn phí cho các nhu cầu cơ bản.</li>
            <li>Giao diện trực quan, dễ dàng sử dụng trên cả máy tính và điện thoại.</li>
        </ul>

        <h2 className="text-3xl font-semibold text-gray-800 mt-10 mb-6 border-b pb-2">Hướng Dẫn Tải Video YouTube Với VidDown</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-3">
          <li><strong>Bước 1: Sao chép URL Video YouTube</strong><br/>Mở ứng dụng YouTube hoặc truy cập youtube.com trên trình duyệt. Tìm video bạn muốn tải xuống. Nhấp vào nút "Chia sẻ" bên dưới video, sau đó chọn "Sao chép đường liên kết". Hoặc bạn có thể sao chép trực tiếp URL từ thanh địa chỉ của trình duyệt.</li>
          <li><strong>Bước 2: Dán URL vào ô nhập liệu trên VidDown</strong><br/>Quay lại trang web VidDown (trang này), tìm ô nhập liệu có nhãn "Dán link video YouTube của bạn vào đây..." và dán URL bạn vừa sao chép vào đó.</li>
          <li><strong>Bước 3: Nhấn nút "Lấy Thông Tin Video"</strong><br/>Sau khi dán link, nhấn vào nút "Lấy Thông Tin Video". Hệ thống của chúng tôi sẽ phân tích link và tìm các định dạng, chất lượng video có sẵn để tải.</li>
          <li><strong>Bước 4: Chọn chất lượng và tải</strong><br/>Chọn chất lượng video mong muốn. Nếu chất lượng yêu cầu đăng nhập hoặc nâng cấp, bạn sẽ thấy thông báo tương ứng. Nhấn nút "Tải Video Ngay" để bắt đầu.</li>
        </ol>
        
        <h2 className="text-3xl font-semibold text-gray-800 mt-10 mb-6 border-b pb-2">Câu Hỏi Thường Gặp (FAQ) Về Tải Video YouTube</h2>
        <div className="space-y-6 text-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-700">Công cụ tải video YouTube của VidDown có miễn phí không?</h3>
            <p>Có, bạn có thể sử dụng công cụ của chúng tôi để tải video YouTube hoàn toàn miễn phí cho các nhu cầu cơ bản. Chúng tôi cũng cung cấp gói Premium với các tính năng nâng cao như tải hàng loạt, chất lượng cao hơn và không quảng cáo.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">Tôi có thể tải video YouTube ở những chất lượng nào?</h3>
            <p>VidDown hỗ trợ tải video YouTube ở nhiều chất lượng khác nhau, bao gồm SD, HD (720p), Full HD (1080p), 2K, 4K và thậm chí 8K nếu video gốc có sẵn ở chất lượng đó. Người dùng miễn phí có thể bị giới hạn ở một số chất lượng nhất định.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">Làm thế nào để tải video YouTube thành file MP3?</h3>
            <p>Sau khi bạn dán link video YouTube và nhấn "Lấy Thông Tin Video", trong danh sách các định dạng tải xuống sẽ có tùy chọn MP3. Bạn chỉ cần chọn định dạng MP3 và nhấn tải xuống.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">Tải video từ YouTube qua VidDown có an toàn không?</h3>
            <p>Tuyệt đối an toàn. VidDown không yêu cầu cài đặt bất kỳ phần mềm hay tiện ích mở rộng nào. Trang web của chúng tôi được bảo vệ bằng SSL, đảm bảo dữ liệu của bạn được mã hóa. Chúng tôi không lưu trữ video bạn tải hoặc thông tin cá nhân của bạn.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">Có giới hạn nào về số lượng video tôi có thể tải không?</h3>
            <p>Đối với người dùng miễn phí, có thể có giới hạn về số lượng video tải xuống mỗi ngày hoặc giới hạn về tốc độ. Người dùng Premium sẽ không có những giới hạn này. Vui lòng xem chi tiết trên trang <Link to="/subscription" className="text-primary-600 hover:underline">Nâng cấp tài khoản</Link>.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default YouTubeDownloaderPage;
