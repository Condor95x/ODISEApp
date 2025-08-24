import React, { useState, useEffect } from 'react';
import { getPlots, activatePlot, getVarieties } from "../services/api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-modal';
import Map from './Map';

function wktToGeoJSON(wkt) {
    try {
      const type = wkt.split('(')[0].trim();
      const coordinatesString = wkt.substring(wkt.indexOf('(') + 1, wkt.lastIndexOf(')'));
      const coordinates = parseCoordinates(coordinatesString, type);
      return {
        type: type === 'POINT' ? 'Point' : type === 'LINESTRING' ? 'LineString' : type === 'POLYGON' ? 'Polygon' : 'GeometryCollection',
        coordinates: coordinates,
      };
    } catch (error) {
      console.error("Error parsing WKT:", error);
      return null;
    }
  }

  function parseCoordinates(coordinatesString, type) {
    if (type === 'POINT') {
      return coordinatesString.split(' ').map(Number);
    } else if (type === 'LINESTRING') {
      return coordinatesString.split(',').map(coord => coord.trim().split(' ').map(Number));
    } else if (type === 'POLYGON') {
      const rings = coordinatesString.split('),(').map(ring => ring.replace(/[()]/g, ''));
      return rings.map(ring => ring.split(',').map(coord => coord.trim().split(' ').map(Number)));
    }
    return [];
  }

  const ArchivedPlotsTable = ({ onPlotActivated, onClose }) => {
    const [archivedPlots, setArchivedPlots] = useState([]);
    const [filterField, setFilterField] = useState("plot_name");
    const [filterValue, setFilterValue] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "plot_id", direction: "asc" });
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapToDisplay, setMapToDisplay] = useState(null);
    const [plotDetails, setPlotDetails] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [varieties, setVarieties] = useState([]); 
    const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

    useEffect(() => {
            const fetchVarieties = async () => { 
              const data = await getVarieties();
              setVarieties(data);
            };
        fetchVarieties();    
        fetchArchivedPlots();
      }, []);
    
    const fetchArchivedPlots = async () => {
        try {
            // Llama a getPlots con activeOnly = false para obtener todas las parcelas
            const data = await getPlots(false);

            if (data && Array.isArray(data)) {
                // Filtra las parcelas donde active es false
                const archivedData = data.filter(plot => plot.active === false);
                setArchivedPlots(archivedData);
            } else {
                throw new Error('Los datos recibidos no son un array');
            }
        } catch (error) {
            console.error("Error al obtener parcelas archivadas:", error);
            setErrorMessage("Error al cargar las parcelas archivadas");
            setShowErrorModal(true);
        }
    };

    const handleActivatePlot = async (plotId) => {
      try {
        await activatePlot(plotId);
        onPlotActivated(); // Notifica al componente Plots para recargar las parcelas activas
        setSuccessMessage("La parcela ha sido activada correctamente");
        setShowSuccessModal(true);
      } catch (error) {
        console.error("Error al activar la parcela:", error);
        setErrorMessage("Error al activar la parcela");
        setShowErrorModal(true);
      }
    };

    const handleSort = (key) => {
      setSortConfig((prev) => ({
        key,
        direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
      }));
    };

    const filteredPlots = archivedPlots.filter((p) => {
      if (!filterValue) return true;
      const value = String(p[filterField] || "").toLowerCase();
      return value.includes(filterValue.toLowerCase());
    });

    const sortedPlots = [...filteredPlots].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    const handleViewPlot = (plot) => {
      if (plot && plot.plot_geom) {
        try {
          const geojson = wktToGeoJSON(plot.plot_geom);
          if (geojson) {
            setMapToDisplay(geojson);
            setShowMapModal(true);
            setPlotDetails(plot);
          }
        } catch (error) {
          console.error("Error al procesar la geometría:", error);
          setErrorMessage("Error al visualizar la parcela");
          setShowErrorModal(true);
        }
      }
    };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Parcelas Archivadas</h2>
          </div>
          <div className="mb-4 p-2 bg-gray-100 rounded">
          <p>Total de parcelas archivadas: {archivedPlots.length}</p>
        </div>
        <div className="flex gap-2 mb-4">
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="plot_id">ID</option>
            <option value="plot_name">Nombre</option>
            <option value="plot_var">Variedad</option>
            <option value="plot_area">Área</option>
          </select>
          <Spacer width={0.2} />
          <input 
            type="text"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder={`Buscar por ${filterField}...`}
            className="border p-2 rounded w-64"
          />
        </div>

        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_id")}>ID</th>
              <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_name")}>Nombre</th>
              <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_var")}>Variedad</th>
              <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_area")}>Área</th>
              <th className="border border-gray-300 p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlots.length > 0 ? (
              sortedPlots.map((plot) => (
                <tr key={`archived-plot-${plot.plot_id}`}>
                  <td className="border border-gray-300 p-2 text-center">{plot.plot_id}</td>
                  <td className="border border-gray-300 p-2">{plot.plot_name}</td>
                  <td className="border border-gray-300 p-2">{varieties.find(v => v.gv_id === plot.plot_var)?.name || plot.plot_var}</td>
                  <td className="border border-gray-300 p-2 text-right">{plot.plot_area}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewPlot(plot)}
                        className="p-2 rounded text-blue-500 hover:text-blue-700"
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                      <button
                        onClick={() => handleActivatePlot(plot.plot_id)}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Activar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="border border-gray-300 p-4 text-center">
                  No hay parcelas archivadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Modal para ver la parcela */}
        <Modal
          isOpen={showMapModal}
          onRequestClose={() => {
            setShowMapModal(false);
            setPlotDetails(null);
          }}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Mapa de Parcela Archivada"
        >
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">Detalles de la Parcela Archivada</h2>
              <div className="mb-4">
                <div className="map-details-container">
                  <div className="leaflet-container">
                    {mapToDisplay && <Map geojson={mapToDisplay} editable={false} />}
                  </div>
                </div>
                {plotDetails && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-4">Información de la Parcela:</h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="font-medium">ID:</dt>
                        <dd>{plotDetails.plot_id}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Nombre:</dt>
                        <dd>{plotDetails.plot_name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Variedad:</dt>
                        <dd>{plotDetails.variety?.name || plotDetails.plot_var}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Área:</dt>
                        <dd>{plotDetails.plot_area}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </div>

        </Modal>

        {/* Modales de éxito y error */}
        <Modal
          isOpen={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Éxito"
        >
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">Éxito</h2>
              <p>{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
              >
                Aceptar
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showErrorModal}
          onRequestClose={() => setShowErrorModal(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Error"
        >
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">Error</h2>
              <p>{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ArchivedPlotsTable;