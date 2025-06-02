import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const SupportedSitesContext = createContext();

export const useSupportedSites = () => useContext(SupportedSitesContext);

export const SupportedSitesProvider = ({ children }) => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get('/api/videos/supported-sites');
        setSites(res.data.data || []); // Đảm bảo sites luôn là một mảng
      } catch (err) {
        console.error('Lỗi khi lấy danh sách trang web được hỗ trợ cho context:', err);
        setError('Không thể lấy danh sách trang web được hỗ trợ.');
        setSites([]); // Đặt lại sites thành mảng rỗng khi có lỗi
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  return (
    <SupportedSitesContext.Provider value={{ sites, loading, error }}>
      {children}
    </SupportedSitesContext.Provider>
  );
};

export default SupportedSitesContext;
