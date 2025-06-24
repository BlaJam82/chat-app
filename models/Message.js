const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, lowercase: true },
    sender: { type: String, required: true },
    senderId: { type: String },
    text: { type: String, required: true },
    edited: { type: Boolean, default: false },
  },
  {
    timestamps: true, // ✅ Adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Message", messageSchema);
