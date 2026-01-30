import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Chat from "../components/Chat/Chat";
import "./Chat1.css";
import portadaLibro from "../assets/img/portada_Libro.png";
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import {
    createOrJoinBookChannel,
    generateBookChannelId,
    isUserConnected
} from "../components/Chat/utiles/chat_logic";

// Helper function to show error toast
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

    const [activeChannelId, setActiveChannelId] = useState(null);
    const [bookTitle, setBookTitle] = useState("");
    const [bookIsbn, setBookIsbn] = useState("");
    const [bookThumbnail, setBookThumbnail] = useState(null);
    const [activeReaders, setActiveReaders] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newBookTitle, setNewBookTitle] = useState("");
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            const streamToken = localStorage.getItem("stream_token");
            const userData = localStorage.getItem("user_data");
            const accessToken = localStorage.getItem("access_token");

            // Debug: log auth state
            console.log("Chat1 Auth Check:", {
                hasAccessToken: !!accessToken,
                hasStreamToken: !!streamToken,
                hasUserData: !!userData
            });

            // Check if user is authenticated
            if (!accessToken) {
                console.log("No access token, redirecting to login");
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
        }
        if (bookFromUrl) {
            setBookTitle(decodeURIComponent(bookFromUrl));
        }

        if (isbnFromUrl) {
            setBookIsbn(decodeURIComponent(isbnFromUrl));
        }

        try {
            const savedBook = localStorage.getItem("selected_book");
            if (savedBook) {
                const bookData = JSON.parse(savedBook);
                if (bookData.thumbnail) {
                    setBookThumbnail(bookData.thumbnail);
                }
            }
        } catch (e) {
            console.error("Error loading book thumbnail:", e);
        }
    }, [navigate, searchParams]);

    // crear o unirse a un canal basado en el título del libro
    const handleCreateOrJoinChannel = async () => {
        if (!newBookTitle.trim()) return;

        setIsCreatingChannel(true);
        try {

            // Generar el ID del canal basado en el título del libro
            const channelId = generateBookChannelId(newBookTitle);
        
            //Crear o unirse al canal
            await createOrJoinBookChannel(newBookTitle);

            setActiveChannelId(channelId);
            setBookTitle(newBookTitle);
            setShowNewChatModal(false);
            setNewBookTitle("");

            // Update URL with channel info
            navigate(`/chat?channel=${channelId}&book=${encodeURIComponent(newBookTitle)}`, { replace: true });
        } catch (error) {
            console.error("Error creating/joining channel:", error);
            showErrorToast("Error al crear o unirse al canal de discusión");
        } finally {
            setIsCreatingChannel(false);
        }
    };

    // Handle joining a channel from the public list

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
            {/* Barra Lateral Izquierda */}
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
                        <p className="empty-text">Selecciona un libro en el Home para chatear con otros lectores del mismo libro</p>
                    </div>
                )}

                <div className="readers-section">
                    <h4>Lectores activos en el chat</h4>
                    <div className="avatar-group">
                        <img src="https://i.pravatar.cc/40?u=1" alt="user1" className="avatar" />
                        <img src="https://i.pravatar.cc/150?img=47" alt="user2" className="avatar" />
                        <img src="https://i.pravatar.cc/150?img=12" alt="user3" className="avatar" />
                    </div>
                    <p className="readers-count">Aure y 12 más están aquí ahora</p>
                </div>

                <div className="actions-section">
                    <button
                        className="new-chat-btn"
                        onClick={() => setShowNewChatModal(true)}
                    >
                        + Nueva Discusión de Libro
                    </button>
                </div>
            </aside>

            {/* Componente Chat Principal */}
            <main className="chat-main">
                <Chat
                    channelId={activeChannelId}
                    bookTitle={bookTitle}
                    onJoinChannel={handleJoinChannel}
                    onCloseChannel={handleCloseChannel}
                />
            </main>

            {/* Modal para crear nuevo canal */}
            {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Nueva Discusión de Libro</h3>
                        <p>Crea un canal para debatir sobre un libro con otros lectores. Si ya existe una discusión sobre este libro, te unirás automáticamente.</p>

                        <input
                            type="text"
                            placeholder="Título del libro"
                            value={newBookTitle}
                            onChange={(e) => setNewBookTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateOrJoinChannel()}
                            className="modal-input"
                        />

                        <div className="modal-actions">
                            <button
                                className="modal-btn cancel"
                                onClick={() => setShowNewChatModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="modal-btn create"
                                onClick={handleCreateOrJoinChannel}
                                disabled={isCreatingChannel || !newBookTitle.trim()}
                            >
                                {isCreatingChannel ? "Conectando..." : "Crear / Unirse"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};