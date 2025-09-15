import React,{ useState }  from 'react';
import TableOperaciones from '../components/TableOperaciones';
import Cuervo from '../../public/Cuervo.png';
import VitacoraDeCampo from '../components/VitacoraManagement'

const Finca = () => {
  const [showOperaciones, setShowOperaciones] = useState(true);
  const [showVitacora, setShowVitacora] = useState(false);

  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  const handleShowOperaciones = () => {
    setShowOperaciones(!showOperaciones);
  };

  const handleShowVitacora = () =>{
    setShowVitacora(!showVitacora);
  }
  return (
    <div style={{ display: 'block', width: '100%' }}>
      <div className="titulo-seccion">
        <h1>Gestión de finca</h1>
        <button
          onClick={handleShowOperaciones}
          className={showOperaciones ? 'btn btn-secondary' : 'btn btn-primary'}
          >
          {showOperaciones ? 'Ocultar Cuaderno de campo' : 'Mostrar Cuaderno de campo'}
        </button>
        <Spacer width={0.5} />
                <button
          onClick={handleShowVitacora}
          className={showVitacora ? 'btn btn-secondary' : 'btn btn-primary'}
          >
          {showVitacora ? 'Ocultar Vitacora' : 'Mostrar Vitacora'}
        </button>
        <Spacer width={0.5} />
      </div>
      {showOperaciones && (
        <div>
          <div className="titulo-seccion">
            <h2>Mi cuaderno de campo</h2>
          </div>  
          <TableOperaciones />
        </div>
    )}
      {showVitacora && (
        <div>
          <div className="titulo-seccion">
            <h2>Mi Vitacora de campo</h2>
          </div>  
          <VitacoraDeCampo />
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