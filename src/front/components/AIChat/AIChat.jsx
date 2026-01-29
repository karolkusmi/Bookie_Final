import { useState, useRef, useEffect } from "react";
import "./AIChat.css";

const AIChat = () => {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "¡Hola! Soy tu asistente de recomendaciones de libros. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre libros, géneros, autores, o simplemente decirme qué tipo de lectura buscas. También puedes usar el botón 'Sorpréndeme' para recibir una recomendación aleatoria."
        }
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSurprising, setIsSurprising] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const API_BASE = `${backendUrl}api`;

    // Auto-scroll al final de los mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Obtener token de autenticación
    const getAuthToken = () => {
        return localStorage.getItem("access_token");
    };

    // Enviar mensaje al chat con IA
    const sendMessage = async (messageText) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage = {
            role: "user",
            content: messageText
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("No estás autenticado. Por favor, inicia sesión.");
            }

            // Construir historial de conversación (últimos 10 mensajes)
            const conversationHistory = messages
                .slice(-10)
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

            const response = await fetch(`${API_BASE}/ai-chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: messageText,
                    history: conversationHistory
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al comunicarse con la IA");
            }

            // Stream con buffer: procesar solo líneas completas para chunks fragmentados
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            setMessages(prev => [...prev, { role: "assistant", content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? ""; // guardar línea incompleta

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            setMessages(prev => {
                                const next = [...prev];
                                const last = next[next.length - 1];
                                next[next.length - 1] = {
                                    ...last,
                                    content: last.content + parsed.content
                                };
                                return next;
                            });
                        }
                    } catch (_) {
                        // ignorar líneas no JSON
                    }
                }
            }
            // Procesar resto del buffer si quedó algo
            if (buffer.trim().startsWith("data: ")) {
                const data = buffer.slice(6).trim();
                if (data !== "[DONE]") {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            setMessages(prev => {
                                const next = [...prev];
                                const last = next[next.length - 1];
                                next[next.length - 1] = { ...last, content: last.content + parsed.content };
                                return next;
                            });
                        }
                    } catch (_) {}
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Lo siento, ocurrió un error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Manejar envío de mensaje
    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputMessage.trim()) {
            sendMessage(inputMessage);
        }
    };

    // Función "Sorpréndeme" - obtener libro aleatorio
    const handleSurpriseMe = async () => {
        setIsSurprising(true);
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("No estás autenticado. Por favor, inicia sesión.");
            }

            const response = await fetch(`${API_BASE}/ai-chat/random-book`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al obtener libro aleatorio");
            }

            const book = await response.json();
            
            // Formatear información del libro
            const authors = book.authors ? book.authors.join(", ") : "Autor desconocido";
            const description = book.description 
                ? (book.description.length > 300 
                    ? book.description.substring(0, 300) + "..." 
                    : book.description)
                : "Sin descripción disponible";
            
            const bookInfo = `📚 **${book.title}**\n\n` +
                `👤 Autor(es): ${authors}\n\n` +
                (book.publishedDate ? `📅 Publicado: ${book.publishedDate}\n\n` : "") +
                (book.categories && book.categories.length > 0 
                    ? `🏷️ Géneros: ${book.categories.join(", ")}\n\n` 
                    : "") +
                (book.pageCount ? `📖 Páginas: ${book.pageCount}\n\n` : "") +
                `📝 Descripción: ${description}`;

            // Enviar como mensaje del asistente
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `¡Aquí tienes una recomendación sorpresa! 🎉\n\n${bookInfo}`
            }]);

        } catch (error) {
            console.error("Error getting random book:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Lo siento, no pude obtener un libro aleatorio: ${error.message}`
            }]);
        } finally {
            setIsSurprising(false);
        }
    };

    return (
        <div className="ai-chat-container">
            <div className="ai-chat-header">
                <h2>💬 Chat con Asistente de Libros</h2>
                <p>Pregúntame sobre libros y te ayudaré a encontrar tu próxima lectura</p>
            </div>

            <div className="ai-chat-messages">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`ai-chat-message ${msg.role === "user" ? "user-message" : "assistant-message"}`}
                    >
                        <div className="message-avatar">
                            {msg.role === "user" ? "👤" : "🤖"}
                        </div>
                        <div className="message-content">
                            {msg.role === "assistant" && msg.content.includes("---") ? (
                                <>
                                    <div className="message-synopsis">
                                        {msg.content.split("---")[0].trim().split("\n").map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                    <div className="message-info">
                                        {msg.content.split("---").slice(1).join("---").trim().split("\n").filter(Boolean).map((line, i) => (
                                            <p key={i}>{line.trim()}</p>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                msg.content.split("\n").map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="ai-chat-message assistant-message">
                        <div className="message-avatar">🤖</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-chat-actions">
                <button
                    className="surprise-me-btn"
                    onClick={handleSurpriseMe}
                    disabled={isSurprising || isLoading}
                >
                    {isSurprising ? "Buscando..." : "🎲 Sorpréndeme"}
                </button>
            </div>

            <form className="ai-chat-input-form" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    disabled={isLoading}
                    className="ai-chat-input"
                />
                <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="ai-chat-send-btn"
                >
                    {isLoading ? "..." : "➤"}
                </button>
            </form>
        </div>
    );
};

export default AIChat;
