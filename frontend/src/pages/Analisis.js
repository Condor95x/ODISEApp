import React, { useState } from 'react';
import TablePlotAnalysis from '../components/TablePlotAnalysis';
import TableWineBatchAnalysis from '../components/TableWineBatchAnalysis';
import Cuervo from '../../public/Cuervo.png';

function Analisis() {
  const [showPlotAnalysis, setShowPlotAnalysis] = useState(true);
  const [showWineBatchAnalysis, setShowWineBatchAnalysis] = useState(false);
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  const handleShowPlotAnalysis = () => {
    setShowPlotAnalysis(!showPlotAnalysis);
  };

  const handleShowWineBatchAnalysis = () => {
    setShowWineBatchAnalysis(!showWineBatchAnalysis);
  };

  return (
    <div className="Contenedor">
      <div className="titulo-seccion flex gap-20">
        <h1>Análisis</h1>
        <button
          onClick={handleShowPlotAnalysis}
          className={showPlotAnalysis ? 'btn btn-secondary' : 'btn btn-primary'}
        >
          {showPlotAnalysis ? 'Ocultar Análisis de Parcelas' : 'Mostrar Análisis de Parcelas'}
        </button>
        <Spacer width={0.5} />
        <button
          onClick={handleShowWineBatchAnalysis}
          className={showWineBatchAnalysis ? 'btn btn-secondary' : 'btn btn-primary'}
        >
          {showWineBatchAnalysis ? 'Ocultar Análisis de Lotes de Vino' : 'Mostrar Análisis de Lotes de Vino'}
        </button>
      </div>

      {showPlotAnalysis && (
        <div>
          <div className="titulo-seccion">
            <h2>Análisis de Parcelas</h2>
          </div>
          <TablePlotAnalysis />
        </div>
      )}

      {showWineBatchAnalysis && (
        <div>
          <div className="titulo-seccion">
            <h2>Análisis de Lotes de Vino</h2>
          </div>
          <TableWineBatchAnalysis />
        </div>
      )}
      <Spacer width={30} />
      <div class="contenedor-imagen">
        <img
          src={Cuervo}
          alt="Logo de Odisea"
          className="logo-app"
          style={{ width: '50px', height: 'auto' }}
        />
      </div>
    </div>
  );
}

export default Analisis;