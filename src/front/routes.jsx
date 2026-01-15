import React from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

// Importación de Layouts y Componentes
import { Layout } from "./pages/Layout";
import { Header } from "./components/Header";

// Importación de Páginas
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signin } from "./pages/Signin";
import { Chat1 } from "./pages/Chat1";
import { Aboutus } from "./pages/Aboutus";
import { Demo } from "./pages/Demo";
import { Single } from "./pages/Single";
import { ResetPassword } from "./pages/ResetPassword";
import { Profile } from "./pages/Profile";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<h1>Not found!</h1>}>

      {/* 1. RUTAS LIMPIAS (Sin Header ni Navbar) */}
      {/* Al estar fuera de cualquier componente Layout, se verán solas */}
      <Route path="/" element={<Login />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* 2. RUTAS CON HEADER Y NAVBAR LATERAL (Diseño Completo) */}
      {/* Usamos el Layout que configuramos con app-wrapper y main-layout */}
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/aboutus" element={<Aboutus />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/single/:theId" element={<Single />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* 3. RUTA CON SOLO HEADER (Chat) */}
      {/* Aquí envolvemos el Chat directamente en un contenedor con Header */}
      <Route
        path="/chat"
        element={
          <div className="app-wrapper">
            <Header />
            <main className="content-area">
              <Chat1 />
            </main>
          </div>
        }
      />

    </Route>
  )
);