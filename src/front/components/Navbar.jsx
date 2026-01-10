import { Link } from "react-router-dom";

export const Navbar = () => {

	return (
		<nav className="navbar navbar-light bg-light">
			<div className="container">
				<Link to="/signin">
					<span className="navbar-brand mb-0 h1">Ir a signin</span>
				</Link>
				<div className="ml-auto">
					<Link to="/Aboutus">
						<button className="btn btn-primary">Aboutus</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/">
						<button className="btn btn-primary">Log in</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/reset-password">
						<button className="btn btn-primary">Reset password</button>
					</Link>
				</div>

			</div>
		</nav>
	);
};

