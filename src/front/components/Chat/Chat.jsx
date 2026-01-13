import { useState } from "react";
import Message from "./Message.jsx";
import "./Chat.css";

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() !== "") {

            const userMessage = { text: input, sender: "user" };
            setMessages(prev => [...prev, userMessage]);


            const mensajeUsuario = input.toLowerCase();
            setInput("");


            setTimeout(() => {
                let respuestaBot = "";


                if (mensajeUsuario.includes("hola")) {
                    respuestaBot = "¡Hola! ¿Cómo va todo?";
                } else if (mensajeUsuario.includes("clima")) {
                    respuestaBot = "No sé el clima, pero aquí dentro de la PC siempre hace calor.";
                } else if (mensajeUsuario.includes("quien eres") || mensajeUsuario.includes("quién eres")) {
                    respuestaBot = "Soy un bot de prueba programado en React.";
                } else if (mensajeUsuario.includes("chau") || mensajeUsuario.includes("adiós")) {
                    respuestaBot = "¡Nos vemos! Cuídate.";
                } else {
                    respuestaBot = "Qué interesante... cuéntame más sobre eso.";
                }

                const botResponse = {
                    text: respuestaBot,
                    sender: "bot"
                };

                setMessages(prev => [...prev, botResponse]);
            }, 1000);
        }
    };
    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`message ${msg.sender}`}
                    >
                        {msg.text}
                    </div>
                ))}
            </div>

            <form className="chat-input" onSubmit={sendMessage}>
                <input
                    type="text"
                    placeholder="Chat Here"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default Chat;
