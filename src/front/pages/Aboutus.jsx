import React from "react";
import "./Aboutus.css";
//import PixelCard from "../components/PixelCard";//
import logoBookie from "../assets/img/Aboutus_img/logo_bookie.png";
import libroIzq from "../assets/img/Aboutus_img/libro_izq.png";
import libroDer from "../assets/img/Aboutus_img/libro_der.png";

export const Aboutus = () => {

    const team = ["KAROL", "GERMAN", "LORENA"];

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

                {/* TÍTULO */}
                <h1 className="text_aboutus_title">About Us Page</h1>


                {/* CONTENIDO */}
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
                    {team.map((name, index) => (
                        <div key={index} className="member-box shadow-sm">
                            <div className="member-avatar">👤</div>

                            <div className="blur-text-wrapper">
                                <p className="member-name fw-bold m-0">{name}</p>
                            </div>
                            <span className="small text-muted">Developer</span>
                        </div>

                    ))}
                </div>
            </div>

        </main >
    );
};
