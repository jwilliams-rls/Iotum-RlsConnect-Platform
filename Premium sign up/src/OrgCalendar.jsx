import React, { useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, TextField, MenuItem, Grid,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction
} from "@mui/material";
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

  const handleDrillDown = (dateClicked, currentView) => {
    if (currentView === "month") {
      setView(Views.DAY);
      setDate(dateClicked);
    }
  };

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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setForm({
      ...form,
      files: [...form.files, ...files]
    });
  };

  const removeFile = (idx) => {
    setForm({
      ...form,
      files: form.files.filter((_, i) => i !== idx)
    });
  };

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

  const availableLocations = canBookPremiumRoom ? LOCATIONS : LOCATIONS.filter(l => l.value !== "premium");

  const handleSubmit = async (e) => {
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

    const apiUrl = import.meta.env.VITE_API_URL || "https://your-subdomain.callbridge.com";
    const authToken = import.meta.env.VITE_AUTH_TOKEN;
    const hostId = import.meta.env.VITE_HOST_ID;

    const response = await fetch(`${apiUrl}/enterprise_api/conference/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_token: authToken,
        host_id: parseInt(hostId),
        subject: form.title,
        start: format(form.start, 'yyyy-MM-dd HH:mm:ss'),
        time_zone: 'US/Eastern',
        duration: Math.round((form.end - form.start) / 60000),
        auto_record: 'none',
        one_time_access_code: true,
        secure_url: false,
        mute_mode: 'conversation',
        participants: form.participants.map(p => ({
          email: p.email,
          name: p.name || '',
          phone: p.phone
        }))
      })
    });

    const data = await response.json();

    if (response.ok && data.conference_id) {
      alert(`Meeting created with ID: ${data.conference_id}`);
      setEvents([
        ...events,
        {
          ...form,
          id: data.conference_id,
          allDay: false
        }
      ]);
      setOpen(false);
    } else {
      console.error("Failed to create meeting", data);
      setError("Failed to create meeting. Please check API response.");
    }
  };

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
      {/* The rest of the calendar and dialog components go here unchanged */}
    </Box>
  );
}
