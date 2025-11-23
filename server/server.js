const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const validator = require("validator");
const db = require("./db");
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 60)
});
app.use(limiter);

app.use(express.static(path.join(__dirname, "..", "frontend")));

function generateCode(len = 6) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

app.post("/api/shorten", async (req, res) => {
  try {
    const { url, customCode } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL." });

    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    if (!validator.isURL(normalized, { require_protocol: true }))
      return res.status(400).json({ error: "Invalid URL." });

    let code = null;

    if (customCode) {
      if (!/^[0-9A-Za-z\-_]{3,100}$/.test(customCode))
        return res.status(400).json({ error: "Invalid custom code." });

      const exists = await db.query("SELECT id FROM links WHERE code = $1", [customCode]);
      if (exists.rows.length)
        return res.status(409).json({ error: "Custom code already exists." });

      code = customCode;
    } else {
      for (let i = 0; i < 5; i++) {
        const cand = generateCode(6);
        const exists = await db.query("SELECT id FROM links WHERE code = $1", [cand]);
        if (!exists.rows.length) {
          code = cand;
          break;
        }
      }
      if (!code) code = generateCode(10);
    }

    await db.query("INSERT INTO links(code, original_url) VALUES($1,$2)", [code, normalized]);
    res.status(201).json({ shortUrl: `${BASE_URL}/${code}`, code, originalUrl: normalized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { rows } = await db.query("SELECT id, original_url FROM links WHERE code = $1", [code]);
    if (!rows.length) return res.status(404).send("Not found");
    const link = rows[0];
    await db.query("UPDATE links SET clicks = clicks + 1, last_clicked = now() WHERE id = $1", [link.id]);
    res.redirect(302, link.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => console.log(`TinyLink running on ${PORT}`));
