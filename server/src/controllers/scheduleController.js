const Appointment = require("../models/Appointment");
const ServiceProvider = require("../models/ServiceProvider");
const { todayString } = require("../utils/dates");
const { weeklyOf, hoursForDate } = require("../utils/workSchedule");
const { calcFreeSlots } = require("./appointmentController");

async function findMe(userId) {
  return await ServiceProvider.findOne({ userId });
}

async function getDiary(req, res) {
  try {
    const me = await findMe(req.user.id);
    if (!me) return res.status(404).json({ message: "לא נמצאה רשומת נותן שירות" });

    const list = await Appointment.find({ barberId: me._id, status: "booked" })
      .populate("clientId", "firstName lastName")
      .sort({ date: 1, time: 1 });

    res.json(list.map((a) => ({
      id: a._id,
      date: a.date,
      time: a.time,
      clientName: a.clientId ? a.clientId.firstName + " " + a.clientId.lastName : "לקוח"
    })));
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function getMySchedule(req, res) {
  const me = await findMe(req.user.id);
  if (!me) return res.status(404).json({ message: "לא נמצאה רשומת נותן שירות" });
  const today = todayString();
  res.json({
    weeklySchedule: weeklyOf(me),
    exceptions: me.exceptions
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date, off: e.off, startHour: e.startHour, endHour: e.endHour })),
    slotMinutes: me.slotMinutes
  });
}

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hoursError(startHour, endHour) {
  const format = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!startHour || !endHour) return "יש למלא שעת התחלה ושעת סיום";
  if (!format.test(startHour) || !format.test(endHour)) return "השעות שהוזנו אינן תקינות";
  if (toMinutes(endHour) <= toMinutes(startHour)) return "שעת הסיום חייבת להיות מאוחרת משעת ההתחלה";
  return null;
}

function findConflicts(candidate, appointments) {
  return appointments.filter((a) => {
    const hours = hoursForDate(candidate, a.date);
    return !hours || !calcFreeSlots(hours, []).includes(a.time);
  });
}

async function futureAppointments(me) {
  return await Appointment.find({ barberId: me._id, status: "booked", date: { $gte: todayString() } })
    .populate("clientId", "firstName lastName")
    .sort({ date: 1, time: 1 });
}

function conflictResponse(res, conflicts) {
  return res.status(409).json({
    message: "לא ניתן לשמור: יש תורים שכבר נקבעו מחוץ לשעות החדשות. " +
      "יש לתאם עם הלקוחות שינוי או ביטול של התורים האלה, ורק אז לשמור שוב",
    conflicts: conflicts.map((a) => ({
      date: a.date,
      time: a.time,
      clientName: a.clientId ? a.clientId.firstName + " " + a.clientId.lastName : "לקוח"
    }))
  });
}

async function updateMySchedule(req, res) {
  try {
    const { weeklySchedule } = req.body;
    if (!Array.isArray(weeklySchedule) || weeklySchedule.length !== 7) {
      return res.status(400).json({ message: "יש להגדיר את כל ימי השבוע" });
    }
    const week = [0, 1, 2, 3, 4, 5, 6].map((day) => weeklySchedule.find((d) => d && d.day === day));
    if (week.some((d) => !d)) {
      return res.status(400).json({ message: "יש להגדיר את כל ימי השבוע" });
    }
    if (!week.some((d) => d.active)) {
      return res.status(400).json({ message: "יש לבחור לפחות יום עבודה אחד" });
    }
    for (const d of week.filter((x) => x.active)) {
      const error = hoursError(d.startHour, d.endHour);
      if (error) return res.status(400).json({ message: error });
    }

    const me = await findMe(req.user.id);
    if (!me) return res.status(404).json({ message: "לא נמצאה רשומת נותן שירות" });

    const clean = week.map((d) => ({
      day: d.day,
      active: d.day === 6 ? false : Boolean(d.active),
      startHour: d.startHour || "09:00",
      endHour: d.endHour || "19:00"
    }));
    const candidate = { weeklySchedule: clean, exceptions: me.exceptions, slotMinutes: me.slotMinutes };
    const conflicts = findConflicts(candidate, await futureAppointments(me));
    if (conflicts.length > 0) return conflictResponse(res, conflicts);

    me.weeklySchedule = clean;
    me.workDays = undefined;
    me.startHour = undefined;
    me.endHour = undefined;
    await me.save();
    res.json({ message: "סדר העבודה השבועי נשמר בהצלחה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function saveException(req, res) {
  try {
    const { date, off, startHour, endHour } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return res.status(400).json({ message: "יש לבחור תאריך" });
    }
    if (date < todayString()) {
      return res.status(400).json({ message: "לא ניתן לשנות תאריך שכבר עבר" });
    }
    if (!off) {
      const error = hoursError(startHour, endHour);
      if (error) return res.status(400).json({ message: error });
    }

    const me = await findMe(req.user.id);
    if (!me) return res.status(404).json({ message: "לא נמצאה רשומת נותן שירות" });

    const exception = { date, off: Boolean(off), startHour: off ? "" : startHour, endHour: off ? "" : endHour };
    const exceptions = me.exceptions.filter((e) => e.date !== date).concat(exception);
    const candidate = { weeklySchedule: weeklyOf(me), exceptions, slotMinutes: me.slotMinutes };
    const sameDay = (await futureAppointments(me)).filter((a) => a.date === date);
    const conflicts = findConflicts(candidate, sameDay);
    if (conflicts.length > 0) return conflictResponse(res, conflicts);

    me.exceptions = exceptions;
    await me.save();
    res.json({ message: off ? "יום החופש נשמר בהצלחה" : "השעות לתאריך נשמרו בהצלחה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function deleteException(req, res) {
  try {
    const { date } = req.params;
    const me = await findMe(req.user.id);
    if (!me) return res.status(404).json({ message: "לא נמצאה רשומת נותן שירות" });

    const exceptions = me.exceptions.filter((e) => e.date !== date);
    if (exceptions.length === me.exceptions.length) {
      return res.status(404).json({ message: "לא נמצא שינוי לתאריך הזה" });
    }
    const candidate = { weeklySchedule: weeklyOf(me), exceptions, slotMinutes: me.slotMinutes };
    const sameDay = (await futureAppointments(me)).filter((a) => a.date === date);
    const conflicts = findConflicts(candidate, sameDay);
    if (conflicts.length > 0) return conflictResponse(res, conflicts);

    me.exceptions = exceptions;
    await me.save();
    res.json({ message: "השינוי לתאריך נמחק, והיום חזר לשעות של סדר העבודה השבועי" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

module.exports = { getDiary, getMySchedule, updateMySchedule, saveException, deleteException, findConflicts };
