import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Si usas React Router
import './App.css';

// Componentes
import { AuthProvider } from './components/AuthContext';
import { ProtectedRoute, ModuleBasedRoute } from './components/ProtectedRoute';
import Menu from './components/Menu';
import Inicio from './pages/Inicio';
import Plots from './pages/Plots'
import Finca from './pages/Finca';
import Bodega from './pages/Bodega';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Analisis from './pages/Analisis';
import FormTelegramPage from './pages/FormTelegramPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Ruta pública para Telegram */}
            <Route path="/form-telegram" element={<FormTelegramPage />} />
            {/* Ruta de login pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas que requieren autenticación */}
             <Route 
                path="/*" 
                element={
                  <ProtectedRoute>
                    <div>          
                      <Menu />
                      <div className="content">
                        <Routes>
                          <Route path="/" index element={<Inicio />} />
                          <Route path="/plots" element={<Plots />} />
                          <Route path="/finca" element={<Finca />} />
                          <Route path="/bodega" element={<Bodega />} />
                          <Route path="/inventory" element={<Inventory />} />
                          <Route path="/Analisis" element={<Analisis />} />
                        </Routes>
                      </div>
                    </div>
                  </ProtectedRoute>
                } 
              />
            {/* Rutas protegidas con acceso basado en módulos */}
            <Route 
              path="/plots" 
              element={
                <ModuleBasedRoute module="plots">
                  <div>
                    <Menu />
                    <div className="content">
                      <Plots />
                    </div>
                  </div>
                </ModuleBasedRoute>
              } 
            />
            
            <Route 
              path="/finca" 
              element={
                <ModuleBasedRoute module="finca">
                  <div>
                    <Menu />
                    <div className="content">
                      <Finca />
                    </div>
                  </div>
                </ModuleBasedRoute>
              } 
            />
            
            <Route 
              path="/bodega" 
              element={
                <ModuleBasedRoute module="bodega">
                  <div>
                    <Menu />
                    <div className="content">
                      <Bodega />
                    </div>
                  </div>
                </ModuleBasedRoute>
              } 
            />
            <Route
              path="/inventory"
              element={
                <ModuleBasedRoute module="inventory">
                  <div>
                    <Menu />
                    <div className="content">
                      <Inventory />
                    </div>
                  </div>
                </ModuleBasedRoute>
              }
            />            

            {/* Ruta para cualquier otra dirección no definida */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>            
  );
}

export default App;
