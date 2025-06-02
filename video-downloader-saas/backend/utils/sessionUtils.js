const crypto = require('crypto');

/**
 * Generate a unique session ID
 * @returns {string} Unique session ID
 */
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Validate session ID format
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} True if valid
 */
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check if it's a valid hex string of 32 characters
  return /^[a-f0-9]{32}$/i.test(sessionId);
}

/**
 * Generate session data with metadata
 * @param {Object} user - User object (optional)
 * @param {string} userAgent - User agent string
 * @param {string} ip - IP address
 * @returns {Object} Session data
 */
function generateSessionData(user = null, userAgent = '', ip = '') {
  const sessionId = generateSessionId();
  
  return {
    sessionId,
    userId: user ? user.id : null,
    userTier: user ? (user.getTier ? user.getTier() : 'anonymous') : 'anonymous',
    userAgent,
    ip,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
}

/**
 * Extract session ID from request
 * @param {Object} req - Express request object
 * @returns {string} Session ID
 */
function extractSessionId(req) {
  // Try to get from headers first
  let sessionId = req.headers['x-session-id'];
  
  // Try to get from query params
  if (!sessionId) {
    sessionId = req.query.sessionId;
  }
  
  // Try to get from body
  if (!sessionId && req.body) {
    sessionId = req.body.sessionId;
  }
  
  // Try to get from Express session
  if (!sessionId && req.session) {
    sessionId = req.session.id || req.sessionID;
  }
  
  // Generate new one if none found
  if (!sessionId || !validateSessionId(sessionId)) {
    sessionId = generateSessionId();
  }
  
  return sessionId;
}

module.exports = {
  generateSessionId,
  validateSessionId,
  generateSessionData,
  extractSessionId
};