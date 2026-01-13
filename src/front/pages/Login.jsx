import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom";

export const Login = () => {

	const [formData, setFormData] = useState({
		email: "",
		password: ""
	});
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();


	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const backendUrl = import.meta.env.VITE_BACKEND_URL;
			setLoading(true);
			setError(null);
			if (!backendUrl) {
				setError("Backend URL is not configured. Please set VITE_BACKEND_URL in your .env file.");
				return;
			}
			const response = await fetch(`${backendUrl}/api/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				body: JSON.stringify(formData),
				mode: "cors",
				credentials: "omit"
			});

			if (!response.ok) {
				setError("Failed to login. Please check your credentials.");
				setLoading(false);
				return;
			}

			const data = await response.json();
			console.log("Login successful:", data);
			setLoading(false);
			navigate("/home");
		} catch (error) {
			console.error("Login error:", error);
			setError("Failed to login. Please check your credentials.");
			setLoading(false);
		}
	}





	return (


		<div className="d-flex justify-content-center align-items-center vh-100">
			<div className="card p-4" style={{ width: "350px" }}>
				<form onSubmit={handleSubmit}>
					<h1 className="text-center">Log In</h1>
					<div className="mb-3">
						<label htmlFor="exampleInputEmail1" className="form-label">Email address</label>
						<input
							type="email"
							className="form-control"
							id="exampleInputEmail1"
							aria-describedby="emailHelp"
							required
							name="email"
							value={formData.email}
							onChange={handleChange}
						/>
						<div id="emailHelp" className="form-text">
						</div>
					</div>

					<div className="mb-3">
						<label htmlFor="exampleInputPassword1" className="form-label">Password</label>
						<input
							type="password"
							className="form-control"
							id="exampleInputPassword1"
							name="password"
							value={formData.password}
							onChange={handleChange}
							required
						/>
					</div>

					<div className="mb-3 form-check">
						<input
							type="checkbox"
							className="form-check-input"
							id="exampleCheck1"
							name="remember_me"
						/>

						<label className="form-check-label" htmlFor="exampleCheck1">
							Remember me
						</label>
						<p><a href="#" class="link-underline-primary">Password forgotten?</a></p>
					</div>

					<button type="submit" className="btn btn-primary w-100">Log in</button>
					<Link to="/signin" className="btn btn-primary w-100 mt-2">Sign up</Link>
				</form>

			</div>
		</div>

	)
};
