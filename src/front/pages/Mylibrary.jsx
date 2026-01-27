import React from "react";
import PixelCard from "../components/PixelCard"; 
import useGlobalReducer from '../hooks/useGlobalReducer';

export const MyLibrary = () => {

    const { store, dispatch } = useGlobalReducer();

    const handleDelete = (index, book) => {
        dispatch({ type: 'delete_favorite', payload: index });
    };

    const currentReading = JSON.parse(localStorage.getItem("selected_book"));
    if (currentReading && currentReading.title === book.title) {
            localStorage.removeItem("selected_book");
        window.dispatchEvent(new Event ("local-storage-changed"));
    };

    return (
        <div className="container-fluid min-vh-100" style={{ backgroundColor: '#E5E4D7', padding: '40px' }}>
            <h1 className="text-center mb-5" style={{ color: '#231B59', fontWeight: 'bold' }}>Mi Biblioteca</h1>
            
            <div className="d-flex flex-wrap justify-content-center gap-4">
                {favoritos.length > 0 ? (
                    favoritos.map((book, index) => (

                    <div key={index} style={{ width: '280px' }}>
                        <PixelCard 
                            title={book.title} 
                            info={book.author} 
                            image={book.image || book.thumbnail} 
                        />
                    <button
                    className="btn w-100 mt-2 text-white"
                    style={{ backgroundColor: '#730202' }}
                    onClick={() => handleDelete(index, book)}
                    >
                     Eliminar de mi lista
                        </button>
                    </div>
                    ))
                ) : (
                    <p className="text-center">No tienes libros en tu biblioteca todavía.</p>
                )}
            </div>
        </div>
    );
};