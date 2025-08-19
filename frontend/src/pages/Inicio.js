import React from 'react';
import odiseaLogo from '../../public/odiseapp.png';


function Inicio() {
  return (
    <div className="contenedor">
      <div className="titulo-seccion">
        <h1>Bienvenido a Odiseapp</h1>
        <img src={odiseaLogo} alt="Logo de Odisea" className="logo-app" /> 
      </div>
    </div>
  );
}

export default Inicio;