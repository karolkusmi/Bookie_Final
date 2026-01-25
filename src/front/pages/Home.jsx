import React, { useEffect, useState } from 'react';
import CreateEventModal from '../components/CreateEventModal';
import BookLibraryModal from '../components/BookLibraryModal';
import './Home.css';
import portadaLibro from "../assets/img/portada_Libro.png";
import useGlobalReducer from '../hooks/useGlobalReducer';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/UserContext';

export const Home = () => {
  const { store, dispatch } = useGlobalReducer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventList, setEventList] = useState(store.initialEventList);
  const navigate = useNavigate();
  const { updateProfile, updateProfileImg } = useUser()


  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Librería + libro seleccionado
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Mensaje UI
  const [uiMessage, setUiMessage] = useState(null); // { type: "danger"|"warning"|"success", text: string }
  const [chatLoading, setChatLoading] = useState(false);

  // Cargar libro guardado (persistencia)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selected_book");
      if (saved) setSelectedBook(JSON.parse(saved));

      updateProfile(JSON.parse(localStorage.getItem("user_data")))

    } catch (e) {
      localStorage.removeItem("selected_book");
    }

  }, []);

  const handleAddEvent = (newEvent) => {
    dispatch({
      type: 'add_event',
      payload: newEvent
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('stream_token');
    localStorage.removeItem("selected_book");
    localStorage.removeItem("token");
    localStorage.removeItem("selectedBook");
    localStorage.removeItem("userAvatar");


    navigate('/');
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    localStorage.setItem("selected_book", JSON.stringify(book));
    console.log("ISBN libro elegido:", book?.isbn);
    setUiMessage(null);
  };

  // Mismo algoritmo que tu backend usa para generar channel_id en create-or-join-channel
  const makeChannelIdFromTitle = (title) => {
    if (!title) return null;

    // Normalizar y quitar acentos
    const normalized = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Solo [a-z0-9 -], espacios -> guiones, guiones múltiples -> uno
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

{/* Debajo del nombre del libro en la Card de Reading Now */}
<span className="fw-bold small">
  {selectedBook?.title || "Your Book !!"}
</span>

{selectedBook && (
  <button 
    className="btn btn-sm mt-2" 
    style={{ color: '#11DA3E7', border: '1px solid #11DA3E7' }}
    onClick={() => dispatch({ type: 'add_favorite', payload: selectedBook })}
  >
    ♥ Add to Favs
  </button>
)}


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

      // 1) Ver si el canal existe consultando tus canales públicos
      const listResp = await fetch(`${backendUrl}/api/chat/public-channels`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });

      if (!listResp.ok) {
        const err = await listResp.json().catch(() => ({}));
        throw new Error(err.message || "No se pudieron obtener los canales.");
      }

      const listData = await listResp.json();
      const channels = listData.channels || [];
      const exists = channels.some(ch => ch.id === channelId);

      // 2) Si existe: navega directo
      if (exists) {
        navigate(`/chat?channel_id=${encodeURIComponent(channelId)}`, {
          state: { selectedBook, channelId }
        });
        return;
      }

      // 3) Si NO existe: avisar y preguntar si quieres crearlo
      const wantCreate = window.confirm(
        `No existe un chat para “${selectedBook.title}”.\n\n¿Quieres crearlo ahora?`
      );

      if (!wantCreate) {
        setUiMessage({ type: "warning", text: "Chat no creado. Puedes crear uno cuando quieras." });
        return;
      }

      // 4) Crear o unirse (tu backend lo crea si no existe)
      const createResp = await fetch(`${backendUrl}/api/chat/create-or-join-channel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          book_title: selectedBook.title
        })
      });

      if (!createResp.ok) {
        const err = await createResp.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo crear/unir el chat.");
      }

      const createData = await createResp.json();
      const createdChannelId = createData.channel_id || channelId;

      navigate(`/chat?channel_id=${encodeURIComponent(createdChannelId)}`, {
        state: { selectedBook, channelId: createdChannelId }
      });

    } catch (e) {
      setUiMessage({ type: "danger", text: e.message });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center" style={{ backgroundColor: 'var(--book-bg)', minHeight: "90%" }}>
      <div className="row gap-3 mx-5">

        {/* COLUMNA IZQUIERDA */}
        <div className="card-shadow col-5 left-container">
          <section className="mb-5">
            <h5 className="fw-bold mb-4 glitch-title" data-text="READING NOW">READING NOW</h5>

            {uiMessage && (
              <div className={`alert alert-${uiMessage.type} py-2`} role="alert">
                {uiMessage.text}
              </div>
            )}

            <div className="d-flex gap-3 flex-wrap">

              {/* Tarjeta Libro (abre librería) */}
              <button
                type="button"
                className="card border-0 shadow-sm p-3 text-center"
                style={{ borderRadius: 'var(--card-radius)', width: '180px', cursor: "pointer" }}
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

                {selectedBook?.isbn && (
                  <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                    ISBN: {selectedBook.isbn}
                  </div>
                )}
              </button>

              {/* Tarjeta Social */}
              <div className="card border-0 shadow-sm p-4 flex-grow-1" style={{ borderRadius: 'var(--card-radius)' }}>
                <h6 className="fw-bold">Like-minded readers</h6>

                <div className="d-flex my-2">
                  <img
                    src="https://i.pravatar.cc/150?img=47"
                    alt="reader avatar"
                    className="rounded-circle border border-white"
                    style={{
                      width: "30px",
                      height: "30px",
                      objectFit: "cover"
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
                      objectFit: "cover"
                    }}
                  />
                </div>

                <p className="small text-muted">"Aure and 12 others are here."</p>

                {/* Open Chat (ahora con lógica por libro) */}
                <button
                  className="btn btn-wine w-100 py-2 mt-auto rounded-3"
                  onClick={handleOpenChat}
                  disabled={chatLoading}
                >
                  {chatLoading ? "Opening..." : "Open Chat"}
                </button>
              </div>

            </div>
          </section>

          <section>
            <h5 className="fw-bold mb-4 glitch-title" data-text="ACTIVITY FEED">ACTIVITY FEED</h5>
            <div className="d-flex gap-3">
              <div className="card border-0 p-4 text-center shadow-sm flex-grow-1 bg-lavender-card" style={{ borderRadius: 'var(--card-radius)' }}>
                <span className="fs-1">📅</span>
                <h6 className="fw-bold mt-2 mb-1">Explore Events</h6>
                <p className="small text-muted mb-0">Clubs & Meetups</p>
              </div>

              <div className="card border-0 p-3 shadow-sm flex-grow-1 bg-white" style={{ borderRadius: 'var(--card-radius)' }}>
                <div className="card-body p-1 d-flex flex-column h-100 text-start">
                  <p className="small fw-medium mb-2">“ Aure and 12 others are talking about this chapter... ”</p>
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

        {/* COLUMNA DERECHA */}
        <div className="card-shadow col-6 right-container">
          <div className="d-flex justify-content-center mb-5">
            <button className="btn btn-outline-wine rounded-pill px-5 fw-bold" onClick={() => setIsModalOpen(true)}>
              ✚ Create Your Event
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold"> Upcoming Events</h4>
          </div>

          <div className="row g-3">
            {
              store.eventGlobalList.length === 0 ? eventList.map((ev, index) => (
                <div className="col-md-6" key={index}>
                  <div className="card border-0 shadow-sm p-3 d-flex flex-row align-items-center  event-card" style={{ borderRadius: '15px' }}>
                    <div className="rounded-circle p-3 me-3 fs-4" style={{ backgroundColor: 'var(--book-lavender)' }}>
                      {ev.icon}
                    </div>
                    <div className="flex-grow-1 text-start">
                      <h6 className="fw-bold mb-0 small">{ev.title}</h6>
                      <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>{ev.date}</p>
                    </div>
                    <button className="btn btn-wine btn-sm rounded-pill px-3">View More</button>
                  </div>
                </div>
              )) :
                store.eventGlobalList.map((ev, index) => (
                  <div className="col-md-6" key={index}>
                    <div className="card border-0 shadow-sm p-3 d-flex flex-row align-items-center  event-card" style={{ borderRadius: '15px' }}>
                      <div className="rounded-circle p-3 me-3 fs-4" style={{ backgroundColor: 'var(--book-lavender)' }}>
                        {ev.icon}
                      </div>
                      <div className="flex-grow-1 text-start">
                        <h6 className="fw-bold mb-0 small">{ev.title}</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>{ev.date}</p>
                      </div>
                      <button className="btn btn-wine btn-sm rounded-pill px-3">View More</button>
                    </div>
                  </div>
                ))}
          </div>

          <button onClick={handleLogout} className="btn btn-outline-wine rounded-pill px-4 fw-bold ms-3 mt-4">
            Log Out
          </button>

          <CreateEventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleAddEvent}
          />
        </div>
      </div>

      {/* Modal para elegir/cambiar libro */}
      <BookLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={handleSelectBook}
      />
    </div>
  );
};
