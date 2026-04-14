const express = require('express');
const multer = require('multer');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  runAIAnalysis,
} = require('../controllers/productController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorizeRoles('farmer', 'admin'), createProduct);
router.patch('/:id', protect, authorizeRoles('farmer', 'admin'), updateProduct);
router.post('/:id/analyze', protect, authorizeRoles('farmer', 'admin'), upload.single('image'), runAIAnalysis);

module.exports = router;
