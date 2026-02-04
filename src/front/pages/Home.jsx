import React, { useEffect, useMemo, useRef, useState } from "react";
import CreateEventModal from "../components/CreateEventModal";
import EventDetailsModal from "../components/EventDetailsModal";
import BookLibraryModal from "../components/BookLibraryModal";
import MyLibraryPickerModal from "../components/MyLibraryPickerModal";
import "./Home.css";
import portadaLibro from "../assets/img/portada_Libro.png";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

export const Home = () => {
  const { store, dispatch } = useGlobalReducer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const DEFAULT_EVENTS_VISIBLE = 4;
  const [isExpandedEvents, setIsExpandedEvents] = useState(false);

  const navigate = useNavigate();
  const { userData } = useUser();

  const backendUrl = import.meta.env.VITE_BACKEND_URL
    ? (import.meta.env.VITE_BACKEND_URL.endsWith("/")
        ? import.meta.env.VITE_BACKEND_URL.slice(0, -1)
        : import.meta.env.VITE_BACKEND_URL)
    : "";

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [modalMode, setModalMode] = useState("library"); // "prologue" | "library"
  const [selectedBook, setSelectedBook] = useState(null);

  const [uiMessage, setUiMessage] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeReaders, setActiveReaders] = useState([]);

  const [libraryBooks, setLibraryBooks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [top3, setTop3] = useState([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("top3");

  const bentoRef = useRef(null);
  const spotlightRef = useRef(null);

  // --- Flujo de eventos: API → store → todos ordenados; por defecto 4 más próximos (futuros), botón muestra todos / vuelve a 4 ---
  // 1) nextEventsSorted: todos con fecha válida, ordenados por fecha/hora; se mantiene _sortDate para filtrar próximos.
  // 2) upcomingEvents: solo eventos con fecha >= ahora (los más próximos a hoy).
  // 3) Por defecto se muestran los 4 más próximos; al hacer click en "View more events" se muestran todos; "View less events" vuelve a 4.
  const nextEventsSorted = useMemo(() => {
    const list = store.eventGlobalList || [];
    const now = new Date();
    const withDate = list
      .map((ev) => {
        const dateStr = ev.date != null ? String(ev.date).trim() : "";
        const rawTime = ev.time != null ? String(ev.time).trim() : "00:00";
        const timeStr = rawTime.length >= 5 ? rawTime.slice(0, 5) : rawTime.padStart(5, "0");
        const iso =
          dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && /^\d{1,2}:\d{2}$/.test(timeStr)
            ? `${dateStr}T${timeStr.length === 4 ? "0" + timeStr : timeStr}:00`
            : null;
        const dt = iso ? new Date(iso) : null;
        return { ...ev, _sortDate: dt };
      })
      .filter((ev) => ev._sortDate && !isNaN(ev._sortDate.getTime()));
    const sorted = [...withDate].sort((a, b) => a._sortDate - b._sortDate);
    return sorted;
  }, [store.eventGlobalList]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return nextEventsSorted.filter((ev) => ev._sortDate >= now);
  }, [nextEventsSorted]);

  const visibleEvents = isExpandedEvents
    ? nextEventsSorted
    : upcomingEvents.slice(0, DEFAULT_EVENTS_VISIBLE);
  const totalEvents = nextEventsSorted.length;
  const showEventsToggle = totalEvents > DEFAULT_EVENTS_VISIBLE;

  const handleViewMoreEvents = () => {
    setIsExpandedEvents((prev) => !prev);
  };

  const enableSpotlight = true;
  const enableBorderGlow = true;
  const enableTilt = true;
  const clickEffect = true;
  const spotlightRadius = 730;
  const glowColor = "132, 0, 255";

  const getUserId = () => {
    const fromCtx = userData?.id;
    if (fromCtx) return fromCtx;
    const raw = localStorage.getItem("user_data");
    if (!raw || raw === "undefined" || raw === "null") return null;
    try {
      const saved = JSON.parse(raw);
      return saved?.id ?? null;
    } catch {
      return null;
    }
  };

  const getPrefsKey = () => {
    const uid = getUserId();
    return uid ? `profile_prefs_${uid}` : null;
  };







  const loadPrefs = () => {
    const key = getPrefsKey();
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  const savePrefs = (next) => {
    const key = getPrefsKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const getAuthorsArray = (book) => {
    if (!book) return [];
    if (Array.isArray(book.authors)) return book.authors;
    if (book.author) return String(book.author).split(";").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const fetchLibrary = async () => {
    const userId = getUserId();
    if (!userId || !backendUrl) return;
    setLoadingLibrary(true);
    try {
      const resp = await fetch(`${backendUrl}/api/library/${userId}/books`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.msg || err?.message || "Error fetching library");
      }
      const data = await resp.json();
      setLibraryBooks(Array.isArray(data) ? data : []);
    } catch {
      setLibraryBooks([]);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const pickTop3Book = (item) => {
    if (activeSlot === null) return;
    const mapped = {
      id: item.id || null,
      title: item.title,
      authors: getAuthorsArray(item),
      publisher: item.publisher || null,
      thumbnail: item.thumbnail || null,
      isbn: normalizeIsbn(item.isbn),
    };
    const prefs = loadPrefs() || {};
    setTop3((prev) => {
      const next = [...prev];
      next[activeSlot] = mapped;
      savePrefs({ ...prefs, top3: next });
      return next;
    });
    setActiveSlot(null);
    setIsBookModalOpen(false);
  };

  const clearTop3Slot = (idx) => {
    const prefs = loadPrefs() || {};
    setTop3((prev) => {
      const next = [...prev];
      next[idx] = null;
      savePrefs({ ...prefs, top3: next });
      return next;
    });
  };

  const handleBookSelect = (book) => {
    if (activeSlot !== null) pickTop3Book(book);
  };

  const addBookToLibrary = async (book) => {
    const userId = getUserId();
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
      fetchLibrary();
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

  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    fetchLibrary();
    const prefs = loadPrefs();
    if (prefs && Array.isArray(prefs.top3)) {
      setTop3([prefs.top3[0] || null, prefs.top3[1] || null, prefs.top3[2] || null]);
    }
  }, [userData?.id]);

  // Sin backend no hacemos fetch; marcar como cargado para no bloquear la UI (skeletons infinitos)
  useEffect(() => {
    if (!backendUrl) setEventsLoaded(true);
  }, [backendUrl]);

  // Carga inicial de eventos: una sola vez por sesión; resultado en store.eventGlobalList (y localStorage)
  useEffect(() => {
    if (!backendUrl || eventsLoaded) return;
    let cancelled = false;
    fetch(`${backendUrl}/api/events`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((e) => ({
          ...e,
          icon: e.category || "📖",
          date: e.date,
          time: e.time,
        }));
        dispatch({ type: "set_events", payload: mapped });
        setEventsLoaded(true);
      })
      .catch(() => setEventsLoaded(true));
    return () => { cancelled = true; };
  }, [backendUrl, eventsLoaded, dispatch]);

  useEffect(() => {
    const isbn = normalizeIsbn(selectedBook?.isbn);
    if (!isbn || !backendUrl) {
      setActiveReaders([]);
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) {
      setActiveReaders([]);
      return;
    }
    let cancelled = false;

    fetch(`${backendUrl}/api/chat/channel-members-by-isbn?isbn=${encodeURIComponent(isbn)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.members)) setActiveReaders(data.members);
      })
      .catch(() => {
        if (!cancelled) setActiveReaders([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBook?.isbn, backendUrl]);

  const handleAddEvent = (newEvent) => {
    dispatch({ type: "add_event", payload: newEvent });
  };

  const makeChannelIdFromIsbn = (isbn) => {
    const normalized = normalizeIsbn(isbn);
    if (!normalized) return null;
    return `book-isbn-${normalized}`;
  };

  // ✅ IMPORTANTE: mapeo + normalize (para no romper prologue / ISBN)
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

  const handleGoToAIChat = (book) => {
    if (book) {
      handleSelectBook(book);
    }
    navigate("/ai-chat");
  };

  const handleOpenChat = async () => {
    setUiMessage(null);

    if (!selectedBook?.title) {
      setUiMessage({ type: "warning", text: "Primero selecciona un libro para abrir su chat." });
      return;
    }

    const isbn = normalizeIsbn(selectedBook?.isbn);
    if (!isbn) {
      setUiMessage({
        type: "warning",
        text: "Este libro no tiene ISBN. Solo puedes chatear sobre libros con ISBN válido.",
      });
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setUiMessage({ type: "danger", text: "No hay sesión activa. Inicia sesión de nuevo." });
      return;
    }

    const channelId = makeChannelIdFromIsbn(isbn);
    if (!channelId) {
      setUiMessage({ type: "danger", text: "No se pudo generar el canal para este libro." });
      return;
    }

    try {
      setChatLoading(true);

      // Crear o unirse al canal por ISBN: mismo libro (mismo ISBN) = mismo chat para todos
      const createResp = await fetch(`${backendUrl}/api/chat/create-or-join-channel-by-isbn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          isbn,
          book_title: selectedBook.title,
          thumbnail: selectedBook.thumbnail || null,
          authors: selectedBook.authors || [],
        }),
      });

      if (!createResp.ok) {
        const err = await createResp.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo crear/unir el chat.");
      }

      const createData = await createResp.json();
      const createdChannelId = createData.channel_id || channelId;

      navigate(
        `/chat?channel=${encodeURIComponent(createdChannelId)}&isbn=${encodeURIComponent(isbn)}&book=${encodeURIComponent(
          selectedBook.title
        )}`,
        {
          state: { selectedBook, channelId: createdChannelId },
        }
      );
    } catch (e) {
      setUiMessage({ type: "danger", text: e.message });
    } finally {
      setChatLoading(false);
    }
  };

  // ✅ Click en el libro => Prologue (sinopsis)
  const openPrologue = () => {
    setModalMode("prologue");
    setIsLibraryOpen(true);
  };

  // ✅ Botón "+" => Librería
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

        <div className="row g-3 mx-0 home-row justify-content-center align-items-stretch">
          <div className="card-shadow col-12 col-lg-5 left-container home-left-column" style={{ minHeight: "420px" }}>
            {!eventsLoaded ? (
              <>
                <section className="mb-5">
                  <div className="home-skeleton home-skeleton-title" style={{ width: "60%", height: 28, marginBottom: "1.5rem" }} />
                  <div className="reading-now-row">
                    <div className="home-skeleton home-skeleton-book-card" style={{ width: 180, height: 260, borderRadius: "var(--card-radius)" }} />
                    <div className="home-skeleton home-skeleton-readers-card" style={{ flex: 1, height: 200, borderRadius: "var(--card-radius)", minWidth: 180 }} />
                  </div>
                </section>
                <section>
                  <div className="home-skeleton home-skeleton-title" style={{ width: "70%", height: 28, marginBottom: "1rem" }} />
                  <div className="d-flex flex-column gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="home-skeleton home-skeleton-top3-row" style={{ height: 100, borderRadius: "var(--card-radius)" }} />
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="mb-5">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold mb-0 glitch-title" data-text="READING NOW">
                      READING NOW
                    </h5>
                    <button
                      type="button"
                      className="home-search-btn"
                      onClick={openLibrary}
                      aria-label="Buscar o cambiar libro"
                      title="Buscar o cambiar libro"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </button>
                  </div>

                  {uiMessage && (
                    <div className={`alert alert-${uiMessage.type} py-2`} role="alert">
                      {uiMessage.text}
                    </div>
                  )}

                  <div className="reading-now-row">
                    <div className="home-book-wrap">
                      <button
                        type="button"
                        className={`card border-0 shadow-sm p-3 text-center mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                        style={{ borderRadius: "var(--card-radius)", width: "180px", cursor: "pointer" }}
                        onClick={openPrologue}
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
                          <div className="text-muted home-isbn-text">
                            ISBN: {selectedBook.isbn}
                          </div>
                        )}
                      </button>
                    </div>

                    <div
                      className={`reading-readers-card card border-0 shadow-sm p-3 mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                      style={{ borderRadius: "var(--card-radius)" }}
                    >
                      <h6 className="fw-bold mb-2">Like-minded readers</h6>

                      <div className="d-flex my-2 align-items-center flex-wrap gap-1">
                        {activeReaders.length > 0 ? (
                          activeReaders.slice(0, 6).map((user, i) => (
                            <img
                              key={user.id}
                              src={
                                user.image ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.id)}&background=8b1a30&color=fff`
                              }
                              alt={user.name || user.id}
                              className="rounded-circle border border-white"
                              style={{
                                width: "32px",
                                height: "32px",
                                objectFit: "cover",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                                border: "2px solid white",
                              }}
                              title={user.name || user.id}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  user.name || user.id
                                )}&background=8b1a30&color=fff`;
                              }}
                            />
                          ))
                        ) : (
                          <span className="small text-muted">Those who open the chat will appear here</span>
                        )}
                      </div>

                      <p className="small text-muted mb-2">
                        {activeReaders.length === 0 && "Open the chat to join."}
                        {activeReaders.length === 1 && "1 reader in this conversation."}
                        {activeReaders.length > 1 && `${activeReaders.length} readers in this conversation.`}
                      </p>

                      <button className="btn btn-wine w-100 py-2 rounded-3" onClick={handleOpenChat} disabled={chatLoading}>
                        {chatLoading ? "Opening..." : "Open Chat"}
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h5 className="fw-bold mb-4 glitch-title" data-text="TOP 3 FAVORITE BOOKS">
                    TOP 3 FAVORITE BOOKS
                  </h5>

                  <div className="d-flex flex-column gap-3">
                    {[0, 1, 2].map((idx) => {
                      const b = top3[idx];
                      return (
                        <div
                          key={idx}
                          className={`card border-0 shadow-sm p-3 mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                          style={{ borderRadius: "var(--card-radius)" }}
                        >
                          <div className="d-flex gap-3 align-items-start">
                            {b ? (
                              <>
                                <img
                                  src={b.thumbnail || "https://via.placeholder.com/80x110"}
                                  alt={b.title}
                                  style={{ width: 60, height: 85, objectFit: "cover", borderRadius: 10 }}
                                />
                                <div className="flex-grow-1">
                                  <div className="fw-bold" style={{ color: "#231B59", fontSize: "0.7rem" }}>
                                    Top {idx + 1}
                                  </div>
                                  <div className="fw-bold" style={{ fontSize: "0.9rem", color: "#231B59" }}>
                                    {b.title}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                    {getAuthorsArray(b).join(", ")}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div
                                  style={{
                                    width: 60,
                                    height: 85,
                                    backgroundColor: "#f0f0f0",
                                    borderRadius: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  📚
                                </div>
                                <div className="flex-grow-1">
                                  <div className="fw-bold small">Top {idx + 1}</div>
                                  <div className="text-muted small">Elige un libro</div>
                                </div>
                              </>
                            )}
                            <div className="d-flex flex-column gap-2">
                              <button
                                className="btn btn-sm btn-wine"
                                onClick={() => {
                                  setPickerMode("top3");
                                  setActiveSlot(idx);
                                  fetchLibrary();
                                  setIsBookModalOpen(true);
                                }}
                              >
                                {b ? "Cambiar" : "Añadir"}
                              </button>
                              {b && (
                                <button className="btn btn-sm btn-outline-danger" onClick={() => clearTop3Slot(idx)}>
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="card-shadow col-12 col-lg-6 right-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0" id="events" style={{ color: "#231B59", letterSpacing: "0.5px" }}>
                Upcoming Events
              </h4>
              <button
                type="button"
                className="home-add-event-btn"
                onClick={() => setIsModalOpen(true)}
                aria-label="Crear evento"
                title="Create Your Event"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <div className="home-events-block" style={{ minHeight: "280px" }}>
              {!eventsLoaded ? (
                <>
                  <div className="row g-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div className="col-md-6" key={i}>
                        <div className="home-skeleton home-skeleton-event-card" />
                      </div>
                    ))}
                  </div>
                </>
              ) : totalEvents === 0 ? (
                <div className="home-events-empty">
                  <span className="home-events-empty-emoji" aria-hidden>📅</span>
                  <p className="home-events-empty-text">We don&apos;t have any events yet.</p>
                  <p className="home-events-empty-sub">Create one with the + button above!</p>
                </div>
              ) : (
                <div className="row g-3">
                  {visibleEvents.map((ev, index) => (
                    <div className="col-md-6" key={ev.id || index}>
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
                            transition: "all 0.3s ease",
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
                        <button
                          className="btn btn-wine btn-sm rounded-pill px-3"
                          onClick={() => {
                            setSelectedEvent(ev);
                            setIsEventDetailsOpen(true);
                          }}
                        >
                          View More
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {eventsLoaded && showEventsToggle && (
              <div className="d-flex justify-content-center mt-4">
                <button
                  type="button"
                  className="home-search-btn home-view-more-events-btn"
                  onClick={handleViewMoreEvents}
                  aria-label={isExpandedEvents ? "Ver menos eventos" : "Ver más eventos"}
                  title={isExpandedEvents ? "View less events" : "View more events"}
                >
                  {isExpandedEvents ? "View less events" : "View more events"}
                </button>
              </div>
            )}

            {/* --- INICIO WIDGET SPOTIFY --- */}
            <div className="mt-4 mb-4">
              <div
                className={`card border-0 shadow-sm p-3 mb-card ${enableBorderGlow ? "mb-border-glow" : ""}`}
                style={{ borderRadius: "15px", overflow: "hidden" }}
              >
                <h6 className="fw-bold mb-3" style={{ color: "#231B59" }}>
                  Música para leer 🎵
                </h6>
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

            <CreateEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddEvent} />

            <EventDetailsModal isOpen={isEventDetailsOpen} onClose={() => setIsEventDetailsOpen(false)} event={selectedEvent} />
          </div>
        </div>

        <BookLibraryModal
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onSelect={handleSelectBook}
          onAddToLibrary={addBookToLibrary}
          onGoToAIChat={handleGoToAIChat}
          mode={modalMode}
          selectedBook={selectedBook}
        />

        <MyLibraryPickerModal
          isOpen={isBookModalOpen}
          onClose={() => {
            setIsBookModalOpen(false);
            setActiveSlot(null);
            setPickerMode("top3");
          }}
          books={libraryBooks}
          onSelect={handleBookSelect}
        />
      </div>
    </div>
  );
};
