const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const c = require("../controllers/scheduleController");

const router = express.Router();

router.get("/diary", auth, requireRole("barber", "admin"), c.getDiary);
router.get("/me", auth, requireRole("barber", "admin"), c.getMySchedule);
router.put("/me", auth, requireRole("barber", "admin"), c.updateMySchedule);
router.post("/me/exceptions", auth, requireRole("barber", "admin"), c.saveException);
router.delete("/me/exceptions/:date", auth, requireRole("barber", "admin"), c.deleteException);

module.exports = router;
