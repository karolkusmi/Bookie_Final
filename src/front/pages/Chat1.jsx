import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Chat from "../components/Chat/Chat";
import "./Chat1.css";
import portadaLibro from "../assets/img/portada_Libro.png";
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

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
                        <p className="empty-text">Select a book on Home to chat with other readers of the same book</p>
                    </div>
                )}

                <div className="readers-section">
                    <h4>Active readers in the chat</h4>
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
                            <span className="text-muted small">No one connected yet</span>
                        )}
                    </div>
                    <p className="readers-count">
                        {activeReaders.length === 0 && "Select a book and open the chat to see who's here"}
                        {activeReaders.length === 1 && "1 reader connected"}
                        {activeReaders.length > 1 && `${activeReaders.length} readers connected`}
                    </p>
                </div>
            </aside>

            {/* Componente Chat Principal */}
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