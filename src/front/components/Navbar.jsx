import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  UserCircleIcon,
  IdentificationIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useUser } from "./UserContext";
import "./Navbar.css";

export const Navbar = () => {
  const { profileImg, userData } = useUser();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const busyRef = useRef(false);

  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const toggleBtnRef = useRef(null);
  const overlayRef = useRef(null);

  const iconRef = useRef(null);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);

  const offscreen = -110;

  const items = [
    { label: "Home", to: "/home", Icon: HomeIcon },
    { label: "Events", to: "/home#events", Icon: CalendarIcon },
    { label: "Chat", to: "/chat", Icon: UsersIcon },
    { label: "Profile", to: "/profile", Icon: UserCircleIcon },
    { label: "Aboutus", to: "/aboutus", Icon: IdentificationIcon },
  ];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;

      if (!panel || !preContainer) return;

      const layers = Array.from(preContainer.querySelectorAll(".ns-prelayer"));
      preLayerElsRef.current = layers;

      // Inicial: fuera de pantalla
      gsap.set([panel, ...layers], { xPercent: offscreen });

      // Overlay inicial oculto
      if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });

      // Icono (rota al abrir/cerrar)
      if (iconRef.current) gsap.set(iconRef.current, { rotate: 0, transformOrigin: "50% 50%" });
    });

    return () => ctx.revert();
  }, []);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    const overlay = overlayRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    closeTweenRef.current = null;

    const itemEls = Array.from(panel.querySelectorAll(".ns-itemLabel"));
    const iconEls = Array.from(panel.querySelectorAll(".ns-itemIcon"));

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (iconEls.length) gsap.set(iconEls, { opacity: 0, y: 10 });

    const tl = gsap.timeline({ paused: true });

    // Overlay entra suave
    if (overlay) {
      tl.to(overlay, { opacity: 1, duration: 0.18, ease: "power1.out", onStart: () => (overlay.style.pointerEvents = "auto") }, 0);
    }

    layers.forEach((el, i) => {
      tl.to(el, { xPercent: 0, duration: 0.45, ease: "power4.out" }, i * 0.07);
    });

    const lastTime = layers.length ? (layers.length - 1) * 0.07 : 0;
    const panelInsert = lastTime + (layers.length ? 0.08 : 0);

    tl.to(panel, { xPercent: 0, duration: 0.6, ease: "power4.out" }, panelInsert);

    const itemsStart = panelInsert + 0.18;

    if (itemEls.length) {
      tl.to(itemEls, { yPercent: 0, rotate: 0, duration: 0.95, ease: "power4.out", stagger: 0.1 }, itemsStart);
    }
    if (iconEls.length) {
      tl.to(iconEls, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.08 }, itemsStart + 0.03);
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;

    const tl = buildOpenTimeline();
    if (!tl) {
      busyRef.current = false;
      return;
    }

    tl.eventCallback("onComplete", () => {
      busyRef.current = false;
    });

    tl.play(0);
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    const overlay = overlayRef.current;
    if (!panel) return;

    closeTweenRef.current?.kill();

    // Overlay sale
    if (overlay) {
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.18,
        ease: "power1.in",
        onComplete: () => (overlay.style.pointerEvents = "none"),
      });
    }

    closeTweenRef.current = gsap.to([...layers, panel], {
      xPercent: offscreen,
      duration: 0.32,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: () => {
        busyRef.current = false;
      },
    });
  }, []);

  const toggleMenu = useCallback(() => {
    const next = !openRef.current;
    openRef.current = next;
    setOpen(next);

    if (next) playOpen();
    else playClose();

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotate: next ? 180 : 0,
        duration: next ? 0.55 : 0.35,
        ease: next ? "power4.out" : "power3.inOut",
        overwrite: "auto",
      });
    }
  }, [playClose, playOpen]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    playClose();
    if (iconRef.current) {
      gsap.to(iconRef.current, { rotate: 0, duration: 0.35, ease: "power3.inOut", overwrite: "auto" });
    }
  }, [playClose]);

  // Click fuera para cerrar (overlay también cierra)
  useEffect(() => {
    if (!open) return;

    const onDoc = (e) => {
      const panel = panelRef.current;
      const btn = toggleBtnRef.current;
      if (!panel || !btn) return;

      if (!panel.contains(e.target) && !btn.contains(e.target)) closeMenu();
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, closeMenu]);

  const handleNav = (to) => {
    if (to.includes("#")) {
      const [path, hash] = to.split("#");
      navigate(path);
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      navigate(to);
    }
    closeMenu();
  };

  return (
    <div className="ns-shell" data-open={open || undefined}>
      {/* Overlay (oscurece el contenido al abrir) */}
      <div ref={overlayRef} className="ns-overlay" onClick={closeMenu} aria-hidden="true" />

      {/* Barra colapsada */}
      <div className="ns-collapsed">
        <img src={profileImg} alt="Profile" className="ns-avatar" />
        <div className="ns-username">{userData?.username || userData?.email || "Usuario"}</div>

        <button
          ref={toggleBtnRef}
          className="ns-toggle"
          onClick={toggleMenu}
          type="button"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          <span ref={iconRef} className="ns-toggleIcon" aria-hidden="true">
            {open ? <XMarkIcon className="ns-xicon" /> : <span className="ns-plus">+</span>}
          </span>
        </button>
      </div>

      {/* Capas del panel */}
      <div ref={preLayersRef} className="ns-prelayers" aria-hidden="true">
        <div className="ns-prelayer layer-1" />
        <div className="ns-prelayer layer-2" />
      </div>

      {/* Panel */}
      <aside ref={panelRef} className="ns-panel" aria-hidden={!open}>
        <div className="ns-panelTop">
          <div className="ns-user">
            <img src={profileImg} alt="Profile" className="ns-avatar lg" />
            <div className="ns-userText">
              <div className="ns-userName">{userData?.username || "Usuario"}</div>
              <div className="ns-userEmail">{userData?.email || ""}</div>
            </div>
          </div>
        </div>

        <ul className="ns-list">
          {items.map((it) => {
            const Icon = it.Icon;
            return (
              <li className="ns-itemWrap" key={it.label}>
                <button className="ns-item" type="button" onClick={() => handleNav(it.to)}>
                  <span className="ns-itemLeft">
                    <Icon className="ns-itemIcon" />
                    <span className="ns-itemLabel">{it.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
};
