import React from 'react';
import odiseaLogo from '../../public/odiseapp.png';
import Meteo from '../../maqueta/Meteo.png';
import Resumen from '../../maqueta/Resumen.png';

function Inicio() {
  return (
    <div className="max-w-screen-lg mx-auto px-4">
     <div className="titulo-seccion">
        <h1>Bienvenido</h1>
        <img src={odiseaLogo} alt="Logo de Odisea" className="w-32 h-auto" />
      </div>
      <div className="imagenes-container">
        <img src={Meteo} alt="Meteo" />
        <img src={Resumen} alt="Resumen" />
      </div>
    </div>
  );
}

export default Inicio;
