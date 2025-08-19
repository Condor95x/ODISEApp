import React, { useState, useEffect, useRef } from "react";
import { getPlots, createPlot, updatePlot, deletePlot, archivePlot, getRootstocks, getVarieties, getConduction, getManagement } from "../services/api";
import Papa from "papaparse";
import Modal from 'react-modal';
import 'leaflet/dist/leaflet.css';
import Map from './Map';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Terraformer from 'terraformer-wkt-parser';
import Select from 'react-select';

Modal.setAppElement('#root');

function wktToGeoJSON(wkt) {
  try {
    const type = wkt.split('(')[0].trim();
    const coordinatesString = wkt.substring(wkt.indexOf('(') + 1, wkt.lastIndexOf(')'));
    const coordinates = parseCoordinates(coordinatesString, type);
    return {
      type: "Feature",
      geometry: {
        type: type === 'POINT' ? 'Point' : type === 'LINESTRING' ? 'LineString' : type === 'POLYGON' ? 'Polygon' : 'GeometryCollection',
        coordinates: coordinates,
      }
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

const fieldConfig = [
  { key: 'plot_id', label: 'ID', type: 'text', disabled: true },
  { key: 'plot_name', label: 'Nombre', type: 'text' },
  { key: 'plot_var', label: 'Variedad', type: 'select', options: 'varieties' },
  { key: 'plot_rootstock', label: 'Portainjerto', type: 'select', options: 'rootstocks' },
  { key: 'plot_implant_year', label: 'Año de implantación', type: 'number' },
  { key: 'plot_creation_year', label: 'Año de creación', type: 'number' },
  { key: 'plot_conduction', label: 'Sistema de conducción', type: 'select', options: 'conduction' },
  { key: 'plot_management', label: 'Tipo de manejo', type: 'select', options: 'management' },
  { key: 'plot_description', label: 'Descripción', type: 'textarea' },
  { key: 'plot_area', label: 'Área', type: 'text', disabled: true },
];

const TablePlots = () => {
  const [plots, setPlots] = useState([]);
  const [selectedPlots, setSelectedPlots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newPlot, setNewPlot] = useState({
    plot_name: "",
    plot_var: "",
    plot_rootstock: "",
    plot_implant_year: "",
    plot_creation_year: "",
    plot_conduction: "",
    plot_management: "",
    plot_description: "",
    plot_geom: null
  });
  const [sortConfig, setSortConfig] = useState({ key: "plot_id", direction: "asc" });
  const [filterField, setFilterField] = useState("plot_name");
  const [filterValue, setFilterValue] = useState("");
  
  // Estados específicos para el modal de visualización/edición
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPlot, setCurrentPlot] = useState(null);
  const [plotGeoJSON, setPlotGeoJSON] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  // Estados para mensajes
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Estados para datos de referencia
  const [varieties, setVarieties] = useState([]); 
  const [rootstocks, setRootstocks] = useState([]);
  const [conduction, setConduction] = useState([]);
  const [management, setManagement] = useState([]);
  
  // Estados para modal de archivo
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [plotToArchive, setPlotToArchive] = useState(null);
  
  // Referencias para los mapas
  const createMapRef = useRef(null);
  const viewEditMapRef = useRef(null);
  
  // Estados específicos para el modal de creación
  const [createPlotGeoJSON, setCreatePlotGeoJSON] = useState(null);

  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  useEffect(() => {
    const fetchPlots = async () => {
      const data = await getPlots();
      setPlots(data);
    };
    
    const fetchVarieties = async () => { 
      const data = await getVarieties();
      setVarieties(data);
    };
    
    const fetchRootstocks = async () => {
      const data = await getRootstocks();
      setRootstocks(data);
    };

    const fetchmanagement = async () => {
      const data = await getManagement();
      setManagement(data);
    };
    
    const fetchconduction = async () => {
      const data = await getConduction();
      setConduction(data);
    };

    fetchconduction();
    fetchmanagement();
    fetchPlots();
    fetchVarieties();
    fetchRootstocks();
  }, []);

  const filteredPlots = Array.isArray(plots)
    ? plots.filter((p) => {
        if (!filterValue) return true;
        const value = String(p[filterField] || "").toLowerCase();
        return value.includes(filterValue.toLowerCase());
      })
    : [];

  const sortedPlots = [...filteredPlots].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPlots(plots.map((plot) => plot.plot_id));
    } else {
      setSelectedPlots([]);
    }
  };

  const handleDownloadCSV = () => {
    const selectedData = plots.filter((p) => selectedPlots.includes(p.plot_id));
    
    const transformedData = selectedData.map(plot => ({
      ID: plot.plot_id,
      Nombre: plot.plot_name,
      Variedad: varieties.find(v => v.gv_id === plot.plot_var)?.name || 'No especificada',
      Portainjerto: rootstocks.find(r => r.gv_id === plot.plot_rootstock)?.name || 'No especificado',
      'Año de Implantación': plot.plot_implant_year || 'No especificado',
      'Año de Creación': plot.plot_creation_year || 'No especificado',
      'Sistema de Conducción': conduction.find(c => c.value === plot.plot_conduction)?.value || 'No especificado',
      'Tipo de Manejo': management.find(m => m.value === plot.plot_management)?.value || 'No especificado',
      Descripción: plot.plot_description || '',
      'Área (m²)': plot.plot_area || 'No calculada'
    }));

    const csv = Papa.unparse(transformedData);
    
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;
    
    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    
    if (link.download !== undefined) {
      const url = window.URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `parcelas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  // Función para visualizar una parcela
  const handleViewPlot = (plot) => {
    if (plot && plot.plot_geom && typeof plot.plot_geom === 'string') {
      try {
        console.log("Datos de parcela a visualizar:", plot);
        const geojson = wktToGeoJSON(plot.plot_geom);
        if (geojson) {
          setCurrentPlot(plot);
          setPlotGeoJSON(geojson);
          setIsEditingDetails(false);
          setShowViewModal(true);
        } else {
          console.error("Error al convertir a GeoJSON: WKT inválido", plot.plot_geom);
          alert("Error al visualizar la parcela: WKT inválido.");
        }
      } catch (error) {
        console.error("Error al procesar la geometría:", error);
        alert("Error al visualizar la parcela.");
      }
    } else {
      console.error("Parcela no encontrada o sin geometría válida:", plot ? plot.plot_geom : "No encontrada");
      alert("Parcela no encontrada o sin geometría.");
    }
  };

  // Función para habilitar edición
  const handleEditDetails = () => {
    setIsEditingDetails(true);
  };

  // Función para cancelar edición
  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    // Restaurar datos originales si es necesario
    if (currentPlot) {
      const geojson = wktToGeoJSON(currentPlot.plot_geom);
      setPlotGeoJSON(geojson);
    }
  };

  // Función para guardar cambios
  const handleSaveDetails = async () => {
    try {
      const updatedPlotDetails = { ...currentPlot };
      
      // Verificar si los valores de select son objetos y extraer los IDs
      if (typeof updatedPlotDetails.plot_var === 'object' && updatedPlotDetails.plot_var !== null) {
        updatedPlotDetails.plot_var = updatedPlotDetails.plot_var.gv_id || updatedPlotDetails.plot_var.value;
      }
      
      if (typeof updatedPlotDetails.plot_rootstock === 'object' && updatedPlotDetails.plot_rootstock !== null) {
        updatedPlotDetails.plot_rootstock = updatedPlotDetails.plot_rootstock.gv_id || updatedPlotDetails.plot_rootstock.value;
      }

      if (typeof updatedPlotDetails.plot_conduction === 'object' && updatedPlotDetails.plot_conduction !== null) {
        updatedPlotDetails.plot_conduction = updatedPlotDetails.plot_conduction.value;
      }

      if (typeof updatedPlotDetails.plot_management === 'object' && updatedPlotDetails.plot_management !== null) {
        updatedPlotDetails.plot_management = updatedPlotDetails.plot_management.value;
      }

      console.log("Enviando datos actualizados:", updatedPlotDetails);
      
      const updatedPlot = await updatePlot(updatedPlotDetails.plot_id, updatedPlotDetails);
      setPlots(plots.map((p) => (p.plot_id === updatedPlot.plot_id ? updatedPlot : p)));
      setIsEditingDetails(false);
      setShowViewModal(false);
      setCurrentPlot(null);
      setPlotGeoJSON(null);
      setSuccessMessage("Los detalles de la parcela han sido actualizados.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al guardar los detalles:", error);
      setErrorMessage("Error al guardar los detalles: " + error.message);
      setShowErrorModal(true);
    }
  };

  // Función para manejar cambios en la geometría durante edición
  const handleEditGeometryChange = (geojson) => {
    console.log("Nueva geometría capturada (edición):", geojson);
    if (geojson && geojson.geometry) {
      const wktGeometry = Terraformer.convert(geojson.geometry);
      setCurrentPlot((prevPlot) => ({
        ...prevPlot,
        plot_geom: wktGeometry,
      }));
      setPlotGeoJSON(geojson);
    }
  };

  // Función para crear una nueva parcela
  const handleCreatePlot = async () => {  
    if (!newPlot.plot_name || !newPlot.plot_var) {
        alert("Por favor, completa los campos obligatorios: Nombre y Variedad.");
        return;
    }
    if (!createPlotGeoJSON) {
        alert("Por favor, dibuja la parcela en el mapa.");
        return;
    }
    try {
        const selectedVariety = varieties.find((v) => v.name === newPlot.plot_var);
        const selectedRootstock = rootstocks.find((r) => r.name === newPlot.plot_rootstock);
        const selectedConduction = conduction.find((c) => c.value === newPlot.plot_conduction);
        const selectedManagement = management.find((m) => m.value === newPlot.plot_management);

        let wktGeom = null;
        if (createPlotGeoJSON && createPlotGeoJSON.geometry) {
          wktGeom = Terraformer.convert(createPlotGeoJSON.geometry);
          console.log("WKT enviado al backend:", wktGeom);
        }
        const implantYear = newPlot.plot_implant_year ? parseInt(newPlot.plot_implant_year) : null;
        const creationYear = newPlot.plot_creation_year ? parseInt(newPlot.plot_creation_year) : null;

        const plotToCreate = {
            ...newPlot,
            plot_var: selectedVariety ? selectedVariety.gv_id : null,
            plot_rootstock: selectedRootstock ? selectedRootstock.gv_id : null,
            plot_conduction: selectedConduction ? selectedConduction.value : null,
            plot_management: selectedManagement ? selectedManagement.value : null, 
            plot_geom: wktGeom,
            plot_implant_year: implantYear,
            plot_creation_year: creationYear,
        };

        console.log("Datos para crear parcela:", plotToCreate);

        const response = await createPlot(plotToCreate);
        setPlots([...plots, response]);
        
        // Limpiar estado después del éxito
        handleCancelCreate();
        setSuccessMessage("La parcela ha sido creada correctamente.");
        setShowSuccessModal(true);
    } catch (error) {
        console.error("Error al crear la parcela:", error);
        setErrorMessage("Error al crear la parcela: " + error.message);
        setShowErrorModal(true);
    }
  };

  // Función para manejar cambios en la geometría durante creación
  const handleCreateGeometryChange = (geojson) => {
    console.log("Nueva geometría capturada (creación):", geojson);
    setCreatePlotGeoJSON(geojson);
  };

  // Función para limpiar el mapa de creación
  const handleClearCreateMap = () => {
    setCreatePlotGeoJSON(null);
    if (createMapRef.current?.clearMap) {
      createMapRef.current.clearMap();
    }
  };

  // Función para cancelar creación y limpiar todo
  const handleCancelCreate = () => {
    setCreatePlotGeoJSON(null);
    setNewPlot({
      plot_name: "",
      plot_var: "",
      plot_rootstock: "",
      plot_implant_year: "",
      plot_creation_year: "",
      plot_conduction: "",
      plot_management: "",
      plot_description: "",
      plot_geom: null,
    });
    setShowForm(false);
  };
  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setCurrentPlot(null);
    setPlotGeoJSON(null);
    setIsEditingDetails(false);
  };

  // Funciones para archivar/eliminar
  const handleShowArchiveModal = () => {
    setPlotToArchive(currentPlot);
    setShowArchiveModal(true);
  };

  const handleDeletePlot = async (plotId) => {
    if (!plotId) {
      alert("No se ha proporcionado un ID de parcela para eliminar.");
      return;
    }
    if (window.confirm("¿Estás seguro de que deseas eliminar esta parcela? Esta acción no se puede deshacer.")) {
      try {
        await deletePlot(plotId);
        const data = await getPlots();
        setPlots(data);
        setShowViewModal(false);
        setShowArchiveModal(false);
        setCurrentPlot(null);
        setPlotToArchive(null);
        setSuccessMessage("La parcela fue eliminada correctamente.");
        setShowSuccessModal(true);
      } catch (error) {
        console.error("Error al eliminar la parcela:", error);
        setErrorMessage("Hubo un error al eliminar la parcela.");
        setShowErrorModal(true);
      }
    }
  };

  const handleArchivePlot = async (plotId) => {
    try {
      await archivePlot(plotId);
      const data = await getPlots();
      setPlots(data);
      setShowViewModal(false);
      setShowArchiveModal(false);
      setCurrentPlot(null);
      setPlotToArchive(null);
      setSuccessMessage("La parcela fue archivada correctamente.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al archivar la parcela:", error);
      setErrorMessage("Hubo un error al archivar la parcela.");
      setShowErrorModal(true);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          Crear Nueva Parcela
        </button>
        <Spacer width={0.5} />
        {selectedPlots.length > 0 && (
          <button
            onClick={handleDownloadCSV}
            className="btn btn-secondary"
          >
            Descargar CSV
          </button>
        )}
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
            <th className="border border-gray-300 p-2">
              <input 
                type="checkbox" 
                onChange={handleSelectAll}
                checked={selectedPlots.length === plots.length && plots.length > 0}
              />
            </th>
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
              <tr key={`plot-${plot.plot_id}`}>
                <td className="border border-gray-300 p-2 text-center">
                  <input 
                    type="checkbox"
                    checked={selectedPlots.includes(plot.plot_id)}
                    onChange={() => 
                      setSelectedPlots((prev) => 
                        prev.includes(plot.plot_id) 
                          ? prev.filter((id) => id !== plot.plot_id) 
                          : [...prev, plot.plot_id]
                      )
                    }
                  />
                </td>
                <td className="border border-gray-300 p-2 text-center">{plot.plot_id}</td>
                <td className="border border-gray-300 p-2">{plot.plot_name}</td>
                <td className="border border-gray-300 p-2">
                  {varieties.find(v => v.gv_id === plot.plot_var)?.name || plot.plot_var}
                </td>
                <td className="border border-gray-300 p-2 text-right">{plot.plot_area}</td>
                <td className="border border-gray-300 p-2 text-center">
                  <button
                    onClick={() => handleViewPlot(plot)}
                    className="p-2 rounded text-blue-500 hover:text-blue-700"
                  >
                    <FontAwesomeIcon icon={faSearch} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="border border-gray-300 p-4 text-center">
                No hay datos disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal para Crear Nueva Parcela */}
      <Modal
        isOpen={showForm}
        onRequestClose={() => setShowForm(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Crear Nueva Parcela"
      >
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">Crear Nueva Parcela</h2>
            
            {/* Contenedor del Mapa para Creación */}
            <div className="mb-4">
              <div className="map-details-container">
                <div className="leaflet-container" style={{ height: '400px', marginBottom: '20px' }}>
                  <Map 
                    ref={createMapRef}
                    geojson={createPlotGeoJSON} 
                    onGeometryChange={handleCreateGeometryChange}
                    editable={true}
                  />
                </div>
                <div className="mb-4">
                  <button
                    onClick={handleClearCreateMap}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  >
                    Limpiar Mapa
                  </button>
                </div>
              </div>

              {/* Formulario de Creación */}
              <div className="map-details-container">
                <h3 className="text-xl font-semibold mb-4">Información de la Nueva Parcela:</h3>
                <dl className="space-y-4">
                  {fieldConfig
                    .filter(field => field.key !== 'plot_id' && field.key !== 'plot_area') // Excluir campos no editables
                    .map((field) => (
                    <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                      <dt className="col-span-1 font-medium">
                        {field.label}
                        {(field.key === 'plot_name' || field.key === 'plot_var') && (
                          <span className="text-red-500 ml-1">*</span>
                        )}:
                      </dt>
                      <dd className="col-span-2">
                        {field.type === 'select' ? (
                          <Select
                            value={
                              newPlot[field.key] 
                                ? { value: newPlot[field.key], label: newPlot[field.key] }
                                : null
                            }
                            onChange={(selectedOption) => {
                              setNewPlot({
                                ...newPlot,
                                [field.key]: selectedOption ? selectedOption.value : ''
                              });
                            }}
                            options={
                              field.options === 'varieties' 
                                ? varieties.map(option => ({ value: option.name, label: option.name }))
                                : field.options === 'rootstocks' 
                                ? rootstocks.map(option => ({ value: option.name, label: option.name }))
                                : field.options === 'conduction' 
                                ? conduction.map(option => ({ value: option.value, label: option.value }))
                                : field.options === 'management' 
                                ? management.map(option => ({ value: option.value, label: option.value }))
                                : []
                            }
                            isSearchable
                            isClearable
                            placeholder={`Seleccionar ${field.label}...`}
                            className="w-full"
                          />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={newPlot[field.key] || ''}
                            onChange={(e) => setNewPlot({ ...newPlot, [field.key]: e.target.value })}
                            className="w-full p-2 border rounded"
                            rows={3}
                            placeholder={`Ingrese ${field.label.toLowerCase()}...`}
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={newPlot[field.key] || ''}
                            onChange={(e) => setNewPlot({ ...newPlot, [field.key]: e.target.value })}
                            className="w-full p-2 border rounded"
                            placeholder={`Ingrese ${field.label.toLowerCase()}...`}
                          />
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-between items-center mt-6 border-t pt-4">
              {/* Botón de cancelar a la izquierda */}
              <button
                onClick={handleCancelCreate}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>

              {/* Botón de crear a la derecha */}
              <button
                onClick={handleCreatePlot}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Crear Parcela
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal para Visualizar/Editar Parcela */}
      <Modal
        isOpen={showViewModal}
        onRequestClose={handleCloseViewModal}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Ver/Editar Parcela"
      >
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">
              {isEditingDetails ? 'Editar Parcela' : 'Detalles de la Parcela'}
            </h2>
            
            {/* Contenedor del Mapa */}
            <div className="mb-4">
              <div className="map-details-container">
                <div className="leaflet-container" style={{ height: '400px', marginBottom: '20px' }}>
                  {plotGeoJSON && (
                    <Map 
                      ref={viewEditMapRef}
                      geojson={plotGeoJSON} 
                      onGeometryChange={handleEditGeometryChange}
                      editable={isEditingDetails} 
                    />
                  )}
                </div>
              </div>

              {/* Información de la Parcela */}
              {currentPlot && (
                <div className="map-details-container">
                  <h3 className="text-xl font-semibold mb-4">Información de la Parcela:</h3>
                  <dl className="space-y-4">
                    {fieldConfig.map((field) => (
                      <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                        <dt className="col-span-1 font-medium">{field.label}:</dt>
                        <dd className="col-span-2">
                          {isEditingDetails && !field.disabled ? (
                            field.type === 'select' ? (
                              <Select
                                value={
                                  field.key === 'plot_var' 
                                    ? varieties.find(v => v.gv_id === currentPlot.plot_var)
                                        ? { value: varieties.find(v => v.gv_id === currentPlot.plot_var)?.name, 
                                            label: varieties.find(v => v.gv_id === currentPlot.plot_var)?.name }
                                        : null
                                    : field.key === 'plot_rootstock'
                                    ? rootstocks.find(r => r.gv_id === currentPlot.plot_rootstock)
                                        ? { value: rootstocks.find(r => r.gv_id === currentPlot.plot_rootstock)?.name,
                                            label: rootstocks.find(r => r.gv_id === currentPlot.plot_rootstock)?.name }
                                        : null
                                    : field.key === 'plot_conduction'
                                    ? conduction.find(c => c.value === currentPlot.plot_conduction)
                                        ? { value: conduction.find(c => c.value === currentPlot.plot_conduction)?.value,
                                            label: conduction.find(c => c.value === currentPlot.plot_conduction)?.value }
                                        : null
                                    : field.key === 'plot_management'
                                    ? management.find(m => m.value === currentPlot.plot_management)
                                        ? { value: management.find(m => m.value === currentPlot.plot_management)?.value,
                                            label: management.find(m => m.value === currentPlot.plot_management)?.value }
                                        : null
                                    : null
                                }
                                onChange={(selectedOption) => {
                                  if (field.key === 'plot_var') {
                                    const selectedVariety = varieties.find(v => v.name === selectedOption.value);
                                    setCurrentPlot({
                                      ...currentPlot,
                                      [field.key]: selectedVariety ? selectedVariety.gv_id : null
                                    });
                                  } else if (field.key === 'plot_rootstock') {
                                    const selectedRootstock = rootstocks.find(r => r.name === selectedOption.value);
                                    setCurrentPlot({
                                      ...currentPlot,
                                      [field.key]: selectedRootstock ? selectedRootstock.gv_id : null
                                    });
                                  } else {
                                    setCurrentPlot({
                                      ...currentPlot,
                                      [field.key]: selectedOption.value
                                    });
                                  }
                                }}
                                options={
                                  field.options === 'varieties' 
                                    ? varieties.map(option => ({ value: option.name, label: option.name }))
                                    : field.options === 'rootstocks' 
                                    ? rootstocks.map(option => ({ value: option.name, label: option.name }))
                                    : field.options === 'conduction' 
                                    ? conduction.map(option => ({ value: option.value, label: option.value }))
                                    : field.options === 'management' 
                                    ? management.map(option => ({ value: option.value, label: option.value }))
                                    : []
                                }
                                isSearchable
                                isClearable
                                placeholder={`Seleccionar ${field.label}...`}
                                className="w-full"
                              />
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={currentPlot[field.key] || ''}
                                onChange={(e) => setCurrentPlot({ ...currentPlot, [field.key]: e.target.value })}
                                className="w-full p-2 border rounded"
                                rows={3}
                              />
                            ) : (
                              <input
                                type={field.type}
                                value={currentPlot[field.key] || ''}
                                onChange={(e) => setCurrentPlot({ ...currentPlot, [field.key]: e.target.value })}
                                className="w-full p-2 border rounded"
                              />
                            )
                          ) : (
                            <span>
                              {field.key === 'plot_var'
                                ? varieties.find(v => v.gv_id === currentPlot.plot_var)?.name || currentPlot.plot_var || 'No especificada'
                                : field.key === 'plot_rootstock'
                                ? rootstocks.find(r => r.gv_id === currentPlot.plot_rootstock)?.name || currentPlot.plot_rootstock || 'No especificado'
                                : field.key === 'plot_conduction'
                                ? conduction.find(c => c.value === currentPlot.plot_conduction)?.value || currentPlot.plot_conduction || 'No especificado'
                                : field.key === 'plot_management'
                                ? management.find(m => m.value === currentPlot.plot_management)?.value || currentPlot.plot_management || 'No especificado'
                                : currentPlot[field.key] || 'No especificado'}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-between items-center mt-6 border-t pt-4">
              {/* Botón de cerrar a la izquierda */}
              <button
                onClick={handleCloseViewModal}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>

              {/* Botones de acción a la derecha */}
              <div className="flex gap-4">
                {isEditingDetails ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Guardar Cambios
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditDetails}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Editar Parcela
                    </button>
                    <button
                      onClick={handleShowArchiveModal}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                    >
                      Archivar Parcela
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Archivo */}
      <Modal
        isOpen={showArchiveModal}
        onRequestClose={() => {
          setShowArchiveModal(false);
          setPlotToArchive(null);
        }}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Confirmar Archivo"
      >
        <div className="modal-wrapper">
          <div className="modal-content p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Archivo</h2>
            <p className="mb-6">
              ¿Estás seguro que deseas archivar la parcela {plotToArchive?.plot_name}?
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleDeletePlot(plotToArchive?.plot_id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Eliminar Parcela
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowArchiveModal(false);
                    setPlotToArchive(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleArchivePlot(plotToArchive?.plot_id)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                  Sí, Archivar Parcela
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TablePlots;