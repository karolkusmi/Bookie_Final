import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/img/Logo.png";
import { HomeIcon, BellIcon } from '@heroicons/react/24/outline';

export const Header = () => {

    const userData = localStorage.getItem("user_data");
    const { username } = JSON.parse(userData);
    return (
        <header className="top-header">
            <div className="header-logo-section">
                <img src={logo} alt="Logo" style={{ width: "40px" }} />
                <span className="brand-title">The Reading Room</span>
            </div>

            <div className="header-right-side">

                <Link to="/home" className="header-icon-link">
                    <HomeIcon className="header-icon-svg" />
                </Link>

                <button className="header-icon-btn">
                    <BellIcon className="header-icon-svg" />
                </button>

                <div className="user-profile-section">
                    <span className="user-name">{username || "User"}</span>
                    <div className="profile-circle">
                        {/*
                            Avatar tipo círculo con letra y color random
                        */}
                        <div
                            style={{
                                backgroundColor: `hsl(${Math.floor(
                                    (username?.charCodeAt(0) || 65) * 16 % 360
                                )}, 70%, 55%)`,
                                color: "#fff",
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: 20,
                                userSelect: "none",
                                textTransform: "uppercase"
                            }}
                        >
                            {username?.[0] || "U"}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};