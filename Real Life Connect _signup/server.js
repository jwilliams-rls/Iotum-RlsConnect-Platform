const express = require("express");
const { openStore } = require("./db");
const { hashPassword } = require("./passwords");

function createApp(store) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  // The Vite proxy serves browser API requests from the same origin.
  // No public user-list or database-download endpoint is exposed.
  let hashing = 0;
  app.post("/api/signup", async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).send("Invalid signup details.");
    const { orgName, adminName, adminEmail, password } = body;
    if ([orgName, adminName, adminEmail, password].some(v => typeof v !== "string")) {
      return res.status(400).send("Organization, administrator, email, and password are required.");
    }
    const details = { orgName: orgName.trim(), adminName: adminName.trim(), adminEmail: adminEmail.trim().toLowerCase() };
    if (!details.orgName || !details.adminName || details.orgName.length > 200 || details.adminName.length > 200) {
      return res.status(400).send("Organization and administrator names must be 1–200 characters.");
    }
    if (details.adminEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.adminEmail)) {
      return res.status(400).send("Enter a valid administrator email address.");
    }
    if (password.length < 12 || password.length > 256) {
      return res.status(400).send("Use a password between 12 and 256 characters.");
    }
    if (hashing >= 4) return res.status(429).send("Signup is busy. Please try again shortly.");
    hashing++;
    try {
      const passwordHash = await hashPassword(password);
      store.createSignup({ ...details, passwordHash });
      return res.status(201).send("Signup saved. Payment and Iotum activation are not connected yet.");
    } catch (error) {
      if (error.status === 409) return res.status(409).send(error.message);
      console.error("Signup could not be saved.");
      return res.status(500).send("Signup could not be saved. Please try again.");
    } finally {
      hashing--;
    }
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.too.large") return res.status(413).send("Signup request is too large.");
    if (error.type === "entity.parse.failed") return res.status(400).send("Invalid JSON request.");
    return res.status(500).send("Request could not be processed.");
  });
  return app;
}

if (require.main === module) {
  process.umask(0o077);
  const store = openStore();
  const port = Number(process.env.PORT || 4001);
  const server = createApp(store).listen(port, "127.0.0.1", () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log("SQLite storage ready. Signup is development-only; billing and activation are not connected.");
  });
  function shutdown() {
    server.close(() => { store.close(); process.exit(0); });
  }
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
module.exports = { createApp };
