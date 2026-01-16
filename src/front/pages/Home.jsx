import React, { useEffect, useState } from "react";
import CreateEventModal from "../components/CreateEventModal";
import BookLibraryModal from "../components/BookLibraryModal";
import "./Home.css";
import portadaLibro from "../assets/img/portada_Libro.png";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const Home = () => {
  const { store, dispatch } = useGlobalReducer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventList, setEventList] = useState(store.initialEventList);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [backendEvents, setBackendEvents] = useState([]);

  const currentUserId = store?.currentUser?.id;

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/events`);
        const data = await resp.json();
        if (resp.ok) setBackendEvents(data);
      } catch (e) {}
    };
    loadEvents();
  }, []);

  const handleAddEvent = (newEvent) => {
    dispatch({ type: "add_event", payload: newEvent });
    if (newEvent?.id) setBackendEvents((prev) => [newEvent, ...prev]);
  };

  const handleSignup = async (eventId) => {
    if (!currentUserId) {
      alert("No hay usuario logueado.");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/events/${eventId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUserId }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        alert(data?.msg || "Error al apuntarte");
        return;
      }

      alert("Te has apuntado correctamente.");
    } catch (e) {
      alert("Error de red: ¿está el backend levantado?");
    }
  };

  const eventsToShow =
    backendEvents.length > 0
      ? backendEvents
      : store.eventGlobalList.length === 0
      ? eventList
      : store.eventGlobalList;

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center"
      style={{ backgroundColor: "var(--book-bg)", minHeight: "90%" }}
    >
      <div className="row gap-3 mx-5">
        <div className="card-shadow col-5 left-container">
          <section className="mb-5">
            <h5 className="fw-bold mb-4 glitch-title" data-text="READING NOW">
              READING NOW
            </h5>

            <div className="d-flex gap-3 flex-wrap">
              <button
                className="card border-0 shadow-sm p-3 text-center"
                style={{
                  borderRadius: "var(--card-radius)",
                  width: "180px",
                  cursor: "pointer",
                }}
                onClick={() => setIsLibraryOpen(true)}
              >
                <div className="book-card-img shadow-sm">
                  <img
                    src={selectedBook?.thumbnail || portadaLibro}
                    alt="Book cover"
                    className="w-100 h-100 object-fit-cover"
                  />
                </div>

                <span className="fw-bold small">
                  {selectedBook?.title || "Your Book !!"}
                </span>

                <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                  Click para elegir
                </span>
              </button>

              <div
                className="card border-0 shadow-sm p-4 flex-grow-1"
                style={{ borderRadius: "var(--card-radius)" }}
              >
                <h6 className="fw-bold">Like-minded readers</h6>

                <div className="d-flex my-2">
                  <img
                    src="https://i.pravatar.cc/150?img=47"
                    alt="reader avatar"
                    className="rounded-circle border border-white"
                    style={{
                      width: "30px",
                      height: "30px",
                      objectFit: "cover",
                    }}
                  />

                  <img
                    src="https://i.pravatar.cc/150?img=12"
                    alt="reader avatar"
                    className="rounded-circle border border-white"
                    style={{
                      width: "30px",
                      height: "30px",
                      marginLeft: "-10px",
                      objectFit: "cover",
                    }}
                  />
                </div>

                <p className="small text-muted">"Aure and 12 others are here."</p>

                <Link to="/chat">
                  <button className="btn btn-wine w-100 py-2 mt-auto rounded-3">
                    Open Chat
                  </button>
                </Link>
              </div>
            </div>
          </section>

          <section>
            <h5 className="fw-bold mb-4 glitch-title" data-text="ACTIVITY FEED">
              ACTIVITY FEED
            </h5>

            <div className="d-flex gap-3">
              <div
                className="card border-0 p-4 text-center shadow-sm flex-grow-1 bg-lavender-card"
                style={{ borderRadius: "var(--card-radius)" }}
              >
                <span className="fs-1">📅</span>
                <h6 className="fw-bold mt-2 mb-1">Explore Events</h6>
                <p className="small text-muted mb-0">Clubs & Meetups</p>
              </div>

              <div
                className="card border-0 p-3 shadow-sm flex-grow-1 bg-white"
                style={{ borderRadius: "var(--card-radius)" }}
              >
                <div className="card-body p-1 d-flex flex-column h-100 text-start">
                  <p className="small fw-medium mb-2">
                    “ Aure and 12 others are talking about this chapter... ”
                  </p>
                  <div className="text-end text-muted opacity-25 fs-4 mt-n2">”</div>
                  <div className="d-flex justify-content-between mt-auto pt-2 border-top small text-muted">
                    <span>❤️ 64k</span>
                    <span>💬 Comment</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="card-shadow col-6 right-container">
          <div className="d-flex justify-content-center mb-5">
            <button
              className="btn btn-outline-wine rounded-pill px-5 fw-bold"
              onClick={() => setIsModalOpen(true)}
            >
              ✚ Create Your Event
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold"> Upcoming Events</h4>
          </div>

          <div className="row g-3">
            {eventsToShow.map((ev, index) => {
              const icon = ev.category ?? ev.icon ?? "📅";
              const title = ev.title ?? ev.name ?? "Untitled";
              const dateText =
                ev.time && ev.date ? `${ev.date} • ${ev.time}` : ev.date;

              return (
                <div className="col-md-6" key={ev.id ?? index}>
                  <div
                    className="card border-0 shadow-sm p-3 d-flex flex-row align-items-center event-card"
                    style={{ borderRadius: "15px" }}
                  >
                    <div
                      className="rounded-circle p-3 me-3 fs-4"
                      style={{ backgroundColor: "var(--book-lavender)" }}
                    >
                      {icon}
                    </div>

                    <div className="flex-grow-1 text-start">
                      <h6 className="fw-bold mb-0 small">{title}</h6>
                      <p
                        className="text-muted mb-0"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {dateText}
                      </p>
                    </div>

                    {ev.id ? (
                      <button
                        className="btn btn-wine btn-sm rounded-pill px-3"
                        onClick={() => handleSignup(ev.id)}
                      >
                        Apuntarme
                      </button>
                    ) : (
                      <button className="btn btn-wine btn-sm rounded-pill px-3">
                        View More
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to="/"
            className="btn btn-outline-wine rounded-pill px-4 fw-bold ms-3 mt-4"
          >
            Log Out
          </Link>

          <CreateEventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleAddEvent}
          />
        </div>
      </div>

      <BookLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={setSelectedBook}
      />
    </div>
  );
};

export default Home;
