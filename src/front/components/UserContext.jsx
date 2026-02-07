import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

const UserContext = createContext();

/** Misma URL por defecto que el backend (models.User.DEFAULT_AVATAR_URL) para consistencia */
export const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dcmqxfpnd/image/upload/v1770140317/i9acwjupwp34xsegrzm6.jpg";

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);

    const apiBase = (() => {
        const url = import.meta.env.VITE_BACKEND_URL || '';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    })();

    // Al cargar la app, si hay token, obtener usuario desde la API (sin usar localStorage para user_data)
    useEffect(() => {
        if (!apiBase) return;
        const token = localStorage.getItem('access_token');
        if (!token || userData !== null) return;
        let cancelled = false;
        fetch(`${apiBase}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!cancelled && data && typeof data === 'object') setUserData(data);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [apiBase]);

    // Avatar: userData.image_avatar si es URL válida; si no, DEFAULT_AVATAR_URL
    const profileImg = (() => {
        const url = userData?.image_avatar;
        if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')))
            return url;
        return DEFAULT_AVATAR_URL;
    })();

    const updateProfileImg = useCallback((newUrl) => {
        setUserData((prev) => {
            if (!prev) return prev;
            return { ...prev, image_avatar: newUrl };
        });
    }, []);

    const updateProfile = useCallback((newUser) => {
        if (newUser !== null && (typeof newUser !== 'object' || Array.isArray(newUser))) return;
        setUserData(newUser);
    }, []);

    const clearUser = useCallback(() => {
        setUserData(null);
    }, []);

    return (
        <UserContext.Provider value={{ profileImg, updateProfileImg, userData, updateProfile, clearUser }}>
            {children}
        </UserContext.Provider>
    );
};
