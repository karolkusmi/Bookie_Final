import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Header } from "../components/Header";
import ScrollToTop from "../components/ScrollToTop";
import { Mylibrary } from "./pages/Mylibrary";

export const Layout = () => {
    return (
        <ScrollToTop>
            <div className="app-wrapper">
                {/* El Header siempre arriba */}
                <Header />

                <div className="main-layout">
                    {/* El Navbar a la izquierda */}
                    <aside className="sidebar-container">
                        <Navbar />
                    </aside>

                    {/* El contenido dinámico a la derecha */}
                    <main className="content-area">
                        <Outlet />
                    </main>
                </div>
            </div>
        </ScrollToTop>
    );
};