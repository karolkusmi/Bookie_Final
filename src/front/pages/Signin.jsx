import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Signin.css";
import logo from "../assets/img/Logo.png";

export const Signin = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    accepted_term: false,
    suscribed_letter: false,
    is_active: true,
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.username || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!formData.accepted_term) {
      setError("You must accept the terms to continue.");
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    if (!backendUrl) {
      setError("Backend URL is not configured. Check VITE_BACKEND_URL.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${backendUrl}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      // Manejo de errores HTTP
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // respuesta no JSON
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Signup exitoso
      const data = await response.json();
      console.log("Signup successful:", data);

      setLoading(false);
      navigate("/home");
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        "Cannot connect to the server. Make sure the backend is running on port 3001 and CORS is configured."
      );
      setLoading(false);
    }
  };

  return (
    <div className="signin-wrapper d-flex flex-column justify-content-center align-items-center">
      <div className="text-center mb-4">
        <img src={logo} alt="Bookie Logo" style={{ width: "180px" }} />
      </div>

      <div className="card p-4" style={{ width: "400px" }}>
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
              I agree to the Terms
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
              Subscribe to newsletter
            </label>
          </div>

          {error && (
            <div className="alert alert-danger mt-3">{error}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
};
