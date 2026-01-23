import React from "react";
import { NavLink } from "react-router-dom";
import { HomeIcon, CalendarIcon, UsersIcon, UserCircleIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { useUser } from "./UserContext";

export const Navbar = () => {
	const { profileImg, userData } = useUser();

	return (
		<nav className="app-sidebar">
			{/* Foto de perfil y nombre en el navbar */}
			<div className="sidebar-profile" style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
				<img
					src={profileImg}
					alt="Profile"
					className="rounded-circle"
					style={{
						width: '60px',
						height: '60px',
						objectFit: 'cover',
						border: '2px solid #730202',
						marginBottom: '10px'
					}}
				/>
				<p style={{
					margin: 0,
					fontWeight: 'bold',
					color: '#231B59',
					fontSize: '14px'
				}}>
					{userData?.username || userData?.email || "Usuario"}
				</p>
			</div>

			<ul className="sidebar-menu">
				<li className="sidebar-item">
					<NavLink to="/home" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
						<HomeIcon className="nav-icon-hero" />
						<span>Home</span>
					</NavLink>
				</li>
				<li className="sidebar-item">
					<NavLink to="/events" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
						<CalendarIcon className="nav-icon-hero" />
						<span>Events</span>
					</NavLink>
				</li>
				<li className="sidebar-item">
					<NavLink to="/chat" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
						<UsersIcon className="nav-icon-hero" />
						<span>Chat</span>
					</NavLink>
				</li>
				<li className="sidebar-item">
					<NavLink to="/profile" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
						<UserCircleIcon className="nav-icon-hero" />
						<span>Profile</span>
					</NavLink>
				</li>
				<li className="sidebar-item">
					<NavLink to="/aboutus" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
						<IdentificationIcon className="nav-icon-hero" />
						<span>Aboutus</span>
					</NavLink>
				</li>
			</ul>
		</nav>
	);
};