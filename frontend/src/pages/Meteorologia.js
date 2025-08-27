import React from 'react';
import Meteo from '../../maqueta/Meteo.png';
import Meteo2 from '../../maqueta/Meteo2.png';
import Meteo3 from '../../maqueta/Meteo3.png';

function Meteorología() {
  return (
    <div className="contenedor">
     <div className="titulo-seccion">
        <h1>La Meteorología de tu finca</h1>
      </div>
      <div className="flex flex-row items-center justify-center gap-12 p-6 bg-white rounded-xl shadow-lg max-w-3xl w-full">
          <img src={Meteo} alt="Meteo" className="logo-app" />
          <img src={Meteo2} alt="Meteo2" className="logo-app" />
          <img src={Meteo3} alt="Meteo3" className="logo-app" />
      </div>
    </div>
  );
}

export default Meteorología;
