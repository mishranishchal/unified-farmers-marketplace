const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const Notification = require('../models/Notification');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

const toPlainText = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const sendEmail = async ({ to, subject, html, type = 'system', metadata = {} }) => {
  if (!to) return;

  let notification = null;

  try {
    const user = await User.findOne({ email: to }).select('_id').lean();
    notification = await Notification.create({
      user: user?._id,
      email: to,
      channel: 'email',
      type,
      title: subject,
      message: toPlainText(html),
      status: process.env.SMTP_HOST ? 'queued' : 'sent',
      sentAt: process.env.SMTP_HOST ? undefined : new Date(),
      metadata,
    });

    if (!process.env.SMTP_HOST) {
      logger.info('SMTP not configured. Email skipped.', { to, subject });
      return;
    }
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    if (notification) {
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();
    }
  } catch (error) {
    if (notification) {
      notification.status = 'failed';
      notification.metadata = { ...notification.metadata, error: error.message };
      await notification.save();
    }
    logger.error('Email send failure', { message: error.message, to });
  }
};

const notifyOrderStatus = async (email, orderId, status) =>
  sendEmail({
    to: email,
    subject: `Order ${orderId} status updated`,
    html: `<p>Your order status is now <strong>${status}</strong>.</p>`,
    type: 'order_status',
    metadata: { orderId, status },
  });

const notifyPaymentSuccess = async (email, orderId, amount) =>
  sendEmail({
    to: email,
    subject: `Payment received for order ${orderId}`,
    html: `<p>Payment of Rs ${amount} received successfully.</p>`,
    type: 'payment_success',
    metadata: { orderId, amount },
  });

const notifyAIResultReady = async (email, resultType, resultValue) =>
  sendEmail({
    to: email,
    subject: `AI ${resultType} result ready`,
    html: `<p>${resultType} result: <strong>${resultValue}</strong></p>`,
    type: 'ai_result',
    metadata: { resultType, resultValue },
  });

module.exports = {
  sendEmail,
  notifyOrderStatus,
  notifyPaymentSuccess,
  notifyAIResultReady,
};
