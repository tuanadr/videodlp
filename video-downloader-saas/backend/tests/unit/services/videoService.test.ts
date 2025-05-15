import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import VideoService from '../../../services/videoService';
import Video from '../../../models/Video';
import User from '../../../models/User';
import { IVideo } from '../../../types';

// Mock dependencies
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../services/ytdlpService', () => ({
  getVideoInfo: jest.fn().mockResolvedValue({
    id: 'test-video-id',
    title: 'Test Video',
    formats: [
      { formatId: '18', formatNote: '360p', ext: 'mp4' },
      { formatId: '22', formatNote: '720p', ext: 'mp4' },
    ],
  }),
  downloadVideo: jest.fn().mockResolvedValue({
    status: 'completed',
    downloadPath: '/path/to/video.mp4',
    fileSize: 1024,
    fileType: 'mp4',
  }),
}));

describe('VideoService', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;

  beforeAll(async () => {
    // Set up MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
      subscription: 'premium',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear videos collection before each test
    await Video.deleteMany({});
  });

  describe('getVideoInfo', () => {
    it('should return video info for a valid URL', async () => {
      const url = 'https://www.youtube.com/watch?v=test123';
      const userId = testUser._id.toString();
      const subscription = 'premium';

      const result = await VideoService.getVideoInfo(url, userId, subscription);

      expect(result).toHaveProperty('id', 'test-video-id');
      expect(result).toHaveProperty('title', 'Test Video');
      expect(result.formats).toHaveLength(2);
    });

    it('should throw an error for invalid URL', async () => {
      const url = 'invalid-url';
      const userId = testUser._id.toString();
      const subscription = 'premium';

      await expect(VideoService.getVideoInfo(url, userId, subscription))
        .rejects
        .toThrow('Invalid URL format');
    });
  });

  describe('createVideo', () => {
    it('should create a new video record', async () => {
      const videoData = {
        url: 'https://www.youtube.com/watch?v=test123',
        title: 'Test Video',
        formatId: '22',
        user: testUser._id.toString(),
      };

      const result = await VideoService.createVideo(videoData);

      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('url', videoData.url);
      expect(result).toHaveProperty('title', videoData.title);
      expect(result).toHaveProperty('formatId', videoData.formatId);
      expect(result).toHaveProperty('status', 'pending');

      // Verify it was saved to the database
      const savedVideo = await Video.findById(result._id);
      expect(savedVideo).not.toBeNull();
    });
  });

  describe('getUserVideos', () => {
    it('should return videos for a specific user', async () => {
      // Create test videos
      await Video.create([
        {
          url: 'https://www.youtube.com/watch?v=test1',
          title: 'Test Video 1',
          formatId: '18',
          status: 'completed',
          user: testUser._id,
        },
        {
          url: 'https://www.youtube.com/watch?v=test2',
          title: 'Test Video 2',
          formatId: '22',
          status: 'completed',
          user: testUser._id,
        },
        {
          url: 'https://www.youtube.com/watch?v=test3',
          title: 'Test Video 3',
          formatId: '18',
          status: 'completed',
          user: new mongoose.Types.ObjectId(), // Different user
        },
      ]);

      const result = await VideoService.getUserVideos(testUser._id.toString());

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('title', 'Test Video 1');
      expect(result[1]).toHaveProperty('title', 'Test Video 2');
    });
  });
});