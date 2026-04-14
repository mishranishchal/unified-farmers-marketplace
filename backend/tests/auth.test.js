const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../app');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Auth APIs', () => {
  it('should signup and login a user', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'Test Buyer',
      email: 'buyer@test.com',
      password: 'Password@123',
      role: 'buyer',
    });

    expect(signupRes.statusCode).toBe(201);
    expect(signupRes.body.success).toBe(true);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'buyer@test.com',
      password: 'Password@123',
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.data.user.role).toBe('buyer');
  });
});
