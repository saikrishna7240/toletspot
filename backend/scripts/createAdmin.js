require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

const createAdmin = async () => {
  try {
    const name = "ToLetSpot Admin";
    const email = "admin@toletspot.com";
    const password = "Admin@12345";

    // Check existing admin
    const existingAdmin = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      console.log("⚠️ Admin already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `
      INSERT INTO users
      (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'ADMIN')
      `,
      [
        name,
        email,
        passwordHash,
      ]
    );

    console.log("✅ Admin created successfully");

    console.log("Email:", email);
    console.log("Password:", password);

  } catch (error) {
    console.error("❌ Failed to create admin:", error);

  } finally {
    await pool.end();
  }
};

createAdmin();