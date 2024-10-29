const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', PostSchema);