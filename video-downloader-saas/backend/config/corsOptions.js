// CORS configuration logic
const configureCors = () => {
  return {
    origin: function(origin, callback) {
      const allowedOrigins = ['http://localhost:3000']; // Default allowed origin for local development
      
      if (process.env.FRONTEND_URL) {
        const frontendUrl = process.env.FRONTEND_URL;
        allowedOrigins.push(frontendUrl);
        if (frontendUrl.endsWith('/')) {
          allowedOrigins.push(frontendUrl.slice(0, -1));
        } else {
          allowedOrigins.push(frontendUrl + '/');
        }
      }
      
      // console.log(`[CORS] Request from origin: ${origin}`);
      // console.log(`[CORS] Allowed origins: ${JSON.stringify(allowedOrigins)}`);
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.error(`[CORS] Origin ${origin} not allowed`);
        callback(new Error('CORS not allowed for this origin'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  };
};

module.exports = configureCors;
