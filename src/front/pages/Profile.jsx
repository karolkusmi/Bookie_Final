import React from "react";
import "./Profile.css";
import { Navbar } from "../components/Navbar.jsx";
import { PencilIcon, BookOpenIcon, TagIcon } from '@heroicons/react/24/outline';


export const Profile = () => {

    const user = {
        name: "Lola",
        location: "Madrid, Spain",
        profilePic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
        about: "The Reading Room is my sanctuary. I love fantasy novels, thrillers, and diving deep into character development.",
        favoriteGenres: ["Fantasy", "Sci-Fi", "Thriller"],
        // IMPORTANTE: Asegúrate de que esto sea un objeto directo {}
        currentlyReading: {
            title: "The Midnight Library",
            cover: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1587664405i/51351119.jpg"
        }
    };



    return (
        <div className="profile-main-container" style={{ backgroundColor: '#E5E4D7', minHeight: '100vh', display: 'flex' }}>


            <div className="profile-content-scroll" style={{ flexGrow: 1, padding: '40px' }}>


                <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '15px', backgroundColor: 'white' }}>
                    <div className="d-flex align-items-center text-start">
                        <img src={user.profilePic} alt="Lola" className="rounded-circle" style={{ width: '120px', height: '120px', objectFit: 'cover', border: '4px solid #11DA3E7' }} />
                        <div className="ms-4">
                            <h1 className="fw-bold mb-1" style={{ color: '#231B59' }}>{user.name}</h1>
                            <p className="text-muted mb-3">{user.location}</p>
                            <button className="btn-wine rounded-pill px-4 py-2" style={{ backgroundColor: '#730202', color: 'white', border: 'none', fontWeight: 'bold' }}>
                                <PencilIcon style={{ width: '18px', marginRight: '8px' }} /> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>

                <div className="row g-4 text-start">


                    <div className="col-md-7">
                        <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '15px', backgroundColor: 'white' }}>
                            <h5 className="fw-bold mb-3" style={{ color: '#231B59' }}>
                                <TagIcon style={{ width: '22px', marginRight: '10px' }} /> About Me
                            </h5>
                            <p className="text-muted">{user.about}</p>
                            <div className="mt-4">
                                <h6 className="fw-bold small mb-2">Favorite Genres</h6>
                                <div className="d-flex gap-2 flex-wrap">
                                    {user.favoriteGenres.map(g => (
                                        <span key={g} className="badge rounded-pill p-2 px-3" style={{ backgroundColor: '#11DA3E7', color: '#231B59' }}>{g}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="col-md-5">
                        <div className="card border-0 shadow-sm p-4 h-100 text-center" style={{ borderRadius: '15px', backgroundColor: 'white' }}>
                            <h5 className="fw-bold mb-4 text-start" style={{ color: '#231B59' }}>
                                <BookOpenIcon style={{ width: '22px', marginRight: '10px' }} /> Currently Reading
                            </h5>
                            <img src={user.currentlyReading.cover} alt="Book" className="shadow" style={{ width: '140px', borderRadius: '8px', margin: '0 auto' }} />
                            <p className="fw-bold mt-3 mb-0" style={{ color: '#231B59' }}>{user.currentlyReading.title}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
