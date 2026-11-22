const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordReset } = require("../utils/mailer");

function createToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function register(req, res) {
  try {
    const { firstName, lastName, email, address, birthDate, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !address || !birthDate || !password || !confirmPassword) {
      return res.status(400).json({ message: "יש למלא את כל השדות" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "הסיסמאות אינן תואמות" });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "כתובת הדוא\"ל כבר קיימת במערכת" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, address, birthDate, passwordHash });

    res.status(201).json({ message: "ההרשמה בוצעה בהצלחה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "יש להזין דוא\"ל וסיסמה" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "דוא\"ל או סיסמה שגויים" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: "דוא\"ל או סיסמה שגויים" });
    }

    res.json({
      token: createToken(user),
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function me(req, res) {
  const user = await User.findById(req.user.id).select("-passwordHash");
  res.json(user);
}

async function updateProfile(req, res) {
  try {
    const { firstName, lastName, address, birthDate, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !address || !birthDate) {
      return res.status(400).json({ message: "יש למלא את כל השדות" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "המשתמש לא נמצא" });

    user.firstName = firstName;
    user.lastName = lastName;
    user.address = address;
    user.birthDate = birthDate;

    if (password) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "הסיסמאות אינן תואמות" });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({
      message: "הפרטים עודכנו בהצלחה",
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "יש להזין כתובת דוא\"ל" });

    const user = await User.findOne({ email });
    if (user) {
      user.resetToken = crypto.randomBytes(32).toString("hex");
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const site = process.env.CLIENT_URL || "http://localhost:3000";
      await sendPasswordReset(user, site + "/reset-password/" + user.resetToken);
    }

    res.json({ message: "אם הכתובת קיימת במערכת, נשלח אליה קישור לשחזור הסיסמה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ message: "יש למלא את כל השדות" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "הסיסמאות אינן תואמות" });
    }

    const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: new Date() } });
    if (!user) {
      return res.status(400).json({ message: "הקישור אינו תקין או שפג תוקפו, יש לבקש קישור חדש" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = "";
    user.resetTokenExpires = null;
    await user.save();

    res.json({ message: "הסיסמה שונתה בהצלחה, אפשר להתחבר עם הסיסמה החדשה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה בשרת", error: err.message });
  }
}

module.exports = { register, login, me, updateProfile, forgotPassword, resetPassword };
