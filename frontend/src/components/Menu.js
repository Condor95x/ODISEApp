import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { FaHome, FaMapMarkerAlt, FaBox, FaWineGlassAlt, FaChartBar, FaSignOutAlt, FaCloudSun, FaCog } from 'react-icons/fa';
import { MdAgriculture } from "react-icons/md";
import '../App.css'

const Menu = () => {
  const { user, logout, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Función para verificar acceso a Meteorología
  const hasWeatherAccess = () => {
    return user && (user.rol === 'tecnico finca' || user.rol === 'administrador');
  };

  // Función para verificar acceso a Administración
  const hasAdminAccess = () => {
    return user && user.rol === 'administrador';
  };

  return (
    <nav className={`menu ${isMenuOpen ? 'open' : 'collapsed'}`}>
      <div className="menu-toggle" onClick={toggleMenu}>
        {isMenuOpen ? '✕' : '☰'}
      </div>
      
      <ul className="menu-items">
        <li>
          <Link to="/" className="menu-link">
            <FaHome className="menu-icon" />
            <span className="menu-text">Inicio</span>
          </Link>
        </li>
        
        {hasModuleAccess('plots') && (
          <li>
            <Link to="/plots" className="menu-link">
              <FaMapMarkerAlt className="menu-icon" />
              <span className="menu-text">Parcelas</span>
            </Link>
          </li>
        )}

        {hasModuleAccess('finca') && (
          <li>
            <Link to="/finca" className="menu-link">
              <MdAgriculture className="menu-icon" />
              <span className="menu-text">Cuaderno de Campo</span>
            </Link>
          </li>
        )}

        {hasModuleAccess('bodega') && (
          <li>
            <Link to="/bodega" className="menu-link">
              <FaWineGlassAlt className="menu-icon" />
              <span className="menu-text">Cuaderno de Bodega</span>
            </Link>
          </li>
        )}

        {hasModuleAccess('inventory') && (
          <li>
            <Link to="/inventory" className="menu-link">
              <FaBox className="menu-icon" />
              <span className="menu-text">Inventario</span>
            </Link>
          </li>
        )}

        {hasModuleAccess('analisis') && (
          <li>
            <Link to="/analisis" className="menu-link">
              <FaChartBar className="menu-icon" />
              <span className="menu-text">Análisis</span>
            </Link>
          </li>
        )}

        {hasWeatherAccess() && (
          <li>
            <Link to="/Meteorologia" className="menu-link">
              <FaCloudSun className="menu-icon" />
              <span className="menu-text">Meteorología</span>
            </Link>
          </li>
        )}

        {hasAdminAccess() && (
          <li>
            <Link to="/administracion" className="menu-link">
              <FaCog className="menu-icon" />
              <span className="menu-text">Administración</span>
            </Link>
          </li>
        )}
      </ul>

      {/* User info siempre visible, pero adaptable según el tamaño de pantalla */}
      <div className="user-info">
        {user && (
          <>
            <span className="user-name">{user.nombre} ({user.rol})</span>
            <button className="logout-button" onClick={handleLogout}>
              <FaSignOutAlt className="logout-icon" />
              <span className="logout-text">Cerrar Sesión</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Menu;
