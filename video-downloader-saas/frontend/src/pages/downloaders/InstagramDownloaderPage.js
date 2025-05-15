import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';

const InstagramDownloaderPage = () => {
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
  const [currentFormatType, setCurrentFormatType] = useState('video'); 

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setVideoInfo(null);
    setSelectedFormat('');
    setError(null);
    setDownloadStatus(null);
    setVideoId(null);
  };

  const handleFetchVideoInfo = async (e) => {
    if (e) e.preventDefault();
    if (!url) {
      setError('Vui lòng nhập URL Instagram (video, reel, story, IGTV).');
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
      const contentData = res.data.data;
      setVideoInfo(contentData); 
      
      if (contentData.formats && contentData.formats.length > 0) {
        const firstVideoFormat = contentData.formats.find(f => f.isAllowed && f.type === 'video') || contentData.formats.find(f => f.type === 'video');
        if (firstVideoFormat) {
          setSelectedFormat(firstVideoFormat.format_id);
          setCurrentFormatType('video');
        } else {
           const firstAllowedFormat = contentData.formats.find(f => f.isAllowed) || contentData.formats[0];
           if(firstAllowedFormat) {
            setSelectedFormat(firstAllowedFormat.format_id);
            setCurrentFormatType(firstAllowedFormat.type || 'video'); 
           } else {
             const firstFormat = contentData.formats[0];
             if (firstFormat) setSelectedFormat(firstFormat.format_id);
           }
        }
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin Instagram:', err);
      setError(err.response?.data?.message || 'Không thể lấy thông tin. Instagram có thể yêu cầu đăng nhập hoặc link không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFormat && !videoInfo?.url) { 
      setError('Vui lòng chọn định dạng hoặc nội dung đã sẵn sàng.');
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
      const downloadId = res.data.data.videoId; 
      setVideoId(downloadId);
      checkDownloadStatus(downloadId);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể bắt đầu tải nội dung.');
      setDownloadStatus('failed');
    }
  };

  const triggerDownload = async (id) => {
    setDownloadStatus('downloading_file');
    setDownloadProgress(0);
    try {
      const downloadUrl = `/api/videos/${id}/download`;
      const selectedFormatObj = videoInfo.formats.find(f => f.format_id === selectedFormat);
      const fileName = `${videoInfo?.title || 'instagram-content'}-${id}.${selectedFormatObj?.ext || 'mp4'}`;

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
      console.error("Lỗi khi tải file Instagram:", fetchError);
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
        setError(errorMessage || 'Tải nội dung thất bại.');
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
      setError('Không thể kiểm tra trạng thái tải xuống. Vui lòng thử lại sau.');
      setDownloadStatus('failed');
    }
  };

  useEffect(() => {
    //
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Tải Video, Reels, Story Instagram Miễn Phí | VidDown</title>
        <meta name="description" content="Download video, Reels, IGTV, và Story từ Instagram một cách dễ dàng. Công cụ tải nội dung Instagram miễn phí, chất lượng cao." />
      </Helmet>

      <header className="text-center mb-12">
        {/* <img src="/path-to-instagram-logo.svg" alt="Instagram Logo" className="h-12 mx-auto mb-4" /> */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Tải Video, Reels & Story Instagram
        </h1>
        <p className="text-lg text-gray-600">
          Lưu giữ những khoảnh khắc tuyệt vời từ Instagram với công cụ đa năng của chúng tôi.
        </p>
      </header>

      <section className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg mb-12">
        <form onSubmit={handleFetchVideoInfo}>
          <div className="mb-6">
            <label htmlFor="insta-url" className="block text-sm font-medium text-gray-700 mb-1">Link Instagram</label>
            <input
              id="insta-url"
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="Dán link Instagram (video, reel, story)... (ví dụ: https://www.instagram.com/p/...)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang lấy thông tin...
              </>
            ) : 'Lấy Thông Tin'}
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
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{videoInfo.title || 'Nội dung Instagram'}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Thời lượng: {videoInfo.duration || 'N/A'}</p> 
              {/* videoInfo.duration giờ đã được định dạng từ backend */}
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Chọn chất lượng video:</h4>
                <div className="space-y-2">
                  {videoInfo.formats?.filter(f => f.type === 'video').map(format => (
                    <div 
                      key={format.format_id} 
                      className={`p-3 rounded-md border flex justify-between items-center transition-all duration-150 ease-in-out
                                  ${selectedFormat === format.format_id && format.isAllowed ? 'border-pink-500 bg-pink-50 shadow-sm' : 'border-gray-300'} 
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
                        <span className={`font-medium text-sm ${format.isAllowed ? 'text-gray-800' : 'text-gray-500'}`}>{format.label || `Chất lượng ${format.quality || 'Mặc định'}`} ({format.ext})</span>
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
                  {videoInfo.formats?.filter(f => f.type === 'video').length === 0 && (
                    <p className="text-sm text-gray-500">Không có định dạng video nào khả dụng.</p>
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
                                    : 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 focus:ring-2 focus:ring-offset-2 focus:ring-pink-500'
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
                      'Tải Nội Dung Ngay'
                    )}
                  </button>
                  
                  {(downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file') && (
                     <div className="mt-3 text-center text-sm text-gray-600">
                       <p className="mb-1">
                         {downloadStatus === 'downloading_file' ? 'Đang tải file về máy...' : `Đang chuẩn bị nội dung Instagram (${downloadProgress.toFixed(0)}%)...`}
                       </p>
                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-pink-500 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{width: `${downloadProgress}%`}}></div>
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
               {/* Nút chia sẻ */}
            </div>
         </div>
      )}

      <section className="mt-16 prose prose-lg max-w-none mx-auto px-4">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Tại Sao VidDown Là Lựa Chọn Tốt Để Tải Nội Dung Instagram?</h2>
        <p>VidDown giúp bạn dễ dàng tải video, Reels, IGTV và thậm chí cả Story từ Instagram. Chúng tôi hiểu rằng Instagram có nhiều biện pháp bảo vệ, nhưng công cụ của chúng tôi cố gắng mang lại trải nghiệm tốt nhất có thể.</p>
        
        <h3 className="text-2xl font-semibold text-gray-700 mt-6 mb-4">Điểm nổi bật:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Hỗ trợ nhiều loại nội dung: Video, Reels, Story, IGTV.</li>
          <li>Cố gắng tải với chất lượng tốt nhất.</li>
          <li>Giao diện thân thiện, dễ sử dụng.</li>
          <li><strong>Lưu ý:</strong> Việc tải Story hoặc nội dung từ tài khoản riêng tư có thể yêu cầu đăng nhập hoặc gặp khó khăn do chính sách của Instagram.</li>
        </ul>

        <h2 className="text-3xl font-semibold text-gray-800 mt-10 mb-6">Cách Tải Nội Dung Từ Instagram</h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li><strong>Bước 1: Lấy link nội dung Instagram</strong><br/>Mở Instagram, tìm video, Reel, hoặc Story bạn muốn tải. Nhấn vào biểu tượng ba chấm (...) và chọn "Sao chép liên kết" hoặc "Copy Link".</li>
          <li><strong>Bước 2: Dán link vào VidDown</strong><br/>Truy cập trang tải Instagram của VidDown, dán link bạn vừa sao chép vào ô nhập liệu.</li>
          <li><strong>Bước 3: Nhấn "Lấy Thông Tin"</strong><br/>Hệ thống sẽ cố gắng phân tích link và hiển thị các tùy chọn.</li>
          <li><strong>Bước 4: Tải xuống</strong><br/>Chọn định dạng và chất lượng mong muốn (nếu có nhiều tùy chọn) và nhấn nút "Tải xuống".</li>
        </ol>

        <h2 className="text-3xl font-semibold text-gray-800 mt-10 mb-6">FAQ - Tải Nội Dung Instagram</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium text-gray-700">Tôi có thể tải ảnh từ Instagram không?</h3>
            <p>Công cụ này chủ yếu tập trung vào nội dung video (Video, Reels, Story). Để tải ảnh, bạn có thể cần các công cụ chuyên dụng khác.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-gray-700">Tại sao tôi không tải được Story hoặc video từ tài khoản riêng tư?</h3>
            <p>Instagram có các biện pháp bảo mật nghiêm ngặt. Việc tải nội dung từ tài khoản riêng tư hoặc Story (thường chỉ tồn tại 24 giờ và có thể yêu cầu là bạn bè) rất phức tạp và không phải lúc nào cũng thành công mà không có thông tin đăng nhập.</p>
          </div>
           <div>
            <h3 className="text-xl font-medium text-gray-700">Công cụ có lưu trữ thông tin đăng nhập Instagram của tôi không?</h3>
            <p>Chúng tôi không yêu cầu và không lưu trữ bất kỳ thông tin đăng nhập Instagram nào của bạn.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InstagramDownloaderPage;
