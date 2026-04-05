import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { testConfig } from '../config/test-config';

const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000', 10);
const RESPONSE_TIME_THRESHOLD = 500; // 500ms as per AC-005
const CONCURRENT_USERS = 100; // As per requirement

describe('Performance Integration Tests', () => {
  let dbManager: DatabaseManager;
  let userTokens: string[] = [];

  beforeAll(async () => {
    dbManager = DatabaseManager.getInstance();
    await setupTestDatabase();
    await createTestUsers();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await cleanupTestDatabase();
    await dbManager.close();
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    await clearTodoData();
  });

  /**
   * AC-005: Test API response times under 500ms
   */
  describe('API Response Time Performance', () => {
    it('should handle user registration under 500ms', async () => {
      const userData = {
        email: 'perf-test@example.com',
        password: 'SecurePass123!'
      };

      const measurements = [];
      for (let i = 0; i < 10; i++) {
        const uniqueUserData = {
          ...userData,
          email: `perf-test-${i}@example.com`
        };

        const networkStart = process.hrtime.bigint();
        const response = await request(app)
          .post('/api/auth/register')
          .send(uniqueUserData)
          .expect(201);
        const networkEnd = process.hrtime.bigint();

        const responseTime = Number(networkEnd - networkStart) / 1000000; // Convert to milliseconds
        measurements.push(responseTime);

        expect(response.body).toHaveProperty('message', 'User registered successfully');
      }

      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);

      console.log(`Registration - Avg: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`);
      expect(maxResponseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
      expect(avgResponseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD * 0.8); // 80% of threshold for average
    });

    it('should handle todo CRUD operations under 500ms', async () => {
      const token = userTokens[0];
      const todoData = {
        title: 'Performance Test Todo',
        description: 'Testing response time'
      };

      // Test CREATE performance
      const createMeasurements = [];
      for (let i = 0; i < 10; i++) {
        const networkStart = process.hrtime.bigint();
        const response = await request(app)
          .post('/api/todos')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...todoData, title: `${todoData.title} ${i}` })
          .expect(201);
        const networkEnd = process.hrtime.bigint();

        const responseTime = Number(networkEnd - networkStart) / 1000000;
        createMeasurements.push(responseTime);
      }

      const avgCreateTime = createMeasurements.reduce((a, b) => a + b, 0) / createMeasurements.length;
      console.log(`Todo CREATE - Avg: ${avgCreateTime.toFixed(2)}ms`);
      expect(avgCreateTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);

      // Test READ performance
      const readMeasurements = [];
      for (let i = 0; i < 10; i++) {
        const networkStart = process.hrtime.bigint();
        const response = await request(app)
          .get('/api/todos')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const networkEnd = process.hrtime.bigint();

        const responseTime = Number(networkEnd - networkStart) / 1000000;
        readMeasurements.push(responseTime);
      }

      const avgReadTime = readMeasurements.reduce((a, b) => a + b, 0) / readMeasurements.length;
      console.log(`Todo READ - Avg: ${avgReadTime.toFixed(2)}ms`);
      expect(avgReadTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
    });
  });

  /**
   * AC-006: Test concurrent user scenarios with performance measurement
   */
  describe('Concurrent User Performance', () => {
    it('should handle 50 concurrent users within performance limits', async () => {
      const concurrentUserCount = Math.min(50, userTokens.length);
      const tokens = userTokens.slice(0, concurrentUserCount);

      const concurrentRequests = tokens.map((token, index) => {
        const networkStart = process.hrtime.bigint();
        return request(app)
          .post('/api/todos')
          .set('Authorization', `Bearer ${token}`)
          .send({ title: `Concurrent Todo ${index}` })
          .then(response => {
            const networkEnd = process.hrtime.bigint();
            const responseTime = Number(networkEnd - networkStart) / 1000000;
            return { response, responseTime, networkStart, networkEnd };
          });
      });

      const overallStart = process.hrtime.bigint();
      const results = await Promise.all(concurrentRequests);
      const overallEnd = process.hrtime.bigint();

      const overallTime = Number(overallEnd - overallStart) / 1000000;
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`Concurrent (${concurrentUserCount} users) - Overall: ${overallTime.toFixed(2)}ms, Avg: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`);

      // All requests should succeed
      results.forEach(result => {
        expect(result.response.status).toBe(201);
        expect(result.response.body).toHaveProperty('todo');
      });

      // Performance requirements
      expect(maxResponseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD * 2); // Allow 2x threshold for concurrent load
      expect(avgResponseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
      expect(overallTime).toBeLessThan(10000); // Overall execution under 10 seconds
    });

    it('should maintain response time consistency under load', async () => {
      const token = userTokens[0];
      const batchSize = 20;
      const batches = 3;

      const allMeasurements = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = Array.from({ length: batchSize }, (_, i) => {
          const networkStart = process.hrtime.bigint();
          return request(app)
            .post('/api/todos')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: `Load Test Todo B${batch}I${i}` })
            .then(response => {
              const networkEnd = process.hrtime.bigint();
              const responseTime = Number(networkEnd - networkStart) / 1000000;
              return { response, responseTime };
            });
        });

        const batchResults = await Promise.all(batchRequests);
        const batchTimes = batchResults.map(r => r.responseTime);
        allMeasurements.push(...batchTimes);

        // Verify all requests succeeded
        batchResults.forEach(result => {
          expect(result.response.status).toBe(201);
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgTime = allMeasurements.reduce((a, b) => a + b, 0) / allMeasurements.length;
      const maxTime = Math.max(...allMeasurements);
      const minTime = Math.min(...allMeasurements);
      const stdDev = Math.sqrt(allMeasurements.reduce((sq, n) => sq + Math.pow(n - avgTime, 2), 0) / allMeasurements.length);

      console.log(`Load consistency - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
      expect(maxTime).toBeLessThan(RESPONSE_TIME_THRESHOLD * 1.5);
      expect(stdDev).toBeLessThan(RESPONSE_TIME_THRESHOLD * 0.3); // Response time should be consistent
    });
  });

  async function setupTestDatabase(): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createTodosTable = `
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await dbManager.query(createUsersTable);
    await dbManager.query(createTodosTable);
  }

  async function cleanupTestDatabase(): Promise<void> {
    await dbManager.query('DROP TABLE IF EXISTS todos CASCADE');
    await dbManager.query('DROP TABLE IF EXISTS users CASCADE');
  }

  async function clearTodoData(): Promise<void> {
    await dbManager.query('DELETE FROM todos');
  }

  async function createTestUsers(): Promise<void> {
    const userCount = Math.min(60, CONCURRENT_USERS); // Create up to 60 test users
    
    for (let i = 0; i < userCount; i++) {
      const userData = {
        email: `perfuser${i}@example.com`,
        password: 'SecurePass123!'
      };

      try {
        await request(app)
          .post('/api/auth/register')
          .send(userData);

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(userData);

        userTokens.push(loginResponse.body.token);
      } catch (error) {
        console.warn(`Failed to create test user ${i}:`, error);
      }
    }

    console.log(`Created ${userTokens.length} test users for performance testing`);
  }
});