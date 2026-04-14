const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const MarketPrice = require('../models/MarketPrice');
const Review = require('../models/Review');
const FarmerProfile = require('../models/FarmerProfile');
const BuyerProfile = require('../models/BuyerProfile');
const AdminProfile = require('../models/AdminProfile');
const CommunityPost = require('../models/CommunityPost');
const BuyerInteraction = require('../models/BuyerInteraction');
const PriceAlert = require('../models/PriceAlert');
const LoanApplication = require('../models/LoanApplication');
const PredictionLog = require('../models/PredictionLog');
const PlatformConfig = require('../models/PlatformConfig');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const OtpChallenge = require('../models/OtpChallenge');
const RefreshToken = require('../models/RefreshToken');

dotenv.config({ path: '.env' });

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Transaction.deleteMany({}),
    MarketPrice.deleteMany({}),
    Review.deleteMany({}),
    FarmerProfile.deleteMany({}),
    BuyerProfile.deleteMany({}),
    AdminProfile.deleteMany({}),
    CommunityPost.deleteMany({}),
    BuyerInteraction.deleteMany({}),
    PriceAlert.deleteMany({}),
    LoanApplication.deleteMany({}),
    PredictionLog.deleteMany({}),
    PlatformConfig.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    OtpChallenge.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);

  const [admin, farmerOne, farmerTwo, buyerOne, buyerTwo] = await User.create([
    {
      name: 'Admin User',
      email: 'admin@agriassist.com',
      password: 'Admin@12345',
      role: 'admin',
      isVerified: true,
      status: 'active',
      subscriptionStatus: 'pro',
      aiCredits: 500,
      profileCompletion: 100,
      verification: {
        emailVerified: true,
        phoneVerified: true,
        kycStatus: 'approved',
      },
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      source: 'seed',
    },
    {
      name: 'Farmer One',
      email: 'farmer@agriassist.com',
      password: 'Farmer@12345',
      role: 'farmer',
      phone: '9876500001',
      address: 'Ward 4, Sehore, Madhya Pradesh',
      isVerified: true,
      status: 'active',
      subscriptionStatus: 'pro',
      aiCredits: 120,
      profileCompletion: 92,
      verification: {
        emailVerified: true,
        phoneVerified: true,
        kycStatus: 'approved',
      },
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      source: 'seed',
      tags: ['wheat', 'rice'],
    },
    {
      name: 'Farmer Two',
      email: 'farmer2@agriassist.com',
      password: 'Farmer@12345',
      role: 'farmer',
      phone: '9876500002',
      address: 'Near Mandi Chowk, Kota, Rajasthan',
      isVerified: true,
      status: 'active',
      subscriptionStatus: 'free',
      aiCredits: 60,
      profileCompletion: 84,
      verification: {
        emailVerified: true,
        phoneVerified: true,
        kycStatus: 'approved',
      },
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      source: 'seed',
      tags: ['soybean', 'maize'],
    },
    {
      name: 'Buyer One',
      email: 'buyer@agriassist.com',
      password: 'Buyer@12345',
      role: 'buyer',
      phone: '9123400001',
      address: 'Indore Wholesale Market, Madhya Pradesh',
      isVerified: true,
      status: 'active',
      subscriptionStatus: 'pro',
      aiCredits: 40,
      profileCompletion: 88,
      verification: {
        emailVerified: true,
        phoneVerified: true,
        kycStatus: 'approved',
      },
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      source: 'seed',
      tags: ['wholesale', 'grain'],
    },
    {
      name: 'Buyer Two',
      email: 'buyer2@agriassist.com',
      password: 'Buyer@12345',
      role: 'buyer',
      phone: '9123400002',
      address: 'Jaipur Procurement Hub, Rajasthan',
      isVerified: true,
      status: 'active',
      subscriptionStatus: 'free',
      aiCredits: 20,
      profileCompletion: 76,
      verification: {
        emailVerified: true,
        phoneVerified: true,
        kycStatus: 'pending',
      },
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      source: 'seed',
      tags: ['retail', 'pulses'],
    },
  ]);

  await AdminProfile.create({
    user: admin._id,
    department: 'operations',
    permissions: ['analytics.read', 'users.manage', 'content.manage', 'pricing.manage', 'finance.review'],
    scopes: ['global'],
    assignedRegions: ['india'],
    dashboardPreferences: {
      defaultView: 'analytics',
      pinnedWidgets: ['revenue', 'active-users', 'price-alerts'],
    },
    lastReviewedAt: new Date(),
  });

  await FarmerProfile.insertMany([
    {
      user: farmerOne._id,
      farmName: 'Green Valley Farms',
      organizationName: 'Green Valley Producer Group',
      bio: 'Specialized in organic wheat and premium paddy.',
      location: {
        village: 'Ashta',
        district: 'Sehore',
        state: 'Madhya Pradesh',
        pincode: '466116',
      },
      landHolding: {
        acreage: 14,
        unit: 'acre',
        ownershipType: 'owned',
      },
      primaryCrops: [
        { name: 'wheat', season: 'rabi', acreage: 8, expectedYield: 120, unit: 'quintal' },
        { name: 'rice', season: 'kharif', acreage: 6, expectedYield: 95, unit: 'quintal' },
      ],
      certifications: ['organic', 'residue tested'],
      irrigationType: 'drip',
      soilProfile: {
        soilType: 'black cotton',
        soilHealthScore: 84,
        ph: 6.8,
        organicCarbon: 0.92,
      },
      bankProfile: {
        bankName: 'State Bank of India',
        accountHolder: 'Farmer One',
        ifsc: 'SBIN0001234',
        accountLast4: '4478',
      },
      kycStatus: 'approved',
      logisticsSupport: true,
      preferredMarkets: ['Indore Mandi', 'Bhopal Mandi'],
      averageOrderValue: 48500,
      rating: 4.8,
      lastHarvestAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      user: farmerTwo._id,
      farmName: 'Sunrise Agro',
      organizationName: 'Sunrise Agro',
      bio: 'Soybean and maize supplier for processors and feed mills.',
      location: {
        village: 'Sultanpur',
        district: 'Kota',
        state: 'Rajasthan',
        pincode: '325204',
      },
      landHolding: {
        acreage: 10,
        unit: 'acre',
        ownershipType: 'leased',
      },
      primaryCrops: [
        { name: 'soybean', season: 'kharif', acreage: 5, expectedYield: 55, unit: 'quintal' },
        { name: 'maize', season: 'kharif', acreage: 5, expectedYield: 78, unit: 'quintal' },
      ],
      certifications: ['quality tested'],
      irrigationType: 'sprinkler',
      soilProfile: {
        soilType: 'alluvial',
        soilHealthScore: 76,
        ph: 7.1,
        organicCarbon: 0.74,
      },
      bankProfile: {
        bankName: 'HDFC Bank',
        accountHolder: 'Farmer Two',
        ifsc: 'HDFC0005678',
        accountLast4: '9812',
      },
      kycStatus: 'approved',
      logisticsSupport: false,
      preferredMarkets: ['Kota Mandi', 'Jaipur Mandi'],
      averageOrderValue: 29200,
      rating: 4.5,
      lastHarvestAt: new Date('2026-03-15T00:00:00.000Z'),
    },
  ]);

  await BuyerProfile.insertMany([
    {
      user: buyerOne._id,
      companyName: 'Indore Grain Traders',
      buyerType: 'wholesaler',
      contactPerson: 'Buyer One',
      phone: buyerOne.phone,
      demand: [
        { commodity: 'wheat', monthlyVolume: 180, preferredUnit: 'quintal', targetPrice: 2550 },
        { commodity: 'rice', monthlyVolume: 120, preferredUnit: 'quintal', targetPrice: 3400 },
      ],
      procurementRegions: ['Madhya Pradesh', 'Uttar Pradesh'],
      warehouseLocations: ['Indore', 'Dewas'],
      monthlyCapacityTonnes: 90,
      paymentTermsDays: 7,
      creditLimit: 400000,
      gstNumber: '23ABCDE1234F1Z5',
      licenseNumber: 'MPT-IND-2026-001',
      verificationStatus: 'verified',
      preferredCategories: ['grain', 'staples'],
      tags: ['bulk', 'repeat-buyer'],
      rating: 4.9,
    },
    {
      user: buyerTwo._id,
      companyName: 'Jaipur Retail Foods',
      buyerType: 'retailer',
      contactPerson: 'Buyer Two',
      phone: buyerTwo.phone,
      demand: [
        { commodity: 'soybean', monthlyVolume: 60, preferredUnit: 'quintal', targetPrice: 5100 },
        { commodity: 'maize', monthlyVolume: 75, preferredUnit: 'quintal', targetPrice: 2300 },
      ],
      procurementRegions: ['Rajasthan'],
      warehouseLocations: ['Jaipur'],
      monthlyCapacityTonnes: 35,
      paymentTermsDays: 14,
      creditLimit: 150000,
      gstNumber: '08PQRSX5678M1Z2',
      licenseNumber: 'RAJ-JPR-2026-002',
      verificationStatus: 'pending',
      preferredCategories: ['grain', 'feed'],
      tags: ['regional'],
      rating: 4.1,
    },
  ]);

  const products = await Product.insertMany([
    {
      farmer: farmerOne._id,
      name: 'Organic Wheat',
      category: 'grain',
      commodity: 'wheat',
      slug: 'organic-wheat-green-valley',
      description: 'High quality organic wheat suitable for bulk procurement.',
      price: 2560,
      suggestedPrice: 2525,
      quantity: 250,
      unit: 'quintal',
      currency: 'INR',
      images: [],
      grade: 'A',
      diseaseReport: 'healthy',
      soilScore: 84,
      harvestDate: new Date('2026-03-18T00:00:00.000Z'),
      featured: true,
      location: {
        village: 'Ashta',
        district: 'Sehore',
        state: 'Madhya Pradesh',
        market: 'Indore Mandi',
      },
      qualityMetrics: {
        moisturePercent: 10.2,
        purityPercent: 97,
        foreignMatterPercent: 1.1,
      },
      analytics: { views: 184, enquiries: 19, saves: 12 },
      status: 'available',
    },
    {
      farmer: farmerOne._id,
      name: 'Premium Basmati Rice',
      category: 'grain',
      commodity: 'rice',
      slug: 'premium-basmati-rice-green-valley',
      description: 'Long-grain basmati with low moisture and high aroma.',
      price: 3450,
      suggestedPrice: 3380,
      quantity: 120,
      unit: 'quintal',
      currency: 'INR',
      images: [],
      grade: 'A+',
      diseaseReport: 'healthy',
      soilScore: 80,
      harvestDate: new Date('2026-03-10T00:00:00.000Z'),
      location: {
        village: 'Ashta',
        district: 'Sehore',
        state: 'Madhya Pradesh',
        market: 'Bhopal Mandi',
      },
      qualityMetrics: {
        moisturePercent: 9.8,
        purityPercent: 98,
        foreignMatterPercent: 0.7,
      },
      analytics: { views: 102, enquiries: 11, saves: 8 },
      status: 'available',
    },
    {
      farmer: farmerTwo._id,
      name: 'Soybean Bulk Lot',
      category: 'oilseed',
      commodity: 'soybean',
      slug: 'soybean-bulk-lot-sunrise-agro',
      description: 'Processor grade soybean with consistent lot quality.',
      price: 5080,
      suggestedPrice: 5005,
      quantity: 140,
      unit: 'quintal',
      currency: 'INR',
      images: [],
      grade: 'B+',
      diseaseReport: 'minor leaf spot',
      soilScore: 76,
      harvestDate: new Date('2026-03-05T00:00:00.000Z'),
      location: {
        village: 'Sultanpur',
        district: 'Kota',
        state: 'Rajasthan',
        market: 'Kota Mandi',
      },
      qualityMetrics: {
        moisturePercent: 11.4,
        purityPercent: 95,
        foreignMatterPercent: 1.8,
      },
      analytics: { views: 96, enquiries: 14, saves: 5 },
      status: 'available',
    },
  ]);

  await MarketPrice.insertMany([
    {
      commodity: 'wheat',
      market: 'Indore Mandi',
      state: 'Madhya Pradesh',
      district: 'Indore',
      unit: 'quintal',
      currency: 'INR',
      msp: 2425,
      latestObservedPrice: 2550,
      localDemandIndex: 1.25,
      localSupplyIndex: 0.82,
      suggestedPrice: 2525,
      changePct: 1.64,
      trend: 'up',
      source: 'seed',
      capturedAt: new Date('2026-04-02T05:30:00.000Z'),
    },
    {
      commodity: 'rice',
      market: 'Bhopal Mandi',
      state: 'Madhya Pradesh',
      district: 'Bhopal',
      unit: 'quintal',
      currency: 'INR',
      msp: 2300,
      latestObservedPrice: 3400,
      localDemandIndex: 1.35,
      localSupplyIndex: 0.7,
      suggestedPrice: 3380,
      changePct: 0.94,
      trend: 'up',
      source: 'seed',
      capturedAt: new Date('2026-04-02T05:30:00.000Z'),
    },
    {
      commodity: 'soybean',
      market: 'Kota Mandi',
      state: 'Rajasthan',
      district: 'Kota',
      unit: 'quintal',
      currency: 'INR',
      msp: 4892,
      latestObservedPrice: 5075,
      localDemandIndex: 1.1,
      localSupplyIndex: 0.95,
      suggestedPrice: 5005,
      changePct: -0.21,
      trend: 'stable',
      source: 'seed',
      capturedAt: new Date('2026-04-02T05:30:00.000Z'),
    },
  ]);

  const orders = await Order.insertMany([
    {
      buyer: buyerOne._id,
      products: [
        {
          product: products[0]._id,
          quantity: 20,
          unitPrice: 2560,
          farmer: farmerOne._id,
        },
      ],
      totalAmount: 51200,
      paymentId: 'pay_seed_001',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      shippingAddress: 'Warehouse 12, Indore Wholesale Market',
    },
    {
      buyer: buyerTwo._id,
      products: [
        {
          product: products[2]._id,
          quantity: 12,
          unitPrice: 5080,
          farmer: farmerTwo._id,
        },
      ],
      totalAmount: 60960,
      paymentStatus: 'pending',
      orderStatus: 'created',
      shippingAddress: 'Retail Zone, Jaipur Procurement Hub',
    },
  ]);

  await Transaction.insertMany([
    {
      user: buyerOne._id,
      type: 'credit',
      category: 'wallet_topup',
      amount: 100000,
      reference: 'seed-wallet-topup-buyer-1',
      method: 'wallet',
      status: 'completed',
      metadata: { source: 'seed' },
    },
    {
      user: buyerOne._id,
      type: 'debit',
      category: 'order_payment',
      amount: orders[0].totalAmount,
      reference: 'seed-order-payment-001',
      method: 'upi',
      status: 'completed',
      metadata: { orderId: orders[0]._id.toString() },
    },
    {
      user: farmerOne._id,
      type: 'credit',
      category: 'farmer_payout',
      amount: 49800,
      reference: 'seed-farmer-payout-001',
      method: 'bank_transfer',
      status: 'completed',
      metadata: { orderId: orders[0]._id.toString() },
    },
  ]);

  await Review.create({
    product: products[0]._id,
    buyer: buyerOne._id,
    rating: 5,
    comment: 'Consistent quality and on-time delivery.',
  });

  await CommunityPost.insertMany([
    {
      author: farmerOne._id,
      authorRole: 'farmer',
      title: 'Best moisture range for wheat storage',
      content: 'Keeping wheat below 12 percent moisture helped us cut spoilage significantly.',
      tags: ['wheat', 'storage'],
      audienceRoles: ['farmer', 'buyer'],
      stats: { likes: 34, comments: 7, shares: 4, views: 240 },
      status: 'published',
      publishedAt: new Date('2026-04-01T10:00:00.000Z'),
    },
    {
      author: admin._id,
      authorRole: 'admin',
      title: 'Platform update on buyer verification',
      content: 'Buyer verification is now mandatory for high-value orders above Rs 2 lakh.',
      tags: ['policy', 'verification'],
      audienceRoles: ['farmer', 'buyer', 'admin'],
      stats: { likes: 19, comments: 3, shares: 2, views: 310 },
      status: 'published',
      pinnedUntil: new Date('2026-04-10T00:00:00.000Z'),
      publishedAt: new Date('2026-04-02T08:00:00.000Z'),
    },
  ]);

  await BuyerInteraction.insertMany([
    {
      buyer: buyerOne._id,
      farmer: farmerOne._id,
      product: products[0]._id,
      createdBy: buyerOne._id,
      channel: 'message',
      subject: 'Bulk wheat procurement inquiry',
      message: 'Can you commit 50 quintals weekly for the next 6 weeks?',
      quantityRequested: 300,
      proposedPrice: 2540,
      priority: 'high',
      status: 'quoted',
      notes: ['Buyer requested recurring supply'],
    },
    {
      buyer: buyerTwo._id,
      farmer: farmerTwo._id,
      product: products[2]._id,
      createdBy: buyerTwo._id,
      channel: 'call',
      subject: 'Soybean lot sample review',
      message: 'Need moisture test before issuing PO.',
      quantityRequested: 80,
      proposedPrice: 5050,
      meetingAt: new Date('2026-04-04T11:00:00.000Z'),
      priority: 'medium',
      status: 'scheduled',
      notes: ['Sample to be shared via courier'],
    },
  ]);

  await PriceAlert.insertMany([
    {
      user: farmerOne._id,
      commodity: 'wheat',
      market: 'Indore Mandi',
      unit: 'quintal',
      alertType: 'threshold',
      direction: 'above',
      currentPrice: 2550,
      targetPrice: 2600,
      isActive: true,
      lastCheckedAt: new Date('2026-04-02T05:30:00.000Z'),
      deliveryChannels: ['email', 'in_app'],
    },
    {
      user: buyerTwo._id,
      commodity: 'soybean',
      market: 'Kota Mandi',
      unit: 'quintal',
      alertType: 'threshold',
      direction: 'below',
      currentPrice: 5075,
      targetPrice: 5000,
      isActive: true,
      lastCheckedAt: new Date('2026-04-02T05:30:00.000Z'),
      deliveryChannels: ['email'],
    },
  ]);

  await LoanApplication.insertMany([
    {
      user: farmerOne._id,
      amount: 150000,
      approvedAmount: 120000,
      tenureMonths: 9,
      purpose: 'Drip irrigation expansion',
      cropCycle: 'rabi',
      collateral: 'warehouse receipt',
      riskBand: 'low',
      status: 'approved',
      requestedDisbursementDate: new Date('2026-04-10T00:00:00.000Z'),
      documents: ['kyc.pdf', 'land-record.pdf'],
      reviewedBy: admin._id,
      reviewNotes: 'Approved based on repayment history and verified inventory.',
      interestRate: 9.5,
      repaymentStartDate: new Date('2026-06-01T00:00:00.000Z'),
    },
    {
      user: farmerTwo._id,
      amount: 90000,
      tenureMonths: 6,
      purpose: 'Seed and fertilizer procurement',
      cropCycle: 'kharif',
      collateral: 'none',
      riskBand: 'medium',
      status: 'pending',
      requestedDisbursementDate: new Date('2026-04-15T00:00:00.000Z'),
      documents: ['kyc.pdf'],
      reviewNotes: 'Pending field verification.',
      interestRate: 11.2,
    },
  ]);

  await PredictionLog.insertMany([
    {
      requestedBy: farmerOne._id,
      subjectUser: farmerOne._id,
      product: products[0]._id,
      kind: 'market_price',
      modelName: 'agriassist-pricing',
      modelVersion: 'v1',
      status: 'completed',
      inputSummary: 'Wheat pricing suggestion for Indore Mandi',
      outputSummary: 'Suggested price Rs 2525 per quintal',
      rawInput: { commodity: 'wheat', market: 'Indore Mandi' },
      rawOutput: { suggestedPrice: 2525 },
      confidence: 0.86,
      latencyMs: 124,
    },
    {
      requestedBy: farmerOne._id,
      subjectUser: farmerOne._id,
      product: products[1]._id,
      kind: 'soil_quality',
      modelName: 'agriassist-soil',
      modelVersion: 'v1',
      status: 'completed',
      inputSummary: 'NPK estimate for paddy field',
      outputSummary: 'Soil score estimated at 80',
      rawInput: { npk: { n: 42, p: 18, k: 23 } },
      rawOutput: { soilScore: 80 },
      confidence: 0.79,
      latencyMs: 88,
    },
    {
      requestedBy: farmerTwo._id,
      subjectUser: farmerTwo._id,
      product: products[2]._id,
      kind: 'disease',
      modelName: 'agriassist-disease',
      modelVersion: 'v1',
      status: 'completed',
      inputSummary: 'Soybean leaf scan',
      outputSummary: 'Minor leaf spot detected',
      rawInput: { imageProvided: true },
      rawOutput: { disease: 'minor leaf spot' },
      confidence: 0.73,
      latencyMs: 203,
    },
  ]);

  await PlatformConfig.create({
    key: 'platform',
    accessPolicy: {
      farmerPlan: 'free',
      buyerPlan: 'free',
      adminRequiresInvite: true,
    },
    categories: {
      crops: ['wheat', 'rice', 'soybean', 'maize', 'cotton'],
      inputs: ['seeds', 'fertilizers', 'equipment'],
      services: ['soil testing', 'agronomy', 'finance'],
    },
    featureFlags: {
      marketplace: true,
      aiAdvisory: true,
      pricePrediction: true,
      cropPrediction: true,
      finance: true,
      community: true,
      kyc: true,
      buyerMatching: true,
    },
    payments: {
      provider: 'razorpay',
      currency: 'INR',
      gatewayMode: 'test',
      platformCommissionRate: 0.025,
    },
    ai: {
      primaryProvider: 'local',
      fallbackEnabled: true,
      modelCatalog: [
        { key: 'market_price', version: 'v1', enabled: true },
        { key: 'soil_quality', version: 'v1', enabled: true },
        { key: 'disease', version: 'v1', enabled: true },
      ],
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
    },
    compliance: {
      kycRequiredForSellers: true,
      kycRequiredForBuyers: false,
      maxOtpAttempts: 5,
    },
    supportEmail: 'support@agriassist.com',
  });

  await Notification.insertMany([
    {
      user: buyerOne._id,
      email: buyerOne.email,
      channel: 'email',
      type: 'payment_success',
      title: 'Payment received for order',
      message: 'Payment of Rs 51200 received successfully.',
      status: 'sent',
      sentAt: new Date('2026-04-01T14:00:00.000Z'),
      metadata: { orderId: orders[0]._id.toString() },
    },
    {
      user: farmerOne._id,
      email: farmerOne.email,
      channel: 'in_app',
      type: 'buyer_interest',
      title: 'New buyer inquiry received',
      message: 'Indore Grain Traders requested recurring wheat supply.',
      status: 'sent',
      sentAt: new Date('2026-04-02T08:15:00.000Z'),
      metadata: { productId: products[0]._id.toString() },
    },
    {
      user: admin._id,
      email: admin.email,
      channel: 'in_app',
      type: 'loan_review',
      title: 'Loan application pending review',
      message: 'One farmer loan application needs admin review.',
      status: 'sent',
      sentAt: new Date('2026-04-02T09:00:00.000Z'),
      metadata: { queue: 'finance' },
    },
  ]);

  await AuditLog.insertMany([
    {
      actor: admin._id,
      actorEmail: admin.email,
      actorRole: 'admin',
      action: 'seed.bootstrap',
      entityType: 'Platform',
      entityId: 'platform',
      outcome: 'success',
      changeSummary: 'Database seeded with baseline platform records',
      metadata: { source: 'seed' },
      occurredAt: new Date(),
    },
    {
      actor: buyerOne._id,
      actorEmail: buyerOne.email,
      actorRole: 'buyer',
      action: 'order.created',
      entityType: 'Order',
      entityId: orders[0]._id.toString(),
      outcome: 'success',
      changeSummary: 'Buyer created a paid order',
      metadata: { source: 'seed' },
      occurredAt: new Date('2026-04-01T13:50:00.000Z'),
    },
    {
      actor: farmerOne._id,
      actorEmail: farmerOne.email,
      actorRole: 'farmer',
      action: 'product.analyzed',
      entityType: 'Product',
      entityId: products[0]._id.toString(),
      outcome: 'success',
      changeSummary: 'AI disease and grading analysis recorded',
      metadata: { source: 'seed' },
      occurredAt: new Date('2026-04-02T06:30:00.000Z'),
    },
  ]);

  console.log('Seed completed');
  console.log({
    users: {
      admin: { email: admin.email, password: 'Admin@12345' },
      farmer: { email: farmerOne.email, password: 'Farmer@12345' },
      buyer: { email: buyerOne.email, password: 'Buyer@12345' },
    },
    mongoExpress: {
      url: 'http://localhost:8081',
      username: process.env.MONGO_EXPRESS_USERNAME || 'admin',
      password: process.env.MONGO_EXPRESS_PASSWORD || 'agriassist123',
    },
  });

  await mongoose.disconnect();
};

if (require.main === module) {
  seed().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = {
  seed,
};
