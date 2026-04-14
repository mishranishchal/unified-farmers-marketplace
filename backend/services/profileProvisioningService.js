const AdminProfile = require('../models/AdminProfile');
const BuyerProfile = require('../models/BuyerProfile');
const FarmerProfile = require('../models/FarmerProfile');

const ensureRoleProfile = async (user) => {
  if (!user) return null;

  if (user.role === 'farmer') {
    return FarmerProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          farmName: `${user.name}'s Farm`,
          organizationName: '',
          preferredMarkets: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (user.role === 'buyer') {
    return BuyerProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          companyName: `${user.name} Trading`,
          contactPerson: user.name,
          phone: user.phone || '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (user.role === 'admin') {
    return AdminProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          department: 'operations',
          permissions: ['analytics.read', 'users.manage', 'content.manage', 'pricing.manage'],
          scopes: ['global'],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return null;
};

module.exports = {
  ensureRoleProfile,
};
