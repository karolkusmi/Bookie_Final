import React, { useMemo, useState } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import AnimatedList from "../components/AnimatedList";
import "./Events.css";

export const Events = () => {
  const [selected, setSelected] = useState(null);

  const center = useMemo(() => ({ lat: 40.416775, lng: -3.70379 }), []);

  const events = useMemo(
    () => [
      {
        id: "prado-1",
        title: "Club de lectura: clásicos en el Prado",
        place: "Museo del Prado",
        address: "C. de Ruiz de Alarcón, 23, 28014 Madrid",
        datetimeISO: "2026-02-05T18:30:00",
        lat: 40.413782,
        lng: -3.692127,
      },
      {
        id: "retiro-1",
        title: "Lectura al aire libre + intercambio de libros",
        place: "Parque del Retiro",
        address: "Plaza de la Independencia, Madrid",
        datetimeISO: "2026-02-08T11:00:00",
        lat: 40.41526,
        lng: -3.68442,
      },
      {
        id: "matadero-1",
        title: "Encuentro: novela contemporánea",
        place: "Matadero Madrid",
        address: "Pl. de Legazpi, 8, 28045 Madrid",
        datetimeISO: "2026-02-12T19:00:00",
        lat: 40.39194,
        lng: -3.69833,
      },
    ],
    []
  );

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  };

  const handleJoin = (event) => {
    alert(`Te has apuntado (demo) a: ${event.title}`);
    console.log("JOIN_EVENT_DEMO", event.id);
  };

  if (!apiKey) {
    return (
      <div className="events-fallback">
        <h2>Falta la API Key de Google Maps</h2>
        <p>
          Añade <code>VITE_GOOGLE_MAPS_API_KEY</code> en tu <code>.env</code> y reinicia el servidor.
        </p>
      </div>
    );
  }

  return (
    <div className="events-page">
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerClassName="events-map"
          center={center}
          zoom={13}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
          }}
          onClick={() => setSelected(null)}
        >
          {events.map((ev) => (
            <Marker
              key={ev.id}
              position={{ lat: ev.lat, lng: ev.lng }}
              onClick={() => setSelected(ev)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="events-infowindow">
                <div className="events-iw-title">{selected.title}</div>

                <div className="events-iw-row">
                  <span className="events-iw-label">Lugar:</span> {selected.place}
                </div>
                <div className="events-iw-row">
                  <span className="events-iw-label">Dirección:</span> {selected.address}
                </div>
                <div className="events-iw-row">
                  <span className="events-iw-label">Fecha:</span> {formatDateTime(selected.datetimeISO).date}
                </div>
                <div className="events-iw-row">
                  <span className="events-iw-label">Hora:</span> {formatDateTime(selected.datetimeISO).time}
                </div>

                <button className="events-join-btn" onClick={() => handleJoin(selected)}>
                  Apuntarme
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      <div className="events-right-overlay">
        <div className="events-right-card">
          <div className="events-right-header">
            <div className="events-right-title">Eventos</div>
            <div className="events-right-subtitle">Pasa el ratón o haz click</div>
          </div>

          <AnimatedList
            items={events}
            onItemSelect={(item) => setSelected(item)}
            showGradients
            enableArrowNavigation
            displayScrollbar
            initialSelectedIndex={-1}
            className="events-animated-list"
            renderItem={(ev) => {
              const { date, time } = formatDateTime(ev.datetimeISO);
              return (
                <div className="events-list-item">
                  <div className="events-list-title">{ev.title}</div>
                  <div className="events-list-meta">
                    {ev.place} · {date} · {time}
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};
