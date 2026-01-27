import { useUser } from "./UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import PillNav from "./PillNav";
import LogoImg from "../assets/img/Logo.png";

export const Header = () => {
    const { profileImg, userData } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

<<<<<<< HEAD
    const savedUser = localStorage.getItem("user_data");
    const userData = savedUser ? JSON.parse(savedUser) : null;
    const username = userData?.username || "Guest";
=======
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
>>>>>>> 9681cacd3d99a11349e92fef0e5fce4f02b3be29

    return (
        <header className="top-header">
            <div className="header-logo-section">
                <img 
                    src={LogoImg} 
                    alt="Bookie Logo" 
                    className="header-user-logo"
                />
                <span className="brand-title">{username}</span>
            </div>

            <div className="header-right-side">
                <button
                    type="button"
                    className="ai-chat-btn"
                    onClick={() => navigate("/ai-chat")}
                >
                    AI Chat
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
