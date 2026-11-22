const Appointment = require("../models/Appointment");
const ServiceProvider = require("../models/ServiceProvider");
const User = require("../models/User");
const { todayString } = require("../utils/dates");
const { weeklyOf, hoursForDate } = require("../utils/workSchedule");
const { sendAppointmentConfirmation } = require("../utils/mailer");

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return h + ":" + m;
}

function calcFreeSlots(schedule, bookedList) {
  const slots = [];
  const start = toMinutes(schedule.startHour);
  const end = toMinutes(schedule.endHour);
  for (let t = start; t + schedule.slotMinutes <= end; t += schedule.slotMinutes) {
    const time = toTime(t);
    if (!bookedList.includes(time)) {
      slots.push(time);
    }
  }
  return slots;
}

async function isWorkingSlot(barberId, date, time) {
  const barber = await ServiceProvider.findById(barberId);
  const hours = barber && hoursForDate(barber, date);
  return Boolean(hours) && calcFreeSlots(hours, []).includes(time);
}

async function getBarbers(req, res) {
  const barbers = await ServiceProvider.find().populate("userId", "firstName lastName");
  res.json(barbers.map((b) => ({
    id: b._id,
    name: b.userId ? b.userId.firstName + " " + b.userId.lastName : "ספר",
    workDays: weeklyOf(b).filter((d) => d.active).map((d) => d.day)
  })));
}

async function getFreeSlots(req, res) {
  try {
    const { barberId, date } = req.query;
    const barber = await ServiceProvider.findById(barberId);
    if (!barber) return res.status(404).json({ message: "הספר לא נמצא" });

    const hours = hoursForDate(barber, date);
    if (!hours) {
      return res.json({ slots: [] });
    }

    const booked = await Appointment.find({ barberId, date, status: "booked" });
    const bookedTimes = booked.map((a) => a.time);
    res.json({ slots: calcFreeSlots(hours, bookedTimes) });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function bookAppointment(req, res) {
  try {
    const { barberId, date, time } = req.body;
    if (!barberId || !date || !time) {
      return res.status(400).json({ message: "יש לבחור ספר, תאריך ושעה" });
    }
    if (!(await isWorkingSlot(barberId, date, time))) {
      return res.status(400).json({ message: "השעה שנבחרה אינה בשעות העבודה של הספר, יש לבחור שעה אחרת" });
    }

    const taken = await Appointment.findOne({ barberId, date, time, status: "booked" });
    if (taken) {
      return res.status(400).json({ message: "התור כבר נתפס, יש לבחור שעה אחרת" });
    }

    await Appointment.create({ clientId: req.user.id, barberId, date, time });

    const client = await User.findById(req.user.id);
    const provider = await ServiceProvider.findById(barberId).populate("userId", "firstName lastName");
    const barberName = provider && provider.userId
      ? provider.userId.firstName + " " + provider.userId.lastName : "הספר";
    const mailed = await sendAppointmentConfirmation(client, barberName, date, time);

    res.status(201).json({
      message: mailed ? "התור נקבע בהצלחה, אישור נשלח לדוא\"ל שלך" : "התור נקבע בהצלחה"
    });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function myAppointments(req, res) {
  const today = todayString();
  const list = await Appointment.find({ clientId: req.user.id, status: "booked", date: { $gte: today } })
    .populate({ path: "barberId", populate: { path: "userId", select: "firstName lastName" } })
    .sort({ date: 1, time: 1 });

  res.json(list.map((a) => ({
    id: a._id,
    date: a.date,
    time: a.time,
    barberId: a.barberId ? a.barberId._id : null,
    barberName: a.barberId && a.barberId.userId
      ? a.barberId.userId.firstName + " " + a.barberId.userId.lastName : "ספר"
  })));
}

async function changeAppointment(req, res) {
  try {
    const { date, time } = req.body;
    const appt = await Appointment.findOne({ _id: req.params.id, clientId: req.user.id });
    if (!appt) return res.status(404).json({ message: "התור לא נמצא" });
    if (!date || !time) return res.status(400).json({ message: "יש לבחור תאריך ושעה" });
    if (!(await isWorkingSlot(appt.barberId, date, time))) {
      return res.status(400).json({ message: "השעה שנבחרה אינה בשעות העבודה של הספר, יש לבחור שעה אחרת" });
    }

    const taken = await Appointment.findOne({
      barberId: appt.barberId, date, time, status: "booked", _id: { $ne: appt._id }
    });
    if (taken) return res.status(400).json({ message: "התור כבר נתפס, יש לבחור שעה אחרת" });

    appt.date = date;
    appt.time = time;
    await appt.save();
    res.json({ message: "התור עודכן בהצלחה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function cancelAppointment(req, res) {
  const appt = await Appointment.findOne({ _id: req.params.id, clientId: req.user.id });
  if (!appt) return res.status(404).json({ message: "התור לא נמצא" });

  appt.status = "cancelled";
  await appt.save();
  res.json({ message: "התור בוטל בהצלחה" });
}

module.exports = { getBarbers, getFreeSlots, bookAppointment, myAppointments, changeAppointment, cancelAppointment, calcFreeSlots };
