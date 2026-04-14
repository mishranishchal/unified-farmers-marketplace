const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const PORT = process.env.PORT || 8080;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Backend running on port ${PORT}`);
  });
};

start();
