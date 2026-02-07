import { useState } from "react"
import { useNavigate, Link } from "react-router-dom";
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import { useUser } from "../components/UserContext";
import "./Login.css";
import logo from "../assets/img/Logo.png";

export const Login = () => {
	const { updateProfile } = useUser();

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
				setLoading(false);
				return;
			}

			const response = await fetch(`${backendUrl}/api/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
				credentials: 'include',
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				setError(errorData.message || "Failed to login. Please check your credentials.");
				setLoading(false);
				return;
			}

			const data = await response.json();
			localStorage.setItem('access_token', data.access_token);
			localStorage.setItem('refresh_token', data.refresh_token);
			if (data.stream_token) {
				localStorage.setItem('stream_token', data.stream_token);
			}

			// Cargar usuario actualizado de la BD (image_avatar, username, etc.) para que la foto y datos se vean en la app y en Stream Chat
			const baseUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
			let userToStore = data.user;
			if (data.user?.id && data.access_token) {
				try {
					const userResp = await fetch(`${baseUrl}/api/users/${data.user.id}`, {
						headers: { Authorization: `Bearer ${data.access_token}` },
					});
					if (userResp.ok) {
						const freshUser = await userResp.json();
						if (freshUser && typeof freshUser === "object") userToStore = freshUser;
					}
				} catch (_) {}
			}
			if (userToStore) {
				updateProfile(userToStore);
			}

			Toastify({
				text: "Login successful",
				duration: 3000,
				destination: "https://github.com/apvarun/toastify-js",
				newWindow: true,
				close: true,
				gravity: "top",
				position: "right",
				stopOnFocus: true,
				style: { background: "rgb(132, 84, 200)" },
				onClick: function () { }
			}).showToast();
			setLoading(false);
			// Navegar en el siguiente tick para que el estado del contexto se actualice antes de montar Home
			setTimeout(() => navigate("/home"), 0);
		} catch (error) {
			console.error("Login error:", error);
			setError("Failed to login. Please check your credentials.");
			setLoading(false);
		}
	}


	return (

		<div className="login-page d-flex justify-content-center align-items-center vh-100">
			{
				loading
					? (
						<img src="https://res.cloudinary.com/dcmqxfpnd/image/upload/v1770485934/Books_stack_xzt4c8.gif" alt="Loading Books..." />
					)
					: (
						<>
							<div className="login-logo-container">
								<img src={logo} alt="Bookie Logo" className="login-logo " />
							</div>
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
										<p><a href="#" className="link-underline-primary">Password forgotten?</a></p>
									</div>

									<button type="submit" className="btn btn-primary w-100">Log in</button>
									<Link to="/signin" className="btn btn-primary w-100 mt-2">Sign up</Link>
								</form>

							</div>
						</>

					)
			}

		</div>

	)
};