import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * Enhanced API Hook with caching, deduplication, and error handling
 */
export const useApi = (url, options = {}) => {
  const {
    method = 'GET',
    data = null,
    dependencies = [],
    enabled = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 1 * 60 * 1000,  // 1 minute
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
    isStale: false
  });

  const abortControllerRef = useRef(null);
  const cacheRef = useRef(new Map());
  const requestsRef = useRef(new Map());

  // Generate cache key
  const getCacheKey = useCallback(() => {
    return `${method}:${url}:${JSON.stringify(data)}`;
  }, [method, url, data]);

  // Check if data is stale
  const isDataStale = useCallback((timestamp) => {
    return Date.now() - timestamp > staleTime;
  }, [staleTime]);

  // Check if cache is expired
  const isCacheExpired = useCallback((timestamp) => {
    return Date.now() - timestamp > cacheTime;
  }, [cacheTime]);

  // Get cached data
  const getCachedData = useCallback(() => {
    const cacheKey = getCacheKey();
    const cached = cacheRef.current.get(cacheKey);
    
    if (!cached) return null;
    
    if (isCacheExpired(cached.timestamp)) {
      cacheRef.current.delete(cacheKey);
      return null;
    }
    
    return {
      ...cached,
      isStale: isDataStale(cached.timestamp)
    };
  }, [getCacheKey, isCacheExpired, isDataStale]);

  // Set cached data
  const setCachedData = useCallback((data) => {
    const cacheKey = getCacheKey();
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, [getCacheKey]);

  // Make API request with retry logic
  const makeRequest = useCallback(async (retryCount = 0) => {
    const cacheKey = getCacheKey();
    
    // Check for ongoing request
    if (requestsRef.current.has(cacheKey)) {
      return requestsRef.current.get(cacheKey);
    }

    // Create abort controller
    abortControllerRef.current = new AbortController();

    const requestPromise = (async () => {
      try {
        const config = {
          method,
          url,
          signal: abortControllerRef.current.signal,
          timeout: 30000, // 30 seconds
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
          config.data = data;
        } else if (data && method.toUpperCase() === 'GET') {
          config.params = data;
        }

        const response = await axios(config);
        
        // Cache successful response
        setCachedData(response.data);
        
        if (onSuccess) {
          onSuccess(response.data);
        }
        
        return response.data;
      } catch (error) {
        // Don't retry on abort or 4xx errors
        if (
          error.name === 'AbortError' ||
          error.code === 'ERR_CANCELED' ||
          (error.response && error.response.status >= 400 && error.response.status < 500)
        ) {
          throw error;
        }

        // Retry on network errors or 5xx errors
        if (retryCount < retry) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return makeRequest(retryCount + 1);
        }

        throw error;
      } finally {
        requestsRef.current.delete(cacheKey);
      }
    })();

    requestsRef.current.set(cacheKey, requestPromise);
    return requestPromise;
  }, [method, url, data, retry, retryDelay, setCachedData, onSuccess, getCacheKey]);

  // Execute request
  const execute = useCallback(async (overrideData = null) => {
    if (!enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Use override data if provided
      const requestData = overrideData !== null ? overrideData : data;
      
      // Check cache first
      const cached = getCachedData();
      if (cached && !cached.isStale) {
        setState({
          data: cached.data,
          loading: false,
          error: null,
          isStale: false
        });
        return cached.data;
      }

      // Make request
      const result = await makeRequest();
      
      setState({
        data: result,
        loading: false,
        error: null,
        isStale: false
      });

      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }, [enabled, data, getCachedData, makeRequest, onError]);

  // Auto-execute on mount and dependency changes
  useEffect(() => {
    if (enabled && method.toUpperCase() === 'GET') {
      execute();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, ...dependencies]);

  // Manual refetch
  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  // Mutate (for POST, PUT, DELETE)
  const mutate = useCallback(async (mutateData = null) => {
    return execute(mutateData);
  }, [execute]);

  // Clear cache
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey();
    cacheRef.current.delete(cacheKey);
  }, [getCacheKey]);

  return {
    ...state,
    execute,
    refetch,
    mutate,
    clearCache
  };
};

/**
 * Hook for GET requests
 */
export const useQuery = (url, options = {}) => {
  return useApi(url, { ...options, method: 'GET' });
};

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export const useMutation = (url, options = {}) => {
  const { method = 'POST', ...restOptions } = options;
  
  return useApi(url, {
    ...restOptions,
    method,
    enabled: false // Don't auto-execute mutations
  });
};

/**
 * Hook for infinite queries (pagination)
 */
export const useInfiniteQuery = (url, options = {}) => {
  const [pages, setPages] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const {
    getNextPageParam = (lastPage, pages) => lastPage.nextPage,
    ...queryOptions
  } = options;

  const query = useQuery(url, {
    ...queryOptions,
    onSuccess: (data) => {
      setPages([data]);
      setHasNextPage(!!getNextPageParam(data, [data]));
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    }
  });

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    setIsFetchingNextPage(true);
    
    try {
      const lastPage = pages[pages.length - 1];
      const nextPageParam = getNextPageParam(lastPage, pages);
      
      if (!nextPageParam) {
        setHasNextPage(false);
        return;
      }

      const nextPageUrl = `${url}?page=${nextPageParam}`;
      const nextPageData = await query.execute();
      
      setPages(prev => [...prev, nextPageData]);
      setHasNextPage(!!getNextPageParam(nextPageData, [...pages, nextPageData]));
    } catch (error) {
      console.error('Error fetching next page:', error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasNextPage, isFetchingNextPage, pages, getNextPageParam, url, query]);

  return {
    ...query,
    pages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  };
};

export default useApi;
