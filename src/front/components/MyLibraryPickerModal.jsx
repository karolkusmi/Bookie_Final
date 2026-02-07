import React,{useMemo, useState} from "react";

const normalize = (s) => (s || "").toString().toLowerCase().trim();
const normalizeIsbn = (isbn) => (isbn || "").replace(/-/g, "").replace(/\s/g, "").toUpperCase();

export default function MyLibraryPickerModal({ isOpen, onClose, books, onSelect, excludeIsbns = [] }) {
  const [q, setQ] = useState("");

  const excludeSet = useMemo(() => {
    return new Set((excludeIsbns || []).map(normalizeIsbn).filter(Boolean));
  }, [excludeIsbns]);

  const filtered = useMemo(() => {
    const list = (books || []).filter((b) => !excludeSet.has(normalizeIsbn(b.isbn)));
    const term = normalize(q);
    if (!term) return list;
    return list.filter((b) => {
      const title = normalize(b.title);
      const authors =
        Array.isArray(b.authors)
          ? b.authors.join(" ")
          : normalize(b.author) || normalize((b.authors || []).join(" "));
      const isbn = normalize(b.isbn);
      return title.includes(term) || authors.includes(term) || isbn.includes(term);
    });
  }, [books, q, excludeSet]);

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white shadow"
        style={{
          width: "min(900px, 92vw)",
          maxHeight: "80vh",
          borderRadius: 18,
          margin: "8vh auto 0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 d-flex align-items-center justify-content-between border-bottom">
          <div className="fw-bold" style={{ color: "#231B59" }}>
            Pick a book from My Library
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-3 border-bottom">
          <input
            className="form-control"
            placeholder="Search by title, author or ISBN..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ borderRadius: 12 }}
          />
        </div>

        <div className="p-3" style={{ overflowY: "auto", maxHeight: "60vh" }}>
          {filtered.length === 0 ? (
            <div className="text-muted">No books found in your library.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {filtered.map((b) => {
                const authors =
                  Array.isArray(b.authors) ? b.authors : (b.author ? b.author.split(";") : []);
                return (
                  <button
                    key={b.isbn || `${b.title}-${Math.random()}`}
                    className="btn text-start w-100"
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 14,
                      padding: 12,
                    }}
                    onClick={() => onSelect(b)}
                  >
                    <div className="d-flex gap-3 align-items-start">
                      <img
                        src={b.thumbnail || "https://via.placeholder.com/60x90"}
                        alt={b.title}
                        style={{ width: 55, height: 75, objectFit: "cover", borderRadius: 10 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-bold" style={{ color: "#231B59" }}>
                          {b.title}
                        </div>
                        <div className="text-muted" style={{ fontSize: 13 }}>
                          {authors.join(", ") || "Autor desconocido"}
                        </div>
                        {b.isbn && (
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            ISBN: {b.isbn}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}