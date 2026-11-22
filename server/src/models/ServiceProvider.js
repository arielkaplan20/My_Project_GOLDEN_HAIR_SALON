const mongoose = require("mongoose");

const dayScheduleSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6, required: true },
  active: { type: Boolean, default: false },
  startHour: { type: String, default: "09:00" },
  endHour: { type: String, default: "19:00" }
}, { _id: false });

const exceptionSchema = new mongoose.Schema({
  date: { type: String, required: true },
  off: { type: Boolean, default: false },
  startHour: { type: String, default: "" },
  endHour: { type: String, default: "" }
}, { _id: false });

const serviceProviderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  weeklySchedule: { type: [dayScheduleSchema], default: undefined },
  exceptions: { type: [exceptionSchema], default: [] },
  slotMinutes: { type: Number, default: 30 },

  workDays: { type: [Number], default: undefined },
  startHour: String,
  endHour: String
}, { timestamps: true });

module.exports = mongoose.model("ServiceProvider", serviceProviderSchema);
