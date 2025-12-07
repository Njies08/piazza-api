// 
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },

    //  This is the main section for the posts (topics/catergories e.g News, Tech, Sports, Ploitics etc)
    topics: [
      {
        type: String,
        enum: ['Politics', 'Health', 'Sport', 'Tech'],
        required: true,
      },
    ],

    // Shows refereence to the uset who created the post
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },

    // Shows when the post should expire
    expiresAt: {
      type: Date,
      required: true,
    },

    //Shows post Likes/dislikes/comments as subdocuments
    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dislikes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    // Adds createdAT and updatedAt fields
    timestamps: true, 
  }
);

// Shows if the post if live or expired (i.e virtual status field)
postSchema.virtual('status').get(function () {
  return this.expiresAt > new Date() ? 'Live' : 'Expired';
});

postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
