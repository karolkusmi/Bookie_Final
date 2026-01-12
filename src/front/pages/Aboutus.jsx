import "./Aboutus.css";

export const Aboutus = () => {
    return (
        <main className="wrapper_aboutus">
            <section className="container-fluid d-flex flex-column  align-items-center p-5">
                <img className="mb-4 imagen-animada"
                    src="src/front/assets/img/Aboutus_img/logo_bookie.png"
                    alt="Logo Bookie" width={300} />
                <h1 className="text_aboutus_title text-center ">About Us Page</h1>

                <div className="d-flex justify-content-center align-items-center gap-5">
                    <img className="imagen-animada"
                        src="src/front/assets/img/Aboutus_img/libro_izq.png" alt="Imagen de libro parte izquierda" />
                    <p>
                        <strong>Connecting hearts through shared stories.</strong> <br />
                        Bookie is where bovers find their perfect match. Swipe through
                        discover users based on your favorite books and genres,
                        and start meangful conversations that go beyond the cover. Find your <strong>next chapter with Bookie! </strong>
                    </p>
                    <img className="imagen-animada retraso"
                        src="src/front/assets/img/Aboutus_img/libro_der.png"
                        alt="Imagen de libro parte derecha" />
                </div>

            </section>
        </main>
    );
}