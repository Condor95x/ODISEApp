import React from 'react';
import Admin from '../../maqueta/Admin.png';

function Administracion() {
  return (
    <div className="contenedor">
     <div className="titulo-seccion">
        <h1>El modulo de Administración</h1>
      </div>
      <div className="flex flex-row items-center justify-center gap-12 p-6 bg-white rounded-xl shadow-lg max-w-3xl w-full">
          <img src={Admin} alt="Admin" className="logo-app" />
      </div>
    </div>
  );
}

export default Administracion()