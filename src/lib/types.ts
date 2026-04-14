export type UserRole = 'user' | 'buyer' | 'admin';
export type AuthOtpPurpose = 'signup' | 'login';
export type AppLanguage = 'en' | 'hi';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'active' | 'suspended';
  isPro: boolean;
  aiCredits: number;
  createdAt: string;
  updatedAt: string;
};

export type SafeUser = Omit<AppUser, 'passwordHash'>;

export type AgriTrustVerification =
  | {
      status: 'pending' | 'verified';
      label: string;
      submittedAt?: string;
      verifiedAt?: string;
      verifiedByRole?: 'admin' | 'buyer' | 'system';
      verifiedByEmail?: string;
    }
  | null;

export type UserNotificationPreferences = {
  priceAlerts: boolean;
  marketplace: boolean;
  community: boolean;
  operations: boolean;
};

export type FarmerProfileDetails = {
  aadhaarNumber: string;
  farmSizeAcres: number;
  primaryCrops: string[];
  mandiPreference: string;
};

export type BuyerProfileDetails = {
  gstin: string;
  businessName: string;
  procurementCapacity: string;
  preferredCommodities: string[];
};

export type AdminProfileDetails = {
  superKey: string;
  department: string;
  accessPasscodeHint: string;
};

export type UserWorkspaceProfile = {
  id: string;
  userEmail: string;
  role: UserRole;
  displayName: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  about: string;
  preferredLanguage: AppLanguage;
  notificationPreferences: UserNotificationPreferences;
  trustScore: number;
  trustLabel: string;
  verification: {
    farmer: AgriTrustVerification;
    buyer: AgriTrustVerification;
    admin: AgriTrustVerification;
  };
  farmerProfile?: FarmerProfileDetails;
  buyerProfile?: BuyerProfileDetails;
  adminProfile?: AdminProfileDetails;
  createdAt: string;
  updatedAt: string;
};

export type AuthOtpChallenge = {
  id: string;
  purpose: AuthOtpPurpose;
  email: string;
  role: UserRole;
  name?: string;
  pendingPasswordHash?: string;
  otpHash: string;
  expiresAt: string;
  resendAvailableAt: string;
  lastSentAt: string;
  sendCount: number;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthOtpDispatch = {
  requestToken: string;
  purpose: AuthOtpPurpose;
  role: UserRole;
  destination: string;
  expiresAt: string;
  resendAvailableAt: string;
  sendCount: number;
  maxSendCount: number;
  deliveryMode?: 'email' | 'preview';
  debugCode?: string;
};

export type MarketplaceProduct = {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageHint?: string;
  seller?: string;
  location?: string;
  sku?: string;
  price: number;
  currency: string;
  unit: string;
  rating: number;
  inStock: boolean;
  stockQuantity?: number;
  moq?: number;
  leadTimeDays?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type FarmerListing = {
  id: string;
  name: string;
  commodity?: string;
  farmerName: string;
  description?: string;
  imageHint?: string;
  price: number;
  unit: string;
  location: string;
  quantity?: number;
  grade?: string;
  harvestDate?: string;
  pricingMode?: 'fixed' | 'negotiable' | 'market-linked';
  priceFloor?: number;
  priceCeiling?: number;
  moisture?: number;
  buyerInterestCount?: number;
  status: 'active' | 'pending';
  createdAt: string;
  updatedAt: string;
};

export type BuyerProfile = {
  id: string;
  name: string;
  location: string;
  demand: string[];
  preferredLocations?: string[];
  specialties?: string[];
  capacity: string;
  type: string;
  verified: boolean;
  contact?: string;
  phone?: string;
  paymentTerms?: string;
  rating?: number;
  trades?: number;
  status?: 'Verified' | 'Pending' | 'Suspended';
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommodityPrice = {
  id: string;
  commodity: string;
  market: string;
  price: number;
  previousPrice?: number;
  arrivalsTons?: number;
  unit: string;
  changePct: number;
  trend: 'up' | 'down' | 'stable';
  baseMsp?: number;
  localDemandIndex?: number;
  localSupplySaturationIndex?: number;
  alpha?: number;
  beta?: number;
  heuristicSuggestedPrice?: number;
  source?: 'sync' | 'heuristic' | 'upstream';
  timestamp: string;
};

export type CommunityPost = {
  id: string;
  authorName: string;
  authorEmail?: string;
  category?: string;
  region?: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = 'created' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'failed';
export type PaymentStatus = 'initiated' | 'paid' | 'failed';
export type PredictionKind = 'price' | 'crop' | 'soil' | 'disease';

export type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  userEmail: string;
  amount: number;
  status: PaymentStatus;
  method: 'cod' | 'upi' | 'card' | 'netbanking';
  transactionRef: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformOrder = {
  id: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  invoiceId?: string;
  shipmentId?: string;
  courier: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
};

export type PredictionLog = {
  id: string;
  type: PredictionKind;
  userEmail: string;
  inputSummary: string;
  outputSummary: string;
  createdAt: string;
};

export type BuyerInteraction = {
  id: string;
  buyerId: string;
  buyerName: string;
  senderEmail: string;
  senderName: string;
  mode: 'message' | 'call';
  lotDetails: string;
  message: string;
  status: 'pending' | 'scheduled' | 'completed';
  createdAt: string;
};

export type PriceAlert = {
  id: string;
  userEmail: string;
  commodity: string;
  market: string;
  currentPrice: number;
  targetPrice: number;
  createdAt: string;
};

export type UserNotification = {
  id: string;
  userEmail: string;
  title: string;
  body: string;
  category: 'system' | 'trade' | 'community' | 'finance' | 'ops';
  read: boolean;
  actionHref?: string;
  createdAt: string;
};

export type ShipmentCheckpoint = {
  status: 'processing' | 'packed' | 'in_transit' | 'out_for_delivery' | 'delivered';
  note: string;
  location: string;
  updatedBy?: string;
  updatedAt: string;
};

export type ShipmentRecord = {
  id: string;
  orderId: string;
  userEmail: string;
  courier: string;
  origin: string;
  destination: string;
  routeCode?: string;
  vehicleId?: string;
  etaHours: number;
  status: 'processing' | 'packed' | 'in_transit' | 'out_for_delivery' | 'delivered';
  lastCheckpoint: string;
  checkpoints: ShipmentCheckpoint[];
  deliveryVerified: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  updatedAt: string;
  createdAt: string;
};

export type InvoiceRecord = {
  id: string;
  orderId: string;
  userEmail: string;
  issuedTo: string;
  issuedBy: string;
  lineItems: OrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
};

export type GlobalSearchResult = {
  id: string;
  type: 'route' | 'product' | 'listing' | 'buyer' | 'order' | 'notification';
  title: string;
  subtitle: string;
  href: string;
};

export type FinanceTransaction = {
  id: string;
  userEmail: string;
  type: string;
  amount: number;
  direction: 'in' | 'out';
  method: string;
  status: 'pending' | 'completed' | 'verification_requested' | 'verified' | 'rejected';
  createdAt: string;
};

export type LoanApplication = {
  id: string;
  userEmail: string;
  userName: string;
  amount: number;
  purpose: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
};

export type WalletFundingRequest = {
  id: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  amount: number;
  status: 'requested' | 'account_shared' | 'payment_submitted' | 'verified' | 'rejected';
  adminInstructions?: string;
  paymentReference?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type NegotiationRecord = {
  id: string;
  creatorEmail: string;
  creatorName: string;
  creatorRole: UserRole;
  targetName: string;
  targetEmail?: string;
  targetRole: UserRole | 'audience';
  commodity: string;
  quantity: number;
  proposedPrice: number;
  terms: string;
  mode: 'offer' | 'counter' | 'form' | 'notice';
  status: 'open' | 'awaiting-response' | 'accepted' | 'rejected' | 'closed';
  createdAt: string;
  updatedAt: string;
};

export type AgriTrustFormField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'document';
  required: boolean;
  placeholder?: string;
};

export type AgriTrustForm = {
  id: string;
  title: string;
  description: string;
  audienceRole: 'user' | 'buyer' | 'all';
  targetEmail?: string;
  fields: AgriTrustFormField[];
  createdBy: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
};

export type CommunicationGroup = {
  id: string;
  name: string;
  description: string;
  memberEmails: string[];
  memberRoles: UserRole[];
  createdBy: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type CommunicationGroupMessage = {
  id: string;
  groupId: string;
  senderEmail: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type AgriTrustFormSubmission = {
  id: string;
  formId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  responses: Array<{ fieldId: string; label: string; value: string }>;
  proofNote?: string;
  status: 'submitted' | 'reviewed' | 'verified' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type FarmerFieldReport = {
  id: string;
  userEmail: string;
  userName: string;
  city: string;
  state: string;
  reportType: 'mandi-price' | 'weather' | 'crop-status';
  commodity?: string;
  mandi?: string;
  reportedPrice?: number;
  weatherCondition?: string;
  rainfallMm?: number;
  summary: string;
  proofNote?: string;
  rewardPoints: number;
  rewardAmount: number;
  status: 'submitted' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformConfig = {
  accessPolicy: {
    farmerPlan: string;
    buyerPlan: string;
  };
  categories: {
    crops: string[];
    inputs: string[];
  };
  ui: {
    supportedLanguages: AppLanguage[];
    defaultLanguage: AppLanguage;
  };
  finance: {
    settlementAccountName: string;
    settlementAccountNumber: string;
    settlementIfsc: string;
    settlementUpi: string;
  };
  developer: {
    name: string;
    photoUrl: string;
    college: string;
    rollNo: string;
    address: string;
    contact: string;
    bio: string;
  };
};

export type PlatformDb = {
  users: AppUser[];
  profiles: UserWorkspaceProfile[];
  otpChallenges: AuthOtpChallenge[];
  products: MarketplaceProduct[];
  listings: FarmerListing[];
  buyers: BuyerProfile[];
  prices: CommodityPrice[];
  posts: CommunityPost[];
  orders: PlatformOrder[];
  payments: PaymentRecord[];
  predictions: PredictionLog[];
  buyerInteractions: BuyerInteraction[];
  priceAlerts: PriceAlert[];
  notifications: UserNotification[];
  shipments: ShipmentRecord[];
  invoices: InvoiceRecord[];
  financeTransactions: FinanceTransaction[];
  walletFundingRequests: WalletFundingRequest[];
  loanApplications: LoanApplication[];
  negotiations: NegotiationRecord[];
  agriTrustForms: AgriTrustForm[];
  agriTrustSubmissions: AgriTrustFormSubmission[];
  fieldReports: FarmerFieldReport[];
  communicationGroups: CommunicationGroup[];
  communicationGroupMessages: CommunicationGroupMessage[];
  config: PlatformConfig;
};
