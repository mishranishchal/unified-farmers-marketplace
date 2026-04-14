import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type {
  AgriTrustForm,
  AgriTrustFormSubmission,
  AppLanguage,
  AppUser,
  CommunicationGroup,
  CommunicationGroupMessage,
  AuthOtpChallenge,
  AuthOtpDispatch,
  AuthOtpPurpose,
  GlobalSearchResult,
  InvoiceRecord,
  BuyerInteraction,
  BuyerProfile,
  CommodityPrice,
  CommunityPost,
  FinanceTransaction,
  FarmerFieldReport,
  FarmerListing,
  LoanApplication,
  MarketplaceProduct,
  NegotiationRecord,
  OrderItem,
  PaymentRecord,
  PaymentStatus,
  PlatformDb,
  PlatformConfig,
  PlatformOrder,
  PriceAlert,
  PredictionKind,
  PredictionLog,
  SafeUser,
  ShipmentCheckpoint,
  ShipmentRecord,
  UserNotification,
  UserNotificationPreferences,
  UserRole,
  UserWorkspaceProfile,
  WalletFundingRequest,
} from '@/lib/types';
import { ensurePlatformBaseline } from '@/lib/server/platform-data';
import { enrichCommodityPrice } from '@/lib/server/pricing';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'platform-db.json');
const SESSION_COOKIE_NAME = 'fm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const APP_SECRET = process.env.APP_SECRET || 'dev-insecure-secret-change-me';
const OTP_TTL_MINUTES = 10;
const OTP_ATTEMPT_LIMIT = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 45;
const OTP_SEND_LIMIT = 5;
const ADMIN_SUPERKEY = process.env.AGRI_TRUST_ADMIN_SUPERKEY || 'AGRI-TRUST-ADMIN';
const NETLIFY_DB_STORE_NAME = process.env.NETLIFY_DB_STORE_NAME || 'farmers-marketplace-data';
const NETLIFY_DB_KEY = 'platform-db';
const NETLIFY_DB_WRITE_RETRIES = 6;

let mutationQueue = Promise.resolve();
let dbCache: PlatformDb | null = null;
let dbReadPromise: Promise<PlatformDb> | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let flushChain = Promise.resolve();
let dbDirty = false;

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, stored] = passwordHash.split(':');
  if (!salt || !stored) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(stored, 'hex'));
}

function hashOtp(challengeId: string, otp: string): string {
  return crypto.createHmac('sha256', APP_SECRET).update(`${challengeId}:${otp}`).digest('hex');
}

function verifyOtp(challengeId: string, otp: string, otpHash: string): boolean {
  const actual = hashOtp(challengeId, otp);
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(otpHash, 'hex'));
}

function maskEmail(email: string): string {
  const [localPart, domain = ''] = email.split('@');
  if (!localPart) return email;
  const visibleLocal = localPart.length <= 2 ? `${localPart[0] ?? '*'}*` : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(1, localPart.length - 2))}`;
  const [domainName, ...rest] = domain.split('.');
  const visibleDomain = domainName ? `${domainName.slice(0, 1)}${'*'.repeat(Math.max(1, domainName.length - 1))}` : '';
  return `${visibleLocal}@${[visibleDomain, ...rest].filter(Boolean).join('.')}`;
}

function isExpired(timestamp: string): boolean {
  return new Date(timestamp).getTime() <= Date.now();
}

function secondsUntil(timestamp: string): number {
  return Math.max(0, Math.ceil((new Date(timestamp).getTime() - Date.now()) / 1000));
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', APP_SECRET).update(payload).digest('hex');
}

function b64urlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString();
}

function createSessionToken(user: SafeUser): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payloadObj = { sub: user.id, email: user.email, role: user.role, exp };
  const payload = b64urlEncode(JSON.stringify(payloadObj));
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { email: string; role: UserRole } | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = signPayload(payload);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(payload)) as { email: string; role: UserRole; exp: number };
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: parsed.email, role: parsed.role };
  } catch {
    return null;
  }
}

function toSafeUser(user: AppUser): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

function createAppUser(name: string, email: string, role: UserRole, passwordHash: string): AppUser {
  const timestamp = nowIso();
  return {
    id: id('usr'),
    name: normalizeName(name),
    email: normalizeEmail(email),
    passwordHash,
    role,
    status: 'active',
    isPro: true,
    aiCredits: 9999,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createBuyerProfileForUser(user: SafeUser): BuyerProfile {
  const timestamp = nowIso();
  return {
    id: id('buy'),
    name: user.name,
    location: 'Profile pending completion',
    demand: [],
    capacity: 'Not provided',
    type: 'Buyer',
    verified: false,
    contact: user.email,
    trades: 0,
    status: 'Pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function defaultNotificationPreferences(): UserNotificationPreferences {
  return {
    priceAlerts: true,
    marketplace: true,
    community: true,
    operations: true,
  };
}

function roleDisplay(role: UserRole) {
  return role === 'user' ? 'Farmer' : role === 'buyer' ? 'Buyer' : 'Admin';
}

function buildTrustScore(profile: Partial<UserWorkspaceProfile> & Pick<UserWorkspaceProfile, 'role'>): number {
  if (profile.role === 'user') {
    if (profile.verification?.farmer?.status === 'verified') return 94;
    if (profile.farmerProfile?.aadhaarNumber) return 78;
  }
  if (profile.role === 'buyer') {
    if (profile.verification?.buyer?.status === 'verified') return 92;
    if (profile.buyerProfile?.gstin) return 76;
  }
  if (profile.role === 'admin') return 98;
  return 48;
}

function buildTrustLabel(score: number): string {
  return score >= 95 ? 'Enterprise verified' : score >= 90 ? 'Verified' : score >= 70 ? 'Review pending' : 'Profile incomplete';
}

function createWorkspaceProfileForUser(user: SafeUser): UserWorkspaceProfile {
  const timestamp = nowIso();
  const base: UserWorkspaceProfile = {
    id: id('prf'),
    userEmail: normalizeEmail(user.email),
    role: user.role,
    displayName: user.name,
    phone: '',
    city: user.role === 'buyer' ? 'Pune' : user.role === 'admin' ? 'New Delhi' : 'Nashik',
    state: user.role === 'admin' ? 'Delhi' : 'Maharashtra',
    address: '',
    about: user.role === 'buyer' ? 'Procurement workspace pending GST verification.' : user.role === 'admin' ? 'Platform operations workspace.' : 'Farm profile pending Agri Trust onboarding.',
    preferredLanguage: 'en',
    notificationPreferences: defaultNotificationPreferences(),
    trustScore: 48,
    trustLabel: 'Profile incomplete',
    verification: {
      farmer: null,
      buyer: null,
      admin: null,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (user.role === 'user') {
    base.farmerProfile = {
      aadhaarNumber: '',
      farmSizeAcres: 0,
      primaryCrops: ['Maize'],
      mandiPreference: 'Pune APMC',
    };
  }

  if (user.role === 'buyer') {
    base.buyerProfile = {
      gstin: '',
      businessName: user.name,
      procurementCapacity: '0 MT/month',
      preferredCommodities: ['Maize'],
    };
  }

  if (user.role === 'admin') {
    base.adminProfile = {
      superKey: '',
      department: 'Operations',
      accessPasscodeHint: 'Use the issued Agri Trust admin key.',
    };
  }

  return base;
}

function ensureWorkspaceProfile(db: PlatformDb, user: SafeUser): void {
  const email = normalizeEmail(user.email);
  const existingIndex = db.profiles.findIndex((profile) => normalizeEmail(profile.userEmail) === email);
  if (existingIndex < 0) {
    db.profiles.unshift(normalizeWorkspaceProfileForRole(createWorkspaceProfileForUser(user)));
    return;
  }

  db.profiles[existingIndex] = normalizeWorkspaceProfileForRole({
    ...db.profiles[existingIndex],
    displayName: db.profiles[existingIndex].displayName || user.name,
    role: user.role,
    updatedAt: nowIso(),
  });
}

function createNotification(input: Omit<UserNotification, 'id' | 'createdAt' | 'read'>): UserNotification {
  return {
    id: id('ntf'),
    read: false,
    createdAt: nowIso(),
    ...input,
  };
}

function listAdminEmails(db: PlatformDb): string[] {
  return Array.from(
    new Set(
      db.users
        .filter((user) => user.role === 'admin')
        .map((user) => normalizeEmail(user.email))
        .filter(Boolean)
    )
  );
}

function notifyAdmins(
  db: PlatformDb,
  input: Omit<UserNotification, 'id' | 'createdAt' | 'read' | 'userEmail'>
): void {
  for (const adminEmail of listAdminEmails(db)) {
    db.notifications.unshift(
      createNotification({
        userEmail: adminEmail,
        ...input,
      })
    );
  }
}

function normalizeWorkspaceProfileForRole(profile: UserWorkspaceProfile): UserWorkspaceProfile {
  const next: UserWorkspaceProfile = {
    ...profile,
    verification: {
      farmer: profile.verification.farmer,
      buyer: profile.verification.buyer,
      admin: profile.verification.admin,
    },
  };

  if (next.role === 'admin') {
    next.farmerProfile = undefined;
    next.buyerProfile = undefined;
    next.verification = {
      farmer: null,
      buyer: null,
      admin: null,
    };
    next.adminProfile = {
      superKey: '',
      department: next.adminProfile?.department || 'Operations',
      accessPasscodeHint: next.adminProfile?.accessPasscodeHint || 'Administrator controls verification and platform settings.',
    };
  }

  if (next.role === 'user') {
    next.buyerProfile = undefined;
    next.adminProfile = undefined;
    next.verification = {
      farmer: next.verification.farmer,
      buyer: null,
      admin: null,
    };
  }

  if (next.role === 'buyer') {
    next.farmerProfile = undefined;
    next.adminProfile = undefined;
    next.verification = {
      farmer: null,
      buyer: next.verification.buyer,
      admin: null,
    };
  }

  const trustScore = buildTrustScore(next);
  next.trustScore = trustScore;
  next.trustLabel = buildTrustLabel(trustScore);
  return next;
}

function createShipmentCheckpoint(
  status: ShipmentRecord['status'],
  note: string,
  location: string,
  updatedBy?: string
): ShipmentCheckpoint {
  return {
    status,
    note,
    location,
    updatedBy,
    updatedAt: nowIso(),
  };
}

function ensureBuyerProfile(db: PlatformDb, user: SafeUser): void {
  const email = normalizeEmail(user.email);
  const alreadyExists = db.buyers.some((buyer) => normalizeEmail(buyer.contact ?? '') === email);
  if (!alreadyExists) {
    db.buyers.unshift(createBuyerProfileForUser(user));
  }
}

function pruneOtpChallenges(db: PlatformDb): void {
  db.otpChallenges = db.otpChallenges.filter((challenge) => !isExpired(challenge.expiresAt) && challenge.attempts < OTP_ATTEMPT_LIMIT);
}

function createOtpDispatch(challenge: AuthOtpChallenge): AuthOtpDispatch {
  return {
    requestToken: challenge.id,
    purpose: challenge.purpose,
    role: challenge.role,
    destination: maskEmail(challenge.email),
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
    sendCount: challenge.sendCount,
    maxSendCount: OTP_SEND_LIMIT,
  };
}

function seedDb(): PlatformDb {
  const timestamp = nowIso();
  const users: AppUser[] = [
    {
      id: id('usr'),
      name: 'Admin User',
      email: 'admin@farmersmarketplace.app',
      passwordHash: hashPassword('adminpass'),
      role: 'admin',
      status: 'active',
      isPro: true,
      aiCredits: 9999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id('usr'),
      name: 'Regular Farmer',
      email: 'farmer@farmersmarketplace.app',
      passwordHash: hashPassword('farmerpass'),
      role: 'user',
      status: 'active',
      isPro: true,
      aiCredits: 9999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id('usr'),
      name: 'Agro Processor',
      email: 'buyer.user@farmersmarketplace.app',
      passwordHash: hashPassword('buyerpass'),
      role: 'buyer',
      status: 'active',
      isPro: true,
      aiCredits: 9999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id('usr'),
      name: 'Google User',
      email: 'google.user@farmersmarketplace.app',
      passwordHash: hashPassword('googlepass'),
      role: 'user',
      status: 'active',
      isPro: true,
      aiCredits: 9999,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const profiles = users.map((user) => createWorkspaceProfileForUser(toSafeUser(user)));
  const adminProfile = profiles.find((profile) => profile.role === 'admin');
  const farmerProfile = profiles.find((profile) => profile.userEmail === 'farmer@farmersmarketplace.app');
  const buyerWorkspace = profiles.find((profile) => profile.role === 'buyer');

  if (adminProfile?.adminProfile) {
    adminProfile.adminProfile.superKey = ADMIN_SUPERKEY;
    adminProfile.trustScore = buildTrustScore(adminProfile);
    adminProfile.trustLabel = buildTrustLabel(adminProfile.trustScore);
    adminProfile.verification.admin = {
      status: 'verified',
      label: 'Agri Trust superkey accepted',
      submittedAt: timestamp,
      verifiedAt: timestamp,
    };
  }

  if (farmerProfile?.farmerProfile) {
    farmerProfile.farmerProfile.aadhaarNumber = '512345678901';
    farmerProfile.farmerProfile.farmSizeAcres = 14;
    farmerProfile.farmerProfile.primaryCrops = ['Maize', 'Soybean', 'Onion'];
    farmerProfile.trustScore = buildTrustScore(farmerProfile);
    farmerProfile.trustLabel = buildTrustLabel(farmerProfile.trustScore);
    farmerProfile.verification.farmer = {
      status: 'verified',
      label: 'Aadhaar submitted and validated',
      submittedAt: timestamp,
      verifiedAt: timestamp,
    };
  }

  if (buyerWorkspace?.buyerProfile) {
    buyerWorkspace.buyerProfile.gstin = '27ABCDE1234F1Z5';
    buyerWorkspace.buyerProfile.procurementCapacity = '1200 MT/month';
    buyerWorkspace.buyerProfile.preferredCommodities = ['Maize', 'Soybean', 'Wheat'];
    buyerWorkspace.trustScore = buildTrustScore(buyerWorkspace);
    buyerWorkspace.trustLabel = buildTrustLabel(buyerWorkspace.trustScore);
    buyerWorkspace.verification.buyer = {
      status: 'verified',
      label: 'GSTIN submitted and validated',
      submittedAt: timestamp,
      verifiedAt: timestamp,
    };
  }

  return {
    users,
    profiles,
    otpChallenges: [],
    products: [
      {
        id: id('prd'),
        name: 'Hybrid Maize Seed K-900',
        category: 'Seeds',
        price: 2450,
        currency: 'INR',
        unit: 'pack',
        rating: 4.8,
        inStock: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: id('prd'),
        name: 'Balanced NPK 19-19-19',
        category: 'Fertilizers',
        price: 1980,
        currency: 'INR',
        unit: '25kg',
        rating: 4.6,
        inStock: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    listings: [
      {
        id: id('lst'),
        name: 'Fresh Maize (100kg)',
        farmerName: 'Ravi Patel',
        price: 2350,
        unit: 'quintal',
        location: 'Pune',
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    buyers: [
      {
        id: id('buy'),
        name: 'Pune Grain Processors Pvt Ltd',
        location: 'Pune, Maharashtra',
        demand: ['Maize', 'Soybean', 'Chana'],
        capacity: '1,200 MT / month',
        type: 'Processor',
        verified: true,
        contact: 'procurement@punegrainprocessors.in',
        trades: 48,
        status: 'Verified',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    prices: [
      {
        id: id('prc'),
        commodity: 'Maize',
        market: 'Pune APMC',
        price: 2150,
        unit: 'INR/quintal',
        changePct: 2.5,
        trend: 'up',
        timestamp,
      },
      {
        id: id('prc'),
        commodity: 'Wheat',
        market: 'Indore APMC',
        price: 2480,
        unit: 'INR/quintal',
        changePct: -1.2,
        trend: 'down',
        timestamp,
      },
    ],
    posts: [
      {
        id: id('pst'),
        authorName: 'Regular Farmer',
        authorEmail: 'farmer@farmersmarketplace.app',
        title: 'Best irrigation schedule for late sowing?',
        content: 'Looking for practical irrigation schedules for maize in delayed monsoon conditions.',
        likes: 14,
        comments: 5,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    orders: [],
    payments: [],
    predictions: [],
    buyerInteractions: [],
    priceAlerts: [],
    notifications: [
      createNotification({
        userEmail: 'farmer@farmersmarketplace.app',
        title: 'Agri Trust approved',
        body: 'Your farmer workspace is verified and ready for buyer-facing trade.',
        category: 'system',
        actionHref: '/profile',
      }),
      createNotification({
        userEmail: 'buyer.user@farmersmarketplace.app',
        title: 'New verified lots available',
        body: 'Fresh maize and soybean lots are now available in the marketplace.',
        category: 'trade',
        actionHref: '/marketplace',
      }),
      createNotification({
        userEmail: 'admin@farmersmarketplace.app',
        title: 'Command center synced',
        body: 'Admin command center is using the live platform data store.',
        category: 'ops',
        actionHref: '/admin/dashboard',
      }),
    ],
    shipments: [],
    invoices: [],
    financeTransactions: [
      {
        id: id('txn'),
        userEmail: 'farmer@farmersmarketplace.app',
        type: 'Initial wallet credit',
        amount: 50000,
        direction: 'in',
        method: 'system',
        status: 'completed',
        createdAt: timestamp,
      },
    ],
    walletFundingRequests: [],
    loanApplications: [],
    negotiations: [],
    agriTrustForms: [
      {
        id: id('atf'),
        title: 'Farmer identity refresh',
        description: 'Confirm Aadhaar, mandi preference, and dispatch contact details before the next buyer cycle.',
        audienceRole: 'user',
        fields: [
          { id: id('fld'), label: 'Aadhaar number', type: 'text', required: true, placeholder: '12-digit Aadhaar number' },
          { id: id('fld'), label: 'Preferred mandi', type: 'text', required: true, placeholder: 'Example: Pune APMC' },
          { id: id('fld'), label: 'Dispatch contact phone', type: 'text', required: true, placeholder: 'Primary phone for logistics confirmation' },
        ],
        createdBy: 'admin@farmersmarketplace.app',
        status: 'open',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    agriTrustSubmissions: [],
    fieldReports: [],
    communicationGroups: [],
    communicationGroupMessages: [],
    config: {
      accessPolicy: {
        farmerPlan: 'Free for all users',
        buyerPlan: 'Free for all users',
      },
      categories: {
        crops: ['Maize', 'Beans', 'Coffee', 'Cassava', 'Banana'],
        inputs: ['Seeds', 'Fertilizers', 'Agrochemicals', 'Tools'],
      },
      ui: {
        supportedLanguages: ['en', 'hi'],
        defaultLanguage: 'en',
      },
      finance: {
        settlementAccountName: 'Farmer Marketplace Escrow Desk',
        settlementAccountNumber: '221100987654321',
        settlementIfsc: 'SBIN0001543',
        settlementUpi: 'farmersmarketplace@upi',
      },
      developer: {
        name: '',
        photoUrl: '',
        college: '',
        rollNo: '',
        address: '',
        contact: '',
        bio: '',
      },
    },
  };
}

async function ensureDbFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(seedDb(), null, 2), 'utf8');
  }
}

function normalizeDb(parsed: Partial<PlatformDb>): PlatformDb {
  const timestamp = nowIso();
  return ensurePlatformBaseline({
    users: (parsed.users ?? []).map((user) => ({
      ...user,
      status: user.status ?? 'active',
      isPro: user.isPro ?? true,
      aiCredits: user.aiCredits ?? 9999,
      createdAt: user.createdAt ?? timestamp,
      updatedAt: user.updatedAt ?? user.createdAt ?? timestamp,
    })),
    profiles: (parsed.profiles ?? []).map((profile) => {
      const trustScore = profile.trustScore ?? buildTrustScore(profile as UserWorkspaceProfile);
      return {
        ...profile,
        preferredLanguage: (profile.preferredLanguage ?? 'en') as AppLanguage,
        notificationPreferences: profile.notificationPreferences ?? defaultNotificationPreferences(),
        trustScore,
        trustLabel: profile.trustLabel ?? buildTrustLabel(trustScore),
        verification: profile.verification ?? { farmer: null, buyer: null, admin: null },
        createdAt: profile.createdAt ?? timestamp,
        updatedAt: profile.updatedAt ?? profile.createdAt ?? timestamp,
      };
    }),
    otpChallenges: (parsed.otpChallenges ?? []).map((challenge) => ({
      ...challenge,
      resendAvailableAt: challenge.resendAvailableAt ?? challenge.updatedAt ?? challenge.createdAt ?? timestamp,
      lastSentAt: challenge.lastSentAt ?? challenge.updatedAt ?? challenge.createdAt ?? timestamp,
      sendCount: challenge.sendCount ?? 1,
    })),
    products: parsed.products ?? [],
    listings: parsed.listings ?? [],
    buyers: parsed.buyers ?? [],
    prices: parsed.prices ?? [],
    posts: parsed.posts ?? [],
    orders: parsed.orders ?? [],
    payments: parsed.payments ?? [],
    predictions: parsed.predictions ?? [],
    buyerInteractions: parsed.buyerInteractions ?? [],
    priceAlerts: parsed.priceAlerts ?? [],
    notifications: parsed.notifications ?? [],
    shipments: (parsed.shipments ?? []).map((shipment) => ({
      ...shipment,
      routeCode: shipment.routeCode ?? `RT-${shipment.id?.slice(-5) ?? '00000'}`,
      vehicleId: shipment.vehicleId ?? 'AGFLEET-01',
      checkpoints:
        shipment.checkpoints?.length
          ? shipment.checkpoints
          : [
              createShipmentCheckpoint(
                shipment.status ?? 'processing',
                shipment.lastCheckpoint ?? 'Shipment created',
                shipment.origin ?? 'Dispatch node'
              ),
            ],
      deliveryVerified: shipment.deliveryVerified ?? Boolean(shipment.acknowledgedAt),
      updatedAt: shipment.updatedAt ?? timestamp,
      createdAt: shipment.createdAt ?? timestamp,
    })),
    invoices: parsed.invoices ?? [],
    financeTransactions: parsed.financeTransactions ?? [],
    walletFundingRequests: parsed.walletFundingRequests ?? [],
    loanApplications: parsed.loanApplications ?? [],
    negotiations: parsed.negotiations ?? [],
    agriTrustForms: parsed.agriTrustForms ?? [],
    agriTrustSubmissions: parsed.agriTrustSubmissions ?? [],
    fieldReports: parsed.fieldReports ?? [],
    communicationGroups: parsed.communicationGroups ?? [],
    communicationGroupMessages: parsed.communicationGroupMessages ?? [],
    config: {
      accessPolicy: {
        farmerPlan: parsed.config?.accessPolicy?.farmerPlan ?? 'Free for all users',
        buyerPlan: parsed.config?.accessPolicy?.buyerPlan ?? 'Free for all users',
      },
      categories: {
        crops: parsed.config?.categories?.crops ?? [],
        inputs: parsed.config?.categories?.inputs ?? [],
      },
      ui: {
        supportedLanguages: parsed.config?.ui?.supportedLanguages ?? ['en', 'hi'],
        defaultLanguage: parsed.config?.ui?.defaultLanguage ?? 'en',
      },
      finance: {
        settlementAccountName: parsed.config?.finance?.settlementAccountName ?? 'Farmer Marketplace Escrow Desk',
        settlementAccountNumber: parsed.config?.finance?.settlementAccountNumber ?? '221100987654321',
        settlementIfsc: parsed.config?.finance?.settlementIfsc ?? 'SBIN0001543',
        settlementUpi: parsed.config?.finance?.settlementUpi ?? 'farmersmarketplace@upi',
      },
      developer: {
        name: parsed.config?.developer?.name ?? '',
        photoUrl: parsed.config?.developer?.photoUrl ?? '',
        college: parsed.config?.developer?.college ?? '',
        rollNo: parsed.config?.developer?.rollNo ?? '',
        address: parsed.config?.developer?.address ?? '',
        contact: parsed.config?.developer?.contact ?? '',
        bio: parsed.config?.developer?.bio ?? '',
      },
    },
  });
}

function cloneDb(db: PlatformDb): PlatformDb {
  return JSON.parse(JSON.stringify(db)) as PlatformDb;
}

function shouldUseNetlifyBlobs(): boolean {
  return process.env.NETLIFY === 'true' || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function getNetlifyDbStore() {
  return getStore({
    name: NETLIFY_DB_STORE_NAME,
    consistency: 'strong',
  });
}

async function loadInitialDb(): Promise<PlatformDb> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return normalizeDb(JSON.parse(raw) as Partial<PlatformDb>);
  } catch {
    return seedDb();
  }
}

async function readDbFromNetlify(): Promise<PlatformDb> {
  const store = getNetlifyDbStore();
  const existing = await store.get(NETLIFY_DB_KEY, {
    type: 'json',
    consistency: 'strong',
  });

  if (!existing) {
    const initial = await loadInitialDb();
    await store.setJSON(NETLIFY_DB_KEY, initial, { onlyIfNew: true });
    const seeded = await store.get(NETLIFY_DB_KEY, {
      type: 'json',
      consistency: 'strong',
    });
    const parsed = normalizeDb((seeded as Partial<PlatformDb> | null) ?? initial);
    pruneOtpChallenges(parsed);
    return parsed;
  }

  const parsed = normalizeDb(existing as Partial<PlatformDb>);
  pruneOtpChallenges(parsed);
  return parsed;
}

async function updateDbInNetlify(mutator: (db: PlatformDb) => void): Promise<PlatformDb> {
  const store = getNetlifyDbStore();

  for (let attempt = 0; attempt < NETLIFY_DB_WRITE_RETRIES; attempt += 1) {
    const existing = await store.getWithMetadata(NETLIFY_DB_KEY, {
      type: 'json',
      consistency: 'strong',
    });
    const current = normalizeDb((existing?.data as Partial<PlatformDb> | undefined) ?? (await loadInitialDb()));
    pruneOtpChallenges(current);
    const next = cloneDb(current);
    mutator(next);

    const result = existing
      ? await store.setJSON(NETLIFY_DB_KEY, next, { onlyIfMatch: existing.etag })
      : await store.setJSON(NETLIFY_DB_KEY, next, { onlyIfNew: true });

    if (result.modified) {
      return next;
    }
  }

  throw new Error('Database update failed after repeated Netlify Blob write conflicts.');
}

async function loadDbFromDisk(): Promise<PlatformDb> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');
  const parsed = normalizeDb(JSON.parse(raw) as Partial<PlatformDb>);
  pruneOtpChallenges(parsed);
  dbCache = parsed;
  return parsed;
}

async function readDb(): Promise<PlatformDb> {
  if (shouldUseNetlifyBlobs()) {
    return readDbFromNetlify();
  }
  if (dbCache) return dbCache;
  if (!dbReadPromise) {
    dbReadPromise = loadDbFromDisk().finally(() => {
      dbReadPromise = null;
    });
  }
  return dbReadPromise;
}

async function flushDbToDisk(): Promise<void> {
  if (!dbCache || !dbDirty) return;
  dbDirty = false;
  await ensureDbFile();
  const tmpFile = `${DB_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(dbCache, null, 2), 'utf8');
  await fs.rename(tmpFile, DB_FILE);
  if (dbDirty) {
    await flushDbToDisk();
  }
}

function scheduleDbFlush(): void {
  dbDirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushChain = flushChain
      .then(() => flushDbToDisk())
      .catch(() => {
        dbDirty = true;
      });
  }, 25);
}

function writeDb(next: PlatformDb): void {
  dbCache = next;
  scheduleDbFlush();
}

async function updateDb(mutator: (db: PlatformDb) => void): Promise<PlatformDb> {
  if (shouldUseNetlifyBlobs()) {
    return updateDbInNetlify(mutator);
  }
  let result: PlatformDb | null = null;
  mutationQueue = mutationQueue.then(async () => {
    const db = await readDb();
    mutator(db);
    writeDb(db);
    result = db;
  });
  await mutationQueue;
  if (!result) {
    throw new Error('Database update failed');
  }
  return result;
}

export const platformStore = {
  sessionCookieName: SESSION_COOKIE_NAME,

  createSessionToken,
  verifySessionToken,

  async health() {
    const db = await readDb();
    return {
      status: 'ok',
      users: db.users.length,
      otpChallenges: db.otpChallenges.length,
      products: db.products.length,
      listings: db.listings.length,
      buyers: db.buyers.length,
      prices: db.prices.length,
      posts: db.posts.length,
      orders: db.orders.length,
      payments: db.payments.length,
      predictions: db.predictions.length,
      walletFundingRequests: db.walletFundingRequests.length,
      negotiations: db.negotiations.length,
      agriTrustForms: db.agriTrustForms.length,
      agriTrustSubmissions: db.agriTrustSubmissions.length,
      fieldReports: db.fieldReports.length,
      communicationGroups: db.communicationGroups.length,
      communicationGroupMessages: db.communicationGroupMessages.length,
    };
  },

  async login(email: string, password: string, role?: UserRole): Promise<SafeUser | null> {
    const db = await readDb();
    const normalizedEmail = normalizeEmail(email);
    const found = db.users.find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!found) return null;
    if (role && found.role !== role) return null;
    if (!verifyPassword(password, found.passwordHash)) return null;
    if (found.status === 'suspended') return null;
    return toSafeUser(found);
  },

  async signup(name: string, email: string, password: string, role: UserRole = 'user'): Promise<SafeUser> {
    let created: SafeUser | null = null;
    await updateDb((db) => {
      const normalizedEmail = normalizeEmail(email);
      if (db.users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
        throw new Error('User with this email already exists.');
      }
      const next = createAppUser(name, normalizedEmail, role, hashPassword(password));
      db.users.push(next);
      created = toSafeUser(next);
      ensureWorkspaceProfile(db, created);
      if (created?.role === 'buyer') {
        ensureBuyerProfile(db, created);
      }
    });
    if (!created) {
      throw new Error('User creation failed');
    }
    return created;
  },

  async requestOtp(input: {
    purpose: AuthOtpPurpose;
    email: string;
    role: UserRole;
    password: string;
    name?: string;
  }): Promise<{ challenge: AuthOtpDispatch; otpCode: string; email: string }> {
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedRole = input.role;
    const normalizedName = input.name ? normalizeName(input.name) : undefined;
    const password = input.password.trim();

    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required.');
    }

    if (input.purpose === 'signup') {
      if (!normalizedName) {
        throw new Error('Name is required for signup.');
      }
      if (normalizedRole === 'admin') {
        throw new Error('Admin signup is invitation-only. Use an existing admin to create admin accounts.');
      }
    }

    let dispatch: { challenge: AuthOtpDispatch; otpCode: string; email: string } | null = null;
    await updateDb((db) => {
      pruneOtpChallenges(db);

      const existingUser = db.users.find((u) => normalizeEmail(u.email) === normalizedEmail);
      if (input.purpose === 'login') {
        if (!existingUser) {
          throw new Error('Invalid email, password, or role.');
        }
        if (existingUser.role !== normalizedRole) {
          throw new Error(`This account is registered as ${existingUser.role === 'user' ? 'farmer' : existingUser.role}. Select the correct role.`);
        }
        if (existingUser.status === 'suspended') {
          throw new Error('This account is suspended and cannot sign in.');
        }
        if (!verifyPassword(password, existingUser.passwordHash)) {
          throw new Error('Invalid email, password, or role.');
        }
      } else if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      const otp = generateOtp();
      const timestamp = nowIso();
      const resendAvailableAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString();
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
      const existingChallenge = db.otpChallenges.find(
        (challenge) => challenge.email === normalizedEmail && challenge.role === normalizedRole && challenge.purpose === input.purpose
      );

      if (existingChallenge) {
        if (isExpired(existingChallenge.expiresAt)) {
          db.otpChallenges = db.otpChallenges.filter((challenge) => challenge.id !== existingChallenge.id);
        } else {
          const waitSeconds = secondsUntil(existingChallenge.resendAvailableAt);
          if (waitSeconds > 0) {
            throw new Error(`Please wait ${waitSeconds} seconds before requesting another OTP.`);
          }
          if (existingChallenge.sendCount >= OTP_SEND_LIMIT) {
            throw new Error('OTP request limit reached for this session. Wait for the current code to expire or use the latest code already sent.');
          }

          existingChallenge.name = normalizedName ?? existingUser?.name ?? existingChallenge.name;
          existingChallenge.pendingPasswordHash = input.purpose === 'signup'
            ? hashPassword(password)
            : undefined;
          existingChallenge.otpHash = hashOtp(existingChallenge.id, otp);
          existingChallenge.attempts = 0;
          existingChallenge.lastSentAt = timestamp;
          existingChallenge.resendAvailableAt = resendAvailableAt;
          existingChallenge.sendCount += 1;
          existingChallenge.updatedAt = timestamp;
          dispatch = { challenge: createOtpDispatch(existingChallenge), otpCode: otp, email: normalizedEmail };
          return;
        }
      }

      const challengeId = id('otp');
      const challenge: AuthOtpChallenge = {
        id: challengeId,
        purpose: input.purpose,
        email: normalizedEmail,
        role: normalizedRole,
        name: normalizedName ?? existingUser?.name,
        pendingPasswordHash: input.purpose === 'signup' ? hashPassword(password) : undefined,
        otpHash: hashOtp(challengeId, otp),
        expiresAt,
        resendAvailableAt,
        lastSentAt: timestamp,
        sendCount: 1,
        attempts: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.otpChallenges = db.otpChallenges.filter(
        (entry) => !(entry.email === normalizedEmail && entry.role === normalizedRole && entry.purpose === input.purpose)
      );
      db.otpChallenges.unshift(challenge);
      dispatch = { challenge: createOtpDispatch(challenge), otpCode: otp, email: normalizedEmail };
    });

    if (!dispatch) {
      throw new Error('Failed to create verification code.');
    }
    return dispatch;
  },

  async deleteOtpChallenge(requestToken: string): Promise<void> {
    await updateDb((db) => {
      db.otpChallenges = db.otpChallenges.filter((challenge) => challenge.id !== requestToken);
    });
  },

  async verifySignupOtp(requestToken: string, otp: string): Promise<SafeUser> {
    const normalizedOtp = otp.trim();
    if (!requestToken || !normalizedOtp) {
      throw new Error('Request token and OTP are required.');
    }

    let created: SafeUser | null = null;
    await updateDb((db) => {
      pruneOtpChallenges(db);
      const challengeIndex = db.otpChallenges.findIndex((challenge) => challenge.id === requestToken && challenge.purpose === 'signup');
      if (challengeIndex < 0) {
        throw new Error('Verification session expired. Request a new OTP.');
      }

      const challenge = db.otpChallenges[challengeIndex];
      if (challenge.attempts >= OTP_ATTEMPT_LIMIT || isExpired(challenge.expiresAt)) {
        db.otpChallenges.splice(challengeIndex, 1);
        throw new Error('OTP expired. Request a new verification code.');
      }

      if (!verifyOtp(challenge.id, normalizedOtp, challenge.otpHash)) {
        challenge.attempts += 1;
        challenge.updatedAt = nowIso();
        if (challenge.attempts >= OTP_ATTEMPT_LIMIT) {
          db.otpChallenges.splice(challengeIndex, 1);
        }
        throw new Error('Invalid OTP.');
      }

      if (!challenge.name || !challenge.pendingPasswordHash) {
        db.otpChallenges.splice(challengeIndex, 1);
        throw new Error('Verification session is invalid. Request a new OTP.');
      }

      if (db.users.some((user) => normalizeEmail(user.email) === challenge.email)) {
        db.otpChallenges.splice(challengeIndex, 1);
        throw new Error('User with this email already exists.');
      }

      const next = createAppUser(challenge.name, challenge.email, challenge.role, challenge.pendingPasswordHash);
      db.users.push(next);
      created = toSafeUser(next);
      ensureWorkspaceProfile(db, created);
      if (created.role === 'buyer') {
        ensureBuyerProfile(db, created);
      }
      db.otpChallenges.splice(challengeIndex, 1);
    });

    if (!created) {
      throw new Error('Signup verification failed.');
    }
    return created;
  },

  async verifyLoginOtp(requestToken: string, otp: string): Promise<SafeUser> {
    const normalizedOtp = otp.trim();
    if (!requestToken || !normalizedOtp) {
      throw new Error('Request token and OTP are required.');
    }

    let signedIn: SafeUser | null = null;
    await updateDb((db) => {
      pruneOtpChallenges(db);
      const challengeIndex = db.otpChallenges.findIndex((challenge) => challenge.id === requestToken && challenge.purpose === 'login');
      if (challengeIndex < 0) {
        throw new Error('Verification session expired. Request a new OTP.');
      }

      const challenge = db.otpChallenges[challengeIndex];
      if (challenge.attempts >= OTP_ATTEMPT_LIMIT || isExpired(challenge.expiresAt)) {
        db.otpChallenges.splice(challengeIndex, 1);
        throw new Error('OTP expired. Request a new verification code.');
      }

      if (!verifyOtp(challenge.id, normalizedOtp, challenge.otpHash)) {
        challenge.attempts += 1;
        challenge.updatedAt = nowIso();
        if (challenge.attempts >= OTP_ATTEMPT_LIMIT) {
          db.otpChallenges.splice(challengeIndex, 1);
        }
        throw new Error('Invalid OTP.');
      }

      const user = db.users.find((entry) => normalizeEmail(entry.email) === challenge.email);
      if (!user || user.role !== challenge.role) {
        db.otpChallenges.splice(challengeIndex, 1);
        throw new Error('Account not found for this verification request.');
      }
      if (user.status === 'suspended') {
        db.otpChallenges.splice(challengeIndex, 1);
        throw new Error('This account is suspended and cannot sign in.');
      }

      signedIn = toSafeUser(user);
      db.otpChallenges.splice(challengeIndex, 1);
    });

    if (!signedIn) {
      throw new Error('Login verification failed.');
    }
    return signedIn;
  },

  async findUserByEmail(email: string): Promise<SafeUser | null> {
    const db = await readDb();
    const found = db.users.find((u) => normalizeEmail(u.email) === normalizeEmail(email));
    return found ? toSafeUser(found) : null;
  },

  async updateUser(email: string, updates: Partial<SafeUser>): Promise<SafeUser | null> {
    let updated: SafeUser | null = null;
    await updateDb((db) => {
      const idx = db.users.findIndex((u) => normalizeEmail(u.email) === normalizeEmail(email));
      if (idx < 0) return;
      db.users[idx] = { ...db.users[idx], ...updates, updatedAt: nowIso() };
      updated = toSafeUser(db.users[idx]);
      if (updated) {
        ensureWorkspaceProfile(db, updated);
      }
    });
    return updated;
  },

  async deleteUser(email: string): Promise<boolean> {
    let deleted = false;
    await updateDb((db) => {
      const normalized = normalizeEmail(email);
      const before = db.users.length;
      db.users = db.users.filter((user) => normalizeEmail(user.email) !== normalized);
      db.profiles = db.profiles.filter((profile) => normalizeEmail(profile.userEmail) !== normalized);
      db.buyers = db.buyers.filter((buyer) => normalizeEmail(buyer.contact ?? '') !== normalized);
      db.notifications = db.notifications.filter((notification) => normalizeEmail(notification.userEmail) !== normalized);
      db.orders = db.orders.filter((order) => normalizeEmail(order.userEmail) !== normalized);
      db.shipments = db.shipments.filter((shipment) => normalizeEmail(shipment.userEmail) !== normalized);
      db.invoices = db.invoices.filter((invoice) => normalizeEmail(invoice.userEmail) !== normalized);
      db.walletFundingRequests = db.walletFundingRequests.filter((request) => normalizeEmail(request.userEmail) !== normalized);
      db.negotiations = db.negotiations.filter(
        (item) => normalizeEmail(item.creatorEmail) !== normalized && normalizeEmail(item.targetEmail ?? '') !== normalized
      );
      db.agriTrustForms = db.agriTrustForms.filter((form) => normalizeEmail(form.createdBy) !== normalized && normalizeEmail(form.targetEmail ?? '') !== normalized);
      db.agriTrustSubmissions = db.agriTrustSubmissions.filter((submission) => normalizeEmail(submission.userEmail) !== normalized);
      db.fieldReports = db.fieldReports.filter((report) => normalizeEmail(report.userEmail) !== normalized);
      db.communicationGroups = db.communicationGroups
        .map((group) => ({
          ...group,
          memberEmails: group.memberEmails.filter((memberEmail) => normalizeEmail(memberEmail) !== normalized),
        }))
        .filter((group) => normalizeEmail(group.createdBy) !== normalized && group.memberEmails.length > 0);
      db.communicationGroupMessages = db.communicationGroupMessages.filter((message) => normalizeEmail(message.senderEmail) !== normalized);
      deleted = db.users.length !== before;
    });
    return deleted;
  },

  async listUsers(): Promise<SafeUser[]> {
    const db = await readDb();
    return db.users.map(toSafeUser);
  },

  async listLocations(): Promise<string[]> {
    const db = await readDb();
    const locations = new Set<string>();
    for (const listing of db.listings) {
      if (listing.location?.trim()) locations.add(listing.location.trim());
    }
    for (const buyer of db.buyers) {
      const city = buyer.location?.split(',')[0]?.trim();
      if (city) locations.add(city);
    }
    for (const price of db.prices) {
      const city = price.market?.split(' ')[0]?.trim();
      if (city) locations.add(city);
    }
    return [...locations].sort((a, b) => a.localeCompare(b));
  },

  async listProducts(): Promise<MarketplaceProduct[]> {
    const db = await readDb();
    return [...db.products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));
  },

  async createProduct(input: Omit<MarketplaceProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceProduct> {
    let created: MarketplaceProduct | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: MarketplaceProduct = { id: id('prd'), ...input, createdAt: timestamp, updatedAt: timestamp };
      db.products.push(next);
      created = next;
    });
    if (!created) {
      throw new Error('Product creation failed');
    }
    return created;
  },

  async listListings(): Promise<FarmerListing[]> {
    const db = await readDb();
    return [...db.listings].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return (b.buyerInterestCount ?? 0) - (a.buyerInterestCount ?? 0);
    });
  },

  async createListing(input: Omit<FarmerListing, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<FarmerListing> {
    let created: FarmerListing | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: FarmerListing = { id: id('lst'), ...input, status: 'active', createdAt: timestamp, updatedAt: timestamp };
      db.listings.push(next);
      created = next;
    });
    if (!created) {
      throw new Error('Listing creation failed');
    }
    return created;
  },

  async listBuyers(): Promise<BuyerProfile[]> {
    const db = await readDb();
    return [...db.buyers].sort((a, b) => Number(Boolean(b.verified)) - Number(Boolean(a.verified)) || (b.trades ?? 0) - (a.trades ?? 0));
  },

  async createBuyer(input: Omit<BuyerProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<BuyerProfile> {
    let created: BuyerProfile | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: BuyerProfile = { id: id('buy'), ...input, createdAt: timestamp, updatedAt: timestamp };
      db.buyers.unshift(next);
      created = next;
    });
    if (!created) throw new Error('Buyer creation failed');
    return created;
  },

  async updateBuyer(idValue: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile | null> {
    let updated: BuyerProfile | null = null;
    await updateDb((db) => {
      const index = db.buyers.findIndex((buyer) => buyer.id === idValue);
      if (index < 0) return;
      db.buyers[index] = { ...db.buyers[index], ...updates, updatedAt: nowIso() };
      updated = db.buyers[index];
    });
    return updated;
  },

  async deleteBuyer(idValue: string): Promise<boolean> {
    let deleted = false;
    await updateDb((db) => {
      const before = db.buyers.length;
      db.buyers = db.buyers.filter((buyer) => buyer.id !== idValue);
      deleted = db.buyers.length !== before;
    });
    return deleted;
  },

  async listPrices(): Promise<CommodityPrice[]> {
    const db = await readDb();
    const sorted = [...db.prices].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.commodity.localeCompare(b.commodity));
    return sorted.map((row) => enrichCommodityPrice(row, sorted));
  },

  async addPriceEntry(entry: Omit<CommodityPrice, 'id' | 'timestamp'>): Promise<CommodityPrice> {
    let created: CommodityPrice | null = null;
    await updateDb((db) => {
      const next: CommodityPrice = { id: id('prc'), timestamp: nowIso(), ...entry };
      db.prices.unshift(next);
      created = next;
    });
    if (!created) {
      throw new Error('Price entry creation failed');
    }
    const history = await readDb();
    return enrichCommodityPrice(created, history.prices);
  },

  async listPosts(): Promise<CommunityPost[]> {
    const db = await readDb();
    return [...db.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createPost(input: Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'comments'>): Promise<CommunityPost> {
    let created: CommunityPost | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: CommunityPost = { id: id('pst'), ...input, likes: 0, comments: 0, createdAt: timestamp, updatedAt: timestamp };
      db.posts.unshift(next);
      created = next;
    });
    if (!created) {
      throw new Error('Post creation failed');
    }
    return created;
  },

  async updatePost(idValue: string, updates: Partial<Pick<CommunityPost, 'title' | 'content'>>): Promise<CommunityPost | null> {
    let updated: CommunityPost | null = null;
    await updateDb((db) => {
      const index = db.posts.findIndex((post) => post.id === idValue);
      if (index < 0) return;
      db.posts[index] = { ...db.posts[index], ...updates, updatedAt: nowIso() };
      updated = db.posts[index];
    });
    return updated;
  },

  async deletePost(idValue: string): Promise<boolean> {
    let deleted = false;
    await updateDb((db) => {
      const before = db.posts.length;
      db.posts = db.posts.filter((post) => post.id !== idValue);
      deleted = db.posts.length !== before;
    });
    return deleted;
  },

  async createOrder(input: {
    userEmail: string;
    userName: string;
    items: OrderItem[];
    shippingAddress: string;
  }): Promise<PlatformOrder> {
    let created: PlatformOrder | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const invoiceId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
      const shipmentId = `SHP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
      const next: PlatformOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
        userEmail: input.userEmail,
        userName: input.userName,
        items: input.items,
        totalAmount,
        status: 'created',
        paymentStatus: 'initiated',
        invoiceId,
        shipmentId,
        courier: 'AgriFleet',
        shippingAddress: input.shippingAddress,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.orders.unshift(next);
      db.invoices.unshift({
        id: invoiceId,
        orderId: next.id,
        userEmail: input.userEmail,
        issuedTo: input.userName,
        issuedBy: 'Farmer Marketplace Commerce',
        lineItems: input.items,
        subtotal: totalAmount,
        taxAmount: 0,
        totalAmount,
        createdAt: timestamp,
      });
      db.shipments.unshift({
        id: shipmentId,
        orderId: next.id,
        userEmail: input.userEmail,
        courier: 'AgriFleet',
        origin: 'Platform dispatch node',
        destination: input.shippingAddress,
        routeCode: `RT-${shipmentId.slice(-5)}`,
        vehicleId: 'AGFLEET-01',
        etaHours: 36,
        status: 'processing',
        lastCheckpoint: 'Order created and awaiting payment confirmation',
        checkpoints: [createShipmentCheckpoint('processing', 'Order created and awaiting payment confirmation', 'Platform dispatch node', 'system')],
        deliveryVerified: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      db.notifications.unshift(
        createNotification({
          userEmail: input.userEmail,
          title: 'Order created',
          body: `${next.id} has been created and moved to payment confirmation.`,
          category: 'trade',
          actionHref: '/profile',
        })
      );
      created = next;
    });
    if (!created) {
      throw new Error('Order creation failed');
    }
    return created;
  },

  async listOrders(userEmail?: string): Promise<PlatformOrder[]> {
    const db = await readDb();
    const orders = !userEmail ? db.orders : db.orders.filter((order) => order.userEmail.toLowerCase() === userEmail.toLowerCase());
    return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrderById(orderId: string): Promise<PlatformOrder | null> {
    const db = await readDb();
    return db.orders.find((order) => order.id === orderId) ?? null;
  },

  async recordPayment(input: {
    orderId: string;
    userEmail: string;
    amount: number;
    method: PaymentRecord['method'];
    success?: boolean;
  }): Promise<{ order: PlatformOrder; payment: PaymentRecord }> {
    let result: { order: PlatformOrder; payment: PaymentRecord } | null = null;
    await updateDb((db) => {
      const orderIndex = db.orders.findIndex((order) => order.id === input.orderId);
      if (orderIndex < 0) {
        throw new Error('Order not found');
      }
      const timestamp = nowIso();
      const paymentStatus: PaymentStatus = input.success === false ? 'failed' : 'paid';
      const payment: PaymentRecord = {
        id: id('pay'),
        orderId: input.orderId,
        userEmail: input.userEmail,
        amount: input.amount,
        status: paymentStatus,
        method: input.method,
        transactionRef: `TXN-${Date.now().toString().slice(-8)}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.payments.unshift(payment);
      const shipmentIndex = db.shipments.findIndex((shipment) => shipment.orderId === input.orderId);
      if (shipmentIndex >= 0) {
        const shipmentStatus = paymentStatus === 'paid' ? 'packed' : 'processing';
        const checkpointNote = paymentStatus === 'paid' ? 'Payment cleared and packed for dispatch' : 'Payment failed, awaiting retry';
        db.shipments[shipmentIndex] = {
          ...db.shipments[shipmentIndex],
          status: shipmentStatus,
          etaHours: paymentStatus === 'paid' ? Math.max(18, db.shipments[shipmentIndex].etaHours - 8) : db.shipments[shipmentIndex].etaHours,
          lastCheckpoint: checkpointNote,
          checkpoints: [
            createShipmentCheckpoint(
              shipmentStatus,
              checkpointNote,
              db.shipments[shipmentIndex].origin,
              'payment-system'
            ),
            ...(db.shipments[shipmentIndex].checkpoints ?? []),
          ],
          updatedAt: timestamp,
        };
      }
      db.orders[orderIndex] = {
        ...db.orders[orderIndex],
        paymentStatus,
        status: paymentStatus === 'paid' ? 'paid' : 'failed',
        updatedAt: timestamp,
      };
      db.notifications.unshift(
        createNotification({
          userEmail: input.userEmail,
          title: paymentStatus === 'paid' ? 'Payment successful' : 'Payment failed',
          body:
            paymentStatus === 'paid'
              ? `Order ${input.orderId} is confirmed and shipment preparation has started.`
              : `Order ${input.orderId} needs a new payment attempt.`,
          category: paymentStatus === 'paid' ? 'finance' : 'system',
          actionHref: '/profile',
        })
      );
      result = { order: db.orders[orderIndex], payment };
    });
    if (!result) {
      throw new Error('Payment recording failed');
    }
    return result;
  },

  async listPayments(userEmail?: string): Promise<PaymentRecord[]> {
    const db = await readDb();
    const payments = !userEmail ? db.payments : db.payments.filter((payment) => payment.userEmail.toLowerCase() === userEmail.toLowerCase());
    return [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listInvoices(userEmail?: string): Promise<InvoiceRecord[]> {
    const db = await readDb();
    const invoices = userEmail ? db.invoices.filter((invoice) => invoice.userEmail.toLowerCase() === userEmail.toLowerCase()) : db.invoices;
    return [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listShipments(userEmail?: string): Promise<ShipmentRecord[]> {
    const db = await readDb();
    const shipments = userEmail ? db.shipments.filter((shipment) => shipment.userEmail.toLowerCase() === userEmail.toLowerCase()) : db.shipments;
    return [...shipments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async updateShipment(
    idValue: string,
    updates: Partial<Pick<ShipmentRecord, 'status' | 'lastCheckpoint' | 'etaHours' | 'courier' | 'vehicleId' | 'routeCode'> & { checkpointLocation: string; updatedBy: string }>
  ): Promise<ShipmentRecord | null> {
    let updated: ShipmentRecord | null = null;
    await updateDb((db) => {
      const index = db.shipments.findIndex((shipment) => shipment.id === idValue);
      if (index < 0) return;
      const current = db.shipments[index];
      const nextStatus = updates.status ?? current.status;
      const nextCheckpoint = updates.lastCheckpoint ?? current.lastCheckpoint;
      const nextLocation = updates.checkpointLocation ?? current.destination;
      db.shipments[index] = {
        ...current,
        ...updates,
        status: nextStatus,
        lastCheckpoint: nextCheckpoint,
        deliveryVerified: nextStatus === 'delivered' ? current.deliveryVerified : false,
        checkpoints:
          current.status !== nextStatus || current.lastCheckpoint !== nextCheckpoint
            ? [createShipmentCheckpoint(nextStatus, nextCheckpoint, nextLocation, updates.updatedBy), ...(current.checkpoints ?? [])]
            : current.checkpoints ?? [],
        updatedAt: nowIso(),
      };
      updated = db.shipments[index];
      db.notifications.unshift(
        createNotification({
          userEmail: db.shipments[index].userEmail,
          title: 'Shipment updated',
          body: `${db.shipments[index].id} is now ${db.shipments[index].status.replace(/_/g, ' ')}.`,
          category: 'ops',
          actionHref: '/logistics-hub',
        })
      );
    });
    return updated;
  },

  async acknowledgeShipment(idValue: string, actorEmail: string): Promise<ShipmentRecord | null> {
    let updated: ShipmentRecord | null = null;
    await updateDb((db) => {
      const index = db.shipments.findIndex((shipment) => shipment.id === idValue && shipment.userEmail.toLowerCase() === actorEmail.toLowerCase());
      if (index < 0) return;
      const current = db.shipments[index];
      const timestamp = nowIso();
      db.shipments[index] = {
        ...current,
        status: 'delivered',
        lastCheckpoint: 'Delivery received and acknowledged by verified customer',
        deliveryVerified: true,
        acknowledgedBy: actorEmail,
        acknowledgedAt: timestamp,
        checkpoints: [
          createShipmentCheckpoint('delivered', 'Delivery received and acknowledged by verified customer', current.destination, actorEmail),
          ...(current.checkpoints ?? []),
        ],
        updatedAt: timestamp,
      };
      updated = db.shipments[index];
      db.notifications.unshift(
        createNotification({
          userEmail: actorEmail,
          title: 'Delivery acknowledged',
          body: `${current.id} has been marked as received by the customer.`,
          category: 'ops',
          actionHref: '/profile',
        })
      );
    });
    return updated;
  },

  async logPrediction(input: {
    type: PredictionKind;
    userEmail: string;
    inputSummary: string;
    outputSummary: string;
  }): Promise<PredictionLog> {
    let created: PredictionLog | null = null;
    await updateDb((db) => {
      const next: PredictionLog = {
        id: id('pred'),
        type: input.type,
        userEmail: input.userEmail,
        inputSummary: input.inputSummary,
        outputSummary: input.outputSummary,
        createdAt: nowIso(),
      };
      db.predictions.unshift(next);
      created = next;
    });
    if (!created) {
      throw new Error('Prediction logging failed');
    }
    return created;
  },

  async listPredictions(userEmail?: string): Promise<PredictionLog[]> {
    const db = await readDb();
    const predictions = userEmail
      ? db.predictions.filter((prediction) => prediction.userEmail.toLowerCase() === userEmail.toLowerCase())
      : db.predictions;
    return [...predictions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listBuyerInteractions(userEmail?: string): Promise<BuyerInteraction[]> {
    const db = await readDb();
    const interactions = userEmail
      ? db.buyerInteractions.filter((interaction) => interaction.senderEmail.toLowerCase() === userEmail.toLowerCase())
      : db.buyerInteractions;
    return [...interactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createBuyerInteraction(input: Omit<BuyerInteraction, 'id' | 'createdAt' | 'status'> & { status?: BuyerInteraction['status'] }): Promise<BuyerInteraction> {
    let created: BuyerInteraction | null = null;
    await updateDb((db) => {
      const next: BuyerInteraction = {
        id: id('int'),
        ...input,
        status: input.status ?? (input.mode === 'call' ? 'scheduled' : 'pending'),
        createdAt: nowIso(),
      };
      db.buyerInteractions.unshift(next);
      created = next;
    });
    if (!created) throw new Error('Interaction creation failed');
    return created;
  },

  async listPriceAlerts(userEmail?: string): Promise<PriceAlert[]> {
    const db = await readDb();
    return userEmail ? db.priceAlerts.filter((alert) => alert.userEmail.toLowerCase() === userEmail.toLowerCase()) : db.priceAlerts;
  },

  async createPriceAlert(input: Omit<PriceAlert, 'id' | 'createdAt'>): Promise<PriceAlert> {
    let created: PriceAlert | null = null;
    await updateDb((db) => {
      const next: PriceAlert = { id: id('alt'), ...input, createdAt: nowIso() };
      db.priceAlerts.unshift(next);
      created = next;
    });
    if (!created) throw new Error('Price alert creation failed');
    return created;
  },

  async listFinanceTransactions(userEmail?: string): Promise<FinanceTransaction[]> {
    const db = await readDb();
    const transactions = userEmail
      ? db.financeTransactions.filter((transaction) => transaction.userEmail.toLowerCase() === userEmail.toLowerCase())
      : db.financeTransactions;
    return [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createFinanceTransaction(input: Omit<FinanceTransaction, 'id' | 'createdAt' | 'status'> & { status?: FinanceTransaction['status'] }): Promise<FinanceTransaction> {
    let created: FinanceTransaction | null = null;
    await updateDb((db) => {
      const next: FinanceTransaction = {
        id: id('txn'),
        ...input,
        status: input.status ?? 'completed',
        createdAt: nowIso(),
      };
      db.financeTransactions.unshift(next);
      db.notifications.unshift(
        createNotification({
          userEmail: input.userEmail,
          title: input.direction === 'in' ? 'Wallet credited' : 'Wallet debited',
          body: `${input.type} for INR ${input.amount.toLocaleString()} has been recorded.`,
          category: 'finance',
          actionHref: '/finance',
        })
      );
      created = next;
    });
    if (!created) throw new Error('Transaction creation failed');
    return created;
  },

  async listWalletFundingRequests(userEmail?: string): Promise<WalletFundingRequest[]> {
    const db = await readDb();
    const items = userEmail
      ? db.walletFundingRequests.filter((request) => request.userEmail.toLowerCase() === userEmail.toLowerCase())
      : db.walletFundingRequests;
    return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createWalletFundingRequest(input: Omit<WalletFundingRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WalletFundingRequest> {
    let created: WalletFundingRequest | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: WalletFundingRequest = {
        id: id('wfr'),
        ...input,
        status: 'requested',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.walletFundingRequests.unshift(next);
      notifyAdmins(db, {
        title: 'Wallet funding request pending',
        body: `${input.userName} requested INR ${input.amount.toLocaleString()} wallet funding approval.`,
        category: 'finance',
        actionHref: '/admin/financials',
      });
      created = next;
    });
    if (!created) throw new Error('Wallet funding request failed');
    return created;
  },

  async updateWalletFundingRequest(
    idValue: string,
    updates: Partial<Pick<WalletFundingRequest, 'status' | 'adminInstructions' | 'paymentReference' | 'verifiedBy'>>
  ): Promise<WalletFundingRequest | null> {
    let updated: WalletFundingRequest | null = null;
    await updateDb((db) => {
      const index = db.walletFundingRequests.findIndex((request) => request.id === idValue);
      if (index < 0) return;
      db.walletFundingRequests[index] = {
        ...db.walletFundingRequests[index],
        ...updates,
        updatedAt: nowIso(),
      };
      updated = db.walletFundingRequests[index];
      if (updated.status === 'verified') {
        db.financeTransactions.unshift({
          id: id('txn'),
          userEmail: updated.userEmail,
          type: 'Wallet funding approved by admin',
          amount: updated.amount,
          direction: 'in',
          method: 'manual-bank-transfer',
          status: 'verified',
          createdAt: nowIso(),
        });
        db.notifications.unshift(
          createNotification({
            userEmail: updated.userEmail,
            title: 'Wallet funding verified',
            body: `Admin verified INR ${updated.amount.toLocaleString()} for your wallet.`,
            category: 'finance',
            actionHref: '/finance',
          })
        );
      }
    });
    return updated;
  },

  async listLoanApplications(userEmail?: string): Promise<LoanApplication[]> {
    const db = await readDb();
    const loans = userEmail
      ? db.loanApplications.filter((loan) => loan.userEmail.toLowerCase() === userEmail.toLowerCase())
      : db.loanApplications;
    return [...loans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createLoanApplication(input: Omit<LoanApplication, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'risk'> & { risk?: LoanApplication['risk']; status?: LoanApplication['status'] }): Promise<LoanApplication> {
    let created: LoanApplication | null = null;
    await updateDb((db) => {
      const profile = db.profiles.find((profileRow) => profileRow.userEmail.toLowerCase() === input.userEmail.toLowerCase());
      if (!profile || profile.trustScore < 90) {
        throw new Error('Only Agri Trust verified customers can request loans.');
      }
      const timestamp = nowIso();
      const risk: LoanApplication['risk'] = input.amount >= 500000 ? 'High' : input.amount >= 200000 ? 'Medium' : 'Low';
      const next: LoanApplication = {
        id: `LOAN-${Date.now().toString().slice(-6)}`,
        ...input,
        risk: input.risk ?? risk,
        status: input.status ?? 'Pending',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.loanApplications.unshift(next);
      db.notifications.unshift(
        createNotification({
          userEmail: input.userEmail,
          title: 'Loan application submitted',
          body: `${next.id} for INR ${next.amount.toLocaleString()} is now under review.`,
          category: 'finance',
          actionHref: '/finance',
        })
      );
      created = next;
    });
    if (!created) throw new Error('Loan application failed');
    return created;
  },

  async updateLoanApplication(idValue: string, updates: Partial<Pick<LoanApplication, 'status' | 'risk'>>): Promise<LoanApplication | null> {
    let updated: LoanApplication | null = null;
    await updateDb((db) => {
      const index = db.loanApplications.findIndex((loan) => loan.id === idValue);
      if (index < 0) return;
      db.loanApplications[index] = { ...db.loanApplications[index], ...updates, updatedAt: nowIso() };
      updated = db.loanApplications[index];
    });
    return updated;
  },

  async listNegotiations(userEmail?: string): Promise<NegotiationRecord[]> {
    const db = await readDb();
    const items = userEmail
      ? db.negotiations.filter(
          (item) =>
            item.creatorEmail.toLowerCase() === userEmail.toLowerCase() ||
            (item.targetEmail ? item.targetEmail.toLowerCase() === userEmail.toLowerCase() : false)
        )
      : db.negotiations;
    return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createNegotiation(input: Omit<NegotiationRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: NegotiationRecord['status'] }): Promise<NegotiationRecord> {
    let created: NegotiationRecord | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: NegotiationRecord = {
        id: id('neg'),
        ...input,
        status: input.status ?? 'awaiting-response',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.negotiations.unshift(next);
      if (input.targetEmail) {
        db.notifications.unshift(
          createNotification({
            userEmail: input.targetEmail,
            title: input.mode === 'form' ? 'Information request received' : 'Negotiation update received',
            body: `${input.creatorName} shared ${input.mode} details for ${input.commodity}.`,
            category: 'trade',
            actionHref: '/buyers',
          })
        );
      }
      created = next;
    });
    if (!created) throw new Error('Negotiation creation failed');
    return created;
  },

  async updateNegotiation(idValue: string, updates: Partial<Pick<NegotiationRecord, 'status' | 'terms' | 'proposedPrice'>>): Promise<NegotiationRecord | null> {
    let updated: NegotiationRecord | null = null;
    await updateDb((db) => {
      const index = db.negotiations.findIndex((item) => item.id === idValue);
      if (index < 0) return;
      db.negotiations[index] = { ...db.negotiations[index], ...updates, updatedAt: nowIso() };
      updated = db.negotiations[index];
    });
    return updated;
  },

  async listAgriTrustForms(userEmail?: string, role?: UserRole): Promise<AgriTrustForm[]> {
    const db = await readDb();
    const items = db.agriTrustForms.filter((form) => {
      if (!userEmail && !role) return true;
      if (form.targetEmail && userEmail) return form.targetEmail.toLowerCase() === userEmail.toLowerCase();
      if (role === 'admin') return false;
      if (role) return form.audienceRole === 'all' || form.audienceRole === role;
      return true;
    });
    return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createAgriTrustForm(
    input: Omit<AgriTrustForm, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: AgriTrustForm['status'] }
  ): Promise<AgriTrustForm> {
    let created: AgriTrustForm | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const normalizedTargetEmail = input.targetEmail ? normalizeEmail(input.targetEmail) : null;
      const targetRole = normalizedTargetEmail
        ? db.users.find((user) => normalizeEmail(user.email) === normalizedTargetEmail)?.role
        : null;
      if (targetRole === 'admin') {
        throw new Error('Admin accounts cannot receive AgriTrust customer forms.');
      }
      const next: AgriTrustForm = {
        id: id('atf'),
        ...input,
        status: input.status ?? 'open',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.agriTrustForms.unshift(next);
      const targets = db.users.filter((user) => {
        if (next.targetEmail) return user.email.toLowerCase() === next.targetEmail.toLowerCase();
        if (user.role === 'admin') return false;
        return next.audienceRole === 'all' || user.role === next.audienceRole;
      });
      for (const target of targets) {
        db.notifications.unshift(
          createNotification({
            userEmail: target.email,
            title: 'AgriTrust form received',
            body: `${next.title} requires your response in the profile vault.`,
            category: 'system',
            actionHref: '/profile',
          })
        );
      }
      created = next;
    });
    if (!created) throw new Error('AgriTrust form creation failed');
    return created;
  },

  async listAgriTrustSubmissions(userEmail?: string): Promise<AgriTrustFormSubmission[]> {
    const db = await readDb();
    const items = userEmail
      ? db.agriTrustSubmissions.filter((submission) => submission.userEmail.toLowerCase() === userEmail.toLowerCase())
      : db.agriTrustSubmissions;
    return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async submitAgriTrustForm(
    input: Omit<AgriTrustFormSubmission, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reviewedBy' | 'reviewedAt'>
  ): Promise<AgriTrustFormSubmission> {
    let created: AgriTrustFormSubmission | null = null;
    await updateDb((db) => {
      if (input.role === 'admin') {
        throw new Error('Admin accounts cannot submit AgriTrust customer forms.');
      }
      const timestamp = nowIso();
      const existingIndex = db.agriTrustSubmissions.findIndex(
        (submission) => submission.formId === input.formId && submission.userEmail.toLowerCase() === input.userEmail.toLowerCase()
      );
      const next: AgriTrustFormSubmission = {
        id: existingIndex >= 0 ? db.agriTrustSubmissions[existingIndex].id : id('ats'),
        ...input,
        status: 'submitted',
        createdAt: existingIndex >= 0 ? db.agriTrustSubmissions[existingIndex].createdAt : timestamp,
        updatedAt: timestamp,
      };
      if (existingIndex >= 0) {
        db.agriTrustSubmissions[existingIndex] = next;
      } else {
        db.agriTrustSubmissions.unshift(next);
      }
      notifyAdmins(db, {
        title: 'AgriTrust submission received',
        body: `${input.userName} submitted a trust form for verification review.`,
        category: 'system',
        actionHref: '/admin/trust',
      });
      created = next;
    });
    if (!created) throw new Error('AgriTrust form submission failed');
    return created;
  },

  async reviewAgriTrustSubmission(
    idValue: string,
    updates: Pick<AgriTrustFormSubmission, 'status'> & { reviewedBy: string }
  ): Promise<AgriTrustFormSubmission | null> {
    let updated: AgriTrustFormSubmission | null = null;
    await updateDb((db) => {
      const index = db.agriTrustSubmissions.findIndex((submission) => submission.id === idValue);
      if (index < 0) return;
      db.agriTrustSubmissions[index] = {
        ...db.agriTrustSubmissions[index],
        status: updates.status,
        reviewedBy: updates.reviewedBy,
        reviewedAt: nowIso(),
        updatedAt: nowIso(),
      };
      updated = db.agriTrustSubmissions[index];
    });
    return updated;
  },

  async listAgriTrustProfiles(viewerRole: UserRole): Promise<UserWorkspaceProfile[]> {
    const db = await readDb();
    const items = db.profiles.filter((profile) => {
      if (viewerRole === 'admin') return profile.role !== 'admin';
      if (viewerRole === 'buyer') return profile.role === 'user';
      return false;
    });
    return [...items].map(normalizeWorkspaceProfileForRole).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async listFieldReports(userEmail?: string): Promise<FarmerFieldReport[]> {
    const db = await readDb();
    const items = userEmail ? db.fieldReports.filter((report) => report.userEmail.toLowerCase() === userEmail.toLowerCase()) : db.fieldReports;
    return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createFieldReport(
    input: Omit<FarmerFieldReport, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'rewardPoints' | 'rewardAmount'>
  ): Promise<FarmerFieldReport> {
    let created: FarmerFieldReport | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const rewardPoints = input.reportType === 'mandi-price' ? 12 : input.reportType === 'weather' ? 8 : 10;
      const rewardAmount = rewardPoints * 10;
      const next: FarmerFieldReport = {
        id: id('frp'),
        ...input,
        rewardPoints,
        rewardAmount,
        status: 'submitted',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.fieldReports.unshift(next);
      notifyAdmins(db, {
        title: 'Farmer field report submitted',
        body: `${input.userName} submitted ${input.reportType} data from ${input.city}.`,
        category: 'ops',
        actionHref: '/admin/trust',
      });
      created = next;
    });
    if (!created) throw new Error('Field report creation failed');
    return created;
  },

  async reviewFieldReport(
    idValue: string,
    updates: Pick<FarmerFieldReport, 'status'> & { verifiedBy: string }
  ): Promise<FarmerFieldReport | null> {
    let updated: FarmerFieldReport | null = null;
    await updateDb((db) => {
      const index = db.fieldReports.findIndex((report) => report.id === idValue);
      if (index < 0) return;
      const current = db.fieldReports[index];
      const timestamp = nowIso();
      db.fieldReports[index] = {
        ...current,
        status: updates.status,
        verifiedBy: updates.verifiedBy,
        verifiedAt: timestamp,
        updatedAt: timestamp,
      };
      updated = db.fieldReports[index];
      if (updates.status === 'verified') {
        const userIndex = db.users.findIndex((user) => user.email.toLowerCase() === current.userEmail.toLowerCase());
        if (userIndex >= 0) {
          db.users[userIndex] = {
            ...db.users[userIndex],
            aiCredits: db.users[userIndex].aiCredits + current.rewardPoints,
            updatedAt: timestamp,
          };
        }
        const profileIndex = db.profiles.findIndex((profile) => profile.userEmail.toLowerCase() === current.userEmail.toLowerCase());
        if (profileIndex >= 0) {
          db.profiles[profileIndex] = {
            ...db.profiles[profileIndex],
            trustScore: Math.min(99, db.profiles[profileIndex].trustScore + Math.ceil(current.rewardPoints / 2)),
            trustLabel: buildTrustLabel(Math.min(99, db.profiles[profileIndex].trustScore + Math.ceil(current.rewardPoints / 2))),
            updatedAt: timestamp,
          };
        }
        db.financeTransactions.unshift({
          id: id('txn'),
          userEmail: current.userEmail,
          type: 'Field intelligence reward',
          amount: current.rewardAmount,
          direction: 'in',
          method: 'wallet-grant',
          status: 'verified',
          createdAt: timestamp,
        });
        db.notifications.unshift(
          createNotification({
            userEmail: current.userEmail,
            title: 'Field report verified',
            body: `Your report earned INR ${current.rewardAmount.toLocaleString()} and ${current.rewardPoints} Agri credits.`,
            category: 'finance',
            actionHref: '/finance',
          })
        );
      }
    });
    return updated;
  },

  async verifyAgriTrustProfile(input: {
    userEmail: string;
    role: 'user' | 'buyer';
    label: string;
    verifiedByEmail: string;
    verifiedByRole: 'admin' | 'buyer';
  }): Promise<UserWorkspaceProfile | null> {
    let updated: UserWorkspaceProfile | null = null;
    await updateDb((db) => {
      const index = db.profiles.findIndex((profile) => profile.userEmail.toLowerCase() === input.userEmail.toLowerCase());
      if (index < 0) return;
      const current = db.profiles[index];
      if (current.role === 'admin') {
        throw new Error('Admin accounts are validators and cannot be AgriTrust verification targets.');
      }
      if (current.role !== input.role) {
        throw new Error(`Profile role mismatch. Expected ${current.role}, received ${input.role}.`);
      }
      if (input.verifiedByRole === 'buyer' && current.role !== 'user') {
        throw new Error('Buyers can validate farmers only.');
      }
      const timestamp = nowIso();
      const verificationEntry = {
        status: 'verified' as const,
        label: input.label,
        submittedAt: input.role === 'user' ? current.verification.farmer?.submittedAt ?? timestamp : current.verification.buyer?.submittedAt ?? timestamp,
        verifiedAt: timestamp,
        verifiedByRole: input.verifiedByRole,
        verifiedByEmail: input.verifiedByEmail,
      };
      const next: UserWorkspaceProfile = {
        ...current,
        verification: {
          farmer: input.role === 'user' ? verificationEntry : current.verification.farmer,
          buyer: input.role === 'buyer' ? verificationEntry : current.verification.buyer,
          admin: current.verification.admin,
        },
        updatedAt: timestamp,
      };
      db.profiles[index] = normalizeWorkspaceProfileForRole(next);
      const normalizedNext = db.profiles[index];

      if (normalizedNext.role === 'buyer') {
        const buyerIndex = db.buyers.findIndex((buyer) => normalizeEmail(buyer.contact ?? '') === normalizedNext.userEmail.toLowerCase());
        if (buyerIndex >= 0) {
          db.buyers[buyerIndex] = {
            ...db.buyers[buyerIndex],
            name: normalizedNext.buyerProfile?.businessName || normalizedNext.displayName,
            location: [normalizedNext.city, normalizedNext.state].filter(Boolean).join(', '),
            verified: true,
            status: 'Verified',
            updatedAt: timestamp,
          };
        } else {
          db.buyers.unshift({
            id: id('buy'),
            name: normalizedNext.buyerProfile?.businessName || normalizedNext.displayName,
            location: [normalizedNext.city, normalizedNext.state].filter(Boolean).join(', '),
            demand: normalizedNext.buyerProfile?.preferredCommodities ?? [],
            capacity: normalizedNext.buyerProfile?.procurementCapacity ?? 'Not provided',
            type: 'Buyer',
            verified: true,
            contact: normalizedNext.userEmail,
            trades: 0,
            status: 'Verified',
            createdAt: normalizedNext.createdAt,
            updatedAt: timestamp,
          });
        }
      }

      db.notifications.unshift(
        createNotification({
          userEmail: input.userEmail,
          title: 'AgriTrust verified',
          body: `${roleDisplay(normalizedNext.role)} workspace is now verified by ${input.verifiedByRole} review.`,
          category: 'system',
          actionHref: '/profile',
        })
      );
      updated = normalizedNext;
    });
    return updated;
  },

  async grantWalletCredit(input: {
    userEmail: string;
    amount: number;
    reason: string;
    approvedBy: string;
  }): Promise<FinanceTransaction> {
    let created: FinanceTransaction | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: FinanceTransaction = {
        id: id('txn'),
        userEmail: input.userEmail,
        type: input.reason,
        amount: input.amount,
        direction: 'in',
        method: `admin-grant:${input.approvedBy}`,
        status: 'verified',
        createdAt: timestamp,
      };
      db.financeTransactions.unshift(next);
      db.notifications.unshift(
        createNotification({
          userEmail: input.userEmail,
          title: 'Admin wallet grant approved',
          body: `INR ${input.amount.toLocaleString()} was credited after proof verification.`,
          category: 'finance',
          actionHref: '/finance',
        })
      );
      created = next;
    });
    if (!created) throw new Error('Wallet grant failed');
    return created;
  },

  async listCommunicationGroups(userEmail?: string): Promise<CommunicationGroup[]> {
    const db = await readDb();
    const items = userEmail
      ? db.communicationGroups.filter((group) => group.memberEmails.some((memberEmail) => memberEmail.toLowerCase() === userEmail.toLowerCase()))
      : db.communicationGroups;
    return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createCommunicationGroup(
    input: Omit<CommunicationGroup, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<CommunicationGroup> {
    let created: CommunicationGroup | null = null;
    await updateDb((db) => {
      const timestamp = nowIso();
      const next: CommunicationGroup = {
        id: id('grp'),
        ...input,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.communicationGroups.unshift(next);
      for (const email of next.memberEmails) {
        db.notifications.unshift(
          createNotification({
            userEmail: email,
            title: 'Added to communication group',
            body: `You were added to ${next.name}.`,
            category: 'community',
            actionHref: '/community',
          })
        );
      }
      created = next;
    });
    if (!created) throw new Error('Communication group creation failed');
    return created;
  },

  async listCommunicationMessages(groupId?: string): Promise<CommunicationGroupMessage[]> {
    const db = await readDb();
    const items = groupId ? db.communicationGroupMessages.filter((message) => message.groupId === groupId) : db.communicationGroupMessages;
    return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async createCommunicationMessage(
    input: Omit<CommunicationGroupMessage, 'id' | 'createdAt'>
  ): Promise<CommunicationGroupMessage> {
    let created: CommunicationGroupMessage | null = null;
    await updateDb((db) => {
      const group = db.communicationGroups.find((item) => item.id === input.groupId);
      if (!group) {
        throw new Error('Communication group not found.');
      }
      const next: CommunicationGroupMessage = {
        id: id('msg'),
        ...input,
        createdAt: nowIso(),
      };
      db.communicationGroupMessages.push(next);
      group.updatedAt = next.createdAt;
      for (const email of group.memberEmails.filter((memberEmail) => memberEmail.toLowerCase() !== input.senderEmail.toLowerCase())) {
        db.notifications.unshift(
          createNotification({
            userEmail: email,
            title: `New message in ${group.name}`,
            body: `${input.senderName}: ${input.body.slice(0, 80)}`,
            category: 'community',
            actionHref: '/community',
          })
        );
      }
      created = next;
    });
    if (!created) throw new Error('Communication message creation failed');
    return created;
  },

  async getUserWorkspace(email: string): Promise<UserWorkspaceProfile | null> {
    const db = await readDb();
    const normalizedEmail = normalizeEmail(email);
    const user = db.users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
    if (!user) return null;
    const existing = db.profiles.find((profile) => normalizeEmail(profile.userEmail) === normalizedEmail);
    return normalizeWorkspaceProfileForRole(existing ?? createWorkspaceProfileForUser(toSafeUser(user)));
  },

  async upsertUserWorkspace(
    email: string,
    updates: Partial<UserWorkspaceProfile> & {
      farmerProfile?: UserWorkspaceProfile['farmerProfile'];
      buyerProfile?: UserWorkspaceProfile['buyerProfile'];
      adminProfile?: UserWorkspaceProfile['adminProfile'];
    }
  ): Promise<UserWorkspaceProfile | null> {
    let updated: UserWorkspaceProfile | null = null;
    await updateDb((db) => {
      const normalizedEmail = normalizeEmail(email);
      const user = db.users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
      if (!user) return;
      ensureWorkspaceProfile(db, toSafeUser(user));
      const index = db.profiles.findIndex((profile) => normalizeEmail(profile.userEmail) === normalizedEmail);
      if (index < 0) return;
      const current = db.profiles[index];
      let next: UserWorkspaceProfile = {
        ...current,
        ...updates,
        farmerProfile: updates.farmerProfile ? { ...current.farmerProfile, ...updates.farmerProfile } : current.farmerProfile,
        buyerProfile: updates.buyerProfile ? { ...current.buyerProfile, ...updates.buyerProfile } : current.buyerProfile,
        adminProfile: updates.adminProfile ? { ...current.adminProfile, ...updates.adminProfile } : current.adminProfile,
        notificationPreferences: {
          ...current.notificationPreferences,
          ...(updates.notificationPreferences ?? {}),
        },
        verification: {
          farmer: updates.verification?.farmer ?? current.verification.farmer,
          buyer: updates.verification?.buyer ?? current.verification.buyer,
          admin: updates.verification?.admin ?? current.verification.admin,
        },
        updatedAt: nowIso(),
      };

      next = normalizeWorkspaceProfileForRole(next);
      db.profiles[index] = next;
      updated = next;

      if (user.role === 'buyer') {
        const buyerIndex = db.buyers.findIndex((buyer) => normalizeEmail(buyer.contact ?? '') === normalizedEmail);
        if (buyerIndex >= 0) {
          db.buyers[buyerIndex] = {
            ...db.buyers[buyerIndex],
            name: next.buyerProfile?.businessName || next.displayName,
            location: [next.city, next.state].filter(Boolean).join(', '),
            verified: Boolean(next.verification.buyer?.status === 'verified'),
            contact: normalizedEmail,
            updatedAt: next.updatedAt,
          };
        } else {
          db.buyers.unshift({
            id: id('buy'),
            name: next.buyerProfile?.businessName || next.displayName,
            location: [next.city, next.state].filter(Boolean).join(', '),
            demand: next.buyerProfile?.preferredCommodities ?? [],
            capacity: next.buyerProfile?.procurementCapacity ?? 'Not provided',
            type: 'Buyer',
            verified: Boolean(next.verification.buyer?.status === 'verified'),
            contact: normalizedEmail,
            trades: 0,
            status: next.verification.buyer?.status === 'verified' ? 'Verified' : 'Pending',
            createdAt: next.createdAt,
            updatedAt: next.updatedAt,
          });
        }
      }
    });
    return updated;
  },

  async listNotifications(userEmail?: string): Promise<UserNotification[]> {
    const db = await readDb();
    const notifications = userEmail
      ? db.notifications.filter((notification) => notification.userEmail.toLowerCase() === userEmail.toLowerCase())
      : db.notifications;
    return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createNotificationForUser(input: Omit<UserNotification, 'id' | 'createdAt' | 'read'>): Promise<UserNotification> {
    let created: UserNotification | null = null;
    await updateDb((db) => {
      const next = createNotification(input);
      db.notifications.unshift(next);
      created = next;
    });
    if (!created) throw new Error('Notification creation failed');
    return created;
  },

  async markNotificationRead(idValue: string): Promise<UserNotification | null> {
    let updated: UserNotification | null = null;
    await updateDb((db) => {
      const index = db.notifications.findIndex((notification) => notification.id === idValue);
      if (index < 0) return;
      db.notifications[index] = { ...db.notifications[index], read: true };
      updated = db.notifications[index];
    });
    return updated;
  },

  async searchGlobal(query: string, userEmail?: string): Promise<GlobalSearchResult[]> {
    const db = await readDb();
    const value = query.trim().toLowerCase();
    if (!value) return [];
    const routeMatches: GlobalSearchResult[] = [
      { id: 'route-dashboard', type: 'route' as const, title: 'Dashboard', subtitle: 'Open operations dashboard', href: '/' },
      { id: 'route-marketplace', type: 'route' as const, title: 'Marketplace', subtitle: 'Browse inputs and farmer lots', href: '/marketplace' },
      { id: 'route-buyers', type: 'route' as const, title: 'Buyer network', subtitle: 'Open verified buyer directory', href: '/buyers' },
      { id: 'route-profile', type: 'route' as const, title: 'My profile', subtitle: 'Manage Agri Trust Protocol data', href: '/profile' },
      { id: 'route-analytics', type: 'route' as const, title: 'Analytics', subtitle: 'Open reporting workspace', href: '/analytics' },
      { id: 'route-developer', type: 'route' as const, title: 'About site developer', subtitle: 'View developer details and profile', href: '/about-developer' },
    ].filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(value));

    const results: GlobalSearchResult[] = [
      ...routeMatches,
      ...db.products
        .filter((product) => `${product.name} ${product.category} ${product.location ?? ''}`.toLowerCase().includes(value))
        .slice(0, 5)
        .map((product) => ({
          id: product.id,
          type: 'product' as const,
          title: product.name,
          subtitle: `${product.category} · ${product.location ?? 'Marketplace'} · INR ${product.price.toLocaleString()}`,
          href: '/marketplace',
        })),
      ...db.listings
        .filter((listing) => `${listing.name} ${listing.commodity ?? ''} ${listing.location}`.toLowerCase().includes(value))
        .slice(0, 5)
        .map((listing) => ({
          id: listing.id,
          type: 'listing' as const,
          title: listing.name,
          subtitle: `${listing.location} · ${listing.quantity ?? 0} MT · INR ${listing.price.toLocaleString()}`,
          href: '/marketplace',
        })),
      ...db.buyers
        .filter((buyer) => `${buyer.name} ${buyer.location} ${buyer.demand.join(' ')}`.toLowerCase().includes(value))
        .slice(0, 5)
        .map((buyer) => ({
          id: buyer.id,
          type: 'buyer' as const,
          title: buyer.name,
          subtitle: `${buyer.location} · ${buyer.capacity}`,
          href: '/buyers',
        })),
      ...db.orders
        .filter((order) => {
          if (userEmail && order.userEmail.toLowerCase() !== userEmail.toLowerCase()) return false;
          return `${order.id} ${order.userName}`.toLowerCase().includes(value);
        })
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          type: 'order' as const,
          title: order.id,
          subtitle: `${order.userName} · INR ${order.totalAmount.toLocaleString()} · ${order.status}`,
          href: '/profile',
        })),
      ...db.notifications
        .filter((notification) => {
          if (userEmail && notification.userEmail.toLowerCase() !== userEmail.toLowerCase()) return false;
          return `${notification.title} ${notification.body}`.toLowerCase().includes(value);
        })
        .slice(0, 5)
        .map((notification) => ({
          id: notification.id,
          type: 'notification' as const,
          title: notification.title,
          subtitle: notification.body,
          href: notification.actionHref || '/profile',
        })),
    ];

    return results.slice(0, 12);
  },

  async getConfig(): Promise<PlatformConfig> {
    const db = await readDb();
    return db.config;
  },

  async updateConfig(updates: Partial<PlatformConfig>): Promise<PlatformConfig> {
    let updated: PlatformConfig | null = null;
    await updateDb((db) => {
      db.config = {
        accessPolicy: { ...db.config.accessPolicy, ...(updates.accessPolicy ?? {}) },
        categories: {
          crops: updates.categories?.crops ?? db.config.categories.crops,
          inputs: updates.categories?.inputs ?? db.config.categories.inputs,
        },
        ui: {
          supportedLanguages: updates.ui?.supportedLanguages ?? db.config.ui.supportedLanguages,
          defaultLanguage: updates.ui?.defaultLanguage ?? db.config.ui.defaultLanguage,
        },
        finance: {
          settlementAccountName: updates.finance?.settlementAccountName ?? db.config.finance.settlementAccountName,
          settlementAccountNumber: updates.finance?.settlementAccountNumber ?? db.config.finance.settlementAccountNumber,
          settlementIfsc: updates.finance?.settlementIfsc ?? db.config.finance.settlementIfsc,
          settlementUpi: updates.finance?.settlementUpi ?? db.config.finance.settlementUpi,
        },
        developer: {
          name: updates.developer?.name ?? db.config.developer.name,
          photoUrl: updates.developer?.photoUrl ?? db.config.developer.photoUrl,
          college: updates.developer?.college ?? db.config.developer.college,
          rollNo: updates.developer?.rollNo ?? db.config.developer.rollNo,
          address: updates.developer?.address ?? db.config.developer.address,
          contact: updates.developer?.contact ?? db.config.developer.contact,
          bio: updates.developer?.bio ?? db.config.developer.bio,
        },
      };
      updated = db.config;
    });
    if (!updated) throw new Error('Config update failed');
    return updated;
  },

  async createAdminUser(name: string, email: string): Promise<{ user: SafeUser; temporaryPassword: string }> {
    const temporaryPassword = `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
    let created: SafeUser | null = null;
    await updateDb((db) => {
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('User with this email already exists.');
      }
      const timestamp = nowIso();
      const next: AppUser = {
        id: id('usr'),
        name,
        email,
        passwordHash: hashPassword(temporaryPassword),
        role: 'admin',
        status: 'active',
        isPro: true,
        aiCredits: 9999,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.users.push(next);
      created = toSafeUser(next);
      if (created) {
        ensureWorkspaceProfile(db, created);
      }
    });
    if (!created) throw new Error('Admin creation failed');
    return { user: created, temporaryPassword };
  },
};
