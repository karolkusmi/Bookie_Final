import React from "react";
import AIChat from "../components/AIChat/AIChat";
import "./AIChatPage.css";

export const AIChatPage = () => {
    return (
        <div className="ai-chat-page">
            <div className="ai-chat-page-container">
                <AIChat />
            </div>
        </div>
    );
};
