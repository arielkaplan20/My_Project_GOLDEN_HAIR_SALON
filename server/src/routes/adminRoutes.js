const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const c = require("../controllers/adminController");

const router = express.Router();

router.get("/users", auth, requireRole("admin"), c.getUsers);
router.put("/users/:id/role", auth, requireRole("admin"), c.updateRole);
router.get("/appointments", auth, requireRole("admin"), c.getAllAppointments);

module.exports = router;
