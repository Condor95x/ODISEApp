import React, { useState } from 'react';
import TablePlots from '../components/TablePlots';
import ArchivedPlotsTable from '../components/TableArchivedPlots';
import Cuervo from '../../public/Cuervo.png';

const Plots = () => {
  const [showArchivedPlots, setShowArchivedPlots] = useState(false);
  const [showActivePlots, setShowActivePlots] = useState(true); // Mostrar parcelas activas por defecto
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  const handleShowArchivedPlots = () => {
    setShowArchivedPlots(!showArchivedPlots);
  };

  const handleShowActivePlots = () => {
    setShowActivePlots(!showActivePlots);
  };

  const handlePlotActivatedFromArchive = () => {
    // Esta función no necesita hacer nada por ahora,
    // pero asegura que la prop onPlotActivated sea una función.
    console.log("Parcela activada (sin acción específica en Plots)");
  };

  return (
    <div className="Contenedor">
      <div className="titulo-seccion">
        <h1>Mis parcelas</h1>
        <button
          onClick={handleShowActivePlots}
          className={showActivePlots ? 'btn btn-secondary' : 'btn btn-primary'}
          >
          {showActivePlots ? 'Ocultar parcelas' : 'Ver parcelas'}
        </button>
        <Spacer width={0.5} />
        <button
          onClick={handleShowArchivedPlots}
          className={showArchivedPlots ? 'btn btn-secondary' : 'btn btn-primary'}
          >
          {showArchivedPlots ? 'Ocultar parcelas archivadas' : 'Ver parcelas archivadas'}
        </button>
      </div>

      {showActivePlots && (
        <div>
          <div className="titulo-seccion">
          <h2>Parcelas Activas</h2>
          </div>
          <TablePlots />
        </div>
      )}



      {showArchivedPlots && (
        <div>
          <div className="titulo-seccion">
          <h2>Mis parcelas archivadas</h2>
          </div>
          <ArchivedPlotsTable  onPlotActivated={handlePlotActivatedFromArchive}  />
        </div>
      )}
      <Spacer width={30} />
      <div class="contenedor-imagen">
        <img
          src={Cuervo}
          alt="Logo de Odisea"
          className="logo-app"
          style={{ width: '100px', height: 'auto' }}
        />
      </div>
    </div>
  );
};

export default Plots;