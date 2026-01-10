export const ResetPassword = () => {
    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4 shadow" style={{ width: "350px" }}>

                <h3 className="text-center mb-3">Reset Password</h3>
                <p className="text-center text-muted" style={{ fontSize: "14px" }}>
                    Enter your username and email, and we will send you a link to reset your password.
                </p>

                <form>
                    <div className="mb-3">
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-control"
                            id="username"
                            placeholder="yourusername"
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            id="email"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-100">
                        Send reset link
                    </button>

                    <div className="text-center mt-3">
                        <a href="/" className="link-primary">Back to login</a>
                    </div>
                </form>

            </div>
        </div>
    );
};
