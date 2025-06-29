import React, { useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Box, Button, Dialog, DialogTitle, DialogContent, TextField, MenuItem, Grid, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales
});

const LOCATIONS = [
  { label: "Online Meeting", value: "online" },
  { label: "Premium Room", value: "premium" },
  { label: "Physical Meeting", value: "physical" }
];

const DEMO_USER_ROOM = "alice@org.com (Basic Room)";

export default function OrgCalendar({ canBookPremiumRoom = true }) {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    start: new Date(),
    end: new Date(),
    locationType: "online",
    location: "",
    participants: [],
    address: "",
    files: []
  });
  const [error, setError] = useState("");
  const [newParticipant, setNewParticipant] = useState({ name: "", email: "", phone: "" });
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // When you click a day in Month, go to Day view for that date
  const handleDrillDown = (dateClicked, currentView) => {
    if (currentView === "month") {
      setView(Views.DAY);
      setDate(dateClicked);
    }
  };

  // Calendar slot click (for week/day view)
  const handleSelectSlot = (slot) => {
    setForm({
      title: "",
      start: slot.start,
      end: slot.end,
      locationType: "online",
      location: "",
      participants: [],
      address: "",
      files: []
    });
    setError("");
    setNewParticipant({ name: "", email: "", phone: "" });
    setOpen(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLocationTypeChange = (e) => {
    const value = e.target.value;
    setForm({
      ...form,
      locationType: value,
      address: "",
      location: ""
    });
  };

  // File upload handler
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setForm({
      ...form,
      files: [...form.files, ...files]
    });
  };

  // Remove file from form
  const removeFile = (idx) => {
    setForm({
      ...form,
      files: form.files.filter((_, i) => i !== idx)
    });
  };

  // Participant input changes
  const handleParticipantInput = (e) => {
    setNewParticipant({ ...newParticipant, [e.target.name]: e.target.value });
  };

  const addParticipant = () => {
    if (!newParticipant.email || !newParticipant.phone) {
      setError("Participant must have both email and phone.");
      return;
    }
    setForm({
      ...form,
      participants: [...form.participants, newParticipant]
    });
    setNewParticipant({ name: "", email: "", phone: "" });
    setError("");
  };

  const removeParticipant = (idx) => {
    setForm({
      ...form,
      participants: form.participants.filter((_, i) => i !== idx)
    });
  };

  const availableLocations = canBookPremiumRoom
    ? LOCATIONS
    : LOCATIONS.filter(l => l.value !== "premium");

  // Save event
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.start || !form.end) {
      setError("Meeting Title and Time are required.");
      return;
    }
    if (form.locationType === "physical" && !form.address) {
      setError("Physical meetings require a location/address.");
      return;
    }
    if (form.participants.length === 0) {
      setError("At least one participant is required.");
      return;
    }
    for (let p of form.participants) {
      if (!p.email || !p.phone) {
        setError("All participants must have both email and phone.");
        return;
      }
    }
    setEvents([
      ...events,
      {
        ...form,
        id: Date.now(),
        allDay: false
      }
    ]);
    setOpen(false);
  };

  // Download file blob
  const downloadFile = (file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <Box sx={{ height: "90vh", p: 2 }}>
      <Calendar
        selectable
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "80vh", background: "#fff", borderRadius: 8 }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onDrillDown={handleDrillDown}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={event => {
          // Show files as links to download
          let filesText = (event.files && event.files.length > 0)
            ? "\nFiles:\n" + event.files.map(f => f.name).join("\n")
            : "";
          alert(
            `Event: ${event.title}\nWhen: ${event.start.toLocaleString()} - ${event.end.toLocaleString()}\nType: ${event.locationType}\n${event.locationType === "physical" ? "Location: " + event.address : ""}\nParticipants:\n${event.participants.map(p => `${p.name} - ${p.email} (${p.phone})`).join("\n")}${filesText}`
          );
        }}
        views={['month', 'week', 'day', 'agenda']}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Book Meeting</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            {error && (
              <Box sx={{ color: "red", mb: 1, fontWeight: "bold" }}>{error}</Box>
            )}
            <TextField
              label="Meeting Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              fullWidth
              sx={{ mt: 1, mb: 2 }}
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start"
                  type="datetime-local"
                  name="start"
                  value={format(form.start, "yyyy-MM-dd'T'HH:mm")}
                  onChange={e =>
                    setForm({ ...form, start: new Date(e.target.value) })
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End"
                  type="datetime-local"
                  name="end"
                  value={format(form.end, "yyyy-MM-dd'T'HH:mm")}
                  onChange={e =>
                    setForm({ ...form, end: new Date(e.target.value) })
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
            <TextField
              select
              label="Meeting Type"
              name="locationType"
              value={form.locationType}
              onChange={handleLocationTypeChange}
              required
              fullWidth
              sx={{ mt: 2, mb: 2 }}
            >
              {availableLocations.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            {form.locationType === "physical" && (
              <TextField
                label="Location (Room, Building, or Address)"
                name="address"
                value={form.address}
                onChange={handleChange}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
            )}
            {form.locationType === "online" && (
              <Box sx={{ mb: 2, color: "#555" }}>
                Your online room: <strong>{DEMO_USER_ROOM}</strong>
              </Box>
            )}

            {/* File upload */}
            <Box sx={{ mb: 2 }}>
              <label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <Button variant="outlined" component="span" startIcon={<AttachFileIcon />}>
                  Attach Files
                </Button>
              </label>
              <List dense>
                {form.files.map((file, idx) => (
                  <ListItem
                    key={idx}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => removeFile(idx)}
                        size="large"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={file.name} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Participants */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={3}>
                  <TextField
                    label="Name"
                    name="name"
                    value={newParticipant.name}
                    onChange={handleParticipantInput}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Email"
                    name="email"
                    value={newParticipant.email}
                    onChange={handleParticipantInput}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Mobile Phone"
                    name="phone"
                    value={newParticipant.phone}
                    onChange={handleParticipantInput}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={1}>
                  <IconButton
                    color="primary"
                    onClick={addParticipant}
                    size="large"
                    aria-label="Add participant"
                  >
                    <AddIcon />
                  </IconButton>
                </Grid>
              </Grid>
              <List>
                {form.participants.map((p, idx) => (
                  <ListItem
                    key={idx}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => removeParticipant(idx)}
                        size="large"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`${p.name || "(No Name)"} - ${p.email} (${p.phone})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Book Meeting
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
