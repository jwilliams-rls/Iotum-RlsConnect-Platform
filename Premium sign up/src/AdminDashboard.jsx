import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel
} from "@mui/material";

export default function AdminDashboard({ orgName }) {
  // User structure: { name, email, plan, canBookPremium }
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", plan: "Basic" });

  // Premium Room State
  const [rooms, setRooms] = useState([
    // By default, have one premium room; can add more if desired
    { name: "Premium Room", email: "premium@org.com", createdAt: new Date().toLocaleString() }
  ]);

  // Add User Logic
  const handleAddUser = () => setShowAdd(true);

  const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePlanChange = (e) => setForm({ ...form, plan: e.target.value });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.plan) return;
    setUsers([
      ...users,
      { name: form.name, email: form.email, plan: form.plan, canBookPremium: false }
    ]);
    setForm({ name: "", email: "", plan: "Basic" });
    setShowAdd(false);
  };

  // Premium Room Permission Toggle
  const handleTogglePremiumPermission = (idx) => {
    setUsers(users.map((user, i) =>
      i === idx ? { ...user, canBookPremium: !user.canBookPremium } : user
    ));
  };

  // Add/Remove Premium Room (optional)
  const handleCreatePremiumRoom = () => {
    setRooms([...rooms, {
      name: `Premium Room #${rooms.length + 1}`,
      email: `premium${rooms.length + 1}@org.com`,
      createdAt: new Date().toLocaleString()
    }]);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {orgName ? `Admin Dashboard for ${orgName}` : "Admin Dashboard"}
        </Typography>

        {/* Organization Users Section */}
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Organization Users
        </Typography>
        <Button variant="contained" color="primary" onClick={handleAddUser} sx={{ mb: 2 }}>
          Add Organization User
        </Button>

        {showAdd && (
          <Box component="form" onSubmit={handleFormSubmit} sx={{ mb: 2 }}>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              required
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleInputChange}
              required
              fullWidth
              sx={{ mb: 1 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Plan</InputLabel>
              <Select
                name="plan"
                value={form.plan}
                label="Plan"
                onChange={handlePlanChange}
              >
                <MenuItem value="Basic">Basic</MenuItem>
                <MenuItem value="Plus">Plus</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="success">
              Save User
            </Button>
          </Box>
        )}

        <List>
          {users.length === 0 ? (
            <ListItem>
              <ListItemText primary="No organization users yet." />
            </ListItem>
          ) : (
            users.map((u, i) => (
              <ListItem key={i} alignItems="flex-start" sx={{ display: 'block', mb: 1 }}>
                <ListItemText
                  primary={`${u.name} (${u.plan})`}
                  secondary={
                    <>
                      {u.email}
                      <br />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={u.canBookPremium}
                            onChange={() => handleTogglePremiumPermission(i)}
                            color="secondary"
                          />
                        }
                        label="Can reserve Premium Room"
                        sx={{ mt: 1 }}
                      />
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>

        <Divider sx={{ my: 3 }} />

        {/* Premium Rooms Section */}
        <Typography variant="subtitle1">
          Premium Room <span style={{ fontSize: "0.85em", color: "#888" }}>(shared by approved users)</span>
        </Typography>
        <Button variant="contained" color="secondary" onClick={handleCreatePremiumRoom} sx={{ mb: 2 }}>
          Add Additional Premium Room
        </Button>
        <List>
          {rooms.length === 0 ? (
            <ListItem>
              <ListItemText primary="No premium rooms yet." />
            </ListItem>
          ) : (
            rooms.map((room, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={room.name}
                  secondary={
                    <>
                      Email: {room.email}
                      <br />
                      Created at: {room.createdAt}
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
        <Typography variant="caption" sx={{ color: "#555", mt: 2, display: "block" }}>
          Only users with permission (checked above) can reserve the Premium Room for pro features.
        </Typography>
      </Paper>
    </Box>
  );
}
