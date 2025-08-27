import React from 'react';

function Inicio() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 font-sans">
      
      {/* Sección de bienvenida con el logo principal */}
      <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-lg mb-8 max-w-lg w-full">
        <h1>Bienvenido</h1>
        <img 
          src="odiseapp.png" 
          alt="Logo de Odisea" 
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-blue-500 shadow-md transition-transform transform hover:scale-105" 
        />
      </div>

      {/* Contenedor de las dos nuevas imágenes, una al lado de la otra */}
      <div className="flex flex-row items-center justify-center gap-30 p-6 bg-white rounded-xl shadow-lg max-w-2xl w-full">
        <img 
          src="Meteo.png" 
          alt="Icono de Meteo" 
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg shadow-md transition-transform transform hover:scale-105" 
        />
        <img 
          src="Resumen.png" 
          alt="Icono de Resumen" 
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg shadow-md transition-transform transform hover:scale-105" 
        />
      </div>
    </div>
  );
}

export default Inicio;
