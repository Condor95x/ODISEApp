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
      <div className="flex flex-wrap items-center justify-center gap-6 p-6 bg-white rounded-xl shadow-lg max-w-2xl w-full">
          <img src={Meteo} alt="Meteo" className="w-32 h-auto" />
          <img src={Resumen} alt="Resumen" className="w-32 h-auto" />
      </div>
    </div>
  );
}

export default Inicio;
