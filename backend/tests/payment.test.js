const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Order = require('../models/Order');
const User = require('../models/User');

let mongod;
let app;
let token;
let order;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.RAZORPAY_KEY_SECRET = 'dev-secret';

  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../app');

  await request(app).post('/api/auth/signup').send({
    name: 'Buyer',
    email: 'buyer-pay@test.com',
    password: 'Password@123',
    role: 'buyer',
  });

  const login = await request(app).post('/api/auth/login').send({
    email: 'buyer-pay@test.com',
    password: 'Password@123',
  });

  token = login.body.data.accessToken;
  const buyer = await User.findOne({ email: 'buyer-pay@test.com' });

  order = await Order.create({
    buyer: buyer._id,
    products: [],
    totalAmount: 500,
    shippingAddress: 'Address',
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Payment APIs', () => {
  it('should create mock razorpay order', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order._id.toString() });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
