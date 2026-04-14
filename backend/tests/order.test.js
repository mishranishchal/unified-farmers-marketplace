const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Product = require('../models/Product');

let mongod;
let app;
let adminToken;
let buyerToken;
let productId;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../app');

  await request(app).post('/api/auth/signup').send({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'Password@123',
    role: 'admin',
  });
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'Password@123',
  });
  adminToken = adminLogin.body.data.accessToken;

  await request(app).post('/api/auth/signup').send({
    name: 'Farmer',
    email: 'farmer@test.com',
    password: 'Password@123',
    role: 'farmer',
  });
  const farmerLogin = await request(app).post('/api/auth/login').send({
    email: 'farmer@test.com',
    password: 'Password@123',
  });
  const farmer = await User.findOne({ email: 'farmer@test.com' });
  const product = await Product.create({
    farmer: farmer._id,
    name: 'Wheat',
    category: 'grain',
    price: 20,
    quantity: 100,
  });
  productId = product._id;

  await request(app).post('/api/auth/signup').send({
    name: 'Buyer',
    email: 'buyer@test.com',
    password: 'Password@123',
    role: 'buyer',
  });
  const buyerLoginRes = await request(app).post('/api/auth/login').send({
    email: 'buyer@test.com',
    password: 'Password@123',
  });
  buyerToken = buyerLoginRes.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Order lifecycle', () => {
  it('should enforce valid transitions only', async () => {
    const createOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ productId, quantity: 2 }],
        shippingAddress: 'Village Road, Pune',
      });

    expect(createOrderRes.statusCode).toBe(201);

    const orderId = createOrderRes.body.data.order._id;

    const invalidTransition = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    expect(invalidTransition.statusCode).toBe(400);
  });
});
