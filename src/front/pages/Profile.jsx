import React, { useEffect, useMemo, useState } from "react";
import "./Profile.css";
import { PencilIcon, BookOpenIcon, TagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useUser } from "../components/UserContext";

export const Profile = () => {
  const { profileImg, updateProfileImg, userData } = useUser();

  const [libraryBooks, setLibraryBooks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [deletingIsbn, setDeletingIsbn] = useState(null);
  const [readingNow, setReadingNow] = useState(null);

  const API_BASE = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:3001", []);

  const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

  const getUserId = () => {
    const ctxId = userData?.id;
    if (ctxId) return ctxId;
    const saved = JSON.parse(localStorage.getItem("user_data") || "null");
    return saved?.id || null;
  };

  const loadReadingNow = () => {
    try {
      const savedSelected = localStorage.getItem("selected_book");
      if (!savedSelected) return null;
      const parsed = JSON.parse(savedSelected);
      if (!parsed) return null;
      return {
        title: parsed.title,
        thumbnail: parsed.thumbnail,
        isbn: normalizeIsbn(parsed.isbn),
        authors: parsed.authors || [],
      };
    } catch (e) {
      localStorage.removeItem("selected_book");
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

  useEffect(() => {
    setReadingNow(loadReadingNow());
    fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "selected_book") setReadingNow(loadReadingNow());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const fallbackCurrent = libraryBooks?.[0] || null;
  const current = readingNow || fallbackCurrent;

  const user = {
    name: userData?.username || userData?.email || JSON.parse(localStorage.getItem("user_data") || "null")?.email || "Usuario",
    location: "Madrid, Spain",
    about: "The Reading Room is my sanctuary. I love fantasy novels, thrillers, and diving deep into character development.",
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
        if (result && result.event === "success") {
          updateProfileImg(result.info.secure_url);
        }
      }
    );
    widget.open();
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
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                border: "4px solid #11DA3E7",
              }}
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
              <p className="text-muted">{user.about}</p>
              <div className="mt-4">
                <h6 className="fw-bold small mb-2">Favorite Genres</h6>
                <div className="d-flex gap-2 flex-wrap">
                  {user.favoriteGenres.map((g) => (
                    <span
                      key={g}
                      className="badge rounded-pill p-2 px-3"
                      style={{ backgroundColor: "#11DA3E7", color: "#231B59" }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
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
                        <div className="flex-grow-1">
                          <div className="fw-bold" style={{ fontSize: "13px", color: "#231B59" }}>
                            {b.title}
                          </div>
                          <div className="text-muted" style={{ fontSize: "12px" }}>
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
