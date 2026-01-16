import React, { useState } from "react";
import "../styles/CreateEventModal.css";

const API_BASE = import.meta.env.VITE_BACKEND_URL;


const CreateEventModal = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("📖");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

   
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); 

    const payload = {
      title: name,
      date: dateStr,
      time: time,        
      category: type,    
      location: location 
    };

    try {
      const resp = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data?.msg || "Error creating event");
        return;
      }

      
      onSave(data);
      onClose();

      setName("");
      setLocation("");
      setTime("");
    } catch (err) {
      setError("Network error. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>&times;</button>
        <h3 className="modal-title">Create New Event</h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Reading Party"
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Event Category (Icon)</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={saving}
            >
              <option value="📖">📖 Book Club</option>
              <option value="🎉">🎉 Party / Celebration</option>
              <option value="🎤">🎤 Author Talk</option>
              <option value="🚀">🚀 Sci-Fi / Tech</option>
              <option value="📝">📝 Workshop</option>
              <option value="☕">☕ Coffee & Books</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Where</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={saving}
              />
            </div>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
