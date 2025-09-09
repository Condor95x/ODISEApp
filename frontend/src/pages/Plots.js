import React, { useState } from 'react';
import TablePlots from '../components/TablePlots';
import ArchivedPlotsTable from '../components/TableArchivedPlots';
import SectorsManagement from '../components/SectorsManagement';
import FincaManagement from '../components/FincaManagement';
import PlotMapComponent from '../components/PlotMapComponent';
import Cuervo from '../../public/Cuervo.png';

const Plots = () => {
  const [showArchivedPlots, setShowArchivedPlots] = useState(false);
  const [showActivePlots, setShowActivePlots] = useState(true);
  const [showSectors, setShowSectors] = useState(false);
  const [showFincas, setShowFincas] = useState(false);

  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  const handleShowArchivedPlots = () => {
    setShowArchivedPlots(!showArchivedPlots);
  };

  const handleShowActivePlots = () => {
    setShowActivePlots(!showActivePlots);
  };

  const handleShowSectors = () => {
    setShowSectors(!showSectors);
  };

  const handleShowFincas = () => {
    setShowFincas(!showFincas);
  };

  const handlePlotActivatedFromArchive = () => {
    // Esta función no necesita hacer nada por ahora
  };

  return (
    <div className="Contenedor">
      {/* Mapa fijo a la derecha en desktop, arriba en móvil */}
      <div className="plot-map-wrapper">
        <PlotMapComponent />
      </div>

      {/* Contenido principal */}
      <div className="plots-main-content">
        <div className="titulo-seccion">
          <h1>Mis parcelas</h1>
        </div>

        <div className="titulo-seccion">
          <button
            onClick={handleShowActivePlots}
            className={showActivePlots ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showActivePlots ? 'Ocultar Parcelas' : 'Parcelas'}
          </button>

          <Spacer width={0.5} />

          <button
            onClick={handleShowArchivedPlots}
            className={showArchivedPlots ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showArchivedPlots ? 'Ocultar Parcelas Archivadas' : 'Parcelas Archivadas'}
          </button>

          <Spacer width={0.5} />

          <button
            onClick={handleShowSectors}
            className={showSectors ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showSectors ? 'Ocultar Sectores' : 'Sectores'}
          </button>
          
          <Spacer width={0.5} />
          
          <button
            onClick={handleShowFincas}
            className={showFincas ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showFincas ? 'Ocultar Fincas' : 'Fincas'}
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
            <ArchivedPlotsTable onPlotActivated={handlePlotActivatedFromArchive} />
          </div>
        )}

        {showSectors && (
          <div>
            <div className="titulo-seccion">
              <h2>Mis Sectores</h2>
            </div>
            <SectorsManagement />
          </div>
        )}

        {showFincas && (
          <div>
            <div className="titulo-seccion">
              <h2>Mis Fincas</h2>
            </div>
            <FincaManagement />
          </div>
        )}

        <Spacer width={30} />
        <div className="contenedor-imagen">
          <img
            src={Cuervo}
            alt="Logo de Odisea"
            className="logo-app"
            style={{ width: '100px', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Plots;