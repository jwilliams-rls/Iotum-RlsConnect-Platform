import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert
} from "@mui/material";

export default function SignupForm({ onSignupSuccess }) {
  const [form, setForm] = useState({
    orgName: "",
    adminName: "",
    adminEmail: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!form.orgName || !form.adminName || !form.adminEmail || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const res = await fetch("http://localhost:4001/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setForm({
        orgName: "",
        adminName: "",
        adminEmail: "",
        password: ""
      });
      if (onSignupSuccess) onSignupSuccess(form.orgName);
    } catch (err) {
      setError(err.message || "Signup failed");
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 400, mx: "auto", mt: 6, p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Create Organization Account
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">Signup successful!</Alert>}
      <Box component="form" onSubmit={handleSubmit} mt={2}>
        <TextField
          label="Organization Name"
          name="orgName"
          value={form.orgName}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Admin Name"
          name="adminName"
          value={form.adminName}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Admin Email"
          name="adminEmail"
          value={form.adminEmail}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="email"
          required
        />
        <TextField
          label="Password"
          name="password"
          value={form.password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="password"
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Create Account
        </Button>
      </Box>
    </Paper>
  );
}
