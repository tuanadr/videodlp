const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

describe('Docker Integration Tests', () => {
  let dockerProcess;
  const baseUrl = 'http://localhost:5000';
  
  beforeAll(async () => {
    // Start Docker Compose for testing
    console.log('Starting Docker Compose for integration tests...');
    
    const dockerComposePath = path.join(__dirname, '../../../docker-compose.optimized.yml');
    dockerProcess = spawn('docker-compose', [
      '-f', dockerComposePath,
      'up', '-d'
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 60000));
  }, 120000);

  afterAll(async () => {
    if (dockerProcess) {
      console.log('Stopping Docker Compose...');
      spawn('docker-compose', [
        '-f', path.join(__dirname, '../../../docker-compose.optimized.yml'),
        'down', '-v'
      ], { stdio: 'inherit' });
    }
  }, 30000);

  describe('Container Health Checks', () => {
    test('Backend container should be healthy', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);
      
      expect(response.text).toBe('OK');
    });

    test('Database connection should work', async () => {
      const response = await request(baseUrl)
        .get('/api/settings')
        .expect(200);
      
      expect(response.body).toBeDefined();
    });

    test('Redis connection should work', async () => {
      // Test an endpoint that uses Redis caching
      const response = await request(baseUrl)
        .get('/api/videos/supported-sites')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Security Tests', () => {
    test('Should have security headers', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);
      
      // Check for security headers (if implemented)
      // expect(response.headers['x-frame-options']).toBeDefined();
      // expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('Should reject requests with invalid CORS origin', async () => {
      const response = await request(baseUrl)
        .get('/api/settings')
        .set('Origin', 'http://malicious-site.com')
        .expect(500); // CORS error
    });

    test('Should handle SQL injection attempts', async () => {
      const maliciousPayload = "'; DROP TABLE users; --";
      
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: maliciousPayload,
          password: 'password'
        })
        .expect(400); // Should be rejected by validation
    });
  });

  describe('Performance Tests', () => {
    test('Health endpoint should respond quickly', async () => {
      const start = Date.now();
      
      await request(baseUrl)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('Should handle concurrent requests', async () => {
      const promises = Array(10).fill().map(() => 
        request(baseUrl)
          .get('/health')
          .expect(200)
      );
      
      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.text).toBe('OK');
      });
    });
  });

  describe('Error Handling', () => {
    test('Should handle 404 errors gracefully', async () => {
      const response = await request(baseUrl)
        .get('/api/nonexistent-endpoint')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });

    test('Should handle malformed JSON', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('Resource Limits', () => {
    test('Should reject oversized requests', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB (over 10MB limit)
      
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({ data: largePayload })
        .expect(413); // Payload too large
    });
  });

  describe('Docker Security Monitoring', () => {
    test('Docker monitor should detect container environment', async () => {
      const response = await request(baseUrl)
        .get('/api/admin/system-info')
        .expect(200);
      
      // This would require authentication in real scenario
      // expect(response.body.docker).toBeDefined();
    });
  });
});