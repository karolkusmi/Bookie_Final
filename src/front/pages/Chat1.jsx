import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Chat from "../components/Chat/Chat";
import useGlobalReducer from "../hooks/useGlobalReducer";
import "./Chat1.css";
import portadaLibro from "../assets/img/portada_Libro.png";
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

// Función auxiliar para mostrar un toast de error
const showErrorToast = (message) => {
    Toastify({
        text: message,
        duration: 5000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #c0392b, #e74c3c)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(192, 57, 43, 0.4)",
        },
    }).showToast();
};


export const Chat1 = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { store } = useGlobalReducer();

    const [activeChannelId, setActiveChannelId] = useState(null);
    const [bookTitle, setBookTitle] = useState("");
    const [bookIsbn, setBookIsbn] = useState("");
    const [bookThumbnail, setBookThumbnail] = useState(null);
    const [activeReaders, setActiveReaders] = useState([]);

    useEffect(() => {
        const checkAuth = () => {
            const accessToken = localStorage.getItem("access_token");
            if (!accessToken) {
                navigate("/");
                return false;
            }

        
            return true;
        };

        if (!checkAuth()) return;

        const channelFromUrl = searchParams.get("channel");
        const bookFromUrl = searchParams.get("book");
        const isbnFromUrl = searchParams.get("isbn");

        if (channelFromUrl) {
            setActiveChannelId(channelFromUrl);
            if (channelFromUrl.startsWith("book-isbn-") && !isbnFromUrl) {
                setBookIsbn(channelFromUrl.replace("book-isbn-", ""));
            }
        }
        if (bookFromUrl) {
            setBookTitle(decodeURIComponent(bookFromUrl));
        }

        if (isbnFromUrl) {
            setBookIsbn(decodeURIComponent(isbnFromUrl));
        }

        if (store?.selectedBook?.thumbnail) {
            setBookThumbnail(store.selectedBook.thumbnail);
        }
    }, [navigate, searchParams, store?.selectedBook?.thumbnail]);

    // Tras refrescar, el store está vacío: recuperar portada (y título si falta) por ISBN desde la API
    useEffect(() => {
        const isbn = searchParams.get("isbn");
        const channel = searchParams.get("channel");
        const isbnToFetch = isbn ? decodeURIComponent(isbn) : (channel && channel.startsWith("book-isbn-") ? channel.replace("book-isbn-", "") : null);
        if (!isbnToFetch || bookThumbnail) return;

        const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
        if (!backendUrl) return;

        let cancelled = false;
        fetch(`${backendUrl}/api/books/by-isbn?isbn=${encodeURIComponent(isbnToFetch)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                if (data.thumbnail) setBookThumbnail(data.thumbnail);
                if (data.title && !searchParams.get("book")) setBookTitle(data.title);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [searchParams.get("isbn"), searchParams.get("channel"), searchParams.get("book"), bookThumbnail]);

    useEffect(() => {
        if (!activeChannelId) setActiveReaders([]);
    }, [activeChannelId]);

    const handleJoinChannel = (channelId, title) => {
        setActiveChannelId(channelId);
        setBookTitle(title);
        navigate(`/chat?channel=${channelId}&book=${encodeURIComponent(title)}`, { replace: true });
    };

    const handleCloseChannel = () => {
        setActiveChannelId(null);
        setBookTitle("");
        setBookIsbn("");
        navigate("/home", { replace: true });
    };

    return (
        <div className="page-layout">
            {/* Barra lateral izquierda */}
            <aside className="sidebar">
                {bookTitle && (
                    <div className="book-section">
                        <h4>Discusión Actual</h4>
                        <img
                            src={bookThumbnail || portadaLibro}
                            alt="Portada del libro"
                            className="book-cover"
                            onError={(e) => { e.currentTarget.src = portadaLibro; }}
                        />
                        <p className="book-title">{bookTitle}</p>
                        {bookIsbn && (
                            <p className="book-isbn" style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>
                                ISBN: {bookIsbn}
                            </p>
                        )}
                    </div>
                )}

                {!bookTitle && (
                    <div className="book-section empty-state">
                        <h4>Bienvenido al Chat</h4>
                        <p className="empty-text">Select a book on Home to chat with other readers of the same book</p>
                    </div>
                )}

                <div className="readers-section">
                    <h4>Lectores activos en el chat</h4>
                    <div className="avatar-group">
                        {activeReaders.length > 0 ? (
                            activeReaders.slice(0, 8).map((user) => (
                                <img
                                    key={user.id}
                                    src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.id)}&background=8b1a30&color=fff`}
                                    alt={user.name || user.id}
                                    className="avatar"
                                    title={user.name || user.id}
                                    onError={(e) => {
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.id)}&background=8b1a30&color=fff`;
                                    }}
                                />
                            ))
                        ) : (
                            <span className="text-muted small">Todavía no hay nadie conectado</span>
                        )}
                    </div>
                    <p className="readers-count">
                        {activeReaders.length === 0 && "Selecciona un libro y abre el chat para ver quién está aquí"}
                        {activeReaders.length === 1 && "1 lector conectado"}
                        {activeReaders.length > 1 && `${activeReaders.length} lectores conectados`}
                    </p>
                </div>
            </aside>

            {/* Componente principal de Chat */}
            <main className="chat-main">
                <Chat
                    channelId={activeChannelId}
                    bookTitle={bookTitle}
                    onJoinChannel={handleJoinChannel}
                    onCloseChannel={handleCloseChannel}
                    onChannelWatchers={setActiveReaders}
                />
            </main>
        </div>
    );
};