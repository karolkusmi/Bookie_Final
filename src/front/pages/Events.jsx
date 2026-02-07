import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import AnimatedList from "../components/AnimatedList";
import CreateEventModal from "../components/CreateEventModal";
import EventDetailsModal from "../components/EventDetailsModal";
import useGlobalReducer from "../hooks/useGlobalReducer";
import "./Events.css";

const LIBRARIES = ["places"];

const apiBase = () => {
  const url = import.meta.env.VITE_BACKEND_URL || "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const Events = () => {
  const { store, dispatch } = useGlobalReducer();
  const events = store.eventGlobalList || [];

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [eventsFetched, setEventsFetched] = useState(false);

  const mapRef = useRef(null);
  const center = useMemo(() => ({ lat: 40.416775, lng: -3.70379 }), []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-script",
    googleMapsApiKey: apiKey || "",
    libraries: LIBRARIES,
    language: "es",
    region: "ES",
  });

  useEffect(() => {
    if (!apiBase() || eventsFetched || events.length > 0) return;
    let cancelled = false;
    fetch(`${apiBase()}/api/events`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((e) => {
          const lat = typeof e.lat === "number" ? e.lat : parseFloat(e.lat);
          const lng = typeof e.lng === "number" ? e.lng : parseFloat(e.lng);
          return {
            ...e,
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
            icon: e.category || "📖",
            datetimeISO: e.date && e.time ? `${e.date}T${e.time}:00` : null,
            place: e.location || "",
            address: e.location || "",
          };
        });
        dispatch({ type: "set_events", payload: mapped });
        setEventsFetched(true);
      })
      .catch(() => setEventsFetched(true));
    return () => { cancelled = true; };
  }, [events.length, eventsFetched, dispatch]);

  const formatDateTime = (ev) => {
    const iso = ev?.datetimeISO ?? (ev?.date && ev?.time ? `${ev.date}T${ev.time}:00` : null);
    if (!iso) return { date: ev?.date ?? "", time: ev?.time ?? "" };
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" }),
      time: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const focusMap = (ev) => {
    if (!mapRef.current || typeof ev?.lat !== "number" || typeof ev?.lng !== "number") return;
    // Hacemos pan suave al evento y luego ajustamos el zoom para que el pin sea claramente visible
    mapRef.current.panTo({ lat: ev.lat, lng: ev.lng });
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setZoom(15);
      }
    }, 300);
  };

  const handleSelect = (ev) => {
    if (!ev) {
      console.warn("handleSelect: evento es null o undefined");
      return;
    }
    
    
    // Normalizamos las coordenadas
    const lat = typeof ev?.lat === "number" ? ev.lat : parseFloat(ev?.lat);
    const lng = typeof ev?.lng === "number" ? ev.lng : parseFloat(ev?.lng);
    
    
    // Si tiene coordenadas válidas, movemos el mapa y seleccionamos el evento
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const normalized = { ...ev, lat, lng };
      setSelected(normalized);
      // Pequeño delay para asegurar que el mapa esté listo
      setTimeout(() => {
        focusMap(normalized);
      }, 100);
    } else {
      // Si no tiene coordenadas, al menos seleccionamos el evento para mostrar detalles
      // (aunque no podamos mover el mapa)
      console.warn(`Evento "${ev.title}" no tiene coordenadas válidas (lat: ${ev.lat}, lng: ${ev.lng})`);
      setSelected(ev);
    }
  };

  const handleAddEvent = (newEvent) => {
    const lat = typeof newEvent.lat === "number" ? newEvent.lat : parseFloat(newEvent.lat);
    const lng = typeof newEvent.lng === "number" ? newEvent.lng : parseFloat(newEvent.lng);
    const normalized = {
      ...newEvent,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
    dispatch({ type: "add_event", payload: normalized });
    if (Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng)) {
      setSelected(normalized);
      focusMap(normalized);
    }
  };

  const handleJoin = (ev) => {
    alert(`Te has apuntado (demo) a: ${ev.title}`);
  };

  if (!apiKey) return <div className="events-fallback">Falta GOOGLE MAPS API KEY</div>;
  if (loadError) return <div className="events-fallback">Error cargando Google Maps</div>;
  if (!isLoaded) return <div className="events-fallback">Cargando mapa…</div>;

  return (
    <div className="events-page">
      <GoogleMap
        mapContainerClassName="events-map"
        center={center}
        zoom={13}
        options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false }}
        onLoad={(map) => (mapRef.current = map)}
        onClick={() => setSelected(null)}
      >
        {events
          .filter((ev) => ev && Number.isFinite(ev.lat) && Number.isFinite(ev.lng))
          .map((ev) => {
            const isSelected = selected?.id === ev.id;

            return (
              <Marker
                key={ev.id}
                position={{ lat: ev.lat, lng: ev.lng }}
                onClick={() => handleSelect(ev)}
              >
                {isSelected && (
                  <InfoWindow onCloseClick={() => setSelected(null)}>
                    <div className="events-infowindow">
                      <div className="events-iw-title">{selected.title}</div>
                      <div className="events-iw-row">{selected.place || selected.location}</div>
                      <div className="events-iw-row">{formatDateTime(selected).date}</div>

                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <button className="events-join-btn" onClick={() => handleJoin(selected)}>
                          Apuntarme
                        </button>
                        <button
                          className="events-join-btn"
                          onClick={() => {
                            setDetailsEvent(selected);
                            setIsDetailsOpen(true);
                          }}
                        >
                          View More
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}
      </GoogleMap>

      <div className="events-right-overlay">
        <div className="events-right-card">
          <div className="events-list-box">
            <AnimatedList
              items={events}
              onItemSelect={(item, index) => {
                handleSelect(item);
              }}
              showGradients
              enableArrowNavigation
              displayScrollbar
              initialSelectedIndex={-1}
              renderItem={(ev) => {
                const { date, time } = formatDateTime(ev);
                const hasCoords = Number.isFinite(ev?.lat) && Number.isFinite(ev?.lng);
                return (
                  <div style={{ cursor: "pointer" }}>
                    <p className="item-text" style={{ fontWeight: 800, marginBottom: 6 }}>
                      {ev.title}
                    </p>
                    <p className="item-text" style={{ opacity: 0.75, marginBottom: 0, fontSize: "0.85rem" }}>
                      {(ev.place || ev.location || "")} · {date} · {time}
                      {!hasCoords && (
                        <span style={{ color: "#ff6b6b", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                          (sin ubicación)
                        </span>
                      )}
                    </p>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      <CreateEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddEvent} />
      <EventDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} event={detailsEvent} />
    </div>
  );
};
