import React from 'react';
import './home.css';
import portadaLibro from "../assets/img/portada_Libro.png";

export const Home = () => {
    return (
        <div className="container-fluid py-4" style={{ backgroundColor: 'var(--book-bg)', minHeight: '100vh' }}>
            <div className="row g-4">

                {/* COLUMNA IZQUIERDA */}
                <div className="col-12 col-xl-5">
                    <section className="mb-5">
                        <h5 className="fw-bold mb-4">READING NOW</h5>
                        <div className="d-flex gap-3 flex-wrap">

                            {/* Tarjeta Libro */}
                            <div className="card border-0 shadow-sm p-3 text-center" style={{ borderRadius: 'var(--card-radius)', width: '180px' }}>
                                <div className="book-card-img shadow-sm">
                                    <img src={portadaLibro} alt="Book cover" className="w-100 h-100 object-fit-cover" />
                                </div>
                                <span className="fw-bold small">Your Book</span>
                            </div>

                            {/* Tarjeta Social */}
                            <div className="card border-0 shadow-sm p-4 flex-grow-1" style={{ borderRadius: 'var(--card-radius)' }}>
                                <h6 className="fw-bold">Like-minded readers</h6>
                                <div className="d-flex my-2">
                                    <div className="bg-secondary rounded-circle border border-white" style={{ width: '30px', height: '30px' }}></div>
                                    <div className="bg-secondary rounded-circle border border-white" style={{ width: '30px', height: '30px', marginLeft: '-10px' }}></div>
                                </div>
                                <p className="small text-muted">"Aure and 12 others are here."</p>
                                <button className="btn btn-wine w-100 py-2 mt-auto rounded-3">View More</button>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h5 className="fw-bold mb-4">ACTIVITY FEED</h5>
                        <div className="d-flex gap-3">
                            <div className="card border-0 p-4 text-center shadow-sm flex-grow-1 bg-lavender-card" style={{ borderRadius: 'var(--card-radius)' }}>
                                <span className="fs-1">📅</span>
                                <h6 className="fw-bold mt-2 mb-1">Explore Events</h6>
                                <p className="small text-muted mb-0">Clubs & Meetups</p>
                            </div>

                            <div className="card border-0 p-3 shadow-sm flex-grow-1 bg-white" style={{ borderRadius: 'var(--card-radius)' }}>
                                <div className="card-body p-1 d-flex flex-column h-100 text-start">
                                    <p className="small fw-medium mb-2">“ Aure and 12 others are talking about this chapter... ”</p>
                                    <div className="text-end text-muted opacity-25 fs-4 mt-n2">”</div>
                                    <div className="d-flex justify-content-between mt-auto pt-2 border-top small text-muted">
                                        <span>❤️ 64k</span>
                                        <span>💬 Comment</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="col-12 col-xl-7 border-start-xl">
                    <div className="d-flex justify-content-center mb-5">
                        <button className="btn btn-outline-wine rounded-pill px-5 fw-bold">
                            Create Your Event
                        </button>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-bold">Upcoming Events</h4>
                        <div className="p-2 rounded-3 btn-wine">📅</div>
                    </div>

                    <div className="row g-3">
                        {[1, 2, 3, 4, 5, 6].map((ev) => (
                            <div className="col-md-6" key={ev}>
                                <div className="card border-0 shadow-sm p-3 d-flex flex-row align-items-center" style={{ borderRadius: '15px' }}>
                                    <div className="rounded-circle p-3 me-3" style={{ backgroundColor: 'var(--book-lavender)' }}>📖</div>
                                    <div className="flex-grow-1 text-start">
                                        <h6 className="fw-bold mb-0 small">Classic Novel Club</h6>
                                        <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>May 25 • 6:00 PM</p>
                                    </div>
                                    <button className="btn btn-wine btn-sm rounded-pill px-3">View More</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};