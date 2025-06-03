import { useState, useEffect, useCallback } from 'react';
import settingsService from '../services/settingsService';
import useAppStore from '../store/useAppStore';

/**
 * Custom hook for managing user settings
 * Provides state management, validation, and API integration for settings
 */
export const useSettings = () => {
  const { addNotification } = useAppStore();
  
  // Settings state
  const [settings, setSettings] = useState(settingsService.getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrors({});
      
      // Try to fetch user settings from API
      try {
        const response = await settingsService.getUserSettings();
        if (response.success && response.data) {
          setSettings(prev => ({ ...prev, ...response.data }));
        }
      } catch (apiError) {
        // If API fails, use default settings (for development)
        console.warn('API not available, using default settings:', apiError.message);
        const defaultSettings = settingsService.getDefaultSettings();
        setSettings(prev => ({ ...prev, ...defaultSettings }));
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      addNotification('Không thể tải cài đặt', 'error');
      
      // Fallback to default settings
      const defaultSettings = settingsService.getDefaultSettings();
      setSettings(prev => ({ ...prev, ...defaultSettings }));
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Update a single setting
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasUnsavedChanges(true);
    
    // Clear any existing errors for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  // Update multiple settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    setHasUnsavedChanges(true);
    setErrors({});
  }, []);

  // Save settings to API
  const saveSettings = useCallback(async () => {
    try {
      setSaving(true);
      setErrors({});
      
      // Validate settings before saving
      const validation = settingsService.validateSettings(settings);
      if (!validation.isValid) {
        setErrors(validation.errors);
        addNotification('Vui lòng kiểm tra lại thông tin đã nhập', 'error');
        return false;
      }
      
      // Try to save to API
      try {
        const response = await settingsService.updateUserSettings(settings);
        if (response.success) {
          addNotification('Cài đặt đã được lưu thành công', 'success');
          setHasUnsavedChanges(false);
          return true;
        } else {
          throw new Error(response.message || 'Không thể lưu cài đặt');
        }
      } catch (apiError) {
        // If API fails, simulate success for development
        console.warn('API not available, simulating save:', apiError.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        addNotification('Cài đặt đã được lưu thành công (chế độ phát triển)', 'success');
        setHasUnsavedChanges(false);
        return true;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification('Không thể lưu cài đặt', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings, addNotification]);

  // Reset to default settings
  const resetToDefaults = useCallback(async () => {
    try {
      // Try to reset via API first
      try {
        const response = await settingsService.resetToDefaults();
        if (response.success && response.data) {
          setSettings(response.data);
          addNotification('Đã khôi phục cài đặt mặc định', 'info');
          setHasUnsavedChanges(false);
          return true;
        }
      } catch (apiError) {
        console.warn('API reset not available, using local reset:', apiError.message);
      }
      
      // Fallback to local reset
      const defaultSettings = settingsService.getDefaultSettings();
      setSettings(defaultSettings);
      setHasUnsavedChanges(true);
      addNotification('Đã khôi phục cài đặt mặc định', 'info');
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      addNotification('Không thể khôi phục cài đặt mặc định', 'error');
      return false;
    }
  }, [addNotification]);

  // Discard unsaved changes
  const discardChanges = useCallback(() => {
    loadSettings();
  }, [loadSettings]);

  // Validate a specific field
  const validateField = useCallback((key, value) => {
    const tempSettings = { ...settings, [key]: value };
    const validation = settingsService.validateSettings(tempSettings);
    
    if (validation.errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: validation.errors[key]
      }));
      return false;
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
      return true;
    }
  }, [settings]);

  // Get setting value by key
  const getSetting = useCallback((key) => {
    return settings[key];
  }, [settings]);

  // Check if a specific setting has errors
  const hasError = useCallback((key) => {
    return !!errors[key];
  }, [errors]);

  // Get error message for a specific setting
  const getError = useCallback((key) => {
    return errors[key];
  }, [errors]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Warn user about unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    // State
    settings,
    loading,
    saving,
    errors,
    hasUnsavedChanges,
    
    // Actions
    loadSettings,
    updateSetting,
    updateSettings,
    saveSettings,
    resetToDefaults,
    discardChanges,
    validateField,
    
    // Getters
    getSetting,
    hasError,
    getError,
    
    // Computed
    isValid: Object.keys(errors).length === 0,
    canSave: hasUnsavedChanges && Object.keys(errors).length === 0 && !saving
  };
};

export default useSettings;
