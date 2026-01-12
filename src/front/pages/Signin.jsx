import { use } from "react";
import { useState } from "react";



export const Signin = () => {



    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password,
                    username
                })
            });

            if (response.ok) {
                window.location.href = "/login";
            } else {
                const errorData = await response.json();
                setError(errorData.message);
            }
        } catch (error) {
            setError("An error occurred during signup.");
        }
    };

    return (

        <>

            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="card p-4" style={{ width: "350px" }}>
                    <form onSubmit={handleSubmit}>
                        <h1 class="text-center">Sign In</h1>
                        <div className="mb-3">
                            <label htmlFor="exampleInputUsername" className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-control"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="exampleInputEmail1" className="form-label">Email address</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-3 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="exampleCheck1"
                            />

                            <label className="form-check-label" htmlFor="exampleCheck1">
                                I agree to the Terms
                            </label>
                        </div>
                        <div className="mb-3 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="exampleCheck2"
                            />
                            <label className="form-check-label" htmlFor="exampleCheck2">
                                Subscribe to newsletter
                            </label>
                        </div>

                        <button type="submit" className="btn btn-primary w-100 mt-2">Sign up</button>

                    </form>

                </div>
            </div>
        </>
    );
}