// Định nghĩa các kiểu dữ liệu chung cho ứng dụng

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'basic' | 'premium' | null;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  url: string;
  title: string;
  formatId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadPath?: string;
  fileSize?: number;
  fileType?: string;
  thumbnailUrl?: string;
  user?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: 'free' | 'basic' | 'premium';
  price: number;
  features: string[];
  downloadLimit: number;
  qualityOptions: string[];
  storageLimit: number;
  active: boolean;
}

export interface VideoFormat {
  formatId: string;
  formatNote: string;
  ext: string;
  resolution?: string;
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploadDate: string;
  uploader: string;
  channel: string;
  formats: VideoFormat[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  videoInfo: VideoInfo | null;
  loading: boolean;
  error: string | null;
}

export interface SubscriptionState {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  video: VideoState;
  subscription: SubscriptionState;
}