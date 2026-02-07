import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useUser } from "../components/UserContext";
import "./Signin.css";
import logo from "../assets/img/Logo.png";
import defaultAvatar from "../assets/img/imagenperfil.jpg";

export const Signin = () => {
  const { updateProfileImg, updateProfile } = useUser();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    accepted_term: false,
    suscribed_letter: false,
    is_active: true
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password) {
      setError("Please fill in all the fields.");
      return;
    }

    if (!formData.accepted_term) {
      setError("You must accept the terms.");
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      if (!backendUrl) {
        setError("VITE_BACKEND_URL is not configured.");
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch(`${backendUrl}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Server error");
      }

      const user = await response.json();
      updateProfile(user);
      updateProfileImg(defaultAvatar);
      navigate("/home");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page d-flex justify-content-center align-items-center vh-100">
      <div className="text-center mb-4">
        <img src={logo} alt="Logo" className="signin-logo" />
      </div>

      <div className="card p-4">
        <form onSubmit={handleSubmit}>
          <h1 className="text-center">Sign Up</h1>

          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              name="accepted_term"
              checked={formData.accepted_term}
              onChange={handleChange}
            />
            <label className="form-check-label">
              I accept the terms
            </label>
          </div>

          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              name="suscribed_letter"
              checked={formData.suscribed_letter}
              onChange={handleChange}
            />
            <label className="form-check-label">
              Subscribe to the newsletter
            </label>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign up"}
          </button>

          <button
            type="button"
            className="btn btn-primary w-100 mt-2"
            onClick={() => navigate("/login")}
          >
            I already have an account, go to Login
          </button>
        </form>
      </div>
    </div>
  );
};
