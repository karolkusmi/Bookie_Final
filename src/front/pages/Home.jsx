import React, { useEffect, useRef, useState } from "react";
import CreateEventModal from "../components/CreateEventModal";
import BookLibraryModal from "../components/BookLibraryModal";
import "./Home.css";
import portadaLibro from "../assets/img/portada_Libro.png";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const Home = () => {
  const { store, dispatch } = useGlobalReducer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventList] = useState(store.initialEventList);
  const navigate = useNavigate();
  const { updateProfile } = useUser();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [modalMode, setModalMode] = useState("prologue"); // "prologue" | "library"
  const [selectedBook, setSelectedBook] = useState(null);

  const [uiMessage, setUiMessage] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const bentoRef = useRef(null);
  const spotlightRef = useRef(null);

  const enableSpotlight = true;
  const enableBorderGlow = true;
  const enableTilt = true;
  const clickEffect = true;
  const spotlightRadius = 730;
  const glowColor = "132, 0, 255";

  const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

  const addBookToLibrary = async (book) => {
    const user = JSON.parse(localStorage.getItem("user_data"));
    const userId = user?.id;

    if (!userId) {
      setUiMessage({ type: "danger", text: "No hay usuario activo. Inicia sesión de nuevo." });
      return;
    }

    if (!backendUrl) {
      setUiMessage({ type: "danger", text: "No está configurado VITE_BACKEND_URL." });
      return;
    }

    const isbn = normalizeIsbn(book?.isbn);
    if (!isbn) {
      setUiMessage({ type: "warning", text: "Este libro no tiene ISBN, no se puede guardar en tu biblioteca." });
      return;
    }

    try {
      const payload = {
        isbn,
        title: book.title,
        authors: book.authors || [],
        publisher: book.publisher || null,
        thumbnail: book.thumbnail || null,
      };

      const resp = await fetch(`${backendUrl}/api/library/${userId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resp.status === 409) {
        setUiMessage({ type: "warning", text: "Ese libro ya está en tu biblioteca." });
        return;
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.msg || err?.message || "No se pudo añadir el libro.");
      }

      setUiMessage({ type: "success", text: "Libro añadido a tu biblioteca." });
    } catch (e) {
      setUiMessage({ type: "danger", text: e.message });
    }
  };

  useEffect(() => {
    if (!enableSpotlight) return;

    const wrap = bentoRef.current;
    const spot = spotlightRef.current;
    if (!wrap || !spot) return;

    let raf = 0;

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        spot.style.transform = `translate(${x - spotlightRadius / 2}px, ${y - spotlightRadius / 2}px)`;
        spot.style.opacity = "1";
      });
    };

    const onLeave = () => {
      spot.style.opacity = "0";
    };

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);

    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [enableSpotlight, spotlightRadius]);

  useEffect(() => {
    const wrap = bentoRef.current;
    if (!wrap) return;

    const cards = Array.from(wrap.querySelectorAll(".mb-card"));
    if (!cards.length) return;

    const onMove = (e) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xPct = (x / rect.width) * 100;
      const yPct = (y / rect.height) * 100;

      const dx = x - rect.width / 2;
      const dy = y - rect.height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt((rect.width / 2) ** 2 + (rect.height / 2) ** 2);
      const intensity = 1 - clamp(dist / maxDist, 0, 1);

      el.style.setProperty("--glow-x", `${xPct}%`);
      el.style.setProperty("--glow-y", `${yPct}%`);
      el.style.setProperty("--glow-intensity", `${intensity}`);

      if (enableTilt) {
        const rotateY = ((xPct - 50) / 50) * 6;
        const rotateX = -((yPct - 50) / 50) * 6;
        el.style.transform = `translateY(-2px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    };

    const onLeave = (e) => {
      const el = e.currentTarget;
      el.style.setProperty("--glow-x", "50%");
      el.style.setProperty("--glow-y", "50%");
      el.style.setProperty("--glow-intensity", "0");
      if (enableTilt) el.style.transform = "";
    };

    const onClick = (e) => {
      if (!clickEffect) return;
      const el = e.currentTarget;
      el.classList.add("mb-click");
      window.setTimeout(() => el.classList.remove("mb-click"), 240);
    };

    cards.forEach((c) => {
      c.addEventListener("mousemove", onMove);
      c.addEventListener("mouseleave", onLeave);
      c.addEventListener("click", onClick);
    });

    return () => {
      cards.forEach((c) => {
        c.removeEventListener("mousemove", onMove);
        c.removeEventListener("mouseleave", onLeave);
        c.removeEventListener("click", onClick);
      });
    };
  }, [enableTilt, clickEffect]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("selected_book");
      if (saved) setSelectedBook(JSON.parse(saved));
      updateProfile(JSON.parse(localStorage.getItem("user_data")));
    } catch (e) {
      localStorage.removeItem("selected_book");
    }
  }, []);

  useEffect(() => {
    const syncBook = () => {
      const saved = localStorage.getItem("selected_book");
      if (!saved) {
        setSelectedBook(null);
      } else {
        setSelectedBook(JSON.parse(saved));
      }
    };
    window.addEventListener("local-storage-changed", syncBook);
    return () => window.removeEventListener("local-storage-changed", syncBook);
  }, []);

  const handleAddEvent = (newEvent) => {
    dispatch({ type: "add_event", payload: newEvent });
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("stream_token");
    localStorage.removeItem("selected_book");
    localStorage.removeItem("token");
    localStorage.removeItem("selectedBook");
    localStorage.removeItem("userAvatar");
    navigate("/");
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    localStorage.setItem("selected_book", JSON.stringify(book));
    setUiMessage(null);
  };

  const makeChannelIdFromIsbn = (isbn) => {
    const normalized = normalizeIsbn(isbn);
    if (!normalized) return null;
    return `book-isbn-${normalized}`;
  const handleSelectBook = (book) => {
    const mapped = {
      id: book.id,
      title: book.title,
      authors: Array.isArray(book.authors) ? book.authors : [],
      publisher: book.publisher || null,
      thumbnail: book.thumbnail || null,
      isbn: normalizeIsbn(book.isbn),
    };

    setSelectedBook(mapped);
    localStorage.setItem("selected_book", JSON.stringify(mapped));
    setUiMessage(null);

    window.dispatchEvent(new Event("local-storage-changed"));
  };

  const makeChannelIdFromTitle = (title) => {
    if (!title) return null;

    const normalized = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const cleaned = normalized
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `book-${cleaned}`;
  };

  const handleOpenChat = async () => {
    setUiMessage(null);

    if (!selectedBook?.title) {
      setUiMessage({ type: "warning", text: "Primero selecciona un libro para abrir su chat." });
      return;
    }

    const isbn = normalizeIsbn(selectedBook?.isbn);
    if (!isbn) {
      setUiMessage({ type: "warning", text: "Este libro no tiene ISBN. Solo puedes chatear sobre libros con ISBN válido." });
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setUiMessage({ type: "danger", text: "No hay sesión activa. Inicia sesión de nuevo." });
      return;
    }

    const channelId = makeChannelIdFromTitle(selectedBook.title);
    if (!channelId) {
      setUiMessage({ type: "danger", text: "No se pudo generar el canal para este libro." });
      return;
    }

    try {
      setChatLoading(true);

      const listResp = await fetch(`${backendUrl}/api/chat/public-channels`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listResp.ok) {
        const err = await listResp.json().catch(() => ({}));
        throw new Error(err.message || "No se pudieron obtener los canales.");
      }

      const listData = await listResp.json();
      const channels = listData.channels || [];
      const exists = channels.some((ch) => ch.id === channelId);

      if (exists) {
        navigate(`/chat?channel_id=${encodeURIComponent(channelId)}`, {
          state: { selectedBook, channelId },
        });
        return;
      }

      const wantCreate = window.confirm(`No existe un chat para “${selectedBook.title}”.\n\n¿Quieres crearlo ahora?`);
      if (!wantCreate) {
        setUiMessage({ type: "warning", text: "Chat no creado. Puedes crear uno cuando quieras." });
        return;
      }

      const createResp = await fetch(`${backendUrl}/api/chat/create-or-join-channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ book_title: selectedBook.title }),
      });

      if (!createResp.ok) {
        const err = await createResp.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo crear/unir el chat.");
      }

      const createData = await createResp.json();
      const createdChannelId = createData.channel_id || channelId;

      navigate(`/chat?channel=${encodeURIComponent(createdChannelId)}&isbn=${encodeURIComponent(isbn)}&book=${encodeURIComponent(selectedBook.title)}`, {
        state: { selectedBook, channelId: createdChannelId },
      });
    } catch (e) {
      setUiMessage({ type: "danger", text: e.message });
    } finally {
      setChatLoading(false);
    }
  };

  const openPrologue = () => {
    setModalMode("prologue");
    setIsLibraryOpen(true);
  };

  const openLibrary = (e) => {
    e.stopPropagation();
    setModalMode("library");
    setIsLibraryOpen(true);
  };

  return (
    <div className="container-fluid home-fixed-wrap" style={{ backgroundColor: "var(--book-bg)" }}>
      <div
        ref={bentoRef}
        className="home-bento-wrap"
        style={{
          ["--mb-glow-rgb"]: glowColor,
          ["--mb-spotlight-size"]: `${spotlightRadius}px`,
        }}
      >
        {enableSpotlight && <div ref={spotlightRef} className="home-global-spotlight" aria-hidden="true" />}

        <div className="row g-3 mx-0 home-row justify-content-center align-items-start">
          <div className="card-shadow col-12 col-lg-5 left-container">
            <section className="mb-5">
              <h5 className="fw-bold mb-4 glitch-title" data-text="READING NOW">
                READING NOW
              </h5>

              {uiMessage && (
                <div className={`alert alert-${uiMessage.type} py-2`} role="alert">
                  {uiMessage.text}
                </div>
              )}

              <div className="d-flex gap-3 flex-wrap">
                <button
                  type="button"
                  className={`card border-0 shadow-sm p-3 text-center mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                  style={{ borderRadius: "var(--card-radius)", width: "180px", cursor: "pointer" }}
                  onClick={() => setIsLibraryOpen(true)}
                >
                  <div className="book-card-img shadow-sm">
                    <img
                      src={selectedBook?.thumbnail || portadaLibro}
                      alt={selectedBook?.title || "Book cover"}
                      className="w-100 h-100 object-fit-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>

                  <span className="fw-bold small">{selectedBook?.title || "Your Book !!"}</span>

                  {selectedBook?.isbn && (
                    <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                      ISBN: {selectedBook.isbn}
                    </div>
                  )}
                </button>

                <div
                  className={`card border-0 shadow-sm p-4 flex-grow-1 mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                  style={{ borderRadius: "var(--card-radius)" }}
                >
                  <h6 className="fw-bold">Like-minded readers</h6>

                  <div className="d-flex my-2">
                    <img
                      src="https://i.pravatar.cc/150?img=47"
                      alt="reader avatar"
                      className="rounded-circle border border-white"
                      style={{
                        width: "36px",
                        height: "36px",
                        objectFit: "cover",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        border: "2px solid white"
                      }}
                    />
                    <img
                      src="https://i.pravatar.cc/150?img=12"
                      alt="reader avatar"
                      className="rounded-circle border border-white"
                      style={{
                        width: "36px",
                        height: "36px",
                        marginLeft: "-12px",
                        objectFit: "cover",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        border: "2px solid white"
                      }}
                    />
                  </div>

                  <p className="small text-muted">"Aure and 12 others are here."</p>

                  <button className="btn btn-wine w-100 py-2 mt-auto rounded-3" onClick={handleOpenChat} disabled={chatLoading}>
                    {chatLoading ? "Opening..." : "Open Chat"}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h5 className="fw-bold mb-4 glitch-title" data-text="ACTIVITY FEED">
                ACTIVITY FEED
              </h5>

              <div className="d-flex gap-3">
                <div
                  className={`card border-0 p-4 text-center shadow-sm flex-grow-1 bg-lavender-card mb-card ${enableBorderGlow ? "mb-border-glow" : ""
                    }`}
                  style={{ borderRadius: "var(--card-radius)" }}
                >
                  <span className="fs-1" style={{ filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))" }}>📅</span>
                  <h6 className="fw-bold mt-2 mb-1" style={{ color: "#231B59" }}>Explore Events</h6>
                  <p className="small text-muted mb-0" style={{ fontSize: "0.85rem" }}>Clubs & Meetups</p>
                </div>

                <div
                  className={`card border-0 p-3 shadow-sm flex-grow-1 bg-white mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                  style={{ borderRadius: "var(--card-radius)" }}
                >
                  <div className="card-body p-1 d-flex flex-column h-100 text-start">
                    <p className="small fw-medium mb-2">" Aure and 12 others are talking about this chapter... "</p>
                    <div className="text-end text-muted opacity-25 fs-4 mt-n2">"</div>
                    <div className="d-flex justify-content-between mt-auto pt-2 border-top small text-muted">
                      <span>❤️ 64k</span>
                      <span>💬 Comment</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="card-shadow col-12 col-lg-6 right-container">
            <div className="d-flex justify-content-center mb-5">
              <button
                className="btn btn-outline-wine rounded-pill px-5 py-2 fw-bold"
                onClick={() => setIsModalOpen(true)}
                style={{ fontSize: "1rem", letterSpacing: "0.5px" }}
              >
                ✚ Create Your Event
              </button>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold" id="events" style={{ color: "#231B59", letterSpacing: "0.5px" }}>
                Upcoming Events
              </h4>
            </div>

            <div className="row g-3">
              {(store.eventGlobalList.length === 0 ? eventList : store.eventGlobalList).map((ev, index) => (
                <div className="col-md-6" key={index}>
                  <div
                    className={`card border-0 shadow-sm p-3 d-flex flex-row align-items-center event-card mb-card ${
                      enableBorderGlow ? "mb-border-glow" : ""
                    }`}
                    style={{ borderRadius: "15px" }}
                  >
                    <div
                      className="rounded-circle p-3 me-3 fs-4 d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: "var(--book-lavender)",
                        width: "56px",
                        height: "56px",
                        boxShadow: "0 4px 12px rgba(139, 26, 48, 0.15)",
                        transition: "all 0.3s ease"
                      }}
                    >
                      {ev.icon}
                    </div>
                    <div className="flex-grow-1 text-start">
                      <h6 className="fw-bold mb-0 small">{ev.title}</h6>
                      <p className="text-muted mb-0" style={{ fontSize: "0.7rem" }}>
                        {ev.date}
                      </p>
                    </div>
                    <button className="btn btn-wine btn-sm rounded-pill px-3">View More</button>
                  </div>
                </div>
              ))}
            </div>

            {/* --- INICIO WIDGET SPOTIFY --- */}
            <div className="mt-4 mb-4">
              <div
                className={`card border-0 shadow-sm p-3 mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                style={{ borderRadius: "15px", overflow: "hidden" }}
              >
                <h6 className="fw-bold mb-3" style={{ color: "#231B59" }}>Música para leer 🎵</h6>
                <iframe
                  data-testid="embed-iframe"
                  style={{ borderRadius: "12px", border: "0" }}
                  src="https://open.spotify.com/embed/playlist/37i9dQZF1DWZkMGGysxknj?utm_source=generator"
                  width="100%"
                  height="152"
                  allowFullScreen=""
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
            {/* --- FIN WIDGET SPOTIFY --- */}




            <div className="d-flex justify-content-center mt-4">
              <button
                onClick={handleLogout}
                className="btn btn-outline-wine rounded-pill px-4 py-2 fw-bold"
                style={{ fontSize: "0.9rem" }}
              >
                Log Out
              </button>
            </div>

            <CreateEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddEvent} />
          </div>
        </div>

        <BookLibraryModal
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onSelect={handleSelectBook}
          selectedBook={selectedBook}
          mode={modalMode}
          onAddToLibrary={addBookToLibrary}
        />
      </div>
    </div>
  );
}

};