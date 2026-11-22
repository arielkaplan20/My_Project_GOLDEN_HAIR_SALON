const express = require("express");
const { auth } = require("../middleware/auth");
const c = require("../controllers/appointmentController");

const router = express.Router();

router.get("/barbers", auth, c.getBarbers);
router.get("/slots", auth, c.getFreeSlots);
router.post("/", auth, c.bookAppointment);
router.get("/my", auth, c.myAppointments);
router.put("/:id", auth, c.changeAppointment);
router.delete("/:id", auth, c.cancelAppointment);

module.exports = router;
