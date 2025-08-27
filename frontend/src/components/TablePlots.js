import React, { useState, useEffect,useRef, Fragment} from "react";
import { getPlots, createPlot, updatePlot, deletePlot,archivePlot, getRootstocks,getVarieties,getConduction,getManagement } from "../services/api";
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
    plot_geom: { type: "Polygon", coordinates: [] }
  });
  const [sortConfig, setSortConfig] = useState({ key: "plot_id", direction: "asc" });
  const [filterField, setFilterField] = useState("plot_name");
  const [filterValue, setFilterValue] = useState("");
  const [mapToDisplay, setMapToDisplay] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [plotGeoJSON, setPlotGeoJSON] = useState(null);
  const [plotDetails, setPlotDetails] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [varieties, setVarieties] = useState([]); 
  const [rootstocks, setRootstocks] = useState([]);
  const [conduction, setConduction] = useState([]);
  const [management, setManagement] = useState([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [plotToArchive, setPlotToArchive] = useState(null);
  const [groupBy, setGroupBy] = useState(null);
  const [allSelected, setAllSelected] = useState({});
  const [selectedPlotsByGroup, setSelectedPlotsByGroup] = useState({});

  const createMapRef = useRef(null);
  const viewEditMapRef = useRef(null);

  useEffect(() => {
    const fetchPlots = async () => {
      const data = await getPlots();
      setPlots(data);
    };
    /* obtener noombre de variedades */
    const fetchVarieties = async () => { 
      const data = await getVarieties();
      setVarieties(data);
    };
    /* obtener noombre de portainjertos */
    const fetchRootstocks = async () => {
      const data = await getRootstocks();
      setRootstocks(data);
    };

    const fetchmanagement= async () => {
      const data = await getManagement();
      setManagement(data);
    };
    
    const fetchconduction= async () => {
      const data = await getConduction();
      setConduction(data);
    };

    fetchconduction();
    fetchmanagement();
    fetchPlots();
    fetchVarieties();
    fetchRootstocks();
  }, []);
  const handleGroupByChange = (e) => {
    setGroupBy(e.target.value === "none" ? null : e.target.value);
  };

  const filteredPlots = Array.isArray(plots)
    ? plots.filter((p) => {
        if (!filterValue) return true;
        
        let value;
        
        // Manejar casos especiales donde necesitamos buscar por nombre en lugar de ID
        if (filterField === 'plot_var') {
          // Buscar el nombre de la variedad por su ID
          const variety = varieties.find(v => v.gv_id === p.plot_var);
          value = variety ? variety.name : (p.plot_var || "");
        } else if (filterField === 'plot_rootstock') {
          // Si también quieres filtrar por portainjerto por nombre
          const rootstock = rootstocks.find(r => r.gv_id === p.plot_rootstock);
          value = rootstock ? rootstock.name : (p.plot_rootstock || "");
        } else if (filterField === 'plot_conduction') {
          // Para sistema de conducción, usar el valor directamente
          value = p.plot_conduction || "";
        } else if (filterField === 'plot_management') {
          // Para tipo de manejo, usar el valor directamente
          value = p.plot_management || "";
        } else {
          // Para otros campos, usar el valor original
          value = p[filterField] || "";
        }
        
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
      })
  : [];

  const groupPlots = (data, groupBy) => {
    return data.reduce((acc, plot) => {
      let key;
      if (groupBy === 'plot_var') {
        const variety = varieties.find(v => v.gv_id === plot.plot_var);
        key = variety ? variety.name : 'Sin variedad';
      } else if (groupBy === 'plot_rootstock') {
        const rootstock = rootstocks.find(r => r.gv_id === plot.plot_rootstock);
        key = rootstock ? rootstock.name : 'Sin portainjerto';
      } else {
        key = plot[groupBy] || 'Sin valor';
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(plot);
      return acc;
    }, {});
  };

  const sortedPlots = [...filteredPlots].sort((a, b) => {
    if (!sortConfig.key) return 0;
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const groupedPlots = groupBy ? groupPlots(sortedPlots, groupBy) : { 'all': sortedPlots };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSelectAll = (e, group) => {
    const isChecked = e.target.checked;
    const plotsInGroup = groupedPlots[group];
    const plotIds = plotsInGroup.map(plot => plot.plot_id);
    
    setAllSelected(prev => ({
      ...prev,
      [group]: isChecked
    }));
    
    setSelectedPlotsByGroup(prev => ({
      ...prev,
      [group]: isChecked ? plotIds : []
    }));
    
    // Actualizar selectedPlots para mantener compatibilidad
    if (isChecked) {
      setSelectedPlots(prev => [...new Set([...prev, ...plotIds])]);
    } else {
      setSelectedPlots(prev => prev.filter(id => !plotIds.includes(id)));
    }
  };

  const handleSelectPlot = (e, plot, group) => {
    const isChecked = e.target.checked;
    const plotId = plot.plot_id;
    
    setSelectedPlotsByGroup(prev => {
      const currentGroup = prev[group] || [];
      const newGroup = isChecked 
        ? [...currentGroup, plotId]
        : currentGroup.filter(id => id !== plotId);
      
      // Actualizar allSelected para este grupo
      const plotsInGroup = groupedPlots[group];
      setAllSelected(prevAll => ({
        ...prevAll,
        [group]: newGroup.length === plotsInGroup.length
      }));
      
      return {
        ...prev,
        [group]: newGroup
      };
    });
    
    // Actualizar selectedPlots para mantener compatibilidad
    setSelectedPlots(prev => 
      isChecked 
        ? [...prev, plotId]
        : prev.filter(id => id !== plotId)
    );
  };

  const getGroupDisplayName = (groupBy) => {
    const names = {
      'plot_var': 'Variedad',
      'plot_rootstock': 'Portainjerto', 
      'plot_conduction': 'Sistema de Conducción',
      'plot_management': 'Tipo de Manejo'
    };
    return names[groupBy] || groupBy;
  };

  const handleDownloadCSV = () => {
    let selectedData = [];
    
    // Recopilar todas las parcelas seleccionadas de todos los grupos
    Object.entries(selectedPlotsByGroup).forEach(([group, plotIds]) => {
      const groupPlots = plots.filter(p => plotIds.includes(p.plot_id));
      selectedData = [...selectedData, ...groupPlots];
    });
    
    // Si no hay agrupación, usar selectedPlots original
    if (!groupBy) {
      selectedData = plots.filter((p) => selectedPlots.includes(p.plot_id));
    }
    
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

  const handleSelectChange = (field, selectedOption) => {
  if (!selectedOption) {
    // Si se limpia la selección
    setPlotDetails({
      ...plotDetails,
      [field]: null
    });
    return;
  }

  let value = selectedOption.value;

  // Para variety y rootstock, guardamos el nombre temporalmente
  // pero en handleSaveDetails lo convertiremos al gv_id
    setPlotDetails({
      ...plotDetails,
      [field]: value
    });
  };


  const handleCreatePlot = async () => {  
    if (!newPlot.plot_name || !newPlot.plot_var) {
        alert("Por favor, completa los campos obligatorios: Nombre y Variedad.");
        return;
    }
    if (!plotGeoJSON) {
        alert("Por favor, dibuja la parcela en el mapa.");
        return;
    }
    try {
      const selectedVariety = varieties.find((v) => v.name === newPlot.plot_var);
      const selectedRootstock = rootstocks.find((r) => r.name === newPlot.plot_rootstock);
      const selectedConduction = conduction.find((c) => c.value === newPlot.plot_conduction);
      const selectedManagement = management.find((m) => m.value === newPlot.plot_management);

        let wktGeom = null;
        if (plotGeoJSON && plotGeoJSON.geometry) {
          try {
            wktGeom = Terraformer.convert(plotGeoJSON.geometry);            
          } catch (error) {
            console.error("Error converting to WKT:", error);
            alert("Error al procesar la geometría del mapa.");
            return;
          }
        }
      
        const implantYear = newPlot.plot_implant_year ? parseInt(newPlot.plot_implant_year) : null;
        const creationYear = newPlot.plot_creation_year ? parseInt(newPlot.plot_creation_year) : null;

        const plotToCreate = {
          plot_name: newPlot.plot_name,
          plot_var: selectedVariety ? selectedVariety.gv_id : null,
          plot_rootstock: selectedRootstock ? selectedRootstock.gv_id : null,
          plot_conduction: selectedConduction ? selectedConduction.value : null,
          plot_management: selectedManagement ? selectedManagement.value : null, 
          plot_geom: newPlot.plot_geom,
          plot_implant_year: implantYear,
          plot_creation_year: creationYear,
          plot_description: newPlot.plot_description,
        };

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
        setShowMapModal(false);
        setShowArchiveModal(false);
        setPlotDetails(null);
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
      setShowMapModal(false);
      setShowArchiveModal(false);
      setPlotDetails(null);
      setPlotToArchive(null);
      setSuccessMessage("La parcela fue archivada correctamente.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al archivar la parcela:", error);
      setErrorMessage("Hubo un error al archivar la parcela.");
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
          setIsEditingDetails(false);
          setPlotDetails(plot);
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

  const handleGeometryChange = (geojson) => {    
    if (!geojson || !geojson.geometry) {
      console.log('No hay geojson válido');
      return;
    }

    try {
      const wktGeometry = Terraformer.convert(geojson.geometry);
      console.log('WKT generado:', wktGeometry);
      
      if (isEditingDetails && plotDetails) {
        console.log('Actualizando plotDetails en modo edición');
        const updatedDetails = {
          ...plotDetails,
          plot_geom: wktGeometry,
        };
        console.log('plotDetails actualizado:', updatedDetails);
        setPlotDetails(updatedDetails);
      } else {
        console.log('No está en modo edición o no hay plotDetails');
      }
      
      setPlotGeoJSON(geojson);
      console.log('=== END GEOMETRY CHANGE DEBUG ===');
    } catch (error) {
      console.error("Error converting geometry to WKT:", error);
    }
  };

  const handleEditDetails = () => {
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    try {
      // Create a copy of plotDetails for updating
      const updatedPlotDetails = { ...plotDetails };
      
      console.log('Datos originales plotDetails:', plotDetails);
      
      // Convertir nombres a IDs para varieties
      if (typeof updatedPlotDetails.plot_var === 'string') {
        const selectedVariety = varieties.find(v => v.name === updatedPlotDetails.plot_var);
        if (selectedVariety) {
          updatedPlotDetails.plot_var = selectedVariety.gv_id;
          console.log(`Variedad encontrada: ${updatedPlotDetails.plot_var} -> ${selectedVariety.gv_id}`);
        } else {
          console.log(`Variedad NO encontrada: ${updatedPlotDetails.plot_var}`);
          console.log('Variedades disponibles:', varieties.map(v => v.name));
          // No cambiar el valor si no encontramos coincidencia
        }
      }

      // Convertir nombres a IDs para rootstocks
      if (typeof updatedPlotDetails.plot_rootstock === 'string') {
        const selectedRootstock = rootstocks.find(r => r.name === updatedPlotDetails.plot_rootstock);
        if (selectedRootstock) {
          updatedPlotDetails.plot_rootstock = selectedRootstock.gv_id;
          console.log(`Rootstock encontrado: ${updatedPlotDetails.plot_rootstock} -> ${selectedRootstock.gv_id}`);
        } else {
          console.log(`Rootstock NO encontrado: ${updatedPlotDetails.plot_rootstock}`);
          console.log('Rootstocks disponibles:', rootstocks.map(r => r.name));
          // No cambiar el valor si no encontramos coincidencia
        }
      }

      // Asegurar que los campos sean strings o null (no objetos)
      if (typeof updatedPlotDetails.plot_conduction === 'object' && updatedPlotDetails.plot_conduction !== null) {
        updatedPlotDetails.plot_conduction = updatedPlotDetails.plot_conduction.value;
      }

      if (typeof updatedPlotDetails.plot_management === 'object' && updatedPlotDetails.plot_management !== null) {
        updatedPlotDetails.plot_management = updatedPlotDetails.plot_management.value;
      }

      // Convertir años a números si no están vacíos
      if (updatedPlotDetails.plot_implant_year) {
        updatedPlotDetails.plot_implant_year = parseInt(updatedPlotDetails.plot_implant_year) || null;
      }
      
      if (updatedPlotDetails.plot_creation_year) {
        updatedPlotDetails.plot_creation_year = parseInt(updatedPlotDetails.plot_creation_year) || null;
      }

      // Verificar y preservar geometría
      if (!updatedPlotDetails.plot_geom || updatedPlotDetails.plot_geom === '') {
        console.warn("No hay geometría para actualizar");
        setErrorMessage("Error: La parcela debe tener una geometría válida.");
        setShowErrorModal(true);
        return;
      }

      // Asegurar que la geometría sea string (WKT)
      if (typeof updatedPlotDetails.plot_geom !== 'string') {
        console.error('plot_geom no es string:', typeof updatedPlotDetails.plot_geom, updatedPlotDetails.plot_geom);
        setErrorMessage("Error: Formato de geometría inválido.");
        setShowErrorModal(true);
        return;
      }

      console.log('Datos a enviar al backend:', JSON.stringify(updatedPlotDetails, null, 2));
      console.log('Geometría a enviar:', updatedPlotDetails.plot_geom);
      
      const updatedPlot = await updatePlot(updatedPlotDetails.plot_id, updatedPlotDetails);
      setPlots(plots.map((p) => (p.plot_id === updatedPlot.plot_id ? updatedPlot : p)));
      setIsEditingDetails(false);
      setShowMapModal(false);
      setPlotDetails(null);
      setSuccessMessage("Los detalles de la parcela han sido actualizados.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al guardar los detalles:", error);
      
      // Mostrar más detalles del error
      if (error.response) {
        console.error('Response data completa:', JSON.stringify(error.response.data, null, 2));
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        // Mostrar el error completo en la consola para debugging
        console.error('Error completo del servidor:', error.response.data);
        
        let errorMsg = 'Error al guardar los detalles: ';
        if (error.response.data?.message) {
          errorMsg += error.response.data.message;
        } else if (error.response.data?.error) {
          errorMsg += error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMsg += error.response.data;
        } else {
          errorMsg += `Estado HTTP ${error.response.status}`;
        }
        
        setErrorMessage(errorMsg);
      } else {
        setErrorMessage("Error al guardar los detalles: " + error.message);
      }
      setShowErrorModal(true);
    }
  };

  const handleCreateGeometryChange = (geojson) => {
            
      // Actualizar ambos estados necesarios
      setPlotGeoJSON(geojson);
      
      try {
          const wktGeometry = Terraformer.convert(geojson.geometry);
          setNewPlot((prevPlot) => ({
              ...prevPlot,
              plot_geom: wktGeometry
          }));
      } catch (error) {
          console.error("Error converting geometry:", error);
      }
  };

  const handleClearCreateMap = () => {
    setPlotGeoJSON(null);
    setNewPlot((prevPlot) => ({
      ...prevPlot,
      plot_geom: null
    }));
    if (createMapRef.current?.clearMap) {
      createMapRef.current.clearMap();
    }
  };

  const handleCancelCreate = () => {
    setNewPlot({
      plot_name: "",
      plot_var: "",
      plot_rootstock: "",
      plot_implant_year: "",
      plot_creation_year: "",
      plot_conduction: "",
      plot_management: "",
      plot_description: "",
      plot_geom: { type: "Polygon", coordinates: [] },
    });
    setShowForm(false);
  };


  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
        <button onClick={() => setShowForm(true)} className="btn btn-primary">Crear Nueva Parcela</button>
        {Object.values(selectedPlots).flat().length > 0 && (
          <button
            onClick={handleDownloadCSV}
            className="btn btn-secondary"
          >
            Descargar CSV ({selectedPlots.length})
          </button>
        )}
      </div>

      <div className="filter-controls-container">
        <div className="control-group">
          <label htmlFor="groupingFieldPlots" className="control-label">
            Agrupar por:
          </label>
          <select
            id="groupingFieldPlots"
            value={groupBy || "none"}
            onChange={handleGroupByChange}
            className="control-select"
          >
            <option value="none">Sin Agrupación</option>
            <option value="plot_var">Variedad</option>
            <option value="plot_rootstock">Portainjerto</option>
            <option value="plot_conduction">Sistema de Conducción</option>
            <option value="plot_management">Tipo de Manejo</option>
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="FilterFieldPlot" className="control-label">
            Filtrar por:
          </label>
          <div className="filter-inputs">
            <select
              id="FilterFieldPlot"
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="control-select filter-field">
              <option value="plot_id">ID</option>
              <option value="plot_name">Nombre</option>
              <option value="plot_var">Variedad</option>
              <option value="plot_area">Área</option>
              <option value="plot_rootstock">Portainjerto</option>
              <option value="plot_conduction">Sistema de Conducción</option>
              <option value="plot_management">Tipo de Manejo</option>
              <option value="plot_area">Área</option>
            </select>
            <input
              id="FilterValuePlot" 
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder={`Buscar por ${filterField}...`}
              className="control-input"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      {Object.entries(groupedPlots).map(([group, plots]) => (
        <div key={group} className="mb-4">
          {groupBy && <h3 className="titulo-seccion">{`${getGroupDisplayName(groupBy)}: ${group}`}</h3>}
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">
                  <input 
                    type="checkbox" 
                    id={`CheckboxPlots-${group}`}
                    checked={allSelected[group] || false} 
                    onChange={(e) => handleSelectAll(e, group)} 
                  />
                </th>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("plot_name")}>
                  Nombre
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
                  <tr key={`plot-${group}-${plot.plot_id}`}>
                    <td className="border border-gray-300 p-2 text-center">
                      <input
                        id={`checkboxPlots-${group}-${plot.plot_id}`}
                        type="checkbox"
                        checked={selectedPlotsByGroup[group]?.includes(plot.plot_id) || false}
                        onChange={(e) => handleSelectPlot(e, plot, group)}
                      />
                    </td>
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
                  <td colSpan="5" className="border border-gray-300 p-4 text-center">
                    No hay datos disponibles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Modal para crear parcela */}
      <Modal
        isOpen={showForm}
        onRequestClose={() => setShowForm(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Crear Parcela"
      >
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">Crear una Nueva Parcela</h2>
            <div className="mb-4">
              <label className="modal-form-label" htmlFor="NewPlotName">Nombre:</label>
              <input
                id="NewPlotName"
                type="text"
                value={newPlot.plot_name}
                onChange={(e) => setNewPlot({ ...newPlot, plot_name: e.target.value })}
                className="modal-form-input"
              />
              
              <label className="modal-form-label" htmlFor="NewPlotVar">Variedad:</label>
              <Select
                inputId="NewPlotVar"
                value={{ value: newPlot.plot_var, label: newPlot.plot_var }}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, plot_var: selectedOption.value });
                }}
                options={varieties.map((variety) => ({
                  value: variety.name,
                  label: variety.name,
                }))}
                isSearchable
                placeholder="Seleccionar variedad..."
                className="modal-form-input"
              />

              <label className="modal-form-label" htmlFor="NewPlotRoots">Portainjerto:</label>
              <Select
                inputId="NewPlotRoots"
                value={{ value: newPlot.plot_rootstock, label: newPlot.plot_rootstock }}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, plot_rootstock: selectedOption.value });
                }}
                options={rootstocks.map((rootstock) => ({
                  value: rootstock.name,
                  label: rootstock.name,
                }))}
                isSearchable
                placeholder="Seleccionar portainjerto..."
                className="modal-form-input"
              />

              <label className="modal-form-label" htmlFor="NewPlotPlantaY">Año de implantación:</label>
              <input
                id="NewPlotPlantaY"
                type="number"
                value={newPlot.plot_implant_year}
                onChange={(e) => setNewPlot({ ...newPlot, plot_implant_year: e.target.value })}
                className="modal-form-input"
              />

              <label className="modal-form-label" htmlFor="NewPlotCreatY">Año de creación:</label>
              <input
                id="NewPlotCreatY"
                type="number"
                value={newPlot.plot_creation_year}
                onChange={(e) => setNewPlot({ ...newPlot, plot_creation_year: e.target.value })}
                className="modal-form-input"
              />

              <label className="modal-form-label" htmlFor="NewPlotConduc">Sistema de conducción:</label>
              <Select
                inputId="NewPlotConduc"
                value={{ value: newPlot.plot_conduction, label: newPlot.plot_conduction }}
                onChange={(selectedOption) => setNewPlot({ ...newPlot, plot_conduction: selectedOption.value })}
                options={conduction.map((conduction) => ({
                  value: conduction.value,
                  label: conduction.value,
                }))}
                isSearchable
                placeholder="Seleccionar sistema de conduccion"
                className="modal-form-input"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (provided) => ({
                    ...provided,
                    zIndex: 10000
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 10000
                  })
                }}
              />

              <label className="modal-form-label" htmlFor="NewPlotManagement">Tipo de manejo:</label>
              <Select
                inputId="NewPlotManagement"
                value={{ value: newPlot.plot_management, label: newPlot.plot_management }}
                onChange={(selectedOption) => setNewPlot({ ...newPlot, plot_management: selectedOption.value })}
                options={management.map((management) => ({
                  value: management.value,
                  label: management.value,
                }))}
                isSearchable
                placeholder="Seleccionar portainjerto..."
                className="modal-form-input"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (provided) => ({
                    ...provided,
                    zIndex: 10000
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 10000
                  })
                }}
                            />

              <label className="modal-form-label" htmlFor="NewPlotDescript">Descripción:</label>
              <textarea
                id="NewPlotDescript"
                value={newPlot.plot_description}
                onChange={(e) => setNewPlot({ ...newPlot, plot_description: e.target.value })}
                className="modal-form-input h-24"
              />

              <div className="map-details-container">
                <div className="leaflet-container" style={{ height: '400px', marginBottom: '20px' }}>
                  <Map 
                    ref={createMapRef}
                    onGeometryChange={handleCreateGeometryChange}
                    geojson={plotGeoJSON}
                    editable={true}
                  />
                </div>
                <div className="mb-4">
                  <button
                    onClick={handleClearCreateMap}
                    className="btn btn-danger mr-2"
                  >
                    Limpiar Mapa
                  </button>
                </div>
              </div>

              <div className="modal-buttons mt-4">
                <button onClick={handleCancelCreate} className="btn btn-secondary">Cancelar</button>
                <button onClick={handleCreatePlot} className="btn btn-primary">Crear</button>
              </div>
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
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">Éxito</h2>
              <div className="modal-message">
                <p>{successMessage}</p>
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowSuccessModal(false)} className="btn btn-primary">OK</button>
              </div>
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
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">Error</h2>
              <div className="modal-message">
                <p>{errorMessage}</p>
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowErrorModal(false)} className="btn btn-primary">Reintentar más tarde</button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal para ver/editar la parcela */}
      <Modal
        isOpen={showMapModal}
        onRequestClose={() => {
          setShowMapModal(false);
          setPlotDetails(null);
          setIsEditingDetails(false);
        }}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Mapa de Parcela"
      >
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">Detalles de la Parcela</h2>
            <div className="mb-4">
              <div className="map-details-container">
                <div className="leaflet-container">
                  {mapToDisplay && (
                    <Map 
                      ref={viewEditMapRef}
                      geojson={mapToDisplay} 
                      onGeometryChange={handleGeometryChange}
                      editable={isEditingDetails}
                      key={`edit-${plotDetails?.plot_id}-${isEditingDetails}`} // Forzar re-render
                    />
                  )}
                </div>
              </div>

        {plotDetails && (
          <div className="map-details-container">
            <h3 className="text-xl font-semibold mb-4">Información de la Parcela:</h3>
            <dl className="space-y-4">
              {fieldConfig.map((field) => (
                <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                  <dt className="col-span-1 font-medium">{field.label}:</dt>
                  <dd className="col-span-2">
                    {isEditingDetails ? (
                      field.type === 'select' ? (
                        <Select
                          inputId={field.key}
                          name={field.key}
                          value={
                            field.key === 'plot_var' 
                              ? { 
                                  value: varieties.find(v => v.gv_id === plotDetails.plot_var)?.name || plotDetails.plot_var, 
                                  label: varieties.find(v => v.gv_id === plotDetails.plot_var)?.name || plotDetails.plot_var
                                }
                              : field.key === 'plot_rootstock'
                              ? {
                                  value: rootstocks.find(r => r.gv_id === plotDetails.plot_rootstock)?.name || plotDetails.plot_rootstock,
                                  label: rootstocks.find(r => r.gv_id === plotDetails.plot_rootstock)?.name || plotDetails.plot_rootstock
                                }
                              : field.key === 'plot_conduction'
                              ? {
                                  value: plotDetails.plot_conduction || '',
                                  label: plotDetails.plot_conduction || ''
                                }
                              : field.key === 'plot_management'
                              ? {
                                  value: plotDetails.plot_management || '',
                                  label: plotDetails.plot_management || ''
                                }
                              : null
                          }
                          onChange={(selectedOption) => handleSelectChange(field.key, selectedOption)}
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
                          placeholder={`Seleccionar ${field.label}...`}
                          className="w-full"
                          isClearable={!field.required} // Solo si el campo no es requerido
                        />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            id={field.key}
                            name={field.key}
                            value={plotDetails[field.key] || ''}
                            onChange={(e) => setPlotDetails({ ...plotDetails, [field.key]: e.target.value })}
                            className="w-full p-2 border rounded"
                            disabled={field.disabled}
                          />
                        ) : (
                          <input
                            id={field.key}
                            name={field.key}
                            type={field.type}
                            value={plotDetails[field.key] || ''}
                            onChange={(e) => setPlotDetails({ ...plotDetails, [field.key]: e.target.value })}
                            className="w-full p-2 border rounded"
                            disabled={field.disabled}
                          />
                        )
                      ) : (
                        <span>
                          {field.key === 'plot_var'
                          ? varieties.find(v => v.gv_id === plotDetails.plot_var)?.name || plotDetails.plot_var
                          : field.key === 'plot_rootstock'
                          ? rootstocks.find(r => r.gv_id === plotDetails.plot_rootstock)?.name || plotDetails.plot_rootstock
                          : field.key === 'plot_conduction'
                          ? conduction.find(c => c.value === plotDetails.plot_conduction)?.value || plotDetails.plot_conduction
                          : field.key === 'plot_management'
                          ? management.find(m => m.value === plotDetails.plot_management)?.value || plotDetails.plot_management
                          : plotDetails[field.key]?.name || plotDetails[field.key]}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {/* Botones de acción unificados */}
            <div className="modal-buttons mt-4">
            {isEditingDetails ? (
            <>
              <button
                onClick={() => setIsEditingDetails(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDetails}
                className="btn btn-primary"
              >
                Guardar Cambios
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setPlotToArchive(plotDetails);
                  setShowArchiveModal(true);
                }}
                className="btn btn-secondary"
              >
                Archivar Parcela
              </button>

                            <button
                onClick={handleEditDetails}
                className="btn btn-primary"
              >
                Editar Parcela
              </button>
                </>
              )}
            </div>
          </div>
        )}
            </div>
          </div>
        </div>
      </Modal>

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
            <div className="modal-buttons mt-4">
              <button
                onClick={() => handleDeletePlot(plotToArchive?.plot_id)}
                className="btn btn-danger mr-2"
              >
                Eliminar Parcela
              </button>
                <button
                  onClick={() => {
                    setShowArchiveModal(false);
                    setPlotToArchive(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleArchivePlot(plotToArchive?.plot_id)}
                  className="btn btn-primary"
                >
                  Sí, Archivar Parcela
                </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TablePlots;
