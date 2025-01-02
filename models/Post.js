const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  slug: {
    type: String,
    required: false,
  },
  content: {
    type: String,
    required: true,
  },
  // New field for processed content with HTML
  processedContent: {
    type: String,
    required: false, // Make it optional for backward compatibility
  },
  preview: {
    type: String,
    required: false,
  },
  // New field for storing tags
  tags: {
    type: [String],
    default: [],
    required: false, // Make it optional for backward compatibility
  },
  views: {
    type: Number,
    default: 0,
  },
  qualityRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for tag searches
PostSchema.index({ tags: 1 });

// Index for text searches on content
PostSchema.index({ content: "text" });

module.exports = mongoose.model("Post", PostSchema);
