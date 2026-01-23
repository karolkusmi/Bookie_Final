import React from "react";
import PixelCard from "../components/PixelCard"; 

export const MyLibrary = () => {
    

    const misLibros = [
        { id: 1, title: "El Alquimista", author: "Paulo Coelho", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300" },
        { id: 2, title: "Orgullo y Prejuicio", author: "Jane Austen", image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300" }
    ];

    return (
        <div className="container-fluid min-vh-100" style={{ backgroundColor: '#E5E4D7', padding: '40px' }}>
            <h1 className="text-center mb-5" style={{ color: '#231B59', fontWeight: 'bold' }}>Mi Biblioteca</h1>
            
            <div className="d-flex flex-wrap justify-content-center gap-4">
                {misLibros.map(book => (
                    <div key={book.id} style={{ width: '280px' }}>
                        <PixelCard 
                            title={book.title} 
                            info={book.author} 
                            image={book.image} 
                        />
                        <button className="btn w-100 mt-2 text-white" style={{ backgroundColor: '#730202' }}>
                            Eliminar de mi lista
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};