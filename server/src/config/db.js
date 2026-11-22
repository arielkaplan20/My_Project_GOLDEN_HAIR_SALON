const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("מחובר למסד הנתונים");
  } catch (err) {
    console.log("שגיאה בחיבור למסד הנתונים:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
