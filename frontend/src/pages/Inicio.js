import React from 'react';
import odiseaLogo from '../../public/odiseapp.png';
import Meteo from '../../maqueta/Meteo.png';
import Resumen from '../../maqueta/Resumen.png';

function Inicio() {
  return (
    <div style={{ display: 'block', width: '100%' }}>
     <div className="titulo-seccion">
        <h1>Bienvenido</h1>
        <img src={odiseaLogo} alt="Logo de Odisea" className="logo-app" />
      </div>
      <div className="flex flex-row items-center justify-center gap-12 p-6 bg-white rounded-xl shadow-lg max-w-2xl w-full">
          <img src={Meteo} alt="Meteo" className="logo-app" />
          <img src={Resumen} alt="Resumen" className="logo-app" />
      </div>
    </div>
  );
}

export default Inicio;
