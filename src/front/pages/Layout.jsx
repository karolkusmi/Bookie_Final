import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import ScrollToTop from "../components/ScrollToTop";

export const Layout = () => {
    return (
        <ScrollToTop>
            <div className="app-wrapper">
                {/* El Header siempre arriba */}
                <Header />

                <div className="main-layout">
                    {/* El contenido dinámico a la derecha */}
                    <main className="content-area">
                        <Outlet />
                    </main>
                </div>
            </div>
        </ScrollToTop>
    );
};