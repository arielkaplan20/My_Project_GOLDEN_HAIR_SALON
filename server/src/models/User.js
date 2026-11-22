const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  address: { type: String, required: true },
  birthDate: { type: Date, required: true },
  role: { type: String, enum: ["client", "barber", "admin"], default: "client" },
  resetToken: { type: String, default: "" },
  resetTokenExpires: { type: Date, default: null }
}, 
{ timestamps: true });

module.exports = mongoose.model("User", userSchema);
