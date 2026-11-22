const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider", required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  haircutType: { type: String, default: "" },
  status: { type: String, enum: ["booked", "cancelled", "done"], default: "booked" }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
