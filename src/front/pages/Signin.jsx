import { Link } from "react-router-dom";

export const Signin = () => {
    return (

        <>

            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="card p-4" style={{ width: "350px" }}>
                    <form>
                        <h1 class="text-center">Sign In</h1>
                        <div className="mb-3">
                            <label htmlFor="exampleInputUsername" className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-control"
                                id="exampleInputUsername"
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="exampleInputEmail1" className="form-label">Email address</label>
                            <input
                                type="email"
                                className="form-control"
                                id="exampleInputEmail1"
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
                                id="exampleInputPassword1"
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