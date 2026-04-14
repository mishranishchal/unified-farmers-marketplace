const Product = require('../models/Product');
const sendResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { getOrUpdateMarketPrice } = require('../services/priceService');
const { predictDisease, predictGrading, predictSoil } = require('../services/aiService');
const { notifyAIResultReady } = require('../services/notificationService');
const PredictionLog = require('../models/PredictionLog');

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      description,
      price,
      quantity,
      images = [],
      commodity,
      msp,
      localDemandIndex = 1,
      localSupplyIndex = 1,
    } = req.body;

    let suggestedPrice;
    if (commodity && msp) {
      const market = await getOrUpdateMarketPrice({
        commodity,
        msp: Number(msp),
        localDemandIndex: Number(localDemandIndex),
        localSupplyIndex: Number(localSupplyIndex),
      });
      suggestedPrice = market.suggestedPrice;
    }

    const product = await Product.create({
      farmer: req.user._id,
      name,
      category,
      description,
      price: Number(price),
      suggestedPrice,
      quantity: Number(quantity),
      images,
    });

    return sendResponse(res, 201, { product }, 'Product listed');
  } catch (error) {
    return next(error);
  }
};

const listProducts = async (req, res, next) => {
  try {
    const query = { status: 'available' };
    if (req.query.category) query.category = req.query.category;
    if (req.query.farmerId) query.farmer = req.query.farmerId;

    const products = await Product.find(query).populate('farmer', 'name isVerified').sort({ createdAt: -1 });
    return sendResponse(res, 200, { products }, 'Products fetched');
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('farmer', 'name isVerified');
    if (!product) return next(new AppError('Product not found', 404));
    return sendResponse(res, 200, { product }, 'Product fetched');
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Product not found', 404));
    if (String(product.farmer) !== String(req.user._id) && req.user.role !== 'admin') {
      return next(new AppError('Not allowed to edit this product', 403));
    }

    Object.assign(product, req.body);
    await product.save();

    return sendResponse(res, 200, { product }, 'Product updated');
  } catch (error) {
    return next(error);
  }
};

const runAIAnalysis = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('farmer', '_id email');
    if (!product) return next(new AppError('Product not found', 404));

    let disease = { result: 'unavailable', confidence: 0 };
    let grade = { result: 'B', confidence: 0.5 };

    if (req.file) {
      const imageBase64 = req.file.buffer.toString('base64');
      disease = await predictDisease({ imageBase64 });
      grade = await predictGrading({ imageBase64 });
    }

    let soilScore = product.soilScore;
    if (req.body.npk) {
      const soil = await predictSoil({ npk: req.body.npk });
      soilScore = Number(soil.confidence ? soil.result : 0);
    }

    product.diseaseReport = disease.result;
    product.grade = grade.result;
    product.soilScore = soilScore;
    await product.save();

    const predictionWrites = [];

    if (req.file) {
      predictionWrites.push(
        PredictionLog.create({
          requestedBy: req.user._id,
          subjectUser: product.farmer?._id,
          product: product._id,
          kind: 'disease',
          inputSummary: 'Image-based disease scan',
          outputSummary: disease.result,
          rawInput: { hasImage: true },
          rawOutput: disease,
          confidence: Number(disease.confidence || 0),
          metadata: { productId: product._id.toString() },
        }),
        PredictionLog.create({
          requestedBy: req.user._id,
          subjectUser: product.farmer?._id,
          product: product._id,
          kind: 'grading',
          inputSummary: 'Image-based produce grading',
          outputSummary: grade.result,
          rawInput: { hasImage: true },
          rawOutput: grade,
          confidence: Number(grade.confidence || 0),
          metadata: { productId: product._id.toString() },
        })
      );
    }

    if (req.body.npk) {
      predictionWrites.push(
        PredictionLog.create({
          requestedBy: req.user._id,
          subjectUser: product.farmer?._id,
          product: product._id,
          kind: 'soil_quality',
          inputSummary: 'NPK soil quality estimate',
          outputSummary: String(soilScore),
          rawInput: { npk: req.body.npk },
          rawOutput: { soilScore },
          confidence: 1,
          metadata: { productId: product._id.toString() },
        })
      );
    }

    if (predictionWrites.length) {
      await Promise.all(predictionWrites);
    }

    await notifyAIResultReady(product.farmer?.email, 'grading', grade.result);

    return sendResponse(
      res,
      200,
      {
        product,
        ai: { disease, grade, soilScore },
      },
      'AI analysis completed'
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  runAIAnalysis,
};
