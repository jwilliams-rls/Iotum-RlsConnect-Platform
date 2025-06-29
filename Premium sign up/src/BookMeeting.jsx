import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  MenuItem,
  Autocomplete,
  Chip,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Simulate org users and contacts for demo
const orgUsers = [
  { name: "Alice Admin", email: "alice@org.com" },
  { name: "Bob User", email: "bob@org.com" },
  { name: "Carol Plus", email: "carol@org.com" }
];
const allContacts = [
  ...orgUsers,
  { name: "External Guest", email: "guest@other.com" }
];

const LOCATIONS = [
  { label: "Physical Room", value: "physical" },
  { label: "Virtual Room (Basic/Plus)", value: "virtual" },
  { label: "Premium Room", value: "premium" }
];

export default function BookMeeting({ user, canBookPremiumRoom = true }) {
  // Store booked meetings in state for demo
  const [meetings, setMeetings] = useState([]);

  const [form, setForm] = useState({
    title: "",
    datetime: new Date(),
    locationType: "virtual",
    physicalLocation: "",
    participants: []
  });

  const [error, setError] = useState("");

  // Handle form field changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle Date/Time
  const handleDateChange = (newValue) => {
    setForm({ ...form, datetime: newValue });
  };

  // Handle participants
  const handleParticipantsChange = (event, values) => {
    setForm({ ...form, participants: values });
  };

  // Only allow Premium Room if user has permission
  const availableLocations = canBookPremiumRoom
    ? LOCATIONS
    : LOCATIONS.filter(l => l.value !== "premium");

  // Save booking (MVP: just add to list)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.datetime || !form.locationType) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.locationType === "physical" && !form.physicalLocation) {
      setError("Please enter the physical location.");
      return;
    }
    setMeetings([...meetings, {
      ...form,
      id: Date.now()
    }]);
    setForm({
      title: "",
      datetime: new Date(),
      locationType: "virtual",
      physicalLocation: "",
      participants: []
    });
    setError("");
  };

  return (
    <Box sx={{ maxWidth: 650, mx: "auto", mt: 4 }}>
      <Paper sx={{ p: 3, border: "2px solid #000087", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Book a Meeting
        </Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <TextField
            label="Meeting Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            fullWidth
            sx={{ mb: 2 }}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Date & Time"
              value={form.datetime}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
            />
          </LocalizationProvider>
          <TextField
            select
            label="Location"
            name="locationType"
            value={form.locationType}
            onChange={handleChange}
            required
            fullWidth
            sx={{ mb: 2 }}
          >
            {availableLocations.map(option => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          {form.locationType === "physical" && (
            <TextField
              label="Physical Location (Room/Address)"
              name="physicalLocation"
              value={form.physicalLocation}
              onChange={handleChange}
              fullWidth
              sx={{ mb: 2 }}
              required
            />
          )}
          <Autocomplete
            multiple
            options={allContacts}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            value={form.participants}
            onChange={handleParticipantsChange}
            filterSelectedOptions
            renderInput={(params) => (
              <TextField
                {...params}
                label="Participants (add by name/email)"
                placeholder="Type or select"
                sx={{ mb: 2 }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={`${option.name} (${option.email})`}
                  {...getTagProps({ index })}
                  key={option.email}
                />
              ))
            }
          />
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Book Meeting
          </Button>
        </Box>

        <Typography variant="subtitle1" sx={{ mt: 3 }}>
          Upcoming Meetings
        </Typography>
        <List>
          {meetings.length === 0 ? (
            <ListItem>
              <ListItemText primary="No meetings booked yet." />
            </ListItem>
          ) : (
            meetings.map(meeting => (
              <ListItem key={meeting.id} alignItems="flex-start">
                <ListItemText
                  primary={`${meeting.title} (${meeting.locationType === "physical" ? meeting.physicalLocation : meeting.locationType.charAt(0).toUpperCase() + meeting.locationType.slice(1)})`}
                  secondary={
                    <>
                      When: {meeting.datetime.toLocaleString
                        ? meeting.datetime.toLocaleString()
                        : new Date(meeting.datetime).toLocaleString()}
                      <br />
                      Participants:{" "}
                      {meeting.participants.length === 0
                        ? "None"
                        : meeting.participants.map(p => p.email).join(", ")}
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
}
