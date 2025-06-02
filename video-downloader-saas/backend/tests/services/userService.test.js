const UserService = require('../../services/userService');
const { User, RefreshToken, Video } = require('../../models');
const { NotFoundError, ConflictError } = require('../../utils/errorHandler');

// Mock the models
jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  RefreshToken: {
    update: jest.fn()
  },
  Video: {
    count: jest.fn()
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  security: jest.fn()
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.findById(1);

      expect(User.findByPk).toHaveBeenCalledWith(1, {
        include: [],
        attributes: { exclude: ['password'] }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user not found', async () => {
      User.findByPk.mockResolvedValue(null);

      await expect(UserService.findById(999)).rejects.toThrow(NotFoundError);
      await expect(UserService.findById(999)).rejects.toThrow('User not found');
    });

    it('should include videos when requested', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      User.findByPk.mockResolvedValue(mockUser);

      await UserService.findById(1, { includeVideos: true });

      expect(User.findByPk).toHaveBeenCalledWith(1, {
        include: [{
          model: Video,
          as: 'videos',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }],
        attributes: { exclude: ['password'] }
      });
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await UserService.findByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: { exclude: ['password'] }
      });
      expect(result).toEqual(mockUser);
    });

    it('should include password when requested', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword'
      };

      User.findOne.mockResolvedValue(mockUser);

      await UserService.findByEmail('test@example.com', true);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: undefined
      });
    });

    it('should convert email to lowercase', async () => {
      User.findOne.mockResolvedValue(null);

      await UserService.findByEmail('TEST@EXAMPLE.COM');

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: { exclude: ['password'] }
      });
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        ...userData,
        role: 'user',
        subscription: 'free',
        isActive: true,
        toJSON: () => ({ id: 1, name: 'Test User', email: 'test@example.com' })
      };

      User.findOne.mockResolvedValue(null); // No existing user
      User.create.mockResolvedValue(mockUser);

      const result = await UserService.createUser(userData);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: { exclude: ['password'] }
      });
      expect(User.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        subscription: 'free',
        isActive: true
      });
      expect(result).toEqual({ id: 1, name: 'Test User', email: 'test@example.com' });
    });

    it('should throw ConflictError when email already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const existingUser = { id: 1, email: 'test@example.com' };
      User.findOne.mockResolvedValue(existingUser);

      await expect(UserService.createUser(userData)).rejects.toThrow(ConflictError);
      await expect(UserService.createUser(userData)).rejects.toThrow('Email already registered');
    });

    it('should trim name and lowercase email', async () => {
      const userData = {
        name: '  Test User  ',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        toJSON: () => ({ id: 1 })
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      await UserService.createUser(userData);

      expect(User.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        subscription: 'free',
        isActive: true
      });
    });
  });

  describe('checkDownloadLimits', () => {
    it('should allow admin users unlimited downloads', async () => {
      const mockUser = {
        id: 1,
        role: 'admin',
        subscription: 'free'
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.checkDownloadLimits(1);

      expect(result).toEqual({
        canDownload: true,
        reason: 'admin'
      });
    });

    it('should check daily limits for free users', async () => {
      const mockUser = {
        id: 1,
        role: 'user',
        subscription: 'free',
        dailyDownloadCount: 5,
        downloadCount: 10
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.checkDownloadLimits(1);

      expect(result).toEqual({
        canDownload: false,
        reason: 'daily_limit',
        limit: 5,
        current: 5
      });
    });

    it('should check total limits for free users', async () => {
      const mockUser = {
        id: 1,
        role: 'user',
        subscription: 'free',
        dailyDownloadCount: 3,
        downloadCount: 100
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.checkDownloadLimits(1);

      expect(result).toEqual({
        canDownload: false,
        reason: 'total_limit',
        limit: 100,
        current: 100
      });
    });

    it('should allow downloads within limits', async () => {
      const mockUser = {
        id: 1,
        role: 'user',
        subscription: 'free',
        dailyDownloadCount: 2,
        downloadCount: 50
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.checkDownloadLimits(1);

      expect(result).toEqual({
        canDownload: true,
        remaining: {
          daily: 3,
          total: 50
        }
      });
    });

    it('should handle premium user limits', async () => {
      const mockUser = {
        id: 1,
        role: 'user',
        subscription: 'premium',
        dailyDownloadCount: 50,
        downloadCount: 1000
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.checkDownloadLimits(1);

      expect(result).toEqual({
        canDownload: true,
        remaining: {
          daily: 50,
          total: 9000
        }
      });
    });
  });

  describe('incrementDownloadCount', () => {
    it('should increment download count for same day', async () => {
      const today = new Date();
      const mockUser = {
        id: 1,
        downloadCount: 10,
        dailyDownloadCount: 3,
        lastDownloadDate: today,
        update: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.incrementDownloadCount(1);

      expect(mockUser.update).toHaveBeenCalledWith({
        downloadCount: 11,
        dailyDownloadCount: 4,
        lastDownloadDate: expect.any(Date)
      });
      expect(result.downloadCount).toBe(11);
      expect(result.dailyDownloadCount).toBe(4);
    });

    it('should reset daily count for new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const mockUser = {
        id: 1,
        downloadCount: 10,
        dailyDownloadCount: 5,
        lastDownloadDate: yesterday,
        update: jest.fn()
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await UserService.incrementDownloadCount(1);

      expect(mockUser.update).toHaveBeenCalledWith({
        downloadCount: 11,
        dailyDownloadCount: 1,
        lastDownloadDate: expect.any(Date)
      });
      expect(result.downloadCount).toBe(11);
      expect(result.dailyDownloadCount).toBe(1);
    });
  });
});
