import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/img/Logo.png";

export const Header = () => {
    return (
        <header className="top-header">
            <div className="header-logo-section">
                <img src={logo} alt="Logo" style={{ width: "40px" }} />
                <span className="brand-title">The Reading Room</span>
            </div>

            <div className="header-right-side">

                <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ fontSize: "1.3rem", cursor: "pointer" }}>🏠</span>
                </Link>

                <span style={{ fontSize: "1.3rem", cursor: "pointer" }}>🔔</span>

                <div className="user-profile-section">
                    <span className="user-name">Lola</span>
                    <div className="profile-circle">
                        <img
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
                            alt="User Profile"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};
