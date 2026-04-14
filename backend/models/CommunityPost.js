const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    audienceRoles: [{ type: String, enum: ['farmer', 'buyer', 'admin'] }],
    attachments: [{ type: String, trim: true }],
    stats: {
      likes: { type: Number, min: 0, default: 0 },
      comments: { type: Number, min: 0, default: 0 },
      shares: { type: Number, min: 0, default: 0 },
      views: { type: Number, min: 0, default: 0 },
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    pinnedUntil: { type: Date },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

communityPostSchema.index({ status: 1, publishedAt: -1 });
communityPostSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
