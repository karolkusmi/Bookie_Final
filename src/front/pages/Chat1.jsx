import Chat from "../components/Chat/Chat";
import "./Chat1.css";
import portadaLibro from "../assets/img/portada_Libro.png";

export const Chat1 = () => {
    return (
        <div className="page-layout">
            {/* Barra Lateral Izquierda fotos */}
            <aside className="sidebar">
                <div className="book-section">
                    <h4>Your Reading</h4>
                    <img
                        src={portadaLibro}
                        alt="Portada del libro"
                        className="book-cover"
                    />
                    <p className="book-title">El Arte de la Guerra</p>
                </div>

                <div className="readers-section">
                    <h4>Active chat readers</h4>
                    <div className="avatar-group">
                        <img src="https://i.pravatar.cc/40?u=1" alt="user1" className="avatar" />
                        <img src="https://i.pravatar.cc/150?img=47" alt="user2" className="avatar" />
                        <img src="https://i.pravatar.cc/150?img=12" alt="user3" className="avatar" />
                    </div>
                    <p className="readers-count">Aure and 12 others are here right now</p>
                </div>
            </aside>

            {/* Componente Chat */}
            <main className="chat-main">
                <Chat />
            </main>
        </div>
    );
}