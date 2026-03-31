const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const crypto = require("crypto");
const net = require("net");
const { spawn } = require("child_process");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const SERVICE_ORDERS_FILE = path.join(DATA_DIR, "service-orders.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ADMIN_EMAIL = "khambhatiburhanuddin72@gmail.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const SESSION_SECRET = process.env.SESSION_SECRET || "dynamicitservices-dev-secret-change-me";
const COOKIE_NAME = "dis_auth";
const ALLOW_DEMO_OTP_MODE = process.env.ALLOW_DEMO_OTP_MODE !== "false";
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || "dynamicitservices").trim();
const MONGODB_RETRY_DELAY_MS = Number(process.env.MONGODB_RETRY_DELAY_MS || 30000);
const AUTO_START_LOCAL_MONGODB = process.env.AUTO_START_LOCAL_MONGODB !== "false";
const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
const RAZORPAY_WEBHOOK_SECRET = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
const IS_RAZORPAY_CONFIGURED = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
let mongoDbPromise = null;
let mongoRetryNotBefore = 0;
let localMongoStartPromise = null;
let localMongoStartAttempted = false;

const LOCAL_MONGO_DEFAULT_PORT = 27017;
const LOCAL_MONGO_CONFIG_PATH = path.join(DATA_DIR, "mongodb", "mongod-local.cfg");
const LOCAL_MONGO_CANDIDATE_BINS = [
  "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe",
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

const SERVICE_CATALOG = [
  {
    id: "secure-web-development",
    title: "Secure Web Development",
    description: "Security-first website and web app development with robust backend architecture.",
  },
  {
    id: "logo-designing",
    title: "Logo Designing",
    description: "Professional logo concepts aligned with your brand identity and market.",
  },
  {
    id: "internet-marketing-seo",
    title: "Internet Marketing and SEO",
    description: "Search visibility, content strategy, and campaign execution for better lead flow.",
  },
  {
    id: "digital-growth-management",
    title: "Digital Growth Management",
    description: "Ongoing planning and execution focused on measurable online business growth.",
  },
  {
    id: "management-maintenance",
    title: "Managing and Maintenance",
    description: "Continuous support, updates, monitoring, and maintenance for digital systems.",
  },
];

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, "[]", "utf8");
  if (!fs.existsSync(SERVICE_ORDERS_FILE)) fs.writeFileSync(SERVICE_ORDERS_FILE, "[]", "utf8");
  if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, "[]", "utf8");
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, { "Content-Type": MIME_TYPES[".json"], ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function serveStatic(reqPath, res) {
  let normalizedReqPath = reqPath;
  try {
    normalizedReqPath = decodeURIComponent(reqPath);
  } catch (error) {
    sendJson(res, 400, { error: "Bad request" });
    return;
  }

  let filePath = path.join(PUBLIC_DIR, normalizedReqPath === "/" ? "index.html" : normalizedReqPath);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (normalizedReqPath !== "/index.html" && normalizedReqPath !== "/") {
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (indexErr, indexData) => {
          if (indexErr) {
            sendJson(res, 404, { error: "Not found" });
            return;
          }
          res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
          res.end(indexData);
        });
        return;
      }
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function readJsonFile(filePath, fallback = []) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function readContacts() {
  return readJsonFile(CONTACTS_FILE, []);
}

function writeContacts(data) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function readServiceOrders() {
  return readJsonFile(SERVICE_ORDERS_FILE, []);
}

function writeServiceOrders(data) {
  fs.writeFileSync(SERVICE_ORDERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function readPayments() {
  return readJsonFile(PAYMENTS_FILE, []);
}

function writePayments(data) {
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function readUsers() {
  return readJsonFile(USERS_FILE, []);
}

function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function isTcpPortOpen(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function parseLocalMongoTarget(uri) {
  if (!uri || !uri.startsWith("mongodb://")) return null;

  try {
    const normalized = uri.replace("mongodb://", "http://");
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!isLocalHost) return null;
    return { host, port: Number(parsed.port || LOCAL_MONGO_DEFAULT_PORT) };
  } catch (error) {
    return null;
  }
}

function findLocalMongoBinary() {
  for (const candidate of LOCAL_MONGO_CANDIDATE_BINS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function ensureLocalMongoRunning() {
  const target = parseLocalMongoTarget(MONGODB_URI);
  if (!target || !AUTO_START_LOCAL_MONGODB) return;
  if (await isTcpPortOpen(target.host, target.port)) return;
  if (localMongoStartAttempted) return localMongoStartPromise;

  localMongoStartAttempted = true;
  localMongoStartPromise = (async () => {
    if (!fs.existsSync(LOCAL_MONGO_CONFIG_PATH)) {
      console.warn(`Local MongoDB config not found at ${LOCAL_MONGO_CONFIG_PATH}.`);
      return;
    }

    const mongoBin = findLocalMongoBinary();
    if (!mongoBin) {
      console.warn("Local MongoDB binary not found. Install MongoDB Community Server or disable local MongoDB in .env.");
      return;
    }

    spawn(mongoBin, ["--config", LOCAL_MONGO_CONFIG_PATH], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (await isTcpPortOpen(target.host, target.port, 1000)) {
        console.log(`Local MongoDB started on ${target.host}:${target.port}.`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.warn(`Local MongoDB did not become ready on ${target.host}:${target.port}.`);
  })().catch((error) => {
    console.warn("Failed to auto-start local MongoDB:", error.message || error);
  });

  return localMongoStartPromise;
}

async function getMongoDb() {
  if (!MONGODB_URI) return null;
  if (Date.now() < mongoRetryNotBefore) return null;
  if (!mongoDbPromise) {
    mongoDbPromise = (async () => {
      await ensureLocalMongoRunning();
      const { MongoClient } = require("mongodb");
      const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      mongoRetryNotBefore = 0;
      return client.db(MONGODB_DB_NAME);
    })().catch((error) => {
      mongoDbPromise = null;
      mongoRetryNotBefore = Date.now() + MONGODB_RETRY_DELAY_MS;
      console.error(
        `MongoDB connection failed (${error.message || error}). Falling back to local JSON store; retry in ${
          Math.round(MONGODB_RETRY_DELAY_MS / 1000)
        }s.`
      );
      return null;
    });
  }
  return mongoDbPromise;
}

async function getMongoCollection(name) {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection(name);
}

async function upsertMongoRecord(collectionName, id, payload) {
  try {
    const collection = await getMongoCollection(collectionName);
    if (!collection) return false;
    await collection.updateOne({ id }, { $set: payload }, { upsert: true });
    return true;
  } catch (error) {
    console.error(`MongoDB upsert failed (${collectionName}):`, error.message || error);
    return false;
  }
}

async function insertMongoRecord(collectionName, payload) {
  try {
    const collection = await getMongoCollection(collectionName);
    if (!collection) return false;
    await collection.insertOne(payload);
    return true;
  } catch (error) {
    console.error(`MongoDB insert failed (${collectionName}):`, error.message || error);
    return false;
  }
}

async function syncLocalContactsToMongo() {
  try {
    const contacts = readContacts();
    if (!Array.isArray(contacts) || contacts.length === 0) return;
    for (const item of contacts) {
      if (!item || !item.id) continue;
      await upsertMongoRecord("contacts", item.id, item);
      await upsertMongoRecord("emails", item.id, item);
    }
  } catch (error) {
    console.error("MongoDB contact sync failed:", error.message || error);
  }
}

async function syncLocalUsersToMongo() {
  try {
    const users = readUsers();
    if (!Array.isArray(users) || users.length === 0) return;
    for (const item of users) {
      if (!item || !item.id) continue;
      await upsertMongoRecord("users", item.id, item);
    }
  } catch (error) {
    console.error("MongoDB user sync failed:", error.message || error);
  }
}

async function findMongoRecordById(collectionName, id) {
  try {
    const collection = await getMongoCollection(collectionName);
    if (!collection) return null;
    return await collection.findOne({ id }, { projection: { _id: 0 } });
  } catch (error) {
    console.error(`MongoDB find by id failed (${collectionName}):`, error.message || error);
    return null;
  }
}

async function listClientOrdersFromMongo(email) {
  try {
    const normalizedEmail = normalizeEmail(email);
    const [paymentsCollection, serviceOrdersCollection] = await Promise.all([
      getMongoCollection("payments"),
      getMongoCollection("service_orders"),
    ]);

    if (!paymentsCollection && !serviceOrdersCollection) return null;

    const [payments, serviceOrders] = await Promise.all([
      paymentsCollection
        ? paymentsCollection.find({}, { projection: { _id: 0 } }).toArray()
        : Promise.resolve([]),
      serviceOrdersCollection
        ? serviceOrdersCollection.find({}, { projection: { _id: 0 } }).toArray()
        : Promise.resolve([]),
    ]);

    return [...payments, ...serviceOrders]
      .filter((entry) => normalizeEmail(entry.customerEmail) === normalizedEmail)
      .sort((a, b) => String(b.createdAt || b.paidAt || "").localeCompare(String(a.createdAt || a.paidAt || "")));
  } catch (error) {
    console.error("MongoDB list client orders failed:", error.message || error);
    return null;
  }
}

async function listContactsFromMongo() {
  try {
    const emailsCollection = await getMongoCollection("emails");
    if (emailsCollection) {
      const emails = await emailsCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      if (Array.isArray(emails) && emails.length > 0) return emails;
    }

    const contactsCollection = await getMongoCollection("contacts");
    if (!contactsCollection) return null;
    return await contactsCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error("MongoDB list contacts failed:", error.message || error);
    return null;
  }
}

async function findMongoPaymentByGatewayOrTxn(orderId, txnId) {
  try {
    const collection = await getMongoCollection("payments");
    if (!collection) return null;
    const conditions = [];
    if (orderId) conditions.push({ gatewayOrderId: orderId });
    if (txnId) conditions.push({ transactionId: txnId });
    if (conditions.length === 0) return null;
    return await collection.findOne({ $or: conditions }, { projection: { _id: 0 } });
  } catch (error) {
    console.error("MongoDB payment lookup failed:", error.message || error);
    return null;
  }
}

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function verifyRazorpayPaymentSignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const provided = String(signature || "");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const provided = String(signature || "");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

async function createRazorpayOrder({ amountMinor, receipt, notes }) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountMinor,
      currency: "INR",
      receipt,
      payment_capture: 1,
      notes: notes || {},
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = payload?.error?.description || payload?.error?.code || "razorpay_order_create_failed";
    throw new Error(reason);
  }
  return payload;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hashOtp(otp) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(String(otp)).digest("hex");
}

function safeEqualHex(aHex, bHex) {
  if (!aHex || !bHex) return false;
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function toBase64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function createSessionToken(user) {
  const payloadObj = { uid: user.id, email: user.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const payload = toBase64Url(JSON.stringify(payloadObj));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function parseSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature !== expected) return null;
  const data = JSON.parse(fromBase64Url(payload));
  if (!data.exp || Date.now() > data.exp) return null;
  return data;
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  const map = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    map[k] = decodeURIComponent(rest.join("="));
  });
  return map;
}

function authCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

function clearAuthCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  const remote = forwarded || req.socket?.remoteAddress || "";
  if (remote.startsWith("::ffff:")) return remote.slice(7);
  return remote;
}

async function persistUserToMongo(user) {
  if (!user || !user.id) return false;
  return upsertMongoRecord("users", user.id, user);
}

async function recordUserLogin(user, req) {
  if (!user || !user.id) return false;
  const event = {
    id: `${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`,
    userId: user.id,
    name: user.name,
    email: user.email,
    ipAddress: getRequestIp(req),
    userAgent: String(req.headers["user-agent"] || "").trim(),
    loggedInAt: new Date().toISOString(),
  };
  return insertMongoRecord("user_logins", event);
}

function getAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = parseSessionToken(token);
  if (!payload) return null;
  const users = readUsers();
  return users.find((u) => u.id === payload.uid) || null;
}

async function sendEmail({ to, subject, text, html, replyTo }) {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: SMTP_FROM_EMAIL,
        to,
        subject,
        text,
        html,
        replyTo,
      });
      return { sent: true, provider: "smtp" };
    } catch (error) {
      return { sent: false, reason: `smtp_error:${error.message || "unknown"}` };
    }
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return { sent: false, reason: "missing_email_config" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      reply_to: replyTo,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const reason = await res.text();
    return { sent: false, reason: `email_api_error:${reason}` };
  }

  return { sent: true, provider: "resend" };
}

async function sendContactEmail(contact) {
  const subject = `New website inquiry from ${contact.name}`;
  const text = [
    "New contact submission",
    "",
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Message: ${contact.message}`,
    `Submitted At: ${contact.createdAt}`,
  ].join("\n");

  const html = `
    <h2>New contact submission</h2>
    <p><strong>Name:</strong> ${contact.name}</p>
    <p><strong>Email:</strong> ${contact.email}</p>
    <p><strong>Message:</strong> ${contact.message}</p>
    <p><strong>Submitted At:</strong> ${contact.createdAt}</p>
  `;
  return sendEmail({ to: ADMIN_EMAIL, replyTo: contact.email, subject, text, html });
}

async function sendPasswordOtpEmail(user, otp) {
  const subject = "Dynamic IT Services Password Reset OTP";
  const text = [
    `Hello ${user.name},`,
    "",
    "Your password reset OTP is:",
    otp,
    "",
    "This OTP is valid for 10 minutes.",
    "If you did not request this, please ignore this email.",
  ].join("\n");

  const html = `
    <h2>Password Reset OTP</h2>
    <p>Hello ${user.name},</p>
    <p>Your OTP is: <strong style="font-size:20px; letter-spacing:2px;">${otp}</strong></p>
    <p>This OTP is valid for <strong>10 minutes</strong>.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return sendEmail({ to: user.email, subject, text, html });
}

async function sendRegistrationEmail(user) {
  const subject = "Welcome to Dynamic IT Services";
  const text = [
    `Hello ${user.name},`,
    "",
    "Your account has been created successfully on Dynamic IT Services.",
    "You can now log in and place service orders from our website.",
    "",
    `Registered Email: ${user.email}`,
    "",
    "If you did not create this account, please reply to this email immediately.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.6;">
      <h2 style="margin-bottom:12px;">Welcome to Dynamic IT Services</h2>
      <p>Hello ${user.name},</p>
      <p>Your account has been created successfully on <strong>Dynamic IT Services</strong>.</p>
      <p>You can now log in and place service orders from our website.</p>
      <p><strong>Registered Email:</strong> ${user.email}</p>
      <p>If you did not create this account, please reply to this email immediately.</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
}

async function sendServiceOrderEmail(order) {
  const subject = "New Order Received";
  const text = [
    "New Order Received",
    "",
    `Name: ${order.customerName}`,
    `Service: ${order.serviceTitle}`,
  ].join("\n");

  const html = `
    <h2>New Order Received</h2>
    <p><strong>Name:</strong> ${order.customerName}</p>
    <p><strong>Service:</strong> ${order.serviceTitle}</p>
  `;
  return sendEmail({ to: ADMIN_EMAIL, replyTo: order.customerEmail, subject, text, html });
}

async function sendServiceOrderConfirmationEmail(order) {
  const subject = "Your order has been placed successfully";
  const text = ["Your order has been placed successfully", "", "We will contact you soon"].join("\n");

  const html = `
    <h2>Your order has been placed successfully</h2>
    <p>We will contact you soon.</p>
  `;

  return sendEmail({ to: order.customerEmail, subject, text, html });
}

async function sendPaidOrderNotificationEmail(payment) {
  const subject = `Paid service order: ${payment.serviceTitle} - ${payment.customerName}`;
  const text = [
    `${payment.customerName} has placed and paid for a service order.`,
    "",
    `Payment ID: ${payment.id}`,
    `Invoice Number: ${payment.invoiceNumber || "N/A"}`,
    `Service: ${payment.serviceTitle}`,
    `Subservice: ${payment.subserviceTitle || "N/A"}`,
    `Price: ${payment.priceText || "N/A"}`,
    `Amount Paid: ${payment.amount || "N/A"}`,
    `Customer Name: ${payment.customerName}`,
    `Customer Email: ${payment.customerEmail}`,
    `Customer Phone: ${payment.customerPhone || "N/A"}`,
    `Specification: ${payment.specification || "N/A"}`,
    `Paid At: ${payment.paidAt || payment.createdAt || new Date().toISOString()}`,
    "",
    "Please reply to this email to contact the client directly.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.6;">
      <h2 style="margin-bottom:12px;">Paid service order received</h2>
      <p><strong>${payment.customerName}</strong> has placed and paid for a service order.</p>
      <p><strong>Payment ID:</strong> ${payment.id}</p>
      <p><strong>Invoice Number:</strong> ${payment.invoiceNumber || "N/A"}</p>
      <p><strong>Service:</strong> ${payment.serviceTitle}</p>
      <p><strong>Subservice:</strong> ${payment.subserviceTitle || "N/A"}</p>
      <p><strong>Price:</strong> ${payment.priceText || "N/A"}</p>
      <p><strong>Amount Paid:</strong> ${payment.amount || "N/A"}</p>
      <p><strong>Customer Name:</strong> ${payment.customerName}</p>
      <p><strong>Customer Email:</strong> ${payment.customerEmail}</p>
      <p><strong>Customer Phone:</strong> ${payment.customerPhone || "N/A"}</p>
      <p><strong>Specification:</strong> ${payment.specification || "N/A"}</p>
      <p><strong>Paid At:</strong> ${payment.paidAt || payment.createdAt || new Date().toISOString()}</p>
      <p>Please reply to this email to contact the client directly.</p>
    </div>
  `;

  return sendEmail({ to: ADMIN_EMAIL, replyTo: payment.customerEmail, subject, text, html });
}

async function sendPaymentConfirmationEmail(payment) {
  const subject = "Dynamic IT Services Payment Confirmation";
  const text = [
    `Hello ${payment.customerName},`,
    "",
    "We have received your order and payment successfully.",
    `Service: ${payment.serviceTitle}`,
    `Subservice: ${payment.subserviceTitle || "N/A"}`,
    `Price: ${payment.priceText || "N/A"}`,
    `Invoice Number: ${payment.invoiceNumber || "N/A"}`,
    "",
    "Our team will contact you within 24 hours.",
    "",
    "Thank you for choosing Dynamic IT Services.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.6;">
      <h2 style="margin-bottom:12px;">Payment Confirmation</h2>
      <p>Hello ${payment.customerName},</p>
      <p>We have received your order and payment successfully.</p>
      <p><strong>Service:</strong> ${payment.serviceTitle}</p>
      <p><strong>Subservice:</strong> ${payment.subserviceTitle || "N/A"}</p>
      <p><strong>Price:</strong> ${payment.priceText || "N/A"}</p>
      <p><strong>Invoice Number:</strong> ${payment.invoiceNumber || "N/A"}</p>
      <p>Our team will contact you within <strong>24 hours</strong>.</p>
      <p>Thank you for choosing Dynamic IT Services.</p>
    </div>
  `;

  return sendEmail({ to: payment.customerEmail, subject, text, html });
}

async function sendPaymentEmails(payment) {
  if (!payment || payment.status !== "paid") {
    return {
      adminEmailSent: false,
      adminEmailStatus: "skipped_not_paid",
      clientEmailSent: false,
      clientEmailStatus: "skipped_not_paid",
    };
  }

  if (payment.adminEmailSent && payment.clientEmailSent) {
    return {
      adminEmailSent: true,
      adminEmailStatus: payment.adminEmailStatus || "sent",
      clientEmailSent: true,
      clientEmailStatus: payment.clientEmailStatus || "sent",
    };
  }

  const [adminResult, clientResult] = await Promise.all([
    payment.adminEmailSent
      ? Promise.resolve({ sent: true, reason: payment.adminEmailStatus || "sent" })
      : sendPaidOrderNotificationEmail(payment),
    payment.clientEmailSent
      ? Promise.resolve({ sent: true, reason: payment.clientEmailStatus || "sent" })
      : sendPaymentConfirmationEmail(payment),
  ]);

  return {
    adminEmailSent: Boolean(adminResult.sent),
    adminEmailStatus: adminResult.reason || "sent",
    clientEmailSent: Boolean(clientResult.sent),
    clientEmailStatus: clientResult.reason || "sent",
  };
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { status: "ok", service: "dynamicitservices", now: new Date().toISOString() });
  }

  if (url.pathname === "/api/auth/register" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const name = String(body.name || "").trim();
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");

      if (!name || !email || !password) {
        return sendJson(res, 400, { error: "name, email, and password are required" });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { error: "password must be at least 6 characters" });
      }

      const users = readUsers();
      if (users.some((u) => u.email === email)) {
        return sendJson(res, 409, { error: "email already registered" });
      }

      const user = {
        id: `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`,
        name,
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      writeUsers(users);
      await persistUserToMongo(user);

      let emailResult = { sent: false, reason: "unknown" };
      try {
        emailResult = await sendRegistrationEmail(user);
      } catch (error) {
        console.error("Registration email failed:", error.message || error);
      }

      const token = createSessionToken(user);
      return sendJson(
        res,
        201,
        {
          success: true,
          user: { id: user.id, name: user.name, email: user.email },
          registrationEmailSent: Boolean(emailResult?.sent),
        },
        { "Set-Cookie": authCookie(token) }
      );
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      if (!email || !password) return sendJson(res, 400, { error: "email and password are required" });

      const users = readUsers();
      const idx = users.findIndex((u) => u.email === email);
      if (idx === -1) return sendJson(res, 404, { error: "no user found" });
      if (!verifyPassword(password, users[idx].passwordHash)) return sendJson(res, 401, { error: "incorrect password" });

      users[idx] = {
        ...users[idx],
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: getRequestIp(req),
        updatedAt: new Date().toISOString(),
      };
      writeUsers(users);
      const user = users[idx];
      await persistUserToMongo(user);
      await recordUserLogin(user, req);

      const token = createSessionToken(user);
      return sendJson(
        res,
        200,
        { success: true, user: { id: user.id, name: user.name, email: user.email } },
        { "Set-Cookie": authCookie(token) }
      );
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/auth/forgot/request" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      if (!email) return sendJson(res, 400, { error: "email is required" });

      const users = readUsers();
      const idx = users.findIndex((u) => u.email === email);
      if (idx === -1) return sendJson(res, 404, { error: "no user found" });

      const otp = String(crypto.randomInt(100000, 1000000));
      users[idx].resetOtpHash = hashOtp(otp);
      users[idx].resetOtpExpires = Date.now() + 10 * 60 * 1000;
      users[idx].resetOtpAttempts = 0;
      writeUsers(users);

      const emailResult = await sendPasswordOtpEmail(users[idx], otp);
      if (!emailResult.sent) {
        if (!ALLOW_DEMO_OTP_MODE) {
          return sendJson(res, 500, { error: `otp_send_failed:${emailResult.reason}` });
        }
        return sendJson(res, 200, {
          success: true,
          message: "email blocked; demo otp generated for project testing",
          demoOtp: otp,
        });
      }

      return sendJson(res, 200, { success: true, message: "otp sent to your registered email" });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/auth/forgot/confirm" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      const otp = String(body.otp || "").trim();
      const newPassword = String(body.newPassword || "");
      if (!email || !otp || !newPassword) {
        return sendJson(res, 400, { error: "email, otp, and newPassword are required" });
      }
      if (newPassword.length < 6) return sendJson(res, 400, { error: "password must be at least 6 characters" });

      const users = readUsers();
      const idx = users.findIndex((u) => u.email === email);
      if (idx === -1) return sendJson(res, 404, { error: "no user found" });

      const user = users[idx];
      if (!user.resetOtpHash || !user.resetOtpExpires) {
        return sendJson(res, 400, { error: "otp not requested" });
      }
      if (Date.now() > user.resetOtpExpires) {
        delete users[idx].resetOtpHash;
        delete users[idx].resetOtpExpires;
        delete users[idx].resetOtpAttempts;
        writeUsers(users);
        return sendJson(res, 400, { error: "otp expired" });
      }

      const providedHash = hashOtp(otp);
      if (!safeEqualHex(user.resetOtpHash, providedHash)) {
        users[idx].resetOtpAttempts = (users[idx].resetOtpAttempts || 0) + 1;
        if (users[idx].resetOtpAttempts >= 5) {
          delete users[idx].resetOtpHash;
          delete users[idx].resetOtpExpires;
          delete users[idx].resetOtpAttempts;
        }
        writeUsers(users);
        return sendJson(res, 401, { error: "invalid otp" });
      }

      users[idx].passwordHash = hashPassword(newPassword);
      users[idx].updatedAt = new Date().toISOString();
      delete users[idx].resetOtpHash;
      delete users[idx].resetOtpExpires;
      delete users[idx].resetOtpAttempts;
      writeUsers(users);
      await persistUserToMongo(users[idx]);

      return sendJson(res, 200, { success: true, message: "password updated successfully" });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/auth/forgot/verify" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      const otp = String(body.otp || "").trim();
      if (!email || !otp) return sendJson(res, 400, { error: "email and otp are required" });

      const users = readUsers();
      const idx = users.findIndex((u) => u.email === email);
      if (idx === -1) return sendJson(res, 404, { error: "no user found" });

      const user = users[idx];
      if (!user.resetOtpHash || !user.resetOtpExpires) return sendJson(res, 400, { error: "otp not requested" });
      if (Date.now() > user.resetOtpExpires) return sendJson(res, 400, { error: "otp expired" });

      const providedHash = hashOtp(otp);
      if (!safeEqualHex(user.resetOtpHash, providedHash)) {
        users[idx].resetOtpAttempts = (users[idx].resetOtpAttempts || 0) + 1;
        if (users[idx].resetOtpAttempts >= 5) {
          delete users[idx].resetOtpHash;
          delete users[idx].resetOtpExpires;
          delete users[idx].resetOtpAttempts;
        }
        writeUsers(users);
        return sendJson(res, 401, { error: "otp not valid" });
      }

      return sendJson(res, 200, { success: true, message: "otp verified" });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = getAuthUser(req);
    if (!user) return sendJson(res, 200, { loggedIn: false });
    return sendJson(res, 200, { loggedIn: true, user: { id: user.id, name: user.name, email: user.email } });
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    return sendJson(res, 200, { success: true }, { "Set-Cookie": clearAuthCookie() });
  }

  if (url.pathname === "/api/services" && req.method === "GET") {
    return sendJson(res, 200, {
      services: [
        { id: "web", title: "Web Development", description: "Modern, scalable web platforms built for growth." },
        { id: "cloud", title: "Cloud Enablement", description: "Cloud migration, optimization, and managed operations." },
        { id: "automation", title: "IT Automation", description: "Workflow automation to reduce manual effort and risk." },
      ],
    });
  }

  if (url.pathname === "/api/service-catalog" && req.method === "GET") {
    return sendJson(res, 200, { services: SERVICE_CATALOG });
  }

  if (url.pathname === "/api/service-orders" && req.method === "POST") {
    try {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: "login required to place service order" });

      const body = await parseBody(req);
      const serviceId = String(body.serviceId || "").trim();
      const companyName = String(body.companyName || "").trim();
      const phone = String(body.phone || "").trim();
      const budgetRange = String(body.budgetRange || "").trim();
      const timeline = String(body.timeline || "").trim();
      const projectSummary = String(body.projectSummary || "").trim();

      const service = SERVICE_CATALOG.find((s) => s.id === serviceId);
      if (!service) return sendJson(res, 400, { error: "invalid service selected" });
      if (!projectSummary) return sendJson(res, 400, { error: "project summary is required" });

      const orders = readServiceOrders();
      const order = {
        id: `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`,
        serviceId: service.id,
        serviceTitle: service.title,
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        companyName,
        phone,
        budgetRange,
        timeline,
        projectSummary,
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      writeServiceOrders(orders);
      await upsertMongoRecord("service_orders", order.id, order);

      const [adminEmailResult, clientEmailResult] = await Promise.all([
        sendServiceOrderEmail(order),
        sendServiceOrderConfirmationEmail(order),
      ]);

      return sendJson(res, 201, {
        success: true,
        order,
        emailSent: adminEmailResult.sent,
        emailStatus: adminEmailResult.reason || "sent",
        clientEmailSent: clientEmailResult.sent,
        clientEmailStatus: clientEmailResult.reason || "sent",
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/client/orders" && req.method === "GET") {
    try {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: "login required" });

      const mongoOrders = await listClientOrdersFromMongo(user.email);
      if (Array.isArray(mongoOrders)) {
        return sendJson(res, 200, {
          success: true,
          source: "mongodb",
          orders: mongoOrders,
          count: mongoOrders.length,
        });
      }

      const normalizedEmail = normalizeEmail(user.email);
      const payments = readPayments().filter((entry) => normalizeEmail(entry.customerEmail) === normalizedEmail);
      const serviceOrders = readServiceOrders().filter((entry) => normalizeEmail(entry.customerEmail) === normalizedEmail);
      const orders = [...payments, ...serviceOrders]
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return sendJson(res, 200, {
        success: true,
        source: "local",
        orders,
        count: orders.length,
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/admin/contacts" && req.method === "GET") {
    try {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: "login required" });
      if (normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)) {
        return sendJson(res, 403, { error: "admin access required" });
      }

      const mongoContacts = await listContactsFromMongo();
      if (Array.isArray(mongoContacts)) {
        return sendJson(res, 200, {
          success: true,
          source: "mongodb",
          contacts: mongoContacts,
          count: mongoContacts.length,
        });
      }

      const contacts = readContacts().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return sendJson(res, 200, {
        success: true,
        source: "local",
        contacts,
        count: contacts.length,
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (url.pathname === "/api/contact" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { name, email, message } = body;

      if (!name || !email || !message) {
        return sendJson(res, 400, { error: "name, email, and message are required" });
      }

      const contacts = readContacts();
      const record = {
        id: Date.now().toString(36),
        name: String(name).trim(),
        email: String(email).trim(),
        message: String(message).trim(),
        createdAt: new Date().toISOString(),
      };
      contacts.push(record);
      writeContacts(contacts);
      await upsertMongoRecord("contacts", record.id, record);
      await upsertMongoRecord("emails", record.id, record);
      const emailResult = await sendContactEmail(record);

      return sendJson(res, 201, {
        success: true,
        contact: record,
        emailSent: emailResult.sent,
        emailStatus: emailResult.reason || "sent",
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  const paymentPath = url.pathname.replace(/\/+$/, "");
  if (paymentPath === "/api/payments/config" && req.method === "GET") {
    return sendJson(res, 200, {
      success: true,
      mode: IS_RAZORPAY_CONFIGURED ? "razorpay" : "demo",
      razorpayEnabled: IS_RAZORPAY_CONFIGURED,
    });
  }

  if (paymentPath === "/api/payments/razorpay/verify" && req.method === "POST") {
    try {
      if (!IS_RAZORPAY_CONFIGURED) return sendJson(res, 503, { error: "razorpay_not_configured" });
      const body = await parseBody(req);
      const paymentId = String(body.paymentId || "").trim();
      const orderId = String(body.razorpay_order_id || "").trim();
      const razorpayPaymentId = String(body.razorpay_payment_id || "").trim();
      const signature = String(body.razorpay_signature || "").trim();

      if (!paymentId || !orderId || !razorpayPaymentId || !signature) {
        return sendJson(res, 400, { error: "payment verification fields are required" });
      }
      if (!verifyRazorpayPaymentSignature(orderId, razorpayPaymentId, signature)) {
        return sendJson(res, 400, { error: "invalid razorpay signature" });
      }

      let payment = await findMongoRecordById("payments", paymentId);
      if (!payment) {
        const payments = readPayments();
        payment = payments.find((entry) => entry.id === paymentId) || null;
      }
      if (!payment) return sendJson(res, 404, { error: "payment not found" });
      if (payment.gatewayOrderId && payment.gatewayOrderId !== orderId) {
        return sendJson(res, 400, { error: "order mismatch" });
      }

      payment = {
        ...payment,
        status: "paid",
        transactionId: razorpayPaymentId,
        gatewayOrderId: orderId,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const emailMeta = await sendPaymentEmails(payment);
      payment = {
        ...payment,
        ...emailMeta,
        paymentEmailsSentAt:
          emailMeta.adminEmailSent || emailMeta.clientEmailSent ? new Date().toISOString() : payment.paymentEmailsSentAt || null,
      };
      const payments = readPayments();
      const idx = payments.findIndex((entry) => entry.id === payment.id);
      if (idx === -1) payments.push(payment);
      else payments[idx] = payment;
      writePayments(payments);
      await upsertMongoRecord("payments", payment.id, payment);
      return sendJson(res, 200, { success: true, payment });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (paymentPath === "/api/payments/razorpay/webhook" && req.method === "POST") {
    try {
      if (!RAZORPAY_WEBHOOK_SECRET) return sendJson(res, 503, { error: "razorpay_webhook_secret_missing" });
      const rawBody = await parseRawBody(req);
      const signature = String(req.headers["x-razorpay-signature"] || "");
      if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
        return sendJson(res, 401, { error: "invalid webhook signature" });
      }

      const event = JSON.parse(rawBody || "{}");
      const paymentEntity = event?.payload?.payment?.entity;
      if (!paymentEntity) return sendJson(res, 200, { received: true });

      const statusMap = {
        captured: "paid",
        authorized: "authorized",
        failed: "failed",
        refunded: "refunded",
      };
      const mappedStatus = statusMap[String(paymentEntity.status || "").toLowerCase()];
      if (!mappedStatus) return sendJson(res, 200, { received: true });

      const payments = readPayments();
      const idx = payments.findIndex(
        (entry) =>
          (paymentEntity.order_id && entry.gatewayOrderId === paymentEntity.order_id) ||
          (paymentEntity.id && entry.transactionId === paymentEntity.id)
      );
      let payment = idx !== -1 ? payments[idx] : await findMongoPaymentByGatewayOrTxn(paymentEntity.order_id, paymentEntity.id);
      if (payment) {
        payment = {
          ...payment,
          status: mappedStatus,
          gatewayOrderId: paymentEntity.order_id || payment.gatewayOrderId || null,
          transactionId: paymentEntity.id || payment.transactionId || null,
          paymentMethod: paymentEntity.method || payment.paymentMethod || null,
          paidAt: mappedStatus === "paid" ? new Date().toISOString() : payment.paidAt || null,
          updatedAt: new Date().toISOString(),
        };
        if (payment.status === "paid") {
          const emailMeta = await sendPaymentEmails(payment);
          payment = {
            ...payment,
            ...emailMeta,
            paymentEmailsSentAt:
              emailMeta.adminEmailSent || emailMeta.clientEmailSent
                ? new Date().toISOString()
                : payment.paymentEmailsSentAt || null,
          };
        }
        if (idx === -1) payments.push(payment);
        else payments[idx] = payment;
        writePayments(payments);
        await upsertMongoRecord("payments", payment.id, payment);
      }
      return sendJson(res, 200, { received: true });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (
    (paymentPath === "/api/payments/demo-checkout" ||
      paymentPath === "/api/payments/checkout" ||
      paymentPath === "/api/payment/demo-checkout" ||
      paymentPath === "/api/payment/checkout") &&
    req.method === "POST"
  ) {
    try {
      const body = await parseBody(req);
      const serviceId = String(body.serviceId || "").trim();
      const serviceTitle = String(body.serviceTitle || "").trim();
      const subserviceTitle = String(body.subserviceTitle || "").trim();
      const priceText = String(body.priceText || "").trim();
      const packageDescription = String(body.packageDescription || "").trim();
      const specification = String(body.specification || "").trim();
      const paymentMethod = String(body.paymentMethod || "").trim() || "upi";
      const methodDetails = body.methodDetails && typeof body.methodDetails === "object" ? body.methodDetails : {};
      const customerName = String(body.customerName || "").trim();
      const customerEmail = String(body.customerEmail || "").trim();
      const customerPhone = String(body.customerPhone || "").trim();
      const features = Array.isArray(body.features)
        ? body.features.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const amount = Number(body.amount);

      if (!serviceTitle || !subserviceTitle) {
        return sendJson(res, 400, { error: "service and subservice are required" });
      }
      if (!customerName || !customerEmail || !customerPhone) {
        return sendJson(res, 400, { error: "customerName, customerEmail, and customerPhone are required" });
      }

      const initiatedAt = new Date().toISOString();
      const payment = {
        id: `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`,
        transactionId: null,
        invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto
          .randomBytes(2)
          .toString("hex")
          .toUpperCase()}`,
        gateway: IS_RAZORPAY_CONFIGURED ? "razorpay" : "demo",
        status: IS_RAZORPAY_CONFIGURED ? "created" : "paid",
        initiatedAt,
        paidAt: IS_RAZORPAY_CONFIGURED ? null : new Date().toISOString(),
        gatewayOrderId: null,
        serviceId,
        serviceTitle,
        subserviceTitle,
        priceText: priceText || "On request",
        amount: Number.isFinite(amount) && amount > 0 ? amount : null,
        packageDescription,
        specification,
        features,
        paymentMethod: IS_RAZORPAY_CONFIGURED ? null : paymentMethod,
        methodDetails: IS_RAZORPAY_CONFIGURED ? {} : methodDetails,
        customerName,
        customerEmail,
        customerPhone,
        createdAt: new Date().toISOString(),
      };

      if (IS_RAZORPAY_CONFIGURED) {
        if (!Number.isFinite(amount) || amount <= 0) {
          return sendJson(res, 400, { error: "valid amount is required for real payment" });
        }

        const order = await createRazorpayOrder({
          amountMinor: toMinorUnits(amount),
          receipt: payment.id.slice(0, 40),
          notes: {
            paymentId: payment.id,
            serviceTitle: payment.serviceTitle,
            subserviceTitle: payment.subserviceTitle,
          },
        });
        payment.gatewayOrderId = order.id;

        const payments = readPayments();
        payments.push(payment);
        writePayments(payments);
        await upsertMongoRecord("payments", payment.id, payment);

        return sendJson(res, 201, {
          success: true,
          mode: "razorpay",
          keyId: RAZORPAY_KEY_ID,
          order: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
          },
          payment,
        });
      }

      if (!["card", "netbanking", "upi"].includes(paymentMethod)) {
        return sendJson(res, 400, { error: "invalid payment method" });
      }
      if (paymentMethod === "card") {
        const last4 = String(methodDetails.cardLast4 || "").trim();
        if (!/^\d{4}$/.test(last4)) return sendJson(res, 400, { error: "invalid card details" });
      }
      if (paymentMethod === "netbanking") {
        const bankName = String(methodDetails.bankName || "").trim();
        const accountHolder = String(methodDetails.accountHolder || "").trim();
        if (!bankName || !accountHolder) return sendJson(res, 400, { error: "invalid net banking details" });
      }
      if (paymentMethod === "upi") {
        const upiId = String(methodDetails.upiId || "").trim();
        if (!upiId.includes("@")) return sendJson(res, 400, { error: "invalid upi details" });
      }

      payment.transactionId = `TXN${Date.now()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const emailMeta = await sendPaymentEmails(payment);
      Object.assign(payment, emailMeta, {
        paymentEmailsSentAt: emailMeta.adminEmailSent || emailMeta.clientEmailSent ? new Date().toISOString() : null,
      });

      const payments = readPayments();
      payments.push(payment);
      writePayments(payments);
      await upsertMongoRecord("payments", payment.id, payment);

      return sendJson(res, 201, {
        success: true,
        mode: "demo",
        payment,
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Bad request" });
    }
  }

  if (paymentPath.startsWith("/api/payments/") && req.method === "GET") {
    const paymentId = decodeURIComponent(paymentPath.replace("/api/payments/", "")).trim();
    if (!paymentId) return sendJson(res, 400, { error: "payment id is required" });
    let payment = await findMongoRecordById("payments", paymentId);
    if (!payment) {
      const payments = readPayments();
      payment = payments.find((entry) => entry.id === paymentId);
    }
    if (!payment) return sendJson(res, 404, { error: "payment not found" });
    return sendJson(res, 200, { success: true, payment });
  }

  sendJson(res, 404, { error: "API route not found" });
}

ensureDataStore();
syncLocalContactsToMongo();
syncLocalUsersToMongo();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/favicon.ico") {
    // 1x1 transparent PNG to replace any previously cached site icon.
    const transparentPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X6v8AAAAASUVORK5CYII=",
      "base64"
    );
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": String(transparentPng.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.end(transparentPng);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }

  serveStatic(url.pathname, res);
});

function startServer(startPort, retries = 10) {
  let attemptsLeft = retries;
  let currentPort = Number(startPort);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      attemptsLeft -= 1;
      currentPort += 1;
      console.log(`Port ${currentPort - 1} is in use, trying ${currentPort}...`);
      server.listen(currentPort);
      return;
    }
    throw err;
  });

  server.listen(currentPort, () => {
    console.log(`Dynamic IT Services app running on http://localhost:${currentPort}`);
  });
}

startServer(PORT);
