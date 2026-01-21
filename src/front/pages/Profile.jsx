import React, { useState } from "react";
import "./Profile.css";
import { PencilIcon, BookOpenIcon, TagIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useUser } from "../components/UserContext";

export const Profile = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [foundBooks, setFoundBooks] = useState([]);
    const { profileImg, updateProfileImg, userData, updateProfile } = useUser()


    // const user = {
    //     name: "Lola",
    //     location: "Madrid, Spain",
    //     about:
    //         "The Reading Room is my sanctuary. I love fantasy novels, thrillers, and diving deep into character development.",
    //     favoriteGenres: ["Fantasy", "Sci-Fi", "Thriller"],
    //     currentlyReading: {
    //         title: "The Midnight Library",
    //         cover:
    //             "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1587664405i/51351119.jpg",
    //     },
    // };

    const handleSearch = async () => {
        if (!searchTerm) return;

        try {
            const response = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${searchTerm}&maxResults=4`
            );
            const data = await response.json();
            setFoundBooks(data.items || []);
        } catch (error) {
            console.error("Error buscando libros:", error);
        }
    };

    // FUNCIÓN PARA ABRIR CLOUDINARY
    const openCloudinaryWidget = () => {
        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName: "dcmqxfpnd",
                uploadPreset: "Bookiecloudinary",
                sources: ["local", "url", "camera"],
                multiple: false,
                cropping: true,
                croppingAspectRatio: 1,
                resourceType: "image"
            },
            (error, result) => {
                if (error) {
                    console.error("❌ Error:", error);
                }
                if (result && result.event === "success") {
                    console.log("✅ Imagen subida:", result.info.secure_url);
                    updateProfileImg(result.info.secure_url);
                }
            }
        );
        widget.open();
    };


    return (
        <div className="container-fluid py-4" style={{ backgroundColor: "#E5E4D7", minHeight: "100vh" }}>

            <div className="row g-4">
                {/* COLUMNA IZQUIERDA */}
                <div className="col-md-9">
                    {/* PERFIL */}
                    <section className="mb-4">
                        <div
                            className="card border-0 shadow-sm p-4 d-flex flex-row align-items-center"
                            style={{ borderRadius: "15px" }}
                        >
                            <img
                                src={profileImg}
                                alt="profile"
                                className="rounded-circle border"
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    objectFit: "cover",
                                    borderColor: "#11DA3E7",
                                }}
                            />

                            <div className="ms-4">
                                <h2 className="fw-bold mb-1" style={{ color: "#231B59" }}>
                                    {userData.username}
                                </h2>
                                <p className="text-muted mb-3">{userData.email}</p>

                                {/* BOTÓN PARA EDITAR FOTO */}
                                <button
                                    className="btn btn-wine rounded-pill px-4 btn-sm"
                                    onClick={openCloudinaryWidget}
                                >
                                    <PencilIcon style={{ width: "16px", marginRight: "5px" }} /> Edit Profile
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* ABOUT + BUSCADOR */}
                    <div className="row g-4">
                        <div className="col-md-7">
                            <div
                                className="card border-0 shadow-sm p-4 h-100"
                                style={{ borderRadius: "15px" }}
                            >
                                <h6 className="fw-bold mb-3">
                                    <TagIcon style={{ width: "20px" }} /> About Me
                                </h6>
                                <p className="small text-muted">about me</p>

                                {/* BUSCADOR API */}
                                <div
                                    className="card border-0 shadow-sm p-4"
                                    style={{
                                        borderRadius: "15px",
                                        border: "2px solid #5DA4D9",
                                    }}
                                >
                                    <h5 className="fw-bold mb-3" style={{ color: "#231B59" }}>
                                        <MagnifyingGlassIcon style={{ width: "20px" }} /> Search Real Books
                                    </h5>

                                    <div className="d-flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Search in Google Books..."
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <button
                                            className="btn btn-sm"
                                            style={{ backgroundColor: "#231B59", color: "white" }}
                                            onClick={handleSearch}
                                        >
                                            Search
                                        </button>
                                    </div>

                                    <div className="row g-2">
                                        {foundBooks.map((book) => (
                                            <div key={book.id} className="col-6 col-sm-3 text-center">
                                                <img
                                                    src={
                                                        book.volumeInfo.imageLinks?.thumbnail ||
                                                        "https://via.placeholder.com/128x192"
                                                    }
                                                    alt={book.volumeInfo.title}
                                                    style={{
                                                        width: "100%",
                                                        borderRadius: "5px",
                                                        height: "100px",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                                <p
                                                    style={{
                                                        fontSize: "10px",
                                                        overflow: "hidden",
                                                        height: "25px",
                                                    }}
                                                    className="mt-1 fw-bold"
                                                >
                                                    {book.volumeInfo.title}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="col-md-5">
                    <div
                        className="card border-0 shadow-sm p-4 h-100 text-center"
                        style={{ borderRadius: "15px" }}
                    >
                        <h5 className="fw-bold mb-4 text-start" style={{ color: "#231B59" }}>
                            <BookOpenIcon style={{ width: "22px" }} /> Currently Reading
                        </h5>

                        <img
                            src="http://unaimagencualquiera.com"
                            alt="Book"
                            className="shadow"
                            style={{ width: "130px", borderRadius: "8px", margin: "0 auto" }}
                        />
                        <p className="fw-bold mt-3" style={{ color: "#231B59" }}>
                            un libro increible
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};