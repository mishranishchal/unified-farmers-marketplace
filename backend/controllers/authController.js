const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { signAccessToken, signRefreshToken, verifyToken } = require('../utils/jwt');
const { generateHash } = require('../utils/crypto');
const sendResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { ensureRoleProfile } = require('../services/profileProvisioningService');
const { logAuditEvent } = require('../services/auditService');

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
};

const issueTokens = async (userId) => {
  const payload = { id: userId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await RefreshToken.create({
    user: userId,
    tokenHash: generateHash(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
};

const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already registered', 409));

    const user = await User.create({ name, email, password, role, phone, address });
    user.lastActiveAt = new Date();
    user.verification.emailVerified = user.isVerified;
    await user.save({ validateBeforeSave: false });
    await ensureRoleProfile(user);
    const { accessToken, refreshToken } = await issueTokens(user._id);

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    await logAuditEvent({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'auth.signup',
      entityType: 'User',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      changeSummary: `New ${user.role} account created`,
    });

    return sendResponse(
      res,
      201,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      },
      'Signup successful'
    );
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid credentials', 401));
    }

    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });
    await ensureRoleProfile(user);

    const { accessToken, refreshToken } = await issueTokens(user._id);

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    await logAuditEvent({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'auth.login',
      entityType: 'User',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      changeSummary: 'User logged in',
    });

    return sendResponse(
      res,
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        accessToken,
      },
      'Login successful'
    );
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingToken) return next(new AppError('Refresh token missing', 401));

    const decoded = verifyToken(incomingToken, process.env.JWT_REFRESH_SECRET);
    const tokenHash = generateHash(incomingToken);

    const tokenDoc = await RefreshToken.findOne({
      user: decoded.id,
      tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) return next(new AppError('Refresh token invalid', 401));

    tokenDoc.revoked = true;
    await tokenDoc.save();

    const { accessToken, refreshToken } = await issueTokens(decoded.id);

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    return sendResponse(res, 200, { accessToken }, 'Token refreshed');
  } catch (error) {
    return next(new AppError('Refresh failed', 401));
  }
};

const logout = async (req, res, next) => {
  try {
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
    if (incomingToken) {
      await RefreshToken.updateOne({ tokenHash: generateHash(incomingToken) }, { revoked: true });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    await logAuditEvent({
      actorEmail: req.user?.email || '',
      actorRole: req.user?.role || 'system',
      action: 'auth.logout',
      entityType: 'Session',
      entityId: incomingToken ? generateHash(incomingToken) : '',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      changeSummary: 'User logged out',
    });

    return sendResponse(res, 200, {}, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) =>
  sendResponse(
    res,
    200,
    {
      user: req.user,
    },
    'Authenticated user'
  );

module.exports = {
  signup,
  login,
  refresh,
  logout,
  me,
};
