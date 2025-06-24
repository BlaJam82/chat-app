const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // 🧠 Track user enrollment in rooms (roomName -> true/false)
    enrolledRooms: {
      type: Map,
      of: Boolean,
      default: () => new Map(),
    },

    // 🧹 Track visible categories for the user (categoryName -> true/false)
    visibleCategories: {
      type: Map,
      of: Boolean,
      default: () => new Map(),
    },
  },
  {
    timestamps: true, // Optional: auto-adds createdAt and updatedAt
  }
);

// 🔒 Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔍 Compare plain text with hashed password
userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
