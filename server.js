const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");

// Load database/admin settings from .env so secrets do not need to be hardcoded.
dotenv.config();

const app = express();

// Middleware allows frontend requests and parses JSON request bodies.
app.use(cors());
app.use(express.json());

// MySQL connection settings. Environment values override local defaults.
const dbConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "blood_donation_system",
};

// Default admin account is created automatically when the server starts.
const defaultAdmin = {
  fullName: process.env.ADMIN_NAME || "Blood Bridge Admin",
  username: (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim(),
  password: process.env.ADMIN_PASSWORD || "admin123",
};

let pool;

// Creates the database/tables if missing, then prepares the connection pool.
async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await connection.end();

  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });

  // Donors table stores searchable donor profile records.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS donors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      bloodGroup VARCHAR(10) NOT NULL,
      location VARCHAR(150) NOT NULL,
      birthday VARCHAR(50) NOT NULL DEFAULT '',
      lastDonation VARCHAR(50) NOT NULL DEFAULT '',
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("donors", "birthday", "VARCHAR(50) NOT NULL DEFAULT ''", "location");
  await ensureColumn("donors", "username", "VARCHAR(100) NOT NULL DEFAULT ''", "lastDonation");
  await ensureColumn("donors", "password", "VARCHAR(255) NOT NULL DEFAULT ''", "username");

  // Blood requests table stores patient/request workflow details.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blood_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requester VARCHAR(150) NOT NULL,
      requesterUserId VARCHAR(50) NOT NULL DEFAULT '',
      bloodGroup VARCHAR(10) NOT NULL,
      units VARCHAR(50) NOT NULL,
      hospital VARCHAR(150) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'Normal',
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      assignedDonor VARCHAR(150) NOT NULL DEFAULT '',
      assignedDonorId VARCHAR(50) NOT NULL DEFAULT '',
      donorPhone VARCHAR(50) NOT NULL DEFAULT '',
      donorResponse VARCHAR(50) NOT NULL DEFAULT 'Waiting',
      notificationStatus VARCHAR(50) NOT NULL DEFAULT 'Not Sent',
      userNotificationStatus VARCHAR(50) NOT NULL DEFAULT 'Not Sent',
      userResponseMessage TEXT,
      additionalInfo TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("blood_requests", "requesterUserId", "VARCHAR(50) NOT NULL DEFAULT ''", "requester");
  await ensureColumn("blood_requests", "userNotificationStatus", "VARCHAR(50) NOT NULL DEFAULT 'Not Sent'", "notificationStatus");
  await ensureColumn("blood_requests", "userResponseMessage", "TEXT", "userNotificationStatus");

  // Users table stores login accounts for users, donors, and admins.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(150) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(50) NOT NULL DEFAULT '',
      bloodGroup VARCHAR(10) NOT NULL DEFAULT '',
      location VARCHAR(150) NOT NULL DEFAULT '',
      role ENUM('user', 'donor', 'admin') NOT NULL DEFAULT 'user',
      password VARCHAR(255) NOT NULL DEFAULT '',
      passwordHash VARCHAR(200) NOT NULL,
      passwordSalt VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("users", "username", "VARCHAR(100) NULL", "fullName");
  await ensureColumn("users", "email", "VARCHAR(150) NULL", "fullName");
  await ensureColumn("users", "phone", "VARCHAR(50) NOT NULL DEFAULT ''", "username");
  await ensureColumn("users", "bloodGroup", "VARCHAR(10) NOT NULL DEFAULT ''", "phone");
  await ensureColumn("users", "location", "VARCHAR(150) NOT NULL DEFAULT ''", "bloodGroup");
  await ensureColumn("users", "role", "ENUM('user', 'donor', 'admin') NOT NULL DEFAULT 'user'", "location");
  await ensureColumn("users", "password", "VARCHAR(255) NOT NULL DEFAULT ''", "role");
  await ensureColumn("users", "passwordHash", "VARCHAR(200) NOT NULL DEFAULT ''", "password");
  await ensureColumn("users", "passwordSalt", "VARCHAR(100) NOT NULL DEFAULT ''", "passwordHash");
  await ensureColumn("users", "status", "VARCHAR(50) NOT NULL DEFAULT 'Active'", "passwordSalt");
  await pool.query("UPDATE users SET email = NULL WHERE email = ''");
  await pool.query("ALTER TABLE users MODIFY email VARCHAR(150) NULL");
  await pool.query("UPDATE users SET username = CONCAT('user', id) WHERE username IS NULL OR username = ''");
  await pool.query("ALTER TABLE users MODIFY username VARCHAR(100) NOT NULL");

  // Inventory table stores available blood units and expiry dates.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blood_inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bloodGroup VARCHAR(10) NOT NULL,
      units INT NOT NULL,
      hospital VARCHAR(150) NOT NULL,
      expiryDate VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Available',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CHECK (units >= 0)
    )
  `);

  // Chat support tables store help desk conversations and their message history.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId VARCHAR(50) NOT NULL DEFAULT '',
      userName VARCHAR(150) NOT NULL,
      userRole VARCHAR(50) NOT NULL DEFAULT 'guest',
      subject VARCHAR(180) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Open',
      lastMessageAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversationId INT NOT NULL,
      senderId VARCHAR(50) NOT NULL DEFAULT '',
      senderName VARCHAR(150) NOT NULL,
      senderRole VARCHAR(50) NOT NULL DEFAULT 'guest',
      message TEXT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX conversation_idx (conversationId),
      CONSTRAINT chat_messages_conversation_fk
        FOREIGN KEY (conversationId) REFERENCES chat_conversations(id)
        ON DELETE CASCADE
    )
  `);

  await ensureDefaultAdmin();
  await clearPlainTextPasswords();
}

// Wraps async route handlers so errors go to the central error handler.
function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

// Passwords are stored as salted hashes instead of plain text.
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt };
}

// Ensures one admin login always exists for initial system access.
async function ensureDefaultAdmin() {
  const [existingRows] = await pool.execute("SELECT id FROM users WHERE username = ?", [defaultAdmin.username]);
  const { hash, salt } = hashPassword(defaultAdmin.password);

  if (existingRows.length > 0) {
    await pool.execute(
      "UPDATE users SET fullName = ?, role = 'admin', password = ?, passwordHash = ?, passwordSalt = ?, status = 'Active' WHERE username = ?",
      [defaultAdmin.fullName, "", hash, salt, defaultAdmin.username]
    );
    return;
  }

  await pool.execute(
    `INSERT INTO users (fullName, username, role, password, passwordHash, passwordSalt, status)
     VALUES (?, ?, 'admin', ?, ?, ?, 'Active')`,
    [defaultAdmin.fullName, defaultAdmin.username, "", hash, salt]
  );
}

async function clearPlainTextPasswords() {
  await pool.execute("UPDATE users SET password = '' WHERE password <> ''");
  await pool.execute("UPDATE donors SET password = '' WHERE password <> ''");
}

// Adds a missing column during startup, useful when the database schema changes.
async function ensureColumn(table, column, definition, afterColumn) {
  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, table, column]
  );

  if (columns.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition} AFTER \`${afterColumn}\``);
  }
}

// Converts numeric MySQL ids into strings so frontend comparisons are consistent.
function normalizeRow(row) {
  return {
    ...row,
    id: String(row.id),
  };
}

function getTodayDateOnly() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function isInventoryDateExpired(expiryDate) {
  const expiry = parseDateOnly(expiryDate);

  if (!expiry) return false;

  return expiry < getTodayDateOnly();
}

async function syncExpiredInventory() {
  await pool.execute(
    "UPDATE blood_inventory SET status = 'Expired' WHERE status <> 'Expired' AND STR_TO_DATE(expiryDate, '%Y-%m-%d') < CURDATE()"
  );
}

function normalizeInventoryRow(row) {
  const normalized = normalizeRow(row);

  if (normalized.status !== "Expired" && isInventoryDateExpired(normalized.expiryDate)) {
    normalized.status = "Expired";
  }

  return normalized;
}

// Removes password hash/salt before sending user records to the frontend.
function sanitizeUser(user) {
  const cleanUser = normalizeRow(user);
  delete cleanUser.password;
  delete cleanUser.passwordHash;
  delete cleanUser.passwordSalt;
  return cleanUser;
}

function sanitizeDonor(donor) {
  const cleanDonor = normalizeRow(donor);
  delete cleanDonor.password;
  return cleanDonor;
}

function verifyPassword(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  return hash === user.passwordHash;
}

async function savePasswordForUser(user, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  await pool.execute(
    "UPDATE users SET password = ?, passwordHash = ?, passwordSalt = ? WHERE id = ?",
    ["", hash, salt, user.id]
  );

  if (user.role === "donor") {
    await pool.execute("UPDATE donors SET password = '' WHERE username = ?", [user.username]);
  }
}

// Keeps only fields allowed for the target table before insert/update.
function pickFields(source, allowedFields) {
  return allowedFields.reduce((fields, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      fields[field] = source[field];
    }
    return fields;
  }, {});
}

// Generic insert helper used by donors, requests, users, and inventory APIs.
async function insertRow(table, data, allowedFields) {
  const fields = pickFields(data, allowedFields);
  const columns = Object.keys(fields);

  if (columns.length === 0) {
    throw new Error("No valid fields provided");
  }

  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
  const [result] = await pool.execute(sql, columns.map((column) => fields[column]));
  const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
  return normalizeRow(rows[0]);
}

// Generic update helper. If no valid fields are sent, it returns the existing row.
async function updateRow(table, id, data, allowedFields) {
  const fields = pickFields(data, allowedFields);
  const columns = Object.keys(fields);

  if (columns.length === 0) {
    const [existingRows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return existingRows[0] ? normalizeRow(existingRows[0]) : null;
  }

  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  await pool.execute(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [
    ...columns.map((column) => fields[column]),
    id,
  ]);
  const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return rows[0] ? normalizeRow(rows[0]) : null;
}

// Allowed fields protect database queries from unexpected request properties.
const donorFields = ["name", "phone", "bloodGroup", "location", "birthday", "lastDonation", "username", "password"];
const requestFields = [
  "requester",
  "requesterUserId",
  "bloodGroup",
  "units",
  "hospital",
  "type",
  "status",
  "assignedDonor",
  "assignedDonorId",
  "donorPhone",
  "donorResponse",
  "notificationStatus",
  "userNotificationStatus",
  "userResponseMessage",
  "additionalInfo",
];
const userFields = [
  "fullName",
  "username",
  "phone",
  "bloodGroup",
  "location",
  "role",
  "password",
  "passwordHash",
  "passwordSalt",
  "status",
];
const inventoryFields = ["bloodGroup", "units", "hospital", "expiryDate", "status"];
const chatConversationFields = ["userId", "userName", "userRole", "subject", "status", "lastMessageAt"];
const chatMessageFields = ["conversationId", "senderId", "senderName", "senderRole", "message"];

// Donor APIs: list donors and create donor accounts.
app.get(
  "/api/donors",
  asyncHandler(async (req, res) => {
    const [donors] = await pool.execute("SELECT * FROM donors ORDER BY createdAt DESC");
    res.json(donors.map(sanitizeDonor));
  })
);

// Auth APIs: register new users/donors and verify login credentials.
app.post(
  "/api/donors",
  asyncHandler(async (req, res) => {
    const {
      name = "",
      username = "",
      password = "",
      phone = "",
      bloodGroup = "",
      location = "",
    } = req.body;
    const normalizedUsername = username.toLowerCase().trim();

    if (!name || !normalizedUsername || !password) {
      return res.status(400).json({ error: "Donor name, username, and password are required" });
    }

    const [existingUsers] = await pool.execute("SELECT id FROM users WHERE username = ?", [normalizedUsername]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "Username is already registered" });
    }

    const donor = await insertRow("donors", { ...req.body, username: normalizedUsername, password: "" }, donorFields);
    const { hash, salt } = hashPassword(password);
    await insertRow(
      "users",
      {
        fullName: name,
        username: normalizedUsername,
        phone,
        bloodGroup,
        location,
        role: "donor",
        password: "",
        passwordHash: hash,
        passwordSalt: salt,
      },
      userFields
    );

    res.status(201).json(sanitizeDonor(donor));
  })
);

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const {
      name = "",
      fullName = name,
      username = "",
      password,
      phone = "",
      bloodGroup = "",
      location = "",
      role = "user",
    } = req.body;

    if (!fullName || !username || !password) {
      return res.status(400).json({ error: "Full name, username, and password are required. Email is not required." });
    }

    if (role === "admin") {
      return res.status(403).json({ error: "Admin accounts cannot be created from registration" });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const [existingRows] = await pool.execute("SELECT id FROM users WHERE username = ?", [normalizedUsername]);
    if (existingRows.length > 0) {
      return res.status(409).json({ error: "Username is already registered" });
    }

    const { hash, salt } = hashPassword(password);
    const user = await insertRow(
      "users",
      {
        fullName,
        username: normalizedUsername,
        phone,
        bloodGroup,
        location,
        role,
        password: "",
        passwordHash: hash,
        passwordSalt: salt,
      },
      userFields
    );

    if (role === "donor") {
      await insertRow(
        "donors",
        {
          name: fullName,
          phone,
          bloodGroup,
          location,
          lastDonation: "",
          username: normalizedUsername,
          password: "",
        },
        donorFields
      );
    }

    res.status(201).json(sanitizeUser(user));
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const [users] = await pool.execute("SELECT * FROM users WHERE username = ?", [normalizedUsername]);
    let user = users[0];
    if (!user) {
      const [donors] = await pool.execute("SELECT * FROM donors WHERE username = ? AND password = ?", [normalizedUsername, password]);
      const donor = donors[0];

      if (!donor) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const { hash, salt } = hashPassword(password);
      user = await insertRow(
        "users",
        {
          fullName: donor.name,
          username: normalizedUsername,
          phone: donor.phone || "",
          bloodGroup: donor.bloodGroup || "",
          location: donor.location || "",
          role: "donor",
          password: "",
          passwordHash: hash,
          passwordSalt: salt,
        },
        userFields
      );
    }

    if (!verifyPassword(password, user)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json(sanitizeUser(user));
  })
);

app.patch(
  "/api/auth/change-password",
  asyncHandler(async (req, res) => {
    const { userId, currentPassword = "", newPassword = "" } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.trim().length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const [users] = await pool.execute("SELECT * FROM users WHERE id = ?", [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!verifyPassword(currentPassword, user)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    await savePasswordForUser(user, newPassword.trim());
    res.json({ message: "Password changed successfully" });
  })
);

app.patch(
  "/api/auth/forgot-password",
  asyncHandler(async (req, res) => {
    const { username = "", newPassword = "" } = req.body;
    const normalizedUsername = username.toLowerCase().trim();

    if (!normalizedUsername || !newPassword) {
      return res.status(400).json({ error: "Username and new password are required" });
    }

    if (newPassword.trim().length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const [users] = await pool.execute("SELECT * FROM users WHERE username = ?", [normalizedUsername]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: "No account found for that username" });
    }

    await savePasswordForUser(user, newPassword.trim());
    res.json({ message: "Password reset successfully. You can login with the new password." });
  })
);

// User/profile APIs: list accounts and update the logged-in user's profile.
app.get(
  "/api/users",
  asyncHandler(async (req, res) => {
    const [users] = await pool.execute("SELECT * FROM users ORDER BY createdAt DESC");
    res.json(users.map(sanitizeUser));
  })
);

app.patch(
  "/api/profile/:id",
  asyncHandler(async (req, res) => {
    const allowedProfileFields = ["fullName", "phone", "bloodGroup", "location", "status"];
    const user = await updateRow("users", req.params.id, req.body, allowedProfileFields);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "donor") {
      const donorUpdates = {
        name: user.fullName,
        phone: user.phone || "",
        bloodGroup: user.bloodGroup || "",
        location: user.location || "",
        lastDonation: req.body.lastDonation || "",
      };
      const [existingDonors] = await pool.execute("SELECT id FROM donors WHERE username = ?", [user.username]);

      if (existingDonors.length > 0) {
        await updateRow("donors", existingDonors[0].id, donorUpdates, donorFields);
      } else {
        await insertRow(
          "donors",
          {
            ...donorUpdates,
            birthday: "",
            username: user.username,
            password: "",
          },
          donorFields
        );
      }
    }

    res.json(sanitizeUser(user));
  })
);

// Admin list API used by the admin users screen.
app.get(
  "/api/admins",
  asyncHandler(async (req, res) => {
    const [admins] = await pool.execute("SELECT * FROM users WHERE role = 'admin' ORDER BY createdAt DESC");
    res.json(admins.map(sanitizeUser));
  })
);

// Blood request APIs: list, create, and update request workflow records.
app.get(
  "/api/requests",
  asyncHandler(async (req, res) => {
    const [requests] = await pool.execute("SELECT * FROM blood_requests ORDER BY createdAt DESC");
    res.json(requests.map(normalizeRow));
  })
);

app.post(
  "/api/requests",
  asyncHandler(async (req, res) => {
    const request = await insertRow("blood_requests", req.body, requestFields);
    res.status(201).json(request);
  })
);

app.patch(
  "/api/requests/:id",
  asyncHandler(async (req, res) => {
    const nextData = { ...req.body };

    if (nextData.userNotificationStatus === "Sent" && !nextData.requesterUserId) {
      const [existingRequests] = await pool.execute("SELECT requester, requesterUserId FROM blood_requests WHERE id = ?", [req.params.id]);
      const existingRequest = existingRequests[0];

      if (existingRequest && !existingRequest.requesterUserId && existingRequest.requester) {
        const requester = existingRequest.requester.trim().toLowerCase();
        const [matchingUsers] = await pool.execute(
          "SELECT id FROM users WHERE LOWER(fullName) = ? OR LOWER(username) = ? ORDER BY role = 'user' DESC, id ASC LIMIT 1",
          [requester, requester]
        );

        if (matchingUsers[0]) {
          nextData.requesterUserId = String(matchingUsers[0].id);
        }
      }
    }

    const request = await updateRow("blood_requests", req.params.id, nextData, requestFields);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(request);
  })
);

// Blood inventory APIs: list and create blood stock records.
app.get(
  "/api/inventory",
  asyncHandler(async (req, res) => {
    await syncExpiredInventory();
    const [inventory] = await pool.execute("SELECT * FROM blood_inventory ORDER BY createdAt DESC");
    res.json(inventory.map(normalizeInventoryRow));
  })
);

app.post(
  "/api/inventory",
  asyncHandler(async (req, res) => {
    const inventoryData = {
      ...req.body,
      status: isInventoryDateExpired(req.body.expiryDate) ? "Expired" : req.body.status,
    };
    const item = await insertRow("blood_inventory", inventoryData, inventoryFields);
    res.status(201).json(normalizeInventoryRow(item));
  })
);

app.patch(
  "/api/inventory/:id",
  asyncHandler(async (req, res) => {
    const nextData = { ...req.body };

    if (nextData.status && !["Available", "Reserved", "Expired"].includes(nextData.status)) {
      return res.status(400).json({ error: "Invalid inventory status" });
    }

    const [existingRows] = await pool.execute("SELECT * FROM blood_inventory WHERE id = ?", [req.params.id]);
    const existingItem = existingRows[0];

    if (!existingItem) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    const nextExpiryDate = nextData.expiryDate || existingItem.expiryDate;

    if (nextData.status !== "Expired" && isInventoryDateExpired(nextExpiryDate)) {
      nextData.status = "Expired";
    }

    const item = await updateRow("blood_inventory", req.params.id, nextData, inventoryFields);

    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json(normalizeInventoryRow(item));
  })
);

// Chat support APIs: conversations can be created by guests/users/donors and answered by admins.
app.get(
  "/api/chat/conversations",
  asyncHandler(async (req, res) => {
    const { role = "", userId = "" } = req.query;
    let sql = "SELECT * FROM chat_conversations";
    const params = [];

    if (role !== "admin") {
      sql += " WHERE userId = ?";
      params.push(userId || "");
    }

    sql += " ORDER BY lastMessageAt DESC, createdAt DESC";
    const [conversations] = await pool.execute(sql, params);
    res.json(conversations.map(normalizeRow));
  })
);

app.post(
  "/api/chat/conversations",
  asyncHandler(async (req, res) => {
    const {
      userId = "",
      userName = "Guest",
      userRole = "guest",
      subject = "Support request",
      message = "",
    } = req.body;

    if (!userName.trim() || !subject.trim() || !message.trim()) {
      return res.status(400).json({ error: "Name, subject, and message are required" });
    }

    const conversation = await insertRow(
      "chat_conversations",
      {
        userId: String(userId || ""),
        userName: userName.trim(),
        userRole,
        subject: subject.trim(),
        status: "Open",
      },
      chatConversationFields
    );

    await insertRow(
      "chat_messages",
      {
        conversationId: conversation.id,
        senderId: String(userId || ""),
        senderName: userName.trim(),
        senderRole: userRole || "guest",
        message: message.trim(),
      },
      chatMessageFields
    );

    res.status(201).json(conversation);
  })
);

app.get(
  "/api/chat/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const [messages] = await pool.execute(
      "SELECT * FROM chat_messages WHERE conversationId = ? ORDER BY createdAt ASC",
      [req.params.id]
    );
    res.json(messages.map(normalizeRow));
  })
);

app.post(
  "/api/chat/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const {
      senderId = "",
      senderName = "Guest",
      senderRole = "guest",
      message = "",
    } = req.body;

    if (!message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [conversations] = await pool.execute("SELECT id FROM chat_conversations WHERE id = ?", [req.params.id]);
    if (conversations.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const chatMessage = await insertRow(
      "chat_messages",
      {
        conversationId: req.params.id,
        senderId: String(senderId || ""),
        senderName: senderName.trim() || "Guest",
        senderRole,
        message: message.trim(),
      },
      chatMessageFields
    );

    await pool.execute(
      "UPDATE chat_conversations SET status = 'Open', lastMessageAt = CURRENT_TIMESTAMP WHERE id = ?",
      [req.params.id]
    );

    res.status(201).json(chatMessage);
  })
);

app.patch(
  "/api/chat/conversations/:id",
  asyncHandler(async (req, res) => {
    const conversation = await updateRow("chat_conversations", req.params.id, req.body, ["status", "subject"]);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  })
);

// Serve the React production build.
const buildPath = path.join(__dirname, "build");

app.use(express.static(buildPath));

// Fallback for React Router routes.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(buildPath, "index.html"));
});

// Fallback response for unknown API routes.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error response so route handlers do not repeat try/catch blocks.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(400).json({ error: error.message });
});

const port = process.env.PORT || 5000;

// Start server only after database initialization succeeds.
initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`MySQL connected: ${dbConfig.database}`);
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MySQL connection error:", error);
    process.exit(1);
  });
