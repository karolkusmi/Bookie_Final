import { useState } from "react";
import Message from "./Message.jsx";
import "./chat.css";

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("")

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() !== "") {
            setMessages(prev => [...prev, { text: input, sender: "user" }]);
            setInput("");
        }

        return (
            <div className="chat-container">
                <div className="messages">
                    {messages.map((msg, index) => (
                        <Message 
                        key={index} 
                        text={msg.text}
                        sender={msg.sender} />
                    ))}
                </div>
                <form className="input-form" onSubmit={sendMessage}>
                    <input
                        type="text"
                        placeholder="Chat Hear"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        );
    }
};
export default Chat;
