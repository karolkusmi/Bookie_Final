import React, { useEffect, useState } from "react";
import PixelCard from "../components/PixelCard";
import portadaLibro from "../assets/img/portada_Libro.png";

const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

export const MyLibrary = () => {
  const API_BASE = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3001";
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingIsbn, setDeletingIsbn] = useState(null);

  const getUserId = () => {
    const saved = JSON.parse(localStorage.getItem("user_data") || "null");
    return saved?.id || null;
  };

  const getAuthors = (book) => {
    if (!book) return "";
    if (Array.isArray(book.authors)) return book.authors.join(", ");
    if (book.author) return book.author;
    return "";
  };

  const fetchLibrary = async () => {
    const userId = getUserId();
    if (!userId) {
      setLibraryBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/library/${userId}/books`);
      if (!resp.ok) throw new Error("Error al cargar biblioteca");
      const data = await resp.json();
      setLibraryBooks(Array.isArray(data) ? data : []);
    } catch {
      setLibraryBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (book) => {
    const userId = getUserId();
    if (!userId || !book?.isbn) return;
    const clean = normalizeIsbn(book.isbn);
    setDeletingIsbn(clean);
    try {
      const resp = await fetch(`${API_BASE}/api/library/${userId}/books/${clean}`, { method: "DELETE" });
      if (!resp.ok) throw new Error();
      const saved = JSON.parse(localStorage.getItem("selected_book") || "null");
      if (saved && normalizeIsbn(saved.isbn) === clean) {
        localStorage.removeItem("selected_book");
        window.dispatchEvent(new Event("local-storage-changed"));
      }
      setLibraryBooks((prev) => prev.filter((b) => normalizeIsbn(b.isbn) !== clean));
    } catch {
      console.error("Error al eliminar");
    } finally {
      setDeletingIsbn(null);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  return (
    <div className="container-fluid min-vh-100" style={{ backgroundColor: "#E5E4D7", padding: "40px" }}>
      <h1 className="text-center mb-5" style={{ color: "#231B59", fontWeight: "bold" }}>
        Mi Biblioteca
      </h1>

      <div className="d-flex flex-wrap justify-content-center gap-4">
        {loading ? (
          <div className="text-center mt-5">
            <p>Cargando tu biblioteca...</p>
          </div>
        ) : libraryBooks.length > 0 ? (
          libraryBooks.map((book, index) => (
            <div key={book.isbn || index} style={{ width: "280px" }}>
              <PixelCard
                title={book.title}
                info={getAuthors(book)}
                image={book.thumbnail || book.image || portadaLibro}
              />
              <button
                className="btn w-100 mt-2 text-white"
                style={{ backgroundColor: "#730202" }}
                onClick={() => handleDelete(book)}
                disabled={deletingIsbn === normalizeIsbn(book.isbn)}
              >
                {deletingIsbn === normalizeIsbn(book.isbn) ? "Eliminando..." : "Eliminar de mi lista"}
              </button>
            </div>
          ))
        ) : (
          <div className="text-center mt-5">
            <h3 style={{ color: "#231B59", opacity: 0.7 }}>Tu biblioteca está vacía</h3>
            <p>Busca libros en el Home y usa &quot;Add to library&quot; para añadirlos aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
};
