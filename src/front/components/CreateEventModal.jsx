import React, { useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { useUser } from "./UserContext";
import "./CreateEventsModal.css";

const API_BASE = (() => {
  const url = import.meta.env.VITE_BACKEND_URL || "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
})();

const CreateEventModal = ({ isOpen, onClose, onSave }) => {
  const { userData } = useUser();
  const [name, setName] = useState("");
  const [type, setType] = useState("📖");
  const [locationText, setLocationText] = useState("");
  const [time, setTime] = useState("");

  const [placeId, setPlaceId] = useState(null);
  const [placeName, setPlaceName] = useState(null);
  const [address, setAddress] = useState(null);
  const [coords, setCoords] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const acRef = useRef(null);

  if (!isOpen) return null;

  const getCreatorName = () => userData?.username || userData?.email || String(userData?.id || "") || "Unknown";

  const buildEventForUI = (apiEvent, createdByName) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const datetimeISO = time ? `${dateStr}T${time}:00` : null;

    // Normalizamos lat/lng: primero del backend (apiEvent), luego de coords locales, luego null
    const latBackend = typeof apiEvent?.lat === "number" ? apiEvent.lat : parseFloat(apiEvent?.lat);
    const lngBackend = typeof apiEvent?.lng === "number" ? apiEvent.lng : parseFloat(apiEvent?.lng);
    const lat = Number.isFinite(latBackend) ? latBackend : (coords?.lat ?? null);
    const lng = Number.isFinite(lngBackend) ? lngBackend : (coords?.lng ?? null);

    return {
      ...apiEvent,
      id: apiEvent?.id ?? apiEvent?.event_id ?? apiEvent?._id ?? `${(apiEvent?.title || name || "event").slice(0, 20)}-${Date.now()}`,
      icon: type,
      title: apiEvent?.title ?? name,
      date: apiEvent?.date ?? dateStr,
      time: apiEvent?.time ?? time,
      place: placeName || locationText || apiEvent?.location || "",
      address: address || locationText || apiEvent?.location || "",
      place_id: placeId || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      datetimeISO,
      created_by_name: apiEvent?.created_by_name ?? createdByName,
    };
  };

  const onLoadAutocomplete = (ac) => {
    acRef.current = ac;
  };

  const onPlaceChanged = () => {
    const ac = acRef.current;
    if (!ac) return;
    const place = ac.getPlace?.();
    if (!place) return;

    const nextName = place?.name || null;
    const nextAddress = place?.formatted_address || null;
    const nextPlaceId = place?.place_id || null;
    const geometry = place?.geometry?.location;

    setPlaceName(nextName);
    setAddress(nextAddress);
    setPlaceId(nextPlaceId);

    if (geometry && typeof geometry.lat === "function" && typeof geometry.lng === "function") {
      setCoords({ lat: geometry.lat(), lng: geometry.lng() });
    }

    setLocationText(nextAddress || nextName || "");
  };

  const handleLocationChange = (value) => {
    setLocationText(value);
    setCoords(null);
    setPlaceId(null);
    setPlaceName(null);
    setAddress(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!API_BASE) {
      setError("VITE_BACKEND_URL is not configured.");
      return;
    }

    if (!name || !type || !locationText || !time) {
      setError("Please fill in all fields.");
      return;
    }

    // Si tenemos Google Places disponible, obligamos a que el usuario elija una ubicación
    // del autocompletado para poder obtener coordenadas y que el evento se vea en el mapa.
    const hasPlaces = Boolean(window.google?.maps?.places);
    const hasValidCoords = coords && typeof coords.lat === "number" && typeof coords.lng === "number" && 
                          Number.isFinite(coords.lat) && Number.isFinite(coords.lng);
    
    if (hasPlaces && !hasValidCoords) {
      setError("⚠️ Please select a location from the dropdown list to add it to the map. Just typing is not enough - you must click on one of the suggestions.");
      return;
    }

    setSaving(true);

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const createdByName = getCreatorName();

    // Aseguramos que lat/lng sean números válidos o null
    const latValue = hasValidCoords ? coords.lat : null;
    const lngValue = hasValidCoords ? coords.lng : null;

    const payload = {
      title: name,
      date: dateStr,
      time,
      category: type,
      location: locationText,
      place_id: placeId || null,
      place_name: placeName || null,
      address: address || locationText || null,
      lat: latValue,
      lng: lngValue,
      created_by_name: createdByName,
    };

    console.log("Creating event with payload:", payload);

    try {
      const resp = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        const text = await resp.text();
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Error parsing response:", e);
        data = {};
      }

      if (!resp.ok) {
        const errorMsg = data?.msg || data?.message || data?.error || `Error creating event (${resp.status})`;
        console.error("Error creating event:", errorMsg, data);
        setError(errorMsg);
        setSaving(false);
        return;
      }

      console.log("Event created successfully:", data);
      
      // Construimos el evento con las coordenadas que enviamos (no solo las del backend)
      const eventForUI = buildEventForUI(
        { ...data, lat: latValue, lng: lngValue }, 
        createdByName
      );
      
      console.log("Event for UI:", eventForUI);
      
      onSave(eventForUI);
      onClose();

      setName("");
      setType("📖");
      setLocationText("");
      setTime("");
      setPlaceId(null);
      setPlaceName(null);
      setAddress(null);
      setCoords(null);
    } catch (err) {
      setError("Network error. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  const canUsePlaces = Boolean(window.google?.maps?.places);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose} type="button">
          &times;
        </button>

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
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
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
              <label>
                Where {coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng) && (
                  <span style={{ color: "#28a745", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                    ✓ Location selected
                  </span>
                )}
              </label>

              {canUsePlaces ? (
                <Autocomplete 
                  onLoad={onLoadAutocomplete} 
                  onPlaceChanged={onPlaceChanged}
                  options={{
                    types: ['establishment', 'geocode'],
                    componentRestrictions: { country: 'es' }
                  }}
                >
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="Search and select a location from the list..."
                    required
                    disabled={saving}
                    style={{
                      borderColor: coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng) 
                        ? "#28a745" 
                        : undefined
                    }}
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="Enter location (coordinates won't be saved)"
                  required
                  disabled={saving}
                />
              )}
              {canUsePlaces && !coords && locationText && (
                <small style={{ color: "#ffc107", display: "block", marginTop: "0.25rem" }}>
                  ⚠️ Select a location from the dropdown to add it to the map
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required disabled={saving} />
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
