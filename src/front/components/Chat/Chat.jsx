import { useEffect, useState } from "react";
import {
    Chat as StreamChatComponent,
    Channel,
    ChannelHeader,
    MessageList,
    MessageInput,
    Thread,
    Window,
    ChannelList,
    useChannelStateContext,
    useChatContext,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import "./Chat.css";

import { useUser } from "../UserContext";
import {
    getStreamClient,
    connectUser,
    disconnectUser,
    isUserConnected,
    getAllBookChannels,
    joinBookChannel,
    isUserMemberOfChannel,
    getChannelMemberCount,
    leaveChannel,
    deleteChannel,
    isChannelCreator,
} from "./utiles/chat_logic";

/**
 * Componente principal de Chat que envuelve la funcionalidad de Stream Chat
 * @param {Object} props
 * @param {string} props.channelId - Canal específico a abrir (opcional)
 * @param {string} props.bookTitle - Título del libro para mostrar (opcional)
 * @param {Function} props.onJoinChannel - Callback cuando el usuario se une a un canal
 * @param {Function} props.onCloseChannel - Callback cuando el usuario cierra un canal
 */
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

/**
 * Componente interno que debe renderizarse dentro de <Channel>.
 * Informa al componente padre de los watchers/miembros actuales para que Chat1 pueda mostrar avatares reales.
 */
function ChannelWatchersReporter({ onWatchers }) {
    const { channel } = useChannelStateContext();
    const { client } = useChatContext();

    useEffect(() => {
        if (!channel || typeof onWatchers !== "function") return;

        const update = () => {
            const watchers = channel.state.watchers || {};
            const members = channel.state.members || {};
            const watcherList = Object.values(watchers);
            const memberUsers = Object.values(members)
                .map((m) => m.user)
                .filter(Boolean);
            const users = watcherList.length ? watcherList : memberUsers;
            const list = users.map((u) => ({
                id: u.id,
                name: u.name || u.id,
                image: u.image,
            }));
            onWatchers(list);
        };

        update();
        channel.on("user.watching.start", update);
        channel.on("user.watching.stop", update);
        if (client) {
            client.on("user.presence.changed", update);
        }
        return () => {
            channel.off("user.watching.start", update);
            channel.off("user.watching.stop", update);
            if (client) {
                client.off("user.presence.changed", update);
            }
        };
    }, [channel, client, onWatchers]);

    return null;
}

const Chat = ({ channelId = null, bookTitle = null, onJoinChannel = null, onCloseChannel = null, onChannelWatchers = null }) => {
    const { userData } = useUser();
    const [client, setClient] = useState(null);
    const [channel, setChannel] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [publicChannels, setPublicChannels] = useState([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [joiningChannelId, setJoiningChannelId] = useState(null);
    const [showChannelActions, setShowChannelActions] = useState(false);
    const [isLeavingChannel, setIsLeavingChannel] = useState(false);
    const [isDeletingChannel, setIsDeletingChannel] = useState(false);

    useEffect(() => {
        const initChat = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const streamToken = localStorage.getItem("stream_token");
                const accessToken = localStorage.getItem("access_token");

                if (!accessToken) {
                    const msg = "No estás autenticado. Por favor, inicia sesión.";
                    setError(msg);
                    showErrorToast(msg);
                    setIsLoading(false);
                    return;
                }

                if (!userData?.id) {
                    const msg = "Cargando sesión…";
                    setError(msg);
                    setIsLoading(false);
                    return;
                }

                if (!streamToken) {
                    const msg = "Error de configuración del chat. Por favor, cierra sesión y vuelve a iniciar.";
                    setError(msg);
                    showErrorToast(msg);
                    setIsLoading(false);
                    return;
                }

                const streamClient = getStreamClient();

                if (!streamClient) {
                    const msg = "Error de configuración: VITE_STREAM_API_KEY no está definida.";
                    setError(msg);
                    showErrorToast(msg);
                    setIsLoading(false);
                    return;
                }

                if (!isUserConnected()) {
                    await connectUser(
                        userData.id,
                        userData.username || String(userData.id),
                        streamToken,
                        userData.image_avatar || null
                    );
                }

                setClient(streamClient);

                // Si se solicita un canal específico, sincronizar avatares desde la BD y luego abrir canal
                if (channelId) {
                    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
                    if (backendUrl && accessToken) {
                        try {
                            await fetch(
                                `${backendUrl}/api/chat/sync-channel-avatars?channel_id=${encodeURIComponent(channelId)}`,
                                { headers: { Authorization: `Bearer ${accessToken}` } }
                            );
                        } catch (_) {}
                    }
                    if (channelId.startsWith("book-")) {
                        try {
                            await joinBookChannel(channelId);
                        } catch (e) {
                            // Si ya es miembro o falla, intentar watch de todos modos
                        }
                    }
                    const selectedChannel = streamClient.channel("messaging", channelId);
                    await selectedChannel.watch();
                    setChannel(selectedChannel);
                }

                setIsLoading(false);
            } catch (err) {
                console.error("Error initializing chat:", err);
                const msg = `Error al conectar con el chat: ${err.message}`;
                setError(msg);
                showErrorToast(msg);
                setIsLoading(false);
            }
        };

        initChat();

        // Limpieza al desmontar el componente
        return () => {
            // No desconectar al desmontar: que lo gestione la app principal
            // disconnectUser();
        };
    }, [channelId, userData?.id, userData?.username, userData?.image_avatar]);

    // Cargar canales públicos de libros cuando no hay un canal específico seleccionado
    useEffect(() => {
        const loadPublicChannels = async () => {
            if (!client || channelId) return;

            setLoadingChannels(true);
            try {
                const channels = await getAllBookChannels();
                setPublicChannels(channels);
            } catch (err) {
                console.error("Error loading public channels:", err);
            } finally {
                setLoadingChannels(false);
            }
        };

        loadPublicChannels();
    }, [client, channelId]);

    // Gestionar la unión a un canal público
    const handleJoinPublicChannel = async (channelToJoin) => {
        const channelIdToJoin = channelToJoin.id;
        setJoiningChannelId(channelIdToJoin);

        try {
            const joinedChannel = await joinBookChannel(channelIdToJoin);
            setChannel(joinedChannel);

            // Notify parent component
            if (onJoinChannel) {
                const bookTitle = channelToJoin.data?.book_title || channelToJoin.data?.name || "Libro";
                onJoinChannel(channelIdToJoin, bookTitle);
            }
        } catch (err) {
            console.error("Error joining channel:", err);
            showErrorToast("Error al unirse al canal");
        } finally {
            setJoiningChannelId(null);
        }
    };

    // Gestionar el cierre del canal actual (volver a la lista)
    const handleCloseChannel = () => {
        setChannel(null);
        setShowChannelActions(false);
        if (onCloseChannel) {
            onCloseChannel();
        }
    };

    // Gestionar abandonar un canal (eliminar al usuario de los miembros)
    const handleLeaveChannel = async () => {
        if (!channel) return;

        const confirmLeave = window.confirm(
            "¿Estás seguro de que quieres abandonar este canal? Dejarás de recibir mensajes."
        );

        if (!confirmLeave) return;

        setIsLeavingChannel(true);
        try {
            await leaveChannel(channel.id);
            // Refresh public channels list
            const channels = await getAllBookChannels();
            setPublicChannels(channels);
            // Close the channel view
            handleCloseChannel();
        } catch (err) {
            console.error("Error leaving channel:", err);
            showErrorToast("Error al abandonar el canal");
        } finally {
            setIsLeavingChannel(false);
        }
    };

    // Gestionar la eliminación de un canal (solo el creador)
    const handleDeleteChannel = async () => {
        if (!channel) return;

        const confirmDelete = window.confirm(
            "⚠️ ¿Estás seguro de que quieres ELIMINAR este canal?\n\nEsta acción es irreversible y eliminará todos los mensajes."
        );

        if (!confirmDelete) return;

        setIsDeletingChannel(true);
        try {
            await deleteChannel(channel.id);
            // Refresh public channels list
            const channels = await getAllBookChannels();
            setPublicChannels(channels);
            // Close the channel view
            handleCloseChannel();
        } catch (err) {
            console.error("Error deleting channel:", err);
            showErrorToast("Error al eliminar el canal. Solo el creador puede eliminarlo.");
        } finally {
            setIsDeletingChannel(false);
        }
    };

    // Actualizar la lista de canales públicos
    const refreshPublicChannels = async () => {
        if (!client) return;
        setLoadingChannels(true);
        try {
            const channels = await getAllBookChannels();
            setPublicChannels(channels);
        } catch (err) {
            console.error("Error refreshing channels:", err);
        } finally {
            setLoadingChannels(false);
        }
    };

    // Estado de carga
    if (isLoading) {
        return (
            <div className="chat-loading">
                <div className="chat-loading-spinner"></div>
                <p>Conectando al chat...</p>
            </div>
        );
    }

    // Estado de error
    if (error) {
        return (
            <div className="chat-error">
                <p>{error}</p>
            </div>
        );
    }

    // Sin cliente
    if (!client) {
        return (
            <div className="chat-error">
                <p>No se pudo inicializar el cliente de chat.</p>
            </div>
        );
    }

    // Filtros para la lista de canales (canales del usuario)
    const filters = {
        type: "messaging",
        members: { $in: [client.userID] }
    };
    const sort = [{ last_message_at: -1 }];

    // Renderizar la lista de canales públicos
    const renderPublicChannelsList = () => {
        if (loadingChannels) {
            return (
                <div className="public-channels-loading">
                    <div className="chat-loading-spinner small"></div>
                    <p>Cargando canales...</p>
                </div>
            );
        }

        if (publicChannels.length === 0) {
            return (
                <div className="public-channels-empty">
                    <p>No hay discusiones de libros todavía.</p>
                    <p>¡Sé el primero en crear una!</p>
                </div>
            );
        }

        return (
            <div className="public-channels-list">
                <div className="public-channels-header">
                    <div>
                        <h3 className="public-channels-title">Discusiones de Libros</h3>
                        <p className="public-channels-subtitle">Únete a una conversación existente</p>
                    </div>
                    <button
                        className="refresh-channels-btn"
                        onClick={refreshPublicChannels}
                        disabled={loadingChannels}
                        title="Actualizar lista"
                    >
                        {loadingChannels ? "..." : "🔄"}
                    </button>
                </div>

                {publicChannels.map((ch) => {
                    const isMember = isUserMemberOfChannel(ch);
                    const memberCount = getChannelMemberCount(ch);
                    const bookTitle = ch.data?.book_title || ch.data?.name?.replace("📚 ", "") || "Libro";
                    const isJoining = joiningChannelId === ch.id;

                    return (
                        <div key={ch.id} className="public-channel-item">
                            <div className="public-channel-info">
                                <span className="public-channel-icon">📚</span>
                                <div className="public-channel-details">
                                    <span className="public-channel-name">{bookTitle}</span>
                                    <span className="public-channel-members">
                                        {memberCount} {memberCount === 1 ? "lector" : "lectores"}
                                    </span>
                                </div>
                            </div>
                            <button
                                className={`public-channel-btn ${isMember ? "member" : "join"}`}
                                onClick={() => handleJoinPublicChannel(ch)}
                                disabled={isJoining}
                            >
                                {isJoining ? "..." : isMember ? "Entrar" : "Unirse"}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="stream-chat-container">
            <StreamChatComponent client={client} theme="str-chat__theme-light">
                {/* Si no hay un canal específico, mostrar la lista de canales públicos */}
                {!channel ? (
                    <div className="chat-with-list">
                        <div className="my-channels-section">
                            <h4 className="my-channels-title">Mis Conversaciones</h4>
                            <ChannelList
                                filters={filters}
                                sort={sort}
                                onSelect={(selectedChannel) => {
                                    setChannel(selectedChannel);
                                    if (onJoinChannel) {
                                        const title = selectedChannel.data?.book_title ||
                                            selectedChannel.data?.name?.replace("📚 ", "") || "Chat";
                                        onJoinChannel(selectedChannel.id, title);
                                    }
                                }}
                            />
                        </div>
                        <div className="public-channels-section">
                            {renderPublicChannelsList()}
                        </div>
                    </div>
                ) : (
                    <div className="active-channel-container">
                        {/* Barra de acciones del canal */}
                        <div className="channel-action-bar">
                            <button
                                className="channel-action-btn back"
                                onClick={handleCloseChannel}
                                title="Volver a la lista de canales"
                            >
                                ← Volver
                            </button>

                            <div className="channel-action-bar-title">
                                {channel.data?.book_title || channel.data?.name || "Chat"}
                            </div>

                            <div className="channel-action-buttons">
                                <button
                                    className="channel-action-btn menu"
                                    onClick={() => setShowChannelActions(!showChannelActions)}
                                    title="Opciones del canal"
                                >
                                    ⋮
                                </button>
                            </div>

                            {/* Menú desplegable */}
                            {showChannelActions && (
                                <div className="channel-actions-dropdown">
                                    <button
                                        className="dropdown-item leave"
                                        onClick={handleLeaveChannel}
                                        disabled={isLeavingChannel}
                                    >
                                        {isLeavingChannel ? "Saliendo..." : "🚪 Abandonar canal"}
                                    </button>

                                    {isChannelCreator(channel) && (
                                        <button
                                            className="dropdown-item delete"
                                            onClick={handleDeleteChannel}
                                            disabled={isDeletingChannel}
                                        >
                                            {isDeletingChannel ? "Eliminando..." : "🗑️ Eliminar canal"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <Channel channel={channel}>
                            {onChannelWatchers && <ChannelWatchersReporter onWatchers={onChannelWatchers} />}
                            <Window>
                                <ChannelHeader />
                                <MessageList />
                                <MessageInput />
                            </Window>
                            <Thread />
                        </Channel>
                    </div>
                )}
            </StreamChatComponent>
        </div>
    );
};

export default Chat;