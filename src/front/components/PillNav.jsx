import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import "./PillNav.css";
import { nav } from "framer-motion/client";
import { useNavigate } from "react-router-dom";


const PillNav = ({
  logo,
  logoAlt = "Profile",
  items,
  activeHref,
  ease = "power3.easeOut",
  baseColor = "#231B59",
  pillColor = "#ffffff",
  hoveredPillTextColor = "#231B59",
  pillTextColor,
  onLogoClick,
  initialLoadAnimation = true,
  profileHref = "/profile",
  onLogout,
}) => {
  const resolvedPillTextColor = pillTextColor ?? baseColor;

  const navigate = useNavigate();

  const circleRefs = useRef([]);
  const tlRefs = useRef([]);
  const activeTweenRefs = useRef([]);
  const navItemsRef = useRef(null);

  const logoImgRef = useRef(null);
  const logoTweenRef = useRef(null);

  const profileBtnRef = useRef(null);
  const dropdownRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector(".pill-label");
        const white = pill.querySelector(".pill-label-hover");

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" }, 0);

        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => { });
    }

    if (initialLoadAnimation) {
      const navItemsEl = navItemsRef.current;
      const profileEl = profileBtnRef.current;

      if (navItemsEl) {
        gsap.set(navItemsEl, { width: 0, overflow: "hidden" });
        gsap.to(navItemsEl, { width: "auto", duration: 0.6, ease });
      }

      if (profileEl) {
        gsap.set(profileEl, { scale: 0 });
        gsap.to(profileEl, { scale: 1, duration: 0.6, ease });
      }
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease, initialLoadAnimation]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return;
      const btn = profileBtnRef.current;
      const dd = dropdownRef.current;
      if (btn?.contains(e.target)) return;
      if (dd?.contains(e.target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleEnter = (i) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: "auto" });
  };

  const handleLeave = (i) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: "auto" });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, { rotate: 360, duration: 0.2, ease, overwrite: "auto" });
  };

  const toggleMenu = () => setMenuOpen((v) => !v);

  const cssVars = {
    ["--base"]: baseColor,
    ["--pill-bg"]: pillColor,
    ["--hover-text"]: hoveredPillTextColor,
    ["--pill-text"]: resolvedPillTextColor,
  };

  return (
    <nav className="pill-nav pill-nav-inline" aria-label="Primary" style={cssVars}>
      <button
        type="button"
        className="pill-logo"
        aria-label="Profile"
        onMouseEnter={handleLogoEnter}
        onClick={onLogoClick}
        ref={(el) => {
          logoRef.current = el;
        }}
      >
        <img ref={logoImgRef} src={logo} alt={logoAlt} />
      </button>

      <div className="pill-nav-items" ref={navItemsRef}>
        <ul className="pill-list" role="menubar">
          {items.map((item, i) => (
            <li key={item.href || `item-${i}`} role="none">
              <Link
                role="menuitem"
                to={item.href}
                className={`pill${activeHref === item.href ? " is-active" : ""}`}
                aria-label={item.ariaLabel || item.label}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={() => handleLeave(i)}
              >
                <span
                  className="hover-circle"
                  aria-hidden="true"
                  ref={(el) => {
                    circleRefs.current[i] = el;
                  }}
                />
                <span className="label-stack">
                  <span className="pill-label">{item.label}</span>
                  <span className="pill-label-hover" aria-hidden="true">
                    {item.label}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="pill-user-area">
        <button
          type="button"
          className="pill-logo pill-logo-right"
          aria-label="User menu"
          onMouseEnter={handleLogoEnter}
          onClick={toggleMenu}
          ref={profileBtnRef}
        >
          <img ref={logoImgRef} src={logo} alt={logoAlt} />
        </button>

        <div
          ref={dropdownRef}
          className={`pill-dropdown${menuOpen ? " is-open" : ""}`}
          role="menu"
          aria-hidden={!menuOpen}
        >
          <Link className="pill-dropdown-item" to={profileHref} role="menuitem" onClick={() => setMenuOpen(false)}>
            Profile
          </Link>
          <button
            type="button"
            className="pill-dropdown-item pill-dropdown-button"
            role="menuitem"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setMenuOpen(false);
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default PillNav;
