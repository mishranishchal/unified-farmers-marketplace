import type {
  AgriTrustFormSubmission,
  BuyerInteraction,
  BuyerProfile,
  CommodityPrice,
  CommunityPost,
  FarmerFieldReport,
  FarmerListing,
  FinanceTransaction,
  LoanApplication,
  MarketplaceProduct,
  PlatformDb,
  PredictionLog,
} from '@/lib/types';

const BASE_TIME = new Date('2026-03-15T05:30:00.000Z').getTime();

const commodityCatalog = [
  { name: 'Maize', basePrice: 2240, seasonalBias: 1.02, demand: ['Feed', 'Starch', 'Poultry'], tags: ['grain', 'feed'] },
  { name: 'Wheat', basePrice: 2475, seasonalBias: 0.99, demand: ['Flour mills', 'Bulk trade'], tags: ['staple', 'rabi'] },
  { name: 'Soybean', basePrice: 4620, seasonalBias: 1.03, demand: ['Oil extraction', 'Meal'], tags: ['oilseed', 'protein'] },
  { name: 'Paddy', basePrice: 2135, seasonalBias: 1.01, demand: ['Rice mills', 'Parboiling'], tags: ['kharif', 'milling'] },
  { name: 'Cotton', basePrice: 7140, seasonalBias: 0.98, demand: ['Ginners', 'Spinners'], tags: ['fibre', 'textile'] },
  { name: 'Mustard', basePrice: 5980, seasonalBias: 1.04, demand: ['Oil mills', 'Seed trade'], tags: ['oilseed', 'rabi'] },
  { name: 'Tomato', basePrice: 1680, seasonalBias: 1.07, demand: ['Fresh retail', 'Processors'], tags: ['vegetable', 'perishable'] },
  { name: 'Onion', basePrice: 1960, seasonalBias: 1.02, demand: ['Wholesale', 'Storage'], tags: ['vegetable', 'storage'] },
  { name: 'Potato', basePrice: 1540, seasonalBias: 1.01, demand: ['Fresh retail', 'Processing'], tags: ['vegetable', 'processing'] },
];

const mandiMarkets = [
  'Pune APMC',
  'Nashik APMC',
  'Indore APMC',
  'Jaipur APMC',
  'Lucknow Mandi',
  'Hisar Grain Market',
  'Nagpur APMC',
  'Bhopal Krishi Upaj Mandi',
  'Kanpur Grain Hub',
];

const districts = ['Pune', 'Nashik', 'Indore', 'Jaipur', 'Lucknow', 'Nagpur', 'Hisar', 'Bhopal', 'Kanpur'];
const forumCategories = ['Pricing', 'Pest Watch', 'Irrigation', 'Buyer Leads', 'Storage', 'Soil Health'];

function stableIso(offsetHours: number) {
  return new Date(BASE_TIME + offsetHours * 60 * 60 * 1000).toISOString();
}

function stableId(prefix: string, key: string) {
  return `${prefix}_${key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function dedupeBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const signature = key(item);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function mergeBy<T>(current: T[], baseline: T[], key: (item: T) => string) {
  const existing = new Set(current.map(key));
  return [...current, ...baseline.filter((item) => !existing.has(key(item)))];
}

export function getBaselineProducts(): MarketplaceProduct[] {
  const items: MarketplaceProduct[] = [
    {
      id: stableId('prd', 'hybrid-maize-seed-k900'),
      name: 'Hybrid Maize Seed K-900',
      category: 'Seeds',
      description: 'High-vigour hybrid for rainfed and irrigated belts with strong standability.',
      imageHint: 'maize seed bag',
      seller: 'Bharat Seed Network',
      location: 'Indore',
      sku: 'SEED-MAIZE-K900',
      price: 2450,
      currency: 'INR',
      unit: 'pack',
      rating: 4.8,
      inStock: true,
      stockQuantity: 180,
      moq: 1,
      leadTimeDays: 2,
      tags: ['hybrid', 'kharif', 'high-germination'],
      createdAt: stableIso(0),
      updatedAt: stableIso(48),
    },
    {
      id: stableId('prd', 'balanced-npk-19-19-19'),
      name: 'Balanced NPK 19-19-19',
      category: 'Fertilizers',
      description: 'Water-soluble balanced fertilizer for vegetative growth and recovery cycles.',
      imageHint: 'fertilizer bag farm',
      seller: 'Agro Input Depot',
      location: 'Pune',
      sku: 'FERT-NPK-191919',
      price: 1980,
      currency: 'INR',
      unit: '25kg',
      rating: 4.6,
      inStock: true,
      stockQuantity: 260,
      moq: 1,
      leadTimeDays: 1,
      tags: ['water-soluble', 'macro-nutrients'],
      createdAt: stableIso(1),
      updatedAt: stableIso(49),
    },
    {
      id: stableId('prd', 'drip-irrigation-kit'),
      name: 'Drip Irrigation Starter Kit',
      category: 'Irrigation',
      description: 'Starter pack for one-acre vegetable and orchard plots with filter set included.',
      imageHint: 'drip irrigation field',
      seller: 'MicroFlow Agri Systems',
      location: 'Jaipur',
      sku: 'IRR-DRIP-ACRE1',
      price: 18950,
      currency: 'INR',
      unit: 'set',
      rating: 4.7,
      inStock: true,
      stockQuantity: 34,
      moq: 1,
      leadTimeDays: 4,
      tags: ['water-saving', 'orchard', 'vegetables'],
      createdAt: stableIso(2),
      updatedAt: stableIso(50),
    },
    {
      id: stableId('prd', 'soil-test-kit-pro'),
      name: 'Soil Test Kit Pro',
      category: 'Testing',
      description: 'Portable field kit for pH, EC, nitrogen, phosphorus, and potassium screening.',
      imageHint: 'soil testing kit',
      seller: 'Krishi Lab Supplies',
      location: 'Nagpur',
      sku: 'TEST-SOIL-PRO',
      price: 3290,
      currency: 'INR',
      unit: 'kit',
      rating: 4.5,
      inStock: true,
      stockQuantity: 92,
      moq: 1,
      leadTimeDays: 2,
      tags: ['soil-health', 'portable'],
      createdAt: stableIso(3),
      updatedAt: stableIso(51),
    },
    {
      id: stableId('prd', 'neem-biopesticide'),
      name: 'Neem Biopesticide Concentrate',
      category: 'Crop Protection',
      description: 'Botanical pest management concentrate for sucking pests and early infestation control.',
      imageHint: 'biopesticide bottle agriculture',
      seller: 'GreenShield Crop Care',
      location: 'Lucknow',
      sku: 'BIO-NEEM-1L',
      price: 845,
      currency: 'INR',
      unit: 'litre',
      rating: 4.4,
      inStock: true,
      stockQuantity: 140,
      moq: 2,
      leadTimeDays: 2,
      tags: ['bio-input', 'integrated-pest-management'],
      createdAt: stableIso(4),
      updatedAt: stableIso(52),
    },
    {
      id: stableId('prd', 'mulch-film-25-micron'),
      name: 'Silver Black Mulch Film 25 Micron',
      category: 'Crop Protection',
      description: 'Weed suppression and moisture conservation film for high-value crops.',
      imageHint: 'mulch film farm',
      seller: 'FieldCover Solutions',
      location: 'Kanpur',
      sku: 'MULCH-25M-400',
      price: 3820,
      currency: 'INR',
      unit: 'roll',
      rating: 4.3,
      inStock: true,
      stockQuantity: 76,
      moq: 1,
      leadTimeDays: 3,
      tags: ['moisture-retention', 'weed-control'],
      createdAt: stableIso(5),
      updatedAt: stableIso(53),
    },
  ];

  commodityCatalog.forEach((commodity, index) => {
    items.push({
      id: stableId('prd', `${commodity.name}-premium-lot-crates`),
      name: `${commodity.name} Handling Crates`,
      category: 'Post Harvest',
      description: `Reusable stackable crates optimized for ${commodity.name.toLowerCase()} handling and dispatch.`,
      imageHint: `${commodity.name.toLowerCase()} crates warehouse`,
      seller: 'Harvest Logistics Supplies',
      location: districts[index % districts.length],
      sku: `POST-${commodity.name.toUpperCase().replace(/[^A-Z0-9]/g, '')}-CRT`,
      price: 540 + index * 45,
      currency: 'INR',
      unit: 'set of 10',
      rating: 4.1 + ((index % 5) * 0.1),
      inStock: true,
      stockQuantity: 50 + index * 8,
      moq: 1,
      leadTimeDays: 2 + (index % 3),
      tags: [commodity.tags[0], 'storage', 'dispatch'],
      createdAt: stableIso(10 + index),
      updatedAt: stableIso(58 + index),
    });
  });

  return dedupeBy(items, (item) => item.id);
}

export function getBaselineListings(): FarmerListing[] {
  return commodityCatalog.flatMap((commodity, commodityIndex) =>
    districts.slice(0, 3).map((district, districtIndex) => {
      const quantity = 18 + commodityIndex * 4 + districtIndex * 3;
      const basePrice = Math.round(commodity.basePrice * commodity.seasonalBias + districtIndex * 25);
      const idKey = `${commodity.name}-${district}-${districtIndex}`;
      return {
        id: stableId('lst', idKey),
        name: `${commodity.name} ${districtIndex === 0 ? 'FAQ' : districtIndex === 1 ? 'Premium' : 'Fresh Arrival'} Lot`,
        commodity: commodity.name,
        farmerName: ['Ravi Patel', 'Suman Yadav', 'Harjit Singh', 'Kiran Pawar', 'Ayesha Khan'][commodityIndex % 5],
        description: `${quantity} MT available from ${district}. ${commodity.demand[0]} grade with dispatch readiness in 24-48 hours.`,
        imageHint: `${commodity.name.toLowerCase()} farm harvest`,
        price: basePrice,
        unit: 'INR/quintal',
        location: district,
        quantity,
        grade: districtIndex === 0 ? 'FAQ' : districtIndex === 1 ? 'Grade A' : 'Premium',
        harvestDate: stableIso(-(commodityIndex * 12 + districtIndex * 8)),
        pricingMode: districtIndex === 2 ? 'market-linked' : districtIndex === 1 ? 'negotiable' : 'fixed',
        priceFloor: basePrice - 90,
        priceCeiling: basePrice + 140,
        moisture: 10 + ((commodityIndex + districtIndex) % 5),
        buyerInterestCount: 4 + commodityIndex + districtIndex,
        status: commodityIndex % 4 === 0 && districtIndex === 2 ? 'pending' : 'active',
        createdAt: stableIso(-(commodityIndex * 10 + districtIndex * 4)),
        updatedAt: stableIso(commodityIndex * 6 + districtIndex),
      };
    })
  );
}

export function getBaselineBuyers(): BuyerProfile[] {
  const buyers = [
    ['Pune Grain Processors Pvt Ltd', 'Pune, Maharashtra', ['Maize', 'Soybean', 'Chana'], '1,200 MT / month', 'Processor'],
    ['Nashik Fresh Chains', 'Nashik, Maharashtra', ['Tomato', 'Onion', 'Potato'], '420 MT / week', 'Retail Aggregator'],
    ['Indore Feed Ingredients', 'Indore, Madhya Pradesh', ['Maize', 'Wheat'], '900 MT / month', 'Feed Mill'],
    ['Jaipur Cotton Link', 'Jaipur, Rajasthan', ['Cotton', 'Mustard'], '680 MT / month', 'Exporter'],
    ['Lucknow Agro Retail Hub', 'Lucknow, Uttar Pradesh', ['Paddy', 'Potato'], '500 MT / month', 'Wholesaler'],
    ['Central India Oil Mills', 'Bhopal, Madhya Pradesh', ['Soybean', 'Mustard'], '1,050 MT / month', 'Oil Mill'],
    ['Kanpur Staples Network', 'Kanpur, Uttar Pradesh', ['Wheat', 'Paddy'], '1,480 MT / month', 'Bulk Buyer'],
    ['Nagpur Fresh Basket', 'Nagpur, Maharashtra', ['Tomato', 'Onion'], '270 MT / week', 'Retail Aggregator'],
    ['Hisar Fibre Traders', 'Hisar, Haryana', ['Cotton', 'Mustard'], '760 MT / month', 'Trader'],
  ] as const;

  return buyers.map((buyer, index) => ({
    id: stableId('buy', buyer[0]),
    name: buyer[0],
    location: buyer[1],
    demand: [...buyer[2]],
    preferredLocations: districts.filter((_, districtIndex) => districtIndex % 2 === index % 2).slice(0, 4),
    specialties: buyer[2].map((item) => `${item} bulk sourcing`),
    capacity: buyer[3],
    type: buyer[4],
    verified: index !== 8,
    contact: `procurement${index + 1}@${buyer[0].toLowerCase().replace(/[^a-z0-9]+/g, '')}.in`,
    phone: `+91 98${(index + 21).toString().padStart(2, '0')}45${(8100 + index * 37).toString().padStart(4, '0')}`,
    paymentTerms: index % 3 === 0 ? 'T+2 bank transfer' : index % 3 === 1 ? '50% advance, balance on weighment' : 'UPI / RTGS within 24h',
    rating: 4.1 + ((index % 5) * 0.15),
    trades: 18 + index * 9,
    status: index === 8 ? 'Pending' : 'Verified',
    lastActiveAt: stableIso(-index * 6),
    createdAt: stableIso(-(72 + index * 4)),
    updatedAt: stableIso(index * 3),
  }));
}

export function getBaselinePrices(): CommodityPrice[] {
  return commodityCatalog.flatMap((commodity, commodityIndex) =>
    mandiMarkets.map((market, marketIndex) => {
      const multiplier = 1 + ((marketIndex % 4) - 1.5) * 0.012 + (commodityIndex % 3) * 0.01;
      const previousPrice = Math.round(commodity.basePrice * multiplier);
      const currentPrice = Math.round(previousPrice * (1 + ((marketIndex + commodityIndex) % 5 - 2) * 0.012));
      const changePct = Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2));
      return {
        id: stableId('prc', `${commodity.name}-${market}`),
        commodity: commodity.name,
        market,
        price: currentPrice,
        previousPrice,
        arrivalsTons: 110 + commodityIndex * 28 + marketIndex * 17,
        unit: 'INR/quintal',
        changePct,
        trend: changePct > 0.15 ? 'up' : changePct < -0.15 ? 'down' : 'stable',
        timestamp: stableIso(-(marketIndex * 4 + commodityIndex)),
      };
    })
  );
}

export function getBaselinePosts(): CommunityPost[] {
  const templates = [
    'Need moisture benchmark before dispatch to mill buyer',
    'Which spray window worked after late rainfall?',
    'Storage strategy for 3-week holding without quality loss',
    'Buyer asked for tighter grading. How are you sorting?',
    'What mandi spread are you seeing against local village trade?',
    'Need quick peer advice on irrigation gap during heat stress',
  ];

  return Array.from({ length: 18 }, (_, index) => {
    const category = forumCategories[index % forumCategories.length];
    const district = districts[index % districts.length];
    const commodity = commodityCatalog[index % commodityCatalog.length].name;
    return {
      id: stableId('pst', `${category}-${district}-${index}`),
      authorName: ['Regular Farmer', 'Savita Growers Group', 'Field Officer Manoj', 'Kisan Producer Co.'][index % 4],
      authorEmail: index % 4 === 0 ? 'farmer@farmersmarketplace.app' : undefined,
      category,
      region: district,
      title: `${commodity}: ${templates[index % templates.length]}`,
      content: `Sharing field update from ${district}. Current lot is ${commodity.toLowerCase()} with active buyer interest, and I want benchmark responses on pricing, logistics, and crop handling before the next dispatch window.`,
      likes: 8 + index * 3,
      comments: 2 + (index % 6),
      createdAt: stableIso(-(index * 5)),
      updatedAt: stableIso(-(index * 5) + 2),
    };
  });
}

export function getBaselineBuyerInteractions(): BuyerInteraction[] {
  const buyers = getBaselineBuyers();
  return buyers.slice(0, 10).map((buyer, index) => ({
    id: stableId('int', `${buyer.name}-${index}`),
    buyerId: buyer.id,
    buyerName: buyer.name,
    senderEmail: index % 2 === 0 ? 'farmer@farmersmarketplace.app' : 'buyer.user@farmersmarketplace.app',
    senderName: index % 2 === 0 ? 'Regular Farmer' : 'Agro Processor',
    mode: index % 3 === 0 ? 'call' : 'message',
    lotDetails: `${commodityCatalog[index % commodityCatalog.length].name} ${(20 + index * 2).toString()} MT, ${index % 2 === 0 ? 'Grade A' : 'FAQ'}`,
    message: index % 3 === 0
      ? 'Need a 15-minute call to confirm dispatch slot, moisture, and weighbridge window.'
      : 'Interested in current rate, payment terms, and expected unloading schedule for this lot.',
    status: index % 3 === 0 ? 'scheduled' : index % 3 === 1 ? 'pending' : 'completed',
    createdAt: stableIso(-(index * 7)),
  }));
}

export function getBaselineFinanceTransactions(): FinanceTransaction[] {
  const flows: FinanceTransaction[] = [
    {
      id: stableId('txn', 'farmer-wallet-credit'),
      userEmail: 'farmer@farmersmarketplace.app',
      type: 'Initial wallet credit',
      amount: 50000,
      direction: 'in',
      method: 'system',
      status: 'completed',
      createdAt: stableIso(-120),
    },
    {
      id: stableId('txn', 'farmer-marketplace-payout'),
      userEmail: 'farmer@farmersmarketplace.app',
      type: 'Marketplace settlement payout',
      amount: 126500,
      direction: 'in',
      method: 'RTGS',
      status: 'completed',
      createdAt: stableIso(-78),
    },
    {
      id: stableId('txn', 'farmer-input-purchase'),
      userEmail: 'farmer@farmersmarketplace.app',
      type: 'Input purchase',
      amount: 18950,
      direction: 'out',
      method: 'UPI',
      status: 'completed',
      createdAt: stableIso(-60),
    },
    {
      id: stableId('txn', 'buyer-escrow-funding'),
      userEmail: 'buyer.user@farmersmarketplace.app',
      type: 'Buyer wallet funding',
      amount: 220000,
      direction: 'in',
      method: 'netbanking',
      status: 'completed',
      createdAt: stableIso(-90),
    },
    {
      id: stableId('txn', 'buyer-lot-booking'),
      userEmail: 'buyer.user@farmersmarketplace.app',
      type: 'Advance lot booking',
      amount: 68000,
      direction: 'out',
      method: 'card',
      status: 'completed',
      createdAt: stableIso(-32),
    },
  ];

  return flows;
}

export function getBaselineLoans(): LoanApplication[] {
  return [
    {
      id: 'LOAN-842310',
      userEmail: 'farmer@farmersmarketplace.app',
      userName: 'Regular Farmer',
      amount: 280000,
      purpose: 'Drip irrigation and fertigation retrofit',
      risk: 'Medium',
      status: 'Approved',
      createdAt: stableIso(-220),
      updatedAt: stableIso(-180),
    },
    {
      id: 'LOAN-842355',
      userEmail: 'farmer@farmersmarketplace.app',
      userName: 'Regular Farmer',
      amount: 125000,
      purpose: 'Working capital for post-harvest storage',
      risk: 'Low',
      status: 'Pending',
      createdAt: stableIso(-72),
      updatedAt: stableIso(-12),
    },
    {
      id: 'LOAN-842390',
      userEmail: 'buyer.user@farmersmarketplace.app',
      userName: 'Agro Processor',
      amount: 650000,
      purpose: 'Procurement line for maize and soybean aggregation',
      risk: 'High',
      status: 'Pending',
      createdAt: stableIso(-48),
      updatedAt: stableIso(-8),
    },
  ];
}

export function getBaselinePredictions(): PredictionLog[] {
  return commodityCatalog.flatMap((commodity, index) => [
    {
      id: stableId('pred', `${commodity.name}-price`),
      type: 'price',
      userEmail: 'farmer@farmersmarketplace.app',
      inputSummary: `${commodity.name} in ${mandiMarkets[index % mandiMarkets.length]}`,
      outputSummary: `${index % 2 === 0 ? 'High' : 'Medium'} confidence, ${index % 3 === 0 ? 'Hold for 5-7 days' : 'Stagger sales and monitor daily'}`,
      createdAt: stableIso(-(index * 9)),
    },
    {
      id: stableId('pred', `${commodity.name}-disease`),
      type: 'disease',
      userEmail: 'farmer@farmersmarketplace.app',
      inputSummary: `${commodity.name} field scan`,
      outputSummary: index % 2 === 0 ? 'Plant appears largely healthy with minor stress symptoms' : 'Early leaf blight risk detected',
      createdAt: stableIso(-(index * 9 + 2)),
    },
    {
      id: stableId('pred', `${commodity.name}-soil`),
      type: 'soil',
      userEmail: 'farmer@farmersmarketplace.app',
      inputSummary: `${commodity.name} soil sample`,
      outputSummary: `${index % 4 === 0 ? 'Excellent' : index % 4 === 1 ? 'Good' : 'Moderate'} soil (${74 + index}/100)`,
      createdAt: stableIso(-(index * 9 + 4)),
    },
  ]);
}

export function ensurePlatformBaseline(db: PlatformDb): PlatformDb {
  db.products = mergeBy(db.products, getBaselineProducts(), (item) => item.id);
  db.listings = mergeBy(db.listings, getBaselineListings(), (item) => item.id);
  db.buyers = mergeBy(db.buyers, getBaselineBuyers(), (item) => item.id);
  db.prices = mergeBy(db.prices, getBaselinePrices(), (item) => item.id);
  db.posts = mergeBy(db.posts, getBaselinePosts(), (item) => item.id);
  db.predictions = mergeBy(db.predictions, getBaselinePredictions(), (item) => item.id);
  db.buyerInteractions = mergeBy(db.buyerInteractions, getBaselineBuyerInteractions(), (item) => item.id);
  db.financeTransactions = mergeBy(db.financeTransactions, getBaselineFinanceTransactions(), (item) => item.id);
  db.loanApplications = mergeBy(db.loanApplications, getBaselineLoans(), (item) => item.id);

  db.config = {
    accessPolicy: {
      farmerPlan: db.config.accessPolicy.farmerPlan || 'Verified farmer workspace with AI, market, and finance access',
      buyerPlan: db.config.accessPolicy.buyerPlan || 'Verified buyer workspace with sourcing, negotiation, and dispatch tools',
    },
    categories: {
      crops: Array.from(new Set([...db.config.categories.crops, ...commodityCatalog.map((item) => item.name)])).sort(),
      inputs: Array.from(
        new Set([...db.config.categories.inputs, 'Seeds', 'Fertilizers', 'Irrigation', 'Crop Protection', 'Testing', 'Post Harvest'])
      ),
    },
    ui: {
      supportedLanguages: db.config.ui?.supportedLanguages?.length ? db.config.ui.supportedLanguages : ['en', 'hi'],
      defaultLanguage: db.config.ui?.defaultLanguage || 'en',
    },
    finance: {
      settlementAccountName: db.config.finance?.settlementAccountName || 'Farmer Marketplace Escrow Desk',
      settlementAccountNumber: db.config.finance?.settlementAccountNumber || '221100987654321',
      settlementIfsc: db.config.finance?.settlementIfsc || 'SBIN0001543',
      settlementUpi: db.config.finance?.settlementUpi || 'farmersmarketplace@upi',
    },
    developer: {
      name: db.config.developer?.name || 'Nishchal Mishra',
      photoUrl: db.config.developer?.photoUrl || '',
      college: db.config.developer?.college || 'Project Developer',
      rollNo: db.config.developer?.rollNo || '',
      address: db.config.developer?.address || 'India',
      contact: db.config.developer?.contact || '',
      bio: db.config.developer?.bio || 'Builder of the Farmer Marketplace platform and AgriTrust workflow.',
    },
  };

  return db;
}

export function buildWeatherOutlook() {
  return districts.map((district, index) => {
    const rainfallMm = 2 + ((index * 7) % 19);
    const high = 29 + (index % 5);
    const low = 18 + (index % 4);
    const humidity = 52 + index * 3;
    return {
      district,
      high,
      low,
      humidity,
      rainfallMm,
      condition: rainfallMm >= 15 ? 'Rain watch' : rainfallMm >= 8 ? 'Cloud build-up' : 'Mostly clear',
      advisory:
        rainfallMm >= 15
          ? 'Delay foliar spray and plan harvest cover.'
          : rainfallMm >= 8
            ? 'Prefer morning loading and monitor fungal pressure.'
            : 'Good window for harvest, drying, and dispatch.',
    };
  });
}

export function buildDispatchQueue(input: Pick<PlatformDb, 'listings' | 'buyers'>) {
  const buyers = input.buyers.filter((buyer) => buyer.verified).slice(0, 6);
  return input.listings.slice(0, 8).map((listing, index) => ({
    id: `DSP-${(410 + index).toString().padStart(3, '0')}`,
    lot: listing.name,
    commodity: listing.commodity || listing.name,
    source: listing.location,
    destination: buyers[index % buyers.length]?.location.split(',')[0] || 'Pune',
    buyerName: buyers[index % buyers.length]?.name || 'Verified Buyer',
    quantity: listing.quantity ?? 20,
    etaHours: 6 + index * 2,
    status: index % 3 === 0 ? 'Ready' : index % 3 === 1 ? 'In Transit' : 'Scheduled',
  }));
}

function buildFieldSignalSummary(reports: FarmerFieldReport[]) {
  return reports
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
    .map((report) => ({
      id: report.id,
      city: report.city,
      reportType: report.reportType,
      commodity: report.commodity ?? 'Local crop mix',
      summary: report.summary,
      rewardAmount: report.rewardAmount,
      status: report.status,
      reportedPrice: report.reportedPrice,
      weatherCondition: report.weatherCondition,
    }));
}

function buildShipmentMoments(shipments: PlatformDb['shipments']) {
  return shipments
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
    .map((shipment) => ({
      id: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      routeCode: shipment.routeCode ?? 'Route pending',
      destination: shipment.destination,
      checkpoint: shipment.lastCheckpoint,
      etaHours: shipment.etaHours,
      deliveryVerified: shipment.deliveryVerified,
      latestUpdate: shipment.checkpoints?.[0]?.updatedAt ?? shipment.updatedAt,
    }));
}

export function buildDashboardSnapshot(
  input: Pick<
    PlatformDb,
    'listings' | 'buyers' | 'prices' | 'predictions' | 'buyerInteractions' | 'financeTransactions' | 'profiles' | 'notifications' | 'shipments' | 'fieldReports' | 'agriTrustSubmissions'
  >
) {
  const activeListings = input.listings.filter((listing) => listing.status === 'active');
  const activeBuyers = input.buyers.filter((buyer) => buyer.status !== 'Suspended');
  const completedTransactions = input.financeTransactions.filter((txn) => txn.status === 'completed');
  const topPrices = [...input.prices].sort((a, b) => b.price - a.price).slice(0, 3);
  const fieldSignals = buildFieldSignalSummary(input.fieldReports);
  const shipmentMoments = buildShipmentMoments(input.shipments);
  const trustReady = input.profiles.filter((profile) => profile.trustScore >= 90).length;
  const pendingTrust = input.agriTrustSubmissions.filter((submission) => submission.status === 'submitted').length;

  return {
    missionCards: [
      { title: 'Market Prices', href: '/prices', meta: `${input.prices.length} mandi rates` },
      { title: 'Marketplace', href: '/marketplace', meta: `${activeListings.length} live lots` },
      { title: 'AI Agronomist', href: '/agronomist', meta: `${input.predictions.length} logged analyses` },
      { title: 'Buyers', href: '/buyers', meta: `${activeBuyers.length} active buyers` },
    ],
    alerts: [
      `${shipmentMoments.filter((item) => item.status === 'in_transit').length} shipments are currently in transit`,
      `${fieldSignals.filter((item) => item.reportType === 'weather').length} farmer weather signals arrived for review`,
      `${input.buyerInteractions.filter((item) => item.status === 'pending').length} buyer conversations need follow-up`,
    ],
    aiUpdates: [
      `Top mandi rate today: ${topPrices[0]?.commodity ?? 'Maize'} at INR ${topPrices[0]?.price.toLocaleString() ?? '0'}/quintal`,
      `${input.predictions.length} AI inference logs available for review and audit`,
      `${activeListings.filter((listing) => (listing.buyerInterestCount ?? 0) >= 8).length} lots show strong buyer demand`,
    ],
    rolePulse: {
      trustReady,
      unreadNotifications: input.notifications.filter((item) => !item.read).length,
      shipmentBacklog: input.shipments.filter((item) => item.status !== 'delivered').length,
    },
    trustQueue: {
      pendingForms: pendingTrust,
      verifiedProfiles: trustReady,
      newFieldReports: input.fieldReports.filter((report) => report.status === 'submitted').length,
    },
    fieldSignals,
    shipmentMoments,
    coverageDistricts: new Set([...input.listings.map((listing) => listing.location), ...districts]).size,
    tradePipelineValue: activeListings.reduce((sum, listing) => sum + listing.price * (listing.quantity ?? 1), 0),
    aiInferences: input.predictions.length,
    completedSettlements: completedTransactions.length,
  };
}

export function buildAnalyticsSnapshot(
  input: Pick<
    PlatformDb,
    'listings' | 'prices' | 'financeTransactions' | 'orders' | 'payments' | 'predictions' | 'shipments' | 'notifications' | 'profiles' | 'fieldReports' | 'agriTrustSubmissions'
  >
) {
  const weather = buildWeatherOutlook();
  const currentWeather = weather[0];
  const fieldSignals = buildFieldSignalSummary(input.fieldReports);
  const forecast = weather.slice(0, 5).map((item, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    temp: item.high,
    condition: item.condition,
    wind: `${9 + index} km/h`,
  }));

  const commoditySeries = commodityCatalog.slice(0, 5).map((commodity, index) => {
    const listingMatches = input.listings.filter((listing) => (listing.commodity || listing.name).toLowerCase().includes(commodity.name.toLowerCase()));
    const avgPrice = input.prices.filter((price) => price.commodity === commodity.name).reduce((sum, row, _, all) => sum + row.price / Math.max(all.length, 1), 0);
    return {
      season: `2026-Q${index + 1}`,
      [commodity.name.toLowerCase()]: Number(((avgPrice / 850) + listingMatches.length * 0.22).toFixed(1)),
    };
  });

  const spendingData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
    month,
    seeds: 80000 + input.listings.length * 3200 + index * 22000,
    fertilizers: 110000 + input.prices.length * 1800 + index * 26000,
    agrochemicals: 42000 + input.predictions.length * 1200 + index * 9000,
  }));

  const totalOrderValue = input.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const paidOrderValue = input.payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  const revenueForecastData = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => ({
    month,
    revenue: Math.round((paidOrderValue || totalOrderValue || 1500000) * (0.7 + index * 0.12)),
  }));

  const reports = [
    {
      id: 'profit-loss',
      name: 'Trade and Settlement Summary',
      description: `${input.orders.length} orders, ${input.payments.length} payments, and INR ${paidOrderValue.toLocaleString()} settled.`,
    },
    {
      id: 'input-spend',
      name: 'Input Spend and Working Capital',
      description: `${input.financeTransactions.length} ledger entries across wallet funding, purchase outflow, and settlements.`,
    },
  ];

  const roleMix = [
    { role: 'Farmers', count: input.profiles.filter((profile) => profile.role === 'user').length },
    { role: 'Buyers', count: input.profiles.filter((profile) => profile.role === 'buyer').length },
    { role: 'Admins', count: input.profiles.filter((profile) => profile.role === 'admin').length },
  ];

  const shipmentStatus = ['processing', 'packed', 'in_transit', 'out_for_delivery', 'delivered'].map((status) => ({
    status,
    count: input.shipments.filter((shipment) => shipment.status === status).length,
  }));

  return {
    weather: {
      city: currentWeather?.district || 'Pune',
      current: {
        temp: currentWeather?.high ?? 30,
        condition: currentWeather?.condition ?? 'Mostly clear',
        wind: '12 km/h',
      },
      forecast,
    },
    yieldData: commoditySeries,
    spendingData,
    revenueForecastData,
    reports,
    roleMix,
    shipmentStatus,
    fieldSignals,
    trustMetrics: {
      verifiedProfiles: input.profiles.filter((profile) => profile.trustScore >= 90).length,
      pendingProfiles:
        input.profiles.filter((profile) => profile.trustScore < 90).length + input.agriTrustSubmissions.filter((submission) => submission.status === 'submitted').length,
      unreadNotifications: input.notifications.filter((notification) => !notification.read).length,
    },
  };
}

export function buildAdminSnapshot(input: {
  users: Array<{ id: string }>;
  buyers: PlatformDb['buyers'];
  orders: PlatformDb['orders'];
  financeTransactions: PlatformDb['financeTransactions'];
  buyerInteractions: PlatformDb['buyerInteractions'];
  listings: PlatformDb['listings'];
  shipments: PlatformDb['shipments'];
  notifications: PlatformDb['notifications'];
  profiles: PlatformDb['profiles'];
  agriTrustSubmissions: AgriTrustFormSubmission[];
  fieldReports: FarmerFieldReport[];
  walletFundingRequests: PlatformDb['walletFundingRequests'];
}) {
  const dailyActiveParticipants = input.users.length + input.buyers.length;
  const grossTradeVolume = input.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const creditDisbursedToday = input.financeTransactions
    .filter((transaction) => transaction.direction === 'in')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const escalationAlerts = input.buyerInteractions.filter((interaction) => interaction.status === 'pending').length;
  const dispatchQueue = buildDispatchQueue({ listings: input.listings, buyers: input.buyers });
  const trustQueue = input.agriTrustSubmissions
    .filter((submission) => submission.status === 'submitted')
    .slice(0, 6)
    .map((submission) => ({
      id: submission.id,
      userName: submission.userName,
      role: submission.role,
      submittedAt: submission.createdAt,
      proofNote: submission.proofNote || 'Submitted via profile vault',
    }));
  const fieldSignals = buildFieldSignalSummary(input.fieldReports);
  const shipmentMoments = buildShipmentMoments(input.shipments);

  return {
    kpis: [
      { title: 'Daily Active Participants', value: dailyActiveParticipants.toLocaleString(), change: `${input.users.length} users + ${input.buyers.length} buyers` },
      { title: 'Gross Trade Volume', value: `INR ${(grossTradeVolume / 10000000).toFixed(2)} Cr`, change: `${input.orders.length} tracked orders` },
      { title: 'Credit Disbursed', value: `INR ${(creditDisbursedToday / 100000).toFixed(1)} L`, change: `${input.financeTransactions.length} ledger inflows` },
      {
        title: 'Escalation Alerts',
        value: escalationAlerts.toString(),
        change: `${input.notifications.filter((item) => !item.read).length} unread notifications · ${input.agriTrustSubmissions.filter((item) => item.status === 'submitted').length} trust reviews`,
      },
    ],
    dispatchQueue,
    trustQueue,
    fieldSignals,
    shipmentMoments,
    liveOps: {
      shipmentsOpen: input.shipments.filter((shipment) => shipment.status !== 'delivered').length,
      trustVerified: input.profiles.filter((profile) => profile.trustScore >= 90).length,
      fundingQueue: input.walletFundingRequests.filter((request) => request.status !== 'verified' && request.status !== 'rejected').length,
    },
  };
}
