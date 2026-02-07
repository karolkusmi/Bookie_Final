import { useUser, DEFAULT_AVATAR_URL } from "./UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import PillNav from "./PillNav";
import LogoImg from "../assets/img/Logo.png";

export const Header = () => {
    const { profileImg, userData, clearUser } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    const username = userData?.username || userData?.email || "User";
    const safeAvatar = profileImg || userData?.image_avatar || DEFAULT_AVATAR_URL;

    const handleLogout = () => {
        clearUser();
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("stream_token");
        navigate("/login");
    };

    const items = [
        { href: "/home", label: "Home" },
        { href: "/events", label: "Events" },
        { href: "/aboutus", label: "About Us" },
    ];

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
                <PillNav
                    logo={safeAvatar}
                    logoAlt={username}
                    items={items}
                    activeHref={location.pathname}
                    baseColor="#231B59"
                    pillColor="#ffffff"
                    hoveredPillTextColor="#231B59"
                    onLogoClick={() => navigate("/profile")}
                    onLogout={handleLogout}
                />
            </div>
        </header>
    );
};
