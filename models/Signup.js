const mongoose = require("mongoose");

const signupSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model("Signup", signupSchema);
