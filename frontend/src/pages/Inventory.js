import React, { useState } from 'react';
import StockManagement from '../components/StockManagement';
import InputManagement from '../components/InputManagement';
import Cuervo from '../../public/Cuervo.png';

const Inventory = () => {
  const [showInputs, setShowInputs] = useState(false);
  const [showStocks, setShowStocks] = useState(true);
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  const handleShowInputs = () => {
    setShowInputs(!showInputs);
  };
  const handleShowStocks = () => {
    setShowStocks(!showStocks);
  };

  return (
    <div style={{ display: 'block', width: '100%' }}>
      <div className="titulo-seccion">
        <h1>Mis Inventarios</h1>
        <button onClick={handleShowStocks} className={showStocks ? 'btn btn-secondary' : 'btn btn-primary'}>
          {showStocks ? 'Ocultar Stocks' : 'Gestion de Stocks'}
        </button>
        <Spacer width={0.5} />
        <button onClick={handleShowInputs} className={showInputs ? 'btn btn-secondary' : 'btn btn-primary'}>
          {showInputs ? 'Ocultar Inputs' : 'Gestion de Inputs'}
        </button>
      </div>
      {showStocks && (
        <div>
          <div className="titulo-seccion">
          <h2>Mis stocks</h2>
          </div>
          <StockManagement />
        </div>
        )}
      {showInputs && (
        <div>
          <div className="titulo-seccion">
          <h2>Mis Inputs</h2>
          </div>
          <InputManagement />
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
  );
};

export default Inventory;
