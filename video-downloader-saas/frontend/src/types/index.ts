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

// Payment related types
export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  months: number;
  paymentMethod: 'vnpay' | 'momo';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionId?: string;
  orderInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  amount: number;
  months: number;
  orderInfo?: string;
}

export interface PaymentResponse {
  paymentUrl?: string;
  payUrl?: string;
  orderId: string;
  amount: number;
}

// Analytics related types
export interface UserAnalytics {
  totalDownloads: number;
  successfulDownloads: number;
  totalUsageTime: number;
  dailyActivity: DailyActivity[];
  popularSites: PopularSite[];
  recentActivity: RecentActivity[];
}

export interface DailyActivity {
  date: string;
  downloads: number;
  duration: number;
}

export interface PopularSite {
  domain: string;
  count: number;
}

export interface RecentActivity {
  id: string;
  domain: string;
  quality: string;
  createdAt: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalDownloads: number;
  totalRevenue: number;
  conversionRate: number;
  tierDistribution: {
    anonymous: number;
    free: number;
    pro: number;
  };
  dailyActivity: DailyActivity[];
  topVideos: TopVideo[];
  recentActivity: AdminRecentActivity[];
}

export interface TopVideo {
  title: string;
  domain: string;
  downloadCount: number;
}

export interface AdminRecentActivity {
  type: 'download' | 'signup' | 'upgrade';
  userEmail: string;
  createdAt: string;
}

// Tier and limits
export interface TierLimits {
  maxQuality: string;
  dailyDownloads: number;
  concurrentDownloads: number;
  features: string[];
}

// Supported sites
export interface SupportedSite {
  name: string;
  domain: string;
  icon?: string;
  features: string[];
  maxQuality: string;
}

// Pagination
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface AppError {
  type: string;
  message: string;
  statusCode?: number;
  timestamp: string;
}