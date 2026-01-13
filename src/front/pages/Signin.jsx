import { useNavigate } from "react-router-dom";
import { useState } from "react";


export const Signin = () => {
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

        // Validación básica del formulario
        if (!formData.username || !formData.email || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (!formData.accepted_term) {
            setError("You must accept the terms to continue.");
            return;
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            if (!backendUrl) {
                setError("Backend URL is not configured. Please set VITE_BACKEND_URL in your .env file.");
                return;
            }

            setLoading(true);
            setError(null);

            const response = await fetch(`${backendUrl}/api/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(formData),
                // Agregar mode y credentials para mejor manejo de CORS
                mode: "cors",
                credentials: "omit"
            });

            // Verificar si la respuesta es OK antes de intentar parsear JSON
            if (!response.ok) {
                // Intentar obtener el mensaje de error del servidor
                let errorMessage = `Server error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    // Si no se puede parsear JSON, usar el mensaje por defecto
                    console.warn("Could not parse error response:", parseError);
                }
                setError(errorMessage);
                setLoading(false);
                return;
            }

            // Si todo está bien, parsear la respuesta y navegar
            try {
                const data = await response.json();
                console.log("Signup successful:", data);
                setLoading(false);
                navigate("/login");
            } catch (parseError) {
                // Si la respuesta está vacía pero el status es OK, asumir éxito
                console.warn("Empty response, assuming success:", parseError);
                setLoading(false);
                navigate("/login");
            }

        } catch (error) {
            console.error("Signup error:", error);

            // Manejo específico de errores de red/CORS
            let errorMessage = "An error occurred during signup. Please check your connection.";

            if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
                errorMessage = "Cannot connect to the server. Please ensure:\n" +
                    "1. The backend server is running on port 3001\n" +
                    "2. CORS is properly configured\n" +
                    "3. The backend URL is correct in your .env file";
            } else if (error.message.includes("CORS") || error.message.includes("blocked")) {
                errorMessage = "CORS error: The request was blocked. Please check:\n" +
                    "1. Backend CORS configuration allows your frontend origin\n" +
                    "2. Backend server is running and accessible";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    return (

        <>

            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="card p-4" style={{ width: "350px" }}>
                    <form onSubmit={handleSubmit}>
                        <h1 className="text-center">Sign In</h1>
                        <div className="mb-3">
                            <label htmlFor="exampleInputUsername" className="form-label">Username</label>
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
                            <label htmlFor="exampleInputEmail1" className="form-label">Email address</label>
                            <input
                                type="email"
                                className="form-control"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                aria-describedby="emailHelp"
                                required
                            />
                            <div id="emailHelp" className="form-text">
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="exampleInputPassword1" className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-control"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="mb-3 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                name="accepted_term"
                                id="exampleCheck1"
                                checked={formData.accepted_term}
                                onChange={handleChange}
                            />

                            <label className="form-check-label" htmlFor="exampleCheck1">
                                I agree to the Terms
                            </label>
                        </div>
                        <div className="mb-3 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                name="suscribed_letter"
                                id="exampleCheck2"
                                checked={formData.suscribed_letter}
                                onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor="exampleCheck2">
                                Subscribe to newsletter
                            </label>
                        </div>

                        {error && (
                            <div className="alert alert-danger mt-3" role="alert">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="btn btn-primary w-100 mt-2"
                            disabled={loading}
                        >
                            {loading ? "Signing up..." : "Sign up"}
                        </button>

                    </form>

                </div>
            </div>
        </>
    );
}