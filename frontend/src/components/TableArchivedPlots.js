import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getPlotsWithData, 
  activatePlot,
  deletePlot,
  buildSearchFilters 
} from "../services/api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-modal';
import Map from './Map';

// Utility function to convert WKT to GeoJSON (same as TablePlots)
export function wktToGeoJSON(wkt) {
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

export function parseCoordinates(coordinatesString, type) {
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
  // State management
  const [archivedPlots, setArchivedPlots] = useState([]);
  const [metadata, setMetadata] = useState({
    varieties: [],
    rootstocks: [],
    conduction: [],
    management: [],
    sectors: []
  });
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Filter and sort state
  const [filterField, setFilterField] = useState("plot_name");
  const [filterValue, setFilterValue] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "plot_id", direction: "asc" });
  const [groupBy, setGroupBy] = useState(null);
  
  // Map and plot details
  const [mapToDisplay, setMapToDisplay] = useState(null);
  const [plotDetails, setPlotDetails] = useState(null);

  //DeletePlot
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [isSliderCompleted, setIsSliderCompleted] = useState(false);

  // Optimized data fetching function
  const fetchArchivedPlotsData = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      
      const searchFilters = buildSearchFilters({
        filterField: filterField,
        filterValue: filterValue?.trim(),
        includeArchived: true, // Only archived plots
        activeOnly: false, // Include inactive plots
        ...customFilters
      });
      
      const data = await getPlotsWithData(searchFilters);
      
      // Filter only archived plots (active === false)
      const archivedData = (data.plots || []).filter(plot => plot.active === false);
      
      setArchivedPlots(archivedData);
      setMetadata(data.metadata || {
        varieties: [],
        rootstocks: [],
        conduction: [],
        management: [],
        sectors: []
      });
      
    } catch (error) {
      console.error("Error al cargar parcelas archivadas:", error);
      setErrorMessage(error.userMessage || "Error al cargar las parcelas archivadas");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, [filterField, filterValue]);

  // Initial data load
  useEffect(() => {
    fetchArchivedPlotsData();
  }, [fetchArchivedPlotsData]);

  // Debounced filter effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchArchivedPlotsData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filterField, filterValue]);

  // Utility functions
  const handleGroupByChange = (e) => {
    setGroupBy(e.target.value === "none" ? null : e.target.value);
  };

  const groupPlots = useCallback((data, groupBy) => {
    return data.reduce((acc, plot) => {
      let key;
      if (groupBy === 'plot_var') {
        const variety = metadata.varieties.find(v => v.gv_id === plot.plot_var);
        key = variety ? variety.name : 'Sin variedad';
      } else if (groupBy === 'plot_rootstock') {
        const rootstock = metadata.rootstocks.find(r => r.gv_id === plot.plot_rootstock);
        key = rootstock ? rootstock.name : 'Sin portainjerto';
      } else if (groupBy === 'sector_id') {
        const sector = metadata.sectors.find(s => s.sector_id === plot.sector_id);
        key = sector ? sector.etiqueta : 'Sin sector';
      } else if (groupBy === 'plot_conduction') {
        const conduction = metadata.conduction.find(c => c.vy_id === plot.plot_conduction);
        key = conduction ? conduction.value : 'Sin sistema de conducción';
      } else if (groupBy === 'plot_management') {
        const management = metadata.management.find(m => m.vy_id === plot.plot_management);
        key = management ? management.value : 'Sin tipo de manejo';
      } else {
        key = plot[groupBy] || 'Sin valor';
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(plot);
      return acc;
    }, {});
  }, [metadata]);

  const sortedPlots = useMemo(() => {
    return [...archivedPlots].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [archivedPlots, sortConfig]);

  const groupedPlots = useMemo(() => {
    return groupBy ? groupPlots(sortedPlots, groupBy) : { 'all': sortedPlots };
  }, [sortedPlots, groupBy, groupPlots]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Utility functions
  const getGroupDisplayName = (groupBy) => {
    const names = {
      'plot_var': 'Variedad',
      'plot_rootstock': 'Portainjerto', 
      'sector_id': 'Sector',
      'plot_conduction': 'Sistema de Conducción',
      'plot_management': 'Tipo de Manejo'
    };
    return names[groupBy] || groupBy;
  };

  const handleActivatePlot = async (plotId) => {
    try {
      await activatePlot(plotId);
      
      // Reload archived plots data
      await fetchArchivedPlotsData();
      
      // Notify parent component
      if (onPlotActivated) {
        onPlotActivated();
      }
      
      setSuccessMessage("La parcela ha sido activada correctamente.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al activar la parcela:", error);
      setErrorMessage(error.userMessage || "Error al activar la parcela");
      setShowErrorModal(true);
    }
  };

  const handleViewPlot = (plot) => {
    if (plot && plot.plot_geom && typeof plot.plot_geom === 'string') {
      try {
        const geojson = wktToGeoJSON(plot.plot_geom);
        if (geojson) {
          setMapToDisplay(geojson);
          setShowMapModal(true);
          setPlotDetails(plot);
        } else {
          console.error("Error al convertir a GeoJSON: WKT inválido", plot.plot_geom);
          setErrorMessage("Error al visualizar la parcela: WKT inválido.");
          setShowErrorModal(true);
        }
      } catch (error) {
        console.error("Error al procesar la geometría:", error);
        setErrorMessage("Error al visualizar la parcela.");
        setShowErrorModal(true);
      }
    } else {
      console.error("Parcela no encontrada o sin geometría válida:", plot ? plot.plot_geom : "No encontrada");
      setErrorMessage("Parcela no encontrada o sin geometría.");
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="flex justify-center items-center">
            <div className="text-lg flex items-center">
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Cargando parcelas archivadas...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleDeletePlot = async (plotId) => {
    try {
      // Importar deletePlot desde api.js
      await deletePlot(plotId);
      
      // Reload archived plots data
      await fetchArchivedPlotsData();
      
      // Notify parent component
      if (onPlotActivated) {
        onPlotActivated();
      }
      
      setSuccessMessage("La parcela ha sido eliminada permanentemente.");
      setShowSuccessModal(true);
      setShowDeleteConfirmModal(false);
      setPlotToDelete(null);
      resetSlider();
    } catch (error) {
      console.error("Error al eliminar la parcela:", error);
      setErrorMessage(error.userMessage || "Error al eliminar la parcela");
      setShowErrorModal(true);
    }
  };

  const resetSlider = () => {
    setSliderValue(0);
    setIsSliderCompleted(false);
  };

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);
    setIsSliderCompleted(value >= 90);
    
    if (value >= 90) {
      handleDeletePlot(plotToDelete.plot_id);
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

        <div className="filter-controls-container">
          <div className="control-group">
            <label htmlFor="groupingFieldArchivedPlots" className="control-label">
              Agrupar por:
            </label>
            <select
              id="groupingFieldArchivedPlots"
              value={groupBy || "none"}
              onChange={handleGroupByChange}
              className="control-select"
            >
              <option value="none">Sin Agrupación</option>
              <option value="sector_id">Sector</option>
              <option value="plot_var">Variedad</option>
              <option value="plot_rootstock">Portainjerto</option>
              <option value="plot_conduction">Sistema de Conducción</option>
              <option value="plot_management">Tipo de Manejo</option>
            </select>
          </div>
          
          <div className="control-group">
            <label htmlFor="FilterFieldArchivedPlot" className="control-label">
              Filtrar por:
            </label>
            <div className="filter-inputs">
              <select
                id="FilterFieldArchivedPlot"
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="control-select filter-field"
              >
                <option value="plot_id">ID</option>
                <option value="plot_name">Nombre</option>
                <option value="sector_id">Sector</option>
                <option value="plot_var">Variedad</option>
                <option value="plot_rootstock">Portainjerto</option>
                <option value="plot_conduction">Sistema de Conducción</option>
                <option value="plot_management">Tipo de Manejo</option>
                <option value="plot_area">Área</option>
              </select>
              <input
                id="FilterValueArchivedPlot" 
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={`Buscar por ${filterField}...`}
                className="control-input"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {Object.entries(groupedPlots).map(([group, plots]) => (
          <div key={group} className="mb-4">
            {groupBy && <h3 className="titulo-seccion">{`${getGroupDisplayName(groupBy)}: ${group}`}</h3>}
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_name")}>
                    Nombre
                  </th>
                  <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("sector_id")}>
                    Sector
                  </th>
                  <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_var")}>
                    Variedad
                  </th>
                  <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_area")}>
                    Área
                  </th>
                  <th className="border border-gray-300 p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plots.length > 0 ? (
                  plots.map((plot) => (
                    <tr key={`archived-plot-${group}-${plot.plot_id}`}>
                      <td className="border border-gray-300 p-2">{plot.plot_name}</td>
                      <td className="border border-gray-300 p-2">
                        {metadata.sectors.find(s => s.sector_id === plot.sector_id)?.etiqueta || 'Sin sector'}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {metadata.varieties.find(v => v.gv_id === plot.plot_var)?.name || 'Sin variedad'}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">{plot.plot_area || 'N/A'}</td>
                      <td className="border border-gray-300 p-2 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewPlot(plot)}
                            className="p-2 rounded text-blue-500 hover:text-blue-700"
                            title="Ver detalles"
                          >
                            <FontAwesomeIcon icon={faSearch} />
                          </button>
                          <button
                            onClick={() => handleActivatePlot(plot.plot_id)}
                            className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                            title="Activar parcela"
                          >
                            Activar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="border border-gray-300 p-4 text-center">
                      No hay parcelas archivadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {/* Modal para ver la parcela archivada - Estilo mejorado */}
        <Modal
          isOpen={showMapModal}
          onRequestClose={() => {
            setShowMapModal(false);
            setPlotDetails(null);
          }}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Detalles de Parcela Archivada"
        >
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">Detalles de la Parcela Archivada</h2>

              <div className="modal-form-grid"> {/* Contenedor para las columnas */}
                <div className="modal-column"> {/* Columna 1 - Mapa */}
                  <div className="mb-4">
                    <span className="modal-form-label">Ubicación:</span>
                    <div className="leaflet-container" style={{ height: '300px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      {mapToDisplay && (
                        <Map 
                          geojson={mapToDisplay} 
                          editable={false}
                          showPopup={false}
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="modal-column"> {/* Columna 2 - Información básica */}
                  {plotDetails && (
                    <>
                      <div className="mb-4">
                        <label className="modal-form-label" htmlFor="plotName">Nombre:</label>
                        <input
                          id="plotName"
                          type="text"
                          value={plotDetails.plot_name}
                          className="modal-form-input"
                          readOnly
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="modal-form-label" htmlFor="plotSector">Sector:</label>
                        <input
                          id="plotSector"
                          type="text"
                          value={metadata.sectors.find(s => s.sector_id === plotDetails.sector_id)?.etiqueta || 'Sin sector'}
                          className="modal-form-input"
                          readOnly
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="modal-form-label" htmlFor="plotVariety">Variedad:</label>
                        <input
                          id="plotVariety"
                          type="text"
                          value={metadata.varieties.find(v => v.gv_id === plotDetails.plot_var)?.name || 'Sin variedad'}
                          className="modal-form-input"
                          readOnly
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="modal-form-label" htmlFor="plotRootstock">Portainjerto:</label>
                        <input
                          id="plotRootstock"
                          type="text"
                          value={metadata.rootstocks.find(r => r.gv_id === plotDetails.plot_rootstock)?.name || 'Sin portainjerto'}
                          className="modal-form-input"
                          readOnly
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {plotDetails && (
                <div className="modal-form-grid mt-4"> {/* Segunda fila de información */}
                  <div className="modal-column">
                    <div className="mb-4">
                      <label className="modal-form-label" htmlFor="plotImplantYear">Año de implantación:</label>
                      <input
                        id="plotImplantYear"
                        type="text"
                        value={plotDetails.plot_implant_year || 'Sin especificar'}
                        className="modal-form-input"
                        readOnly
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="modal-form-label" htmlFor="plotCreationYear">Año de creación:</label>
                      <input
                        id="plotCreationYear"
                        type="text"
                        value={plotDetails.plot_creation_year || 'Sin especificar'}
                        className="modal-form-input"
                        readOnly
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="modal-form-label" htmlFor="plotArea">Área:</label>
                      <input
                        id="plotArea"
                        type="text"
                        value={plotDetails.plot_area ? `${plotDetails.plot_area} m²` : 'No calculada'}
                        className="modal-form-input"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="modal-column">
                    <div className="mb-4">
                      <label className="modal-form-label" htmlFor="plotConduction">Sistema de conducción:</label>
                      <input
                        id="plotConduction"
                        type="text"
                        value={metadata.conduction.find(c => c.vy_id === plotDetails.plot_conduction)?.value || 'Sin especificar'}
                        className="modal-form-input"
                        readOnly
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="modal-form-label" htmlFor="plotManagement">Tipo de manejo:</label>
                      <input
                        id="plotManagement"
                        type="text"
                        value={metadata.management.find(m => m.vy_id === plotDetails.plot_management)?.value || 'Sin especificar'}
                        className="modal-form-input"
                        readOnly
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="modal-form-label" htmlFor="plotDescription">Descripción:</label>
                      <input
                        id="plotDescription"
                        type="text"
                        value={plotDetails.plot_description || 'Sin descripción'}
                        className="modal-form-input"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="modal-buttons mt-4">
                <button
                  onClick={() => {
                    setShowMapModal(false);
                    setPlotDetails(null);
                  }}
                  className="btn btn-secondary"
                  type="button"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setPlotToDelete(plotDetails);
                    setShowDeleteConfirmModal(true);
                  }}
                  className="btn btn-danger mr-2"
                  title="Eliminar permanentemente"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => handleActivatePlot(plotDetails.plot_id)}
                  className="btn btn-primary"
                  type="button"
                >
                  Activar Parcela
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de éxito */}
        <Modal
          isOpen={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Éxito"
        >
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title text-green-600">✓ Operación Exitosa</h2>
              <div className="modal-message">
                <p className="text-gray-700">{successMessage}</p>
              </div>
              <div className="modal-buttons">
                <button 
                  onClick={() => setShowSuccessModal(false)} 
                  className="btn btn-primary"
                  type="button"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de error */}
        <Modal
          isOpen={showErrorModal}
          onRequestClose={() => setShowErrorModal(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Error"
        >
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title text-red-600">⚠ Error</h2>
              <div className="modal-message">
                <p className="text-gray-700">{errorMessage}</p>
              </div>
              <div className="modal-buttons">
                <button 
                  onClick={() => setShowErrorModal(false)} 
                  className="btn btn-primary"
                  type="button"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de confirmación de eliminación con slider */}
        <Modal
          isOpen={showDeleteConfirmModal}
          onRequestClose={() => {
            setShowDeleteConfirmModal(false);
            setPlotToDelete(null);
            resetSlider();
          }}
          className="modal-content"
          overlayClassName="modal-overlay"
          contentLabel="Confirmar Eliminación"
        >
          <div className="modal-wrapper">
            <div className="modal-content p-6">
              <h2 className="modal-title"><FontAwesomeIcon icon={faTriangleExclamation} /> Eliminar Permanentemente</h2>
              <p className="mb-6 text-gray-700">
                Estás a punto de eliminar permanentemente la parcela <label className="control-label"><strong>{plotToDelete?.plot_name}</strong></label>.
                <br />
                <span className="text-sm text-red-500 font-semibold">
                  Esta acción NO se puede deshacer.
                </span>
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desliza hacia la derecha para confirmar la eliminación:
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${sliderValue}%, #e5e7eb ${sliderValue}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">

                  </div>
                </div>

              </div>
              
              <div className="modal-buttons mt-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setPlotToDelete(null);
                    resetSlider();
                  }}
                  className="btn btn-secondary"
                  type="button"
                  disabled={isSliderCompleted}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ArchivedPlotsTable;