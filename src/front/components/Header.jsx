import { useUser } from "./UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import PillNav from "./PillNav";

export const Header = () => {
    const { profileImg, userData } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    const saved = JSON.parse(localStorage.getItem("user_data") || "null");
    const username = userData?.username || saved?.username || saved?.email || "User";

    const safeAvatar =
        profileImg ||
        localStorage.getItem("userAvatar") ||
        "https://i.pravatar.cc/150?img=3";

    const items = [
        { href: "/home", label: "Home" },
        { href: "/events", label: "Events" },
        { href: "/aboutus", label: "About Us" },
    ];

    return (
        <header className="top-header">
            <div className="header-logo-section">
                <span className="brand-title">{username}</span>
            </div>

            <div className="header-right-side">
                <button
                    type="button"
                    className="ai-chat-icon-btn"
                    onClick={() => navigate("/ai-chat")}
                    aria-label="AI Chat"
                >
                    <img
                        className="ai-chat-icon-img"
                        src="/ai-chat-icon.png"
                        alt="AI Chat"
                    />
                </button>
                <PillNav
                    logo={safeAvatar}
                    logoAlt={username}
                    items={items}
                    activeHref={location.pathname}
                    baseColor="#231B59"
                    pillColor="#ffffff"
                    hoveredPillTextColor="#231B59"
                    onLogoClick={() => navigate("/profile")}
                />
            </div>
        </header>
    );
};
