const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // Optional: ensures case-insensitive uniqueness
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    category: {
      type: String,
      required: true,
      default: "General",
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", RoomSchema);
