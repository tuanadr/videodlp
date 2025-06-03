import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SupportedSitesPage = () => {
  // Static list of supported sites for now (removed dependency on SupportedSitesContext)
  const sites = [
    'YouTube', 'Facebook', 'Instagram', 'TikTok', 'Twitter', 'Vimeo',
    'Dailymotion', 'SoundCloud', 'Twitch', 'Reddit', 'Pinterest',
    'LinkedIn', 'Tumblr', 'Flickr', 'DeviantArt', 'Bandcamp'
  ];
  const loading = false;
  const error = null;

  const [searchTerm, setSearchTerm] = useState('');
  const [groupedSites, setGroupedSites] = useState({});
  const [activeGroup, setActiveGroup] = useState('all');

  useEffect(() => {
    // Dữ liệu sites đã được fetch bởi context, chỉ cần nhóm lại khi sites thay đổi
    if (sites && sites.length > 0) {
      groupSitesByFirstLetter(sites);
    } else if (!loading && sites.length === 0 && !error) { // Handle empty but successful fetch
      setGroupedSites({});
    }
  }, [sites, loading, error]); // Phụ thuộc vào sites, loading, error từ context

  // Nhóm các trang web theo chữ cái đầu tiên
  const groupSitesByFirstLetter = (sitesList) => {
    if (!sitesList) return; // Guard clause
    const groups = {};
    
    sitesList.forEach(site => {
      // Lấy chữ cái đầu tiên và chuyển thành chữ hoa
      const firstLetter = site.charAt(0).toUpperCase();
      
      // Kiểm tra xem chữ cái đầu tiên có phải là chữ cái không
      const isLetter = /[A-Z]/.test(firstLetter);
      
      // Nếu không phải chữ cái, nhóm vào "#"
      const group = isLetter ? firstLetter : '#';
      
      if (!groups[group]) {
        groups[group] = [];
      }
      
      groups[group].push(site);
    });
    
    // Sắp xếp các trang web trong mỗi nhóm
    Object.keys(groups).forEach(group => {
      groups[group].sort();
    });
    
    setGroupedSites(groups);
  };

  // Lọc các trang web theo từ khóa tìm kiếm
  const filteredSites = searchTerm
    ? sites.filter(site => site.toLowerCase().includes(searchTerm.toLowerCase()))
    : sites;

  // Lấy danh sách các nhóm
  const groups = Object.keys(groupedSites).sort((a, b) => {
    // Đặt "#" ở cuối
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  // Lấy các trang web trong nhóm đang chọn
  const sitesInActiveGroup = activeGroup === 'all'
    ? filteredSites
    : filteredSites.filter(site => {
        const firstLetter = site.charAt(0).toUpperCase();
        const isLetter = /[A-Z]/.test(firstLetter);
        const group = isLetter ? firstLetter : '#';
        return group === activeGroup;
      });

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-center">
              <h1 className="text-lg leading-6 font-medium text-gray-900">
                Các trang web được hỗ trợ
              </h1>
              <Link
                to="/dashboard/download"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Tải video
              </Link>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Danh sách các trang web mà dịch vụ của chúng tôi hỗ trợ tải video.
            </p>
          </div>
          
          {/* Tìm kiếm */}
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="max-w-lg">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Tìm kiếm trang web
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Nhập tên trang web..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Hiển thị lỗi */}
          {error && (
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Hiển thị loading */}
          {loading && (
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            </div>
          )}
          
          {/* Hiển thị danh sách trang web */}
          {!loading && !error && (
            <div className="border-t border-gray-200">
              {/* Tabs chữ cái */}
              <div className="px-4 py-3 sm:px-6 overflow-x-auto">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveGroup('all')}
                    className={`px-2 py-1 text-sm font-medium rounded-md ${
                      activeGroup === 'all'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Tất cả
                  </button>
                  
                  {groups.map((group) => (
                    <button
                      key={group}
                      onClick={() => setActiveGroup(group)}
                      className={`px-2 py-1 text-sm font-medium rounded-md ${
                        activeGroup === group
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Danh sách trang web */}
              <div className="px-4 py-5 sm:px-6">
                {sitesInActiveGroup.length === 0 ? (
                  <p className="text-sm text-gray-500">Không tìm thấy trang web nào.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sitesInActiveGroup.map((site) => (
                      <div key={site} className="bg-gray-50 p-3 rounded-md hover:bg-gray-100">
                        <p className="text-sm font-medium text-gray-900">{site}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Thông tin tổng số */}
              <div className="border-t border-gray-200 px-4 py-3 sm:px-6 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Hiển thị {sitesInActiveGroup.length} trang web
                  {searchTerm && ` phù hợp với "${searchTerm}"`}
                  {activeGroup !== 'all' && ` trong nhóm "${activeGroup}"`}
                  {' '}(tổng số: {sites.length})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportedSitesPage;
