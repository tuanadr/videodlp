import { Document } from 'mongoose';

// Định nghĩa các kiểu dữ liệu chung cho API

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'basic' | 'premium' | null;
  subscriptionId?: string;
  subscriptionEnd?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(enteredPassword: string): Promise<boolean>;
  getSignedJwtToken(): string;
  getResetPasswordToken(): string;
}

export interface IVideo extends Document {
  url: string;
  title: string;
  formatId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadPath?: string;
  fileSize?: number;
  fileType?: string;
  thumbnailUrl?: string;
  user?: string | IUser;
  isAnonymous: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription extends Document {
  name: 'free' | 'basic' | 'premium';
  price: number;
  features: string[];
  downloadLimit: number;
  qualityOptions: string[];
  storageLimit: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettings extends Document {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  allowAnonymousDownloads: boolean;
  anonymousDownloadLimit: number;
  defaultSubscription: string;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVideoFormat {
  formatId: string;
  formatNote: string;
  ext: string;
  resolution?: string;
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface IVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploadDate: string;
  uploader: string;
  channel: string;
  formats: IVideoFormat[];
}

export interface IDownloadJob {
  videoId: string;
  url: string;
  formatId: string;
  title: string;
  user?: string;
}

export interface IDownloadResult {
  videoId: string;
  status: 'completed' | 'failed';
  downloadPath?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IDecodedToken {
  id: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'basic' | 'premium' | null;
  iat: number;
  exp: number;
}

export interface IRequestWithUser extends Request {
  user?: IDecodedToken;
}