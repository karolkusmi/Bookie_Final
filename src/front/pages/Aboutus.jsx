import React, { useState } from "react";
import "./Aboutus.css";
//import PixelCard from "../components/PixelCard";//
import logoBookie from "../assets/img/Aboutus_img/logo_bookie.png";
import libroIzq from "../assets/img/Aboutus_img/libro_izq.png";
import libroDer from "../assets/img/Aboutus_img/libro_der.png";
import Ima_German from "../assets/img/Aboutus_img/Ima_German.png"
import Ima_Lore from "../assets/img/Aboutus_img/Ima_Lore.jpeg"
import Ima_Karol from "../assets/img/Aboutus_img/Ima_Karol.jpeg"

export const Aboutus = () => {
    const [selectedMember, setSelectedMember] = useState(null);

    const team = [
        { name: "KAROL", photo: Ima_Karol, link: "https://www.linkedin.com/in/karol-kusmierz-b620b1367/" },
        { name: "GERMAN", photo: Ima_German, link: "https://www.linkedin.com/in/german-garcia-solano-a00352268/" },
        { name: "LORENA", photo: Ima_Lore, link: "https://www.linkedin.com/in/lorenaacosta2019/" }
    ];

    return (
        <main className="wrapper_aboutus">

            <div className="aboutus_content">

                {/* LOGO */}
                <div className="logo-container">
                    <img
                        src={logoBookie}
                        alt="Logo Bookie"
                        className="imagen-animada"
                    />
                </div>


                <h1 className="text_aboutus_title">About Us Page</h1>



                < div className="main-info-container" >

                    <img
                        src={libroIzq}
                        alt="Libro izquierda"
                        className="book-img imagen-animada"
                    />

                    <div className="text-container">
                        <p>
                            <strong>Connecting hearts through shared stories.</strong><br />
                            Bookie is where lovers find their perfect match. Swipe through,
                            discover users based on your favorite books and genres,
                            and start meaningful conversations that go beyond the cover.
                            Find your <strong>next chapter with Bookie!</strong>
                        </p>
                    </div>


                    <img
                        src={libroDer}
                        alt="Libro derecha"
                        className="book-img imagen-animada retraso"
                    />

                </div>


                <div className="team-container">
                    {team.map((member, index) => (
                        <div
                            key={index}
                            className="member-box shadow-sm"
                            onClick={() => setSelectedMember(member)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="member-avatar">👤</div>
                            <div className="blur-text-wrapper">
                                <p className="member-name fw-bold m-0">{member.name}</p>
                            </div>
                            <span className="small text-muted">Developer</span>
                        </div>
                    ))}
                </div>


                {selectedMember && (
                    <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="close-button" onClick={() => setSelectedMember(null)}>×</button>
                            <img src={selectedMember.photo} alt={selectedMember.name} className="modal-img" />
                            <h2 style={{ color: '#231B59' }}>{selectedMember.name}</h2>
                            <p className="text-muted">Full Stack Developer</p>
                            <a href={selectedMember.link} target="_blank" rel="noreferrer" className="modal-link">
                                Ver Perfil de Linkedin
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};