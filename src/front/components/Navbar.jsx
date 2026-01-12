import { Link } from "react-router-dom";

export const Navbar = () => {

	return (
		<nav className="navbar navbar-light bg-light">
			<div className="ml-auto">
				<Link to="/">
					<button className="btn btn-primary">Log in</button>
				</Link>
			</div>
			<div className="container">
				<div className="ml-auto">
					<Link to="/signin">
						<button className="btn btn-primary">Sign in</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/Aboutus">
						<button className="btn btn-primary">Aboutus</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/home">
						<button className="btn btn-primary">Home</button>
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

