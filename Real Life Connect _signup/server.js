const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for prototype
const orgs = [];
const users = [];

// Signup endpoint
app.post("/api/signup", (req, res) => {
  const { orgName, adminName, adminEmail, password } = req.body;
  if (!orgName || !adminName || !adminEmail || !password) {
    return res.status(400).send("Missing fields");
  }
  // Create org record
  const orgId = orgs.length + 1;
  orgs.push({
    orgId,
    orgName,
    adminEmail,
    createdAt: new Date()
  });
  // Create admin user
  users.push({
    userId: users.length + 1,
    orgId,
    name: adminName,
    email: adminEmail,
    password, // (in real world, hash this)
    role: "admin",
    plan: "basic",
    createdAt: new Date()
  });
  // In a real implementation: now trigger premium room creation, etc.
  return res.status(200).send("Organization and admin user created");
});

// Start server
const PORT = 4001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
