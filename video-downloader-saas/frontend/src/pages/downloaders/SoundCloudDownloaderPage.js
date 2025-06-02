import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { useAuth } from '../../context/AuthContextV2';
import { useSettings } from '../../context/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';

const SoundCloudDownloaderPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [audioInfo, setAudioInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadId, setDownloadId] = useState(null);
  const [currentFormatType, setCurrentFormatType] = useState('audio');

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setAudioInfo(null);
    setSelectedFormat('');
    setError(null);
    setDownloadStatus(null);
    setDownloadId(null);
  };

  const handleFetchAudioInfo = async (e) => {
    if (e) e.preventDefault();
    if (!url) {
      setError('Vui lòng nhập URL bài hát/playlist SoundCloud.');
      return;
    }
    setLoading(true);
    setError(null);
    setAudioInfo(null);
    setDownloadStatus(null);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      const config = accessToken ? { headers: { 'Authorization': `Bearer ${accessToken}` } } : {};
      const res = await axios.post('/api/videos/info', { url }, config); 
      const audioData = res.data.data;
      setAudioInfo(audioData);
      
      if (audioData.formats && audioData.formats.length > 0) {
        const firstAudioFormat = audioData.formats.find(f => f.isAllowed && f.type === 'audio') || audioData.formats.find(f => f.type === 'audio');
        if (firstAudioFormat) {
          setSelectedFormat(firstAudioFormat.format_id);
        } else {
          const firstFormat = audioData.formats.find(f => f.type === 'audio');
          if (firstFormat) setSelectedFormat(firstFormat.format_id);
        }
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin SoundCloud:', err);
      setError(err.response?.data?.message || 'Không thể lấy thông tin nhạc. Vui lòng kiểm tra URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFormat) {
      setError('Vui lòng chọn định dạng âm thanh.');
      return;
    }
    const formatToDownload = audioInfo.formats.find(f => f.format_id === selectedFormat);
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
      title: audioInfo?.title,
      formatType: currentFormatType,
      qualityKey: formatToDownload?.qualityKey || ''
    };

    try {
      const accessToken = localStorage.getItem('accessToken');
      const config = accessToken ? { headers: { 'Authorization': `Bearer ${accessToken}` } } : {};
      const res = await axios.post('/api/videos/download', payload, config);
      const newDownloadId = res.data.data.videoId;
      setDownloadId(newDownloadId);
      checkDownloadStatus(newDownloadId);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể bắt đầu tải nhạc.');
      setDownloadStatus('failed');
    }
  };

  const triggerDownload = async (id) => {
    setDownloadStatus('downloading_file');
    setDownloadProgress(0);
    try {
      const downloadUrl = `/api/videos/${id}/download`;
      const selectedFormatObj = audioInfo.formats.find(f => f.format_id === selectedFormat);
      const fileName = `${audioInfo?.title || 'soundcloud-audio'}-${id}.${selectedFormatObj?.ext || 'mp3'}`;

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
      console.error("Lỗi khi tải file SoundCloud:", fetchError);
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
        setError(errorMessage || 'Tải nhạc thất bại.');
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
        <title>Tải Nhạc SoundCloud MP3 Chất Lượng Cao Miễn Phí | VidDown</title>
        <meta name="description" content="Download nhạc, bài hát, playlist từ SoundCloud sang MP3 chất lượng cao (128kbps, 320kbps) miễn phí. Công cụ tải nhạc SoundCloud nhanh và dễ sử dụng." />
      </Helmet>

      <header className="text-center mb-12">
        {/* <img src="/path-to-soundcloud-logo.svg" alt="SoundCloud Logo" className="h-12 mx-auto mb-4" /> */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Tải Nhạc SoundCloud MP3 Miễn Phí
        </h1>
        <p className="text-lg text-gray-600">
          Lưu trữ những bản nhạc yêu thích từ SoundCloud dưới dạng MP3 chất lượng cao.
        </p>
      </header>

      <section className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg mb-12">
        <form onSubmit={handleFetchAudioInfo}>
          <div className="mb-6">
            <label htmlFor="soundcloud-url" className="block text-sm font-medium text-gray-700 mb-1">Link SoundCloud</label>
            <input
              id="soundcloud-url"
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="Dán link SoundCloud (bài hát, playlist)... (ví dụ: https://soundcloud.com/artist/track-name)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
               <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang lấy thông tin...
              </>
            ) : 'Lấy Thông Tin Nhạc'}
          </button>
        </form>
        {error && !loading && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </section>

      {loading && !audioInfo && (
        <div className="text-center py-8">
          {/* Spinner đã có ở nút submit */}
        </div>
      )}

      {audioInfo && (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-xl mt-8">
          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-4 flex justify-center items-start">
              {audioInfo.thumbnail && (
                <img 
                  src={audioInfo.thumbnail} 
                  alt={audioInfo.title} 
                  className="w-full max-w-xs h-auto object-contain rounded-lg shadow-md"
                />
              )}
            </div>
            <div className="md:col-span-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{audioInfo.title || 'Âm thanh SoundCloud'}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">Thời lượng: {audioInfo.duration || 'N/A'}</p> 
              {/* audioInfo.duration giờ đã được định dạng từ backend */}
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Chọn chất lượng MP3:</h4>
                <div className="space-y-2">
                  {audioInfo.formats?.filter(f => f.type === 'audio').map(format => (
                    <div 
                      key={format.format_id} 
                      className={`p-3 rounded-md border flex justify-between items-center transition-all duration-150 ease-in-out
                                  ${selectedFormat === format.format_id && format.isAllowed ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-300'} 
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
                        <span className={`font-medium text-sm ${format.isAllowed ? 'text-gray-800' : 'text-gray-500'}`}>{format.label || `Chất lượng ${format.abr || 'Mặc định'}`} ({format.ext})</span>
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
                  {audioInfo.formats?.filter(f => f.type === 'audio').length === 0 && (
                    <p className="text-sm text-gray-500">Không có định dạng MP3 nào khả dụng.</p>
                  )}
                </div>
              </div>

              {selectedFormat && audioInfo.formats.find(f => f.format_id === selectedFormat)?.isAllowed && (
                <div className="mt-5">
                  <button
                    onClick={handleDownload}
                    disabled={downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file'}
                    className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-150
                                ${ (downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file')
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
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
                      'Tải Nhạc Ngay'
                    )}
                  </button>
                  
                  {(downloadStatus === 'pending' || downloadStatus === 'processing' || downloadStatus === 'downloading_file') && (
                     <div className="mt-3 text-center text-sm text-gray-600">
                       <p className="mb-1">
                         {downloadStatus === 'downloading_file' ? 'Đang tải file MP3 về máy...' : `Đang chuẩn bị tệp MP3 của bạn (${downloadProgress.toFixed(0)}%)...`}
                       </p>
                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{width: `${downloadProgress}%`}}></div>
                      </div>
                     </div>
                  )}
                   {downloadStatus === 'failed' && error && (
                    <p className="text-red-600 mt-2 text-center py-2 bg-red-100 rounded-md text-sm">{error}</p>
                  )}
                   {downloadStatus === 'download_triggered' && !error && (
                      <p className="text-green-600 mt-2 text-center py-2 bg-green-50 rounded-md text-sm">Tải xuống MP3 đã bắt đầu. Kiểm tra thư mục tải về của bạn!</p>
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
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Tại Sao Nên Sử Dụng VidDown Để Tải Nhạc SoundCloud?</h2>
        <p>VidDown là công cụ hoàn hảo để bạn tải các bài hát, track và playlist yêu thích từ SoundCloud dưới dạng file MP3 chất lượng cao. Quá trình tải nhanh chóng, đơn giản và không yêu cầu cài đặt.</p>
        
        <h3 className="text-2xl font-semibold text-gray-700 mt-6 mb-4">Các tính năng chính:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Chất lượng MP3 cao:</strong> Hỗ trợ tải nhạc với chất lượng lên đến 320kbps (nếu có sẵn).</li>
          <li><strong>Tải playlist:</strong> Dễ dàng tải toàn bộ playlist SoundCloud.</li>
          <li><strong>Nhanh và tiện lợi:</strong> Giao diện trực quan, dễ sử dụng.</li>
          <li><strong>Hoàn toàn miễn phí:</strong> Cho phép tải chất lượng thấp nhất khi chưa đăng nhập.</li>
        </ul>

        <h2 className="text-3xl font-semibold text-gray-800 mt-10 mb-6">Cách Tải Nhạc Từ SoundCloud Sang MP3</h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li><strong>Bước 1: Sao chép link nhạc SoundCloud</strong><br/>Mở SoundCloud, tìm bài hát hoặc playlist bạn muốn tải. Sao chép URL từ thanh địa chỉ trình duyệt hoặc qua nút "Share".</li>
          <li><strong>Bước 2: Dán link vào VidDown</strong><br/>Truy cập trang tải nhạc SoundCloud của VidDown và dán link đã sao chép vào ô nhập liệu.</li>
          <li><strong>Bước 3: Nhấn "Lấy Thông Tin Nhạc"</strong><br/>Công cụ sẽ phân tích link và hiển thị các tùy chọn tải MP3.</li>
          <li><strong>Bước 4: Chọn chất lượng và tải</strong><br/>Chọn chất lượng MP3 mong muốn. Nếu chất lượng yêu cầu đăng nhập hoặc nâng cấp, bạn sẽ thấy thông báo tương ứng. Nhấn nút "Tải Nhạc Ngay" để bắt đầu.</li>
        </ol>

        <h2 className="text-3xl font-semibold text-gray-800 mt-10 mb-6">FAQ - Tải Nhạc SoundCloud</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium text-gray-700">Chất lượng MP3 tối đa tôi có thể tải là bao nhiêu?</h3>
            <p>Chúng tôi hỗ trợ tải nhạc với chất lượng tốt nhất mà SoundCloud cung cấp, thường là 128kbps hoặc 320kbps cho các tài khoản Go+.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-gray-700">Có thể tải các bản nhạc riêng tư (private tracks) không?</h3>
            <p>Thông thường, bạn chỉ có thể tải các bản nhạc được chia sẻ công khai trên SoundCloud. Các bản nhạc riêng tư có thể không truy cập được.</p>
          </div>
           <div>
            <h3 className="text-xl font-medium text-gray-700">Công cụ này có an toàn không?</h3>
            <p>Có, VidDown an toàn để sử dụng. Chúng tôi không yêu cầu thông tin cá nhân và không lưu trữ các file nhạc bạn tải.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SoundCloudDownloaderPage;
