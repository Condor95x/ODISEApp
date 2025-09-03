import React,{ useState }  from 'react';
import TableOperaciones from '../components/TableOperaciones';
import Cuervo from '../../public/Cuervo.png';


const Finca = () => {
  const [showOperaciones, setShowOperaciones] = useState(true);
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  const handleShowOperaciones = () => {
    setShowOperaciones(!showOperaciones);
  };
  return (
    <div className="Contenedor">
      <div className="titulo-seccion">
        <h1>Mi Cuaderno de Campo</h1>
        <button
          onClick={handleShowOperaciones}
          className={showOperaciones ? 'btn btn-secondary' : 'btn btn-primary'}
          >
          {showOperaciones ? 'Ocultar Operaciones' : 'Mostrar Operaciones'}
        </button>
        <Spacer width={0.1} />
      </div>
      {showOperaciones && (
      <div>
        <div className="titulo-seccion">
        <h2>Mis Operaciones</h2>
        </div>  
        <TableOperaciones />
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
}

export default Finca; 