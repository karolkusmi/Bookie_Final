import React, { useEffect, useMemo, useState } from "react";
import "./Profile.css";
import { PencilIcon, BookOpenIcon, TagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useUser, DEFAULT_AVATAR_URL } from "../components/UserContext";
import MyLibraryPickerModal from "../components/MyLibraryPickerModal";

export const Profile = () => {
  const { profileImg, updateProfileImg, userData, updateProfile } = useUser();

  // VITE_BACKEND_URL puede tener o no barra final (ej. http://localhost:3001/); normalizamos para usar siempre API_BASE + "/api/..."
  const API_BASE = useMemo(() => {
    const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }, []);

  const [libraryBooks, setLibraryBooks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [deletingIsbn, setDeletingIsbn] = useState(null);

  const [readingNow, setReadingNow] = useState(null);

  const [aboutText, setAboutText] = useState("");
  const [top3, setTop3] = useState([null, null, null]);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [newGenre, setNewGenre] = useState("");

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("reading");

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const normalizeIsbn = (isbn) => (isbn || "").replaceAll("-", "").replaceAll(" ", "").toUpperCase();

  const getAuthorsArray = (book) => {
    if (!book) return [];
    if (Array.isArray(book.authors)) return book.authors;
    if (book.author) return String(book.author).split(";").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const getUserId = () => userData?.id ?? null;

  const fetchProfile = async () => {
    const uid = getUserId();
    if (!uid) return;
    try {
      const resp = await fetch(`${API_BASE}/api/users/${uid}/profile`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.aboutText !== undefined) setAboutText(data.aboutText ?? "");
      if (Array.isArray(data.favoriteGenres)) setFavoriteGenres(data.favoriteGenres);
      else setFavoriteGenres([]);
      if (Array.isArray(data.top3)) {
        setTop3([data.top3[0] ?? null, data.top3[1] ?? null, data.top3[2] ?? null]);
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  };

  const saveProfilePrefs = async (updates) => {
    const uid = getUserId();
    if (!uid) return;
    try {
      await fetch(`${API_BASE}/api/users/${uid}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error("Error saving profile:", e);
    }
  };

  const saveTop3ToBackend = async (top3Array) => {
    const uid = getUserId();
    if (!uid) return;
    try {
      await fetch(`${API_BASE}/api/users/${uid}/top3`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ top3: top3Array }),
      });
    } catch (e) {
      console.error("Error saving top3:", e);
    }
  };

  const fetchCurrentReading = async () => {
    const uid = getUserId();
    if (!uid) return;
    try {
      const resp = await fetch(`${API_BASE}/api/users/${uid}/current-reading`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.current?.isbn) setReadingNow(normalizeIsbn(data.current.isbn));
    } catch {}
  };

  const setCurrentlyReading = async (book) => {
    const isbn = normalizeIsbn(book?.isbn);
    if (!isbn) return;
    setReadingNow(isbn);
    const userId = getUserId();
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/api/users/${userId}/current-reading`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn,
          title: book.title,
          thumbnail: book.thumbnail,
          authors: getAuthorsArray(book),
          publisher: book.publisher,
        }),
      });
    } catch (e) {
      console.error("Error setting current reading:", e);
    }
  };

  const fetchLibrary = async () => {
    const userId = getUserId();
    if (!userId) return;

    setLoadingLibrary(true);
    try {
      const resp = await fetch(`${API_BASE}/api/library/${userId}/books`); 
      if (!resp.ok) {
        throw new Error("Error fetching library");
      }
      const data = await resp.json();
      setLibraryBooks(Array.isArray(data) ? data : []);
    } catch {
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
      if (!resp.ok) throw new Error();

      setLibraryBooks((prev) => prev.filter((b) => normalizeIsbn(b.isbn) !== clean));

      if (readingNow === clean) {
        setReadingNow(null);
      }

      setTop3((prev) => {
        const next = prev.map((slot) => (slot && normalizeIsbn(slot.isbn) === clean ? null : slot));
        saveTop3ToBackend(next);
        return next;
      });
    } finally {
      setDeletingIsbn(null);
    }
  };

  const handleBookSelect = (book) => {
    if (pickerMode === "reading") {
      setCurrentlyReading(book);
      setIsBookModalOpen(false);
    }
  };

  const onChangeAbout = (val) => {
    setAboutText(val);
    saveProfilePrefs({ aboutText: val });
  };

  const addGenre = () => {
    const genre = newGenre.trim();
    if (!genre) return;
    const normalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
    if (favoriteGenres.includes(normalizedGenre)) {
      setNewGenre("");
      return;
    }
    const updated = [...favoriteGenres, normalizedGenre];
    setFavoriteGenres(updated);
    saveProfilePrefs({ favoriteGenres: updated });
    setNewGenre("");
  };

  const removeGenre = (genreToRemove) => {
    const updated = favoriteGenres.filter((g) => g !== genreToRemove);
    setFavoriteGenres(updated);
    saveProfilePrefs({ favoriteGenres: updated });
  };

  const commonGenres = [
    "Fantasy",
    "Sci-Fi",
    "Thriller",
    "Romance",
    "Mystery",
    "Horror",
    "Historical Fiction",
    "Biography",
    "Non-Fiction",
    "Adventure",
    "Drama",
    "Comedy",
    "Poetry",
    "Young Adult",
    "Children's",
    "Crime",
    "Suspense",
    "Western",
    "Philosophy",
    "Self-Help",
  ];

  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;

    fetchCurrentReading();
    fetchLibrary();
    fetchProfile();
  }, [userData?.id]);

  const current = useMemo(() => {
    if (!libraryBooks.length) return null;
    if (readingNow) {
      const found = libraryBooks.find((b) => normalizeIsbn(b.isbn) === readingNow);
      if (found) return found;
    }
    return libraryBooks[0];
  }, [libraryBooks, readingNow]);

  const user = {
    name: userData?.username || userData?.email || "Usuario",
    location: "Madrid, Spain",
  };

  useEffect(() => {
    setUsername(userData?.username ?? "");
  }, [userData?.id, userData?.username]);

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
        if (!error && result?.event === "success") {
          updateProfileImg(result.info.secure_url);
        }
      }
    );
    widget.open();


  };
  
  const saveProfileToBackend = async () => {
    const userId = getUserId();
    if (!userId) return;
    setSaveError(null);
    setSaving(true);
    const accessToken = localStorage.getItem("access_token");
    try {
      // Foto: la que está en el contexto (userData o profileImg tras Cloudinary)
      let imageUrl =
        typeof userData?.image_avatar === "string" &&
        (userData.image_avatar.startsWith("http://") || userData.image_avatar.startsWith("https://"))
          ? userData.image_avatar
          : (typeof profileImg === "string" && profileImg.startsWith("http") ? profileImg : DEFAULT_AVATAR_URL);

      const payload = {
        username: ((username.trim() || userData?.username) ?? "").trim(),
        image_avatar: imageUrl,
      };
      const headers = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.message || err?.msg || "Error al guardar");
      }
      const data = await resp.json();
      if (data && typeof data === "object") {
        updateProfile(data);
      }
      // Sincronizar avatar con Stream Chat para que se vea en el chat sin cerrar sesión
      if (accessToken) {
        try {
          await fetch(`${API_BASE}/api/chat/sync-my-avatar`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (_) {}
      }
    } catch (e) {
      setSaveError(e?.message ?? "Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="profile-main-container" style={{ backgroundColor: "#E5E4D7", minHeight: "100vh", display: "flex" }}>
      <div className="profile-content-scroll" style={{ flexGrow: 1, padding: "40px" }}>
        <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: "28px" }}>
          <div className="d-flex align-items-center">
            <div className="profile-avatar-wrap">
              <img src={profileImg} alt={user.name} className="profile-avatar-img" />
            </div>
            <div className="ms-4 flex-grow-1">
              <div className="mb-2">
                <label className="form-label small text-muted mb-0">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
              </div>
              <div className="mb-2">
                <label className="form-label small text-muted mb-0">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={userData?.email ?? ""}
                  disabled
                  readOnly
                  title="El email no se puede modificar"
                />
              </div>
              <p className="text-muted small mb-2">{user.location}</p>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn-wine rounded-pill px-4 py-2"
                  onClick={openCloudinaryWidget}
                >
                  <PencilIcon style={{ width: 18 }} /> Change photo
                </button>
                <button
                  type="button"
                  className="btn-save-changes"
                  onClick={saveProfileToBackend}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Save changes"}
                </button>
              </div>
              {saveError && <p className="text-danger small mt-2 mb-0">{saveError}</p>}
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-7">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: "28px" }}>
              <h5 className="fw-bold">
                <TagIcon style={{ width: 22 }} /> About Me
              </h5>
              <textarea className="form-control" rows={5} value={aboutText} onChange={(e) => onChangeAbout(e.target.value)} />
            </div>
          </div>

          <div className="col-md-5">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: "28px" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold">
                  <BookOpenIcon style={{ width: 22 }} /> Currently Reading
                </h5>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setPickerMode("reading");
                    setIsBookModalOpen(true);
                  }}
                >
                  Change
                </button>
              </div>

              {!current ? (
                <p className="text-muted">Your library is empty.</p>
              ) : (
                <>
                  <div className="text-center">
                    <img src={current.thumbnail || "https://via.placeholder.com/140x180"} alt={current.title} style={{ width: 140 }} />
                    <p className="fw-bold mt-3">{current.title}</p>
                    <p className="text-muted">{getAuthorsArray(current).join(", ")}</p>
                  </div>

                  <hr />

                  <h6 className="fw-bold">My Library</h6>
                  <div className="d-flex flex-column gap-3">
                    {loadingLibrary ? (
                      <p className="text-muted mb-0">Loading...</p>
                    ) : (
                      libraryBooks.map((b) => (
                        <div key={b.isbn} className="d-flex gap-3 align-items-start">
                          <img src={b.thumbnail || "https://via.placeholder.com/60x90"} alt={b.title} style={{ width: 55 }} />
                          <div className="flex-grow-1">
                            <div className="fw-bold">{b.title}</div>
                            <div className="text-muted">{getAuthorsArray(b).join(", ")}</div>
                          </div>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeFromLibrary(b.isbn)} disabled={deletingIsbn === normalizeIsbn(b.isbn)}>
                            <TrashIcon style={{ width: 16 }} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <MyLibraryPickerModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setPickerMode("reading");
        }}
        books={libraryBooks}
        onSelect={handleBookSelect}
      />
    </div>
  );
};
