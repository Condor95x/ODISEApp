import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { FaHome, FaMapMarkerAlt, FaBox, FaWineGlassAlt,FaChartBar } from 'react-icons/fa';
import { MdAgriculture } from "react-icons/md";
import '../App.css'


const Menu = () => {
  const { user, logout, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true); // Estado para el menú
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Alterna el estado del menú
  };

  return (
    <nav className={`menu ${isMenuOpen ? 'open' : 'collapsed'}`}>
      <div className="menu-toggle" onClick={toggleMenu}>
        {/* Aquí puedes añadir un icono para el toggle */}
        {isMenuOpen ? '✕' : '☰'}
      </div>
      <ul className="menu-items">
        <li>
          <Link to="/">
            <FaHome className="menu-icon" />
            <span className="menu-text">Inicio</span>
          </Link>
        </li>
      {hasModuleAccess('plots') && (
          <li>
              <Link to="/plots">
                  <FaMapMarkerAlt className="menu-icon" />
                  <span className="menu-text">Parcelas</span>
              </Link>
          </li>
      )}

      {hasModuleAccess('finca') && (
          <li>
              <Link to="/finca">
                  <MdAgriculture className="menu-icon" />
                  <span className="menu-text">Finca</span>
              </Link>
          </li>
      )}

      {hasModuleAccess('bodega') && (
          <li>
              <Link to="/bodega">
                  <FaWineGlassAlt className="menu-icon" />
                  <span className="menu-text">Bodega</span>
              </Link>
          </li>
      )}

      {hasModuleAccess('inventory') && (
          <li>
              <Link to="/inventory">
                  <FaBox className="menu-icon" />
                  <span className="menu-text">Inventario</span>
              </Link>
          </li>
      )}

      {hasModuleAccess('analisis') && (
          <li>
            <Link to="/analisis">
              <FaChartBar className="menu-icon" />
              <span className="menu-text">Análisis</span>
            </Link>
          </li>
      )}
      </ul>

      {isMenuOpen && (
        <div className="user-info">
          {user && (
            <>
              <span className="user-name">{user.nombre} ({user.rol})</span>
              <button className="logout-button" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Menu;
