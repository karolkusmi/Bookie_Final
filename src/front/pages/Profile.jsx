import React, { useEffect, useMemo, useState } from "react";
import "./Profile.css";
import { PencilIcon, BookOpenIcon, TagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useUser } from "../components/UserContext";

export const Profile = () => {
  const { profileImg, updateProfileImg, userData } = useUser();

  const API_BASE = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", []);

  const [libraryBooks, setLibraryBooks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [deletingIsbn, setDeletingIsbn] = useState(null);
  const [readingNow, setReadingNow] = useState(null);

  const [aboutText, setAboutText] = useState("");
  const [top3, setTop3] = useState([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [foundBooks, setFoundBooks] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

  const getUserId = () => {
    const fromCtx = userData?.id;
    if (fromCtx) return fromCtx;
    const saved = JSON.parse(localStorage.getItem("user_data") || "null");
    return saved?.id || null;
  };

  const getPrefsKey = () => {
    const uid = getUserId();
    return uid ? `profile_prefs_${uid}` : null;
  };

  const loadPrefs = () => {
    const key = getPrefsKey();
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  const savePrefs = (next) => {
    const key = getPrefsKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const loadReadingNow = () => {
    try {
      const raw = localStorage.getItem("selected_book");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed) return null;
      return {
        title: parsed.title,
        thumbnail: parsed.thumbnail,
        isbn: normalizeIsbn(parsed.isbn),
        authors: parsed.authors || [],
      };
    } catch {
      return null;
    }
  };

  const fetchLibrary = async () => {
    const userId = getUserId();
    if (!userId) return;

    setLoadingLibrary(true);
    try {
      const resp = await fetch(`${API_BASE}/api/library/${userId}/books`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.msg || err?.message || "Error fetching library");
      }
      const data = await resp.json();
      setLibraryBooks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando biblioteca:", e);
      setLibraryBooks([]);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const removeFromLibrary = async (isbn) => {
    const userId = getUserId();
    if (!userId) return;

    const clean = normalizeIsbn(isbn);
    setDeletingIsbn(clean);

    try {
      const resp = await fetch(`${API_BASE}/api/library/${userId}/books/${clean}`, { method: "DELETE" });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.msg || err?.message || "Error deleting book");
      }
      setLibraryBooks((prev) => prev.filter((b) => normalizeIsbn(b.isbn) !== clean));
      if (normalizeIsbn(readingNow?.isbn) === clean) setReadingNow(null);
    } catch (e) {
      console.error("Error borrando libro:", e);
      alert("No se pudo borrar el libro.");
    } finally {
      setDeletingIsbn(null);
    }
  };

  const searchBooks = async () => {
    const q = searchTerm.trim();
    if (!q) return;

    setLoadingSearch(true);
    try {
      const resp = await fetch(`${API_BASE}/api/books/search?title=${encodeURIComponent(q)}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.message || "Search failed");
      }
      const data = await resp.json();
      setFoundBooks(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setFoundBooks([]);
      alert("No se pudo buscar libros.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const pickTop3Book = (item) => {
    if (activeSlot === null) return;

    const mapped = {
      id: item.id,
      title: item.title,
      authors: Array.isArray(item.authors) ? item.authors : [],
      publisher: item.publisher || null,
      thumbnail: item.thumbnail || null,
      isbn: normalizeIsbn(item.isbn),
    };

    setTop3((prev) => {
      const next = [...prev];
      next[activeSlot] = mapped;
      savePrefs({ aboutText, top3: next });
      return next;
    });

    setSearchTerm("");
    setFoundBooks([]);
    setActiveSlot(null);
  };

  const clearTop3Slot = (idx) => {
    setTop3((prev) => {
      const next = [...prev];
      next[idx] = null;
      savePrefs({ aboutText, top3: next });
      return next;
    });
  };

  const onChangeAbout = (val) => {
    setAboutText(val);
    savePrefs({ aboutText: val, top3 });
  };

  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;

    setReadingNow(loadReadingNow());
    fetchLibrary();

    const prefs = loadPrefs();
    if (prefs?.aboutText !== undefined) setAboutText(prefs.aboutText);
    if (Array.isArray(prefs?.top3)) {
      setTop3([prefs.top3[0] || null, prefs.top3[1] || null, prefs.top3[2] || null]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id]);

  const current = readingNow || libraryBooks?.[0] || null;

  const user = {
    name:
      userData?.username ||
      userData?.email ||
      JSON.parse(localStorage.getItem("user_data") || "null")?.email ||
      "Usuario",
    location: "Madrid, Spain",
    favoriteGenres: ["Fantasy", "Sci-Fi", "Thriller"],
  };

  const openCloudinaryWidget = () => {
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: "dcmqxfpnd",
        uploadPreset: "Bookiecloudinary",
        sources: ["local", "url", "camera"],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 1,
        resourceType: "image",
      },
      (error, result) => {
        if (error) console.error("❌ Error:", error);
        if (result && result.event === "success") updateProfileImg(result.info.secure_url);
      }
    );
    widget.open();
  };

  const TopCard = ({ idx }) => {
    const b = top3[idx];
    return (
      <div className="card border-0 shadow-sm p-3" style={{ borderRadius: 14, backgroundColor: "white" }}>
        <div className="d-flex gap-3 align-items-start">
          <img
            src={b?.thumbnail || "https://via.placeholder.com/80x110"}
            alt={b?.title || `Top ${idx + 1}`}
            style={{ width: 70, height: 95, objectFit: "cover", borderRadius: 10 }}
          />
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-bold" style={{ color: "#231B59" }}>
              Top {idx + 1}
            </div>
            <div
              className="fw-bold"
              style={{
                fontSize: 13,
                color: "#231B59",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={b?.title || ""}
            >
              {b?.title || "Pick a book"}
            </div>
            <div
              className="text-muted"
              style={{
                fontSize: 12,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={(b?.authors || []).join(", ")}
            >
              {(b?.authors || []).join(", ")}
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <button
              className="btn btn-sm"
              style={{ backgroundColor: "#231B59", color: "white" }}
              onClick={() => setActiveSlot(idx)}
            >
              {b ? "Change" : "Add"}
            </button>
            {b && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => clearTop3Slot(idx)}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="profile-main-container" style={{ backgroundColor: "#E5E4D7", minHeight: "100vh", display: "flex" }}>
      <div className="profile-content-scroll" style={{ flexGrow: 1, padding: "40px" }}>
        <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: "15px", backgroundColor: "white" }}>
          <div className="d-flex align-items-center text-start">
            <img
              src={profileImg}
              alt={user.name}
              className="rounded-circle"
              style={{ width: "120px", height: "120px", objectFit: "cover", border: "4px solid #11DA3E7" }}
            />
            <div className="ms-4">
              <h1 className="fw-bold mb-1" style={{ color: "#231B59" }}>
                {user.name}
              </h1>
              <p className="text-muted mb-3">{user.location}</p>
              <button
                className="btn-wine rounded-pill px-4 py-2"
                style={{ backgroundColor: "#730202", color: "white", border: "none", fontWeight: "bold" }}
                onClick={openCloudinaryWidget}
              >
                <PencilIcon style={{ width: "18px", marginRight: "8px" }} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="row g-4 text-start">
          <div className="col-md-7">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: "15px", backgroundColor: "white" }}>
              <h5 className="fw-bold mb-3" style={{ color: "#231B59" }}>
                <TagIcon style={{ width: "22px", marginRight: "10px" }} /> About Me
              </h5>

              <textarea
                className="form-control"
                rows={5}
                value={aboutText}
                onChange={(e) => onChangeAbout(e.target.value)}
                placeholder="Write something about you..."
                style={{ borderRadius: 12 }}
              />

              <div className="mt-4">
                <h6 className="fw-bold small mb-2">Favorite Genres</h6>
                <div className="d-flex gap-2 flex-wrap">
                  {user.favoriteGenres.map((g) => (
                    <span key={g} className="badge rounded-pill p-2 px-3" style={{ backgroundColor: "#11DA3E7", color: "#231B59" }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h6 className="fw-bold" style={{ color: "#231B59" }}>
                  Top 3 Favorite Books
                </h6>

                <div className="d-flex flex-column gap-3 mt-3">
                  <TopCard idx={0} />
                  <TopCard idx={1} />
                  <TopCard idx={2} />
                </div>

                {activeSlot !== null && (
                  <div className="card border-0 shadow-sm p-3 mt-4" style={{ borderRadius: 14, backgroundColor: "#F7F6EF" }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-bold" style={{ color: "#231B59" }}>
                        Search a book for Top {activeSlot + 1}
                      </div>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setActiveSlot(null)}>
                        Close
                      </button>
                    </div>

                    <div className="d-flex gap-2">
                      <input
                        className="form-control"
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => (e.key === "Enter" ? searchBooks() : null)}
                        style={{ borderRadius: 12 }}
                      />
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: "#231B59", color: "white", borderRadius: 12, minWidth: 92 }}
                        onClick={searchBooks}
                        disabled={loadingSearch}
                      >
                        {loadingSearch ? "..." : "Search"}
                      </button>
                    </div>

                    <div className="mt-3" style={{ maxHeight: 260, overflowY: "auto" }}>
                      {foundBooks.length === 0 ? (
                        <div className="text-muted" style={{ fontSize: 13 }}>
                          Search results will appear here.
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {foundBooks.map((b) => (
                            <button
                              key={b.id || b.isbn || b.title}
                              type="button"
                              onClick={() => pickTop3Book(b)}
                              className="card border-0 shadow-sm p-2 text-start"
                              style={{ borderRadius: 12, backgroundColor: "white" }}
                            >
                              <div className="d-flex gap-2 align-items-start">
                                <img
                                  src={b.thumbnail || "https://via.placeholder.com/60x85"}
                                  alt={b.title}
                                  style={{ width: 52, height: 74, objectFit: "cover", borderRadius: 10 }}
                                />
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                  <div
                                    className="fw-bold"
                                    style={{
                                      fontSize: 13,
                                      color: "#231B59",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={b.title}
                                  >
                                    {b.title}
                                  </div>
                                  <div
                                    className="text-muted"
                                    style={{
                                      fontSize: 12,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={(b.authors || []).join(", ")}
                                  >
                                    {(b.authors || []).join(", ")}
                                  </div>
                                  <div
                                    className="text-muted"
                                    style={{
                                      fontSize: 11,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {b.isbn ? `ISBN: ${normalizeIsbn(b.isbn)}` : "No ISBN"}
                                  </div>
                                </div>
                                <span className="badge rounded-pill" style={{ backgroundColor: "#231B59" }}>
                                  Select
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-5">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: "15px", backgroundColor: "white" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0" style={{ color: "#231B59" }}>
                  <BookOpenIcon style={{ width: "22px", marginRight: "10px" }} /> Currently Reading
                </h5>
                <button className="btn btn-sm" style={{ backgroundColor: "#231B59", color: "white" }} onClick={fetchLibrary}>
                  Refresh
                </button>
              </div>

              {loadingLibrary ? (
                <p className="text-muted">Loading library...</p>
              ) : !current ? (
                <p className="text-muted">Your library is empty. Add books from Home to see them here.</p>
              ) : (
                <>
                  <div className="text-center">
                    <img
                      src={current.thumbnail || "https://via.placeholder.com/140x180"}
                      alt={current.title}
                      className="shadow"
                      style={{ width: "140px", borderRadius: "8px", margin: "0 auto" }}
                    />
                    <p className="fw-bold mt-3 mb-0" style={{ color: "#231B59" }}>
                      {current.title}
                    </p>
                    <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                      {(current.authors || []).join(", ")}
                    </p>
                    {current.isbn && (
                      <div className="text-muted" style={{ fontSize: "12px" }}>
                        ISBN: {normalizeIsbn(current.isbn)}
                      </div>
                    )}
                  </div>

                  <hr />

                  <h6 className="fw-bold" style={{ color: "#231B59" }}>
                    My Library
                  </h6>
                  <div className="d-flex flex-column gap-3 mt-2" style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {libraryBooks.map((b) => (
                      <div key={b.isbn} className="d-flex gap-3 align-items-start">
                        <img
                          src={b.thumbnail || "https://via.placeholder.com/60x90"}
                          alt={b.title}
                          style={{ width: "55px", height: "75px", objectFit: "cover", borderRadius: "6px" }}
                        />
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="fw-bold" style={{ fontSize: "13px", color: "#231B59" }}>
                            {b.title}
                          </div>
                          <div className="text-muted" style={{ fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {(b.authors || []).join(", ")}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeFromLibrary(b.isbn)}
                          disabled={deletingIsbn === normalizeIsbn(b.isbn)}
                          title="Remove from library"
                        >
                          <TrashIcon style={{ width: "16px" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
