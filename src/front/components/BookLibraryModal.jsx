import React, { useEffect, useMemo, useState } from "react";
import "./BookLibraryModal.css";
import portadaLibro from "../assets/img/portada_Libro.png";

const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

export default function BookLibraryModal({
  isOpen,
  onClose,
  onSelect,
  selectedBook,
  mode = "library",
  onAddToLibrary,
}) {
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
  const [picked, setPicked] = useState(null);

  const [prologueText, setPrologueText] = useState(null);
  const [prologueLoading, setPrologueLoading] = useState(false);

  const effectiveSelected = useMemo(() => {
    if (mode === "prologue") return selectedBook || null;
    return picked || null;
  }, [mode, selectedBook, picked]);


  useEffect(() => {
    if (!isOpen) return;
    if (mode === "library") {
      setSearchTerm("");
      setFoundBooks([]);
      setPicked(null);
    }
    if (mode === "prologue") {
      setPrologueText(null);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode !== "prologue") return;

    const isbn = normalizeIsbn(selectedBook?.isbn);
    if (!isbn) {
      setPrologueText(null);
      return;
    }

    const fetchPrologue = async () => {
      setPrologueLoading(true);
      try {
        const base = (backendUrl || "").replace(/\/$/, "");
        const resp = await fetch(`${base}/api/books/by-isbn?isbn=${encodeURIComponent(isbn)}`);
        if (!resp.ok) throw new Error("google_books_failed");
        const data = await resp.json();
        setPrologueText(data.description ?? null);
      } catch (e) {
        setPrologueText(null);
      } finally {
        setPrologueLoading(false);
      }
    };

    fetchPrologue();
  }, [isOpen, mode, selectedBook]);

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
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429 || errorData.error === "rate_limit") {
          throw new Error("rate_limit");
        }
        throw new Error(errorData.message || "Search failed");
      }
      const data = await resp.json();
      setFoundBooks(data.items || []);
    } catch (e) {
      console.error(e);
      setFoundBooks([]);
      if (e.message === "rate_limit") {
        alert("Se ha excedido el límite de búsquedas. Intenta de nuevo en unos minutos.");
      } else {
        alert("No se pudo buscar libros. Verifica tu conexión e intenta de nuevo.");
      }
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
    setPicked(mapped);
    onSelect?.(mapped);
    onClose?.();
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

  if (mode === "prologue") {
    const title = effectiveSelected?.title || "Your Book !!";
    const cover = effectiveSelected?.thumbnail || portadaLibro;

    return (
      <div className="blm-backdrop" role="dialog" aria-modal="true">
        <div className="blm-modal blm-modal-prologue">
          <div className="blm-header">
            <div className="blm-title">Prologue</div>
            <button type="button" className="blm-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="blm-body">
            <div className="blm-prologue-top">
              <div className="blm-prologue-cover">
                <img
                  src={cover}
                  alt={title}
                  onError={(e) => {
                    e.currentTarget.src = portadaLibro;
                  }}
                />
              </div>

              <div className="blm-prologue-meta">
                <div className="blm-prologue-title" title={title}>
                  {title}
                </div>
                {!!effectiveSelected?.isbn && (
                  <div className="blm-prologue-isbn">ISBN: {effectiveSelected.isbn}</div>
                )}
              </div>
            </div>

            <div className="blm-prologue-box">
              <div className="blm-prologue-box-title">Prólogo</div>

              {prologueLoading ? (
                <div className="blm-prologue-text">Cargando prólogo...</div>
              ) : prologueText ? (
                <div
                  className="blm-prologue-text"
                  dangerouslySetInnerHTML={{ __html: prologueText }}
                />
              ) : (
                <div className="blm-prologue-text">Este libro no tiene prólogo disponible.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              const hasCover = !!b.thumbnail;
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
                    {hasCover ? (
                      <img
                        src={b.thumbnail}
                        alt={b.title}
                      />
                    ) : (
                      <div className="blm-no-cover">
                        <div className="blm-no-cover-title">
                          {b.title}
                        </div>
                        <div className="blm-no-cover-sub">
                          Libro sin portada
                        </div>
                      </div>
                    )}
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
