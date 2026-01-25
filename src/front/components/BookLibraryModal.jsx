import React, { useMemo, useState } from "react";
import "./BookLibraryModal.css";

const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

export default function BookLibraryModal({ isOpen, onClose, onSelect, onAddToLibrary }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [searchTerm, setSearchTerm] = useState("");
  const [foundBooks, setFoundBooks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canAdd = useMemo(() => {
    const isbn = normalizeIsbn(selected?.isbn);
    return !!selected && !!isbn && !saving;
  }, [selected, saving]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const q = searchTerm.trim();
    if (!q) return;

    if (!backendUrl) {
      alert("Falta VITE_BACKEND_URL");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${backendUrl}/api/books/search?title=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error("Search failed");
      const data = await resp.json();
      setFoundBooks(data.items || []);
    } catch (e) {
      console.error(e);
      setFoundBooks([]);
      alert("No se pudo buscar libros.");
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (b) => {
    const mapped = {
      id: b.id,
      title: b.title,
      authors: Array.isArray(b.authors) ? b.authors : [],
      publisher: b.publisher || null,
      thumbnail: b.thumbnail || null,
      isbn: normalizeIsbn(b.isbn),
    };
    setSelected(mapped);
    onSelect?.(mapped);
  };

  const handleAdd = async () => {
    if (!canAdd) return;
    setSaving(true);
    try {
      await onAddToLibrary?.(selected);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="blm-backdrop" role="dialog" aria-modal="true">
      <div className="blm-modal">
        <div className="blm-header">
          <div className="blm-title">Book Library</div>
          <button type="button" className="blm-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="blm-body">
          <div className="blm-searchbar">
            <input
              className="blm-input"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? handleSearch() : null)}
            />
            <button className="blm-btn blm-btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="blm-grid">
            {foundBooks.map((b) => {
              const thumb = b.thumbnail || "https://via.placeholder.com/160x240";
              const isbn = normalizeIsbn(b.isbn);
              const isSelected = normalizeIsbn(selected?.isbn) === isbn;

              return (
                <button
                  type="button"
                  key={b.id || b.isbn || b.title}
                  className={`blm-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handlePick(b)}
                >
                  <div className="blm-cover">
                    <img src={thumb} alt={b.title} />
                  </div>
                  <div className="blm-meta">
                    <div className="blm-book-title" title={b.title}>
                      {b.title || "Untitled"}
                    </div>
                    <div className="blm-book-authors" title={(b.authors || []).join(", ")}>
                      {(b.authors || []).join(", ") || "Unknown author"}
                    </div>
                    <div className="blm-book-isbn" title={isbn || ""}>
                      {isbn ? `ISBN: ${isbn}` : "No ISBN"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="blm-footer">
          <div className="blm-selected">
            {selected?.title ? `Selected: ${selected.title}` : "Select a book to add it"}
          </div>
          <div className="blm-actions">
            <button className="blm-btn blm-btn-ghost" onClick={onClose}>
              Close
            </button>
            <button className="blm-btn blm-btn-wine" onClick={handleAdd} disabled={!canAdd}>
              {saving ? "Adding..." : "Add to library"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
