'NEW TABLE PLOTS'
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  getPlotsWithData, 
  getPlotsMetadata, 
  createPlot, 
  updatePlot, 
  deletePlot, 
  archivePlot,
  buildSearchFilters 
} from "../services/api"; // Make sure this path matches your file
import Papa from "papaparse";
import Modal from 'react-modal';
import 'leaflet/dist/leaflet.css';
import Map from './Map';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Terraformer from 'terraformer-wkt-parser';
import Select from 'react-select';

Modal.setAppElement('#root');

// Utility function to convert WKT to GeoJSON
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

const fieldConfig = [
  { key: 'plot_id', label: 'ID', type: 'text', disabled: true },
  { key: 'plot_name', label: 'Nombre', type: 'text', required: true },
  { key: 'sector_id', label: 'Sector', type: 'select', options: 'sectors' },
  { key: 'plot_var', label: 'Variedad', type: 'select', options: 'varieties', required: true },
  { key: 'plot_rootstock', label: 'Portainjerto', type: 'select', options: 'rootstocks' },
  { key: 'plot_implant_year', label: 'Año de implantación', type: 'number' },
  { key: 'plot_creation_year', label: 'Año de creación', type: 'number' },
  { key: 'plot_conduction', label: 'Sistema de conducción', type: 'select', options: 'conduction' },
  { key: 'plot_management', label: 'Tipo de manejo', type: 'select', options: 'management' },
  { key: 'plot_description', label: 'Descripción', type: 'textarea' },
  { key: 'plot_area', label: 'Área', type: 'text', disabled: true },
];

const TablePlots = () => {
  // State management
  const [plots, setPlots] = useState([]);
  const [selectedPlots, setSelectedPlots] = useState([]);
  const [metadata, setMetadata] = useState({
    varieties: [],
    rootstocks: [],
    conduction: [],
    management: [],
    sectors: []
  });
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Form data
  const [newPlot, setNewPlot] = useState({
    plot_name: "",
    sector_id: "",
    plot_var: "",
    plot_rootstock: "",
    plot_implant_year: "",
    plot_creation_year: "",
    plot_conduction: "",
    plot_management: "",
    plot_description: "",
    plot_geom: null
  });
  
  // Filter and sort state
  const [filterField, setFilterField] = useState("plot_name");
  const [filterValue, setFilterValue] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "plot_id", direction: "asc" });
  const [groupBy, setGroupBy] = useState(null);
  
  // Selection state
  const [allSelected, setAllSelected] = useState({});
  const [selectedPlotsByGroup, setSelectedPlotsByGroup] = useState({});
  
  // Map and plot details
  const [mapToDisplay, setMapToDisplay] = useState(null);
  const [plotGeoJSON, setPlotGeoJSON] = useState(null);
  const [plotDetails, setPlotDetails] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [plotToArchive, setPlotToArchive] = useState(null);
  
  // Refs
  const createMapRef = useRef(null);
  const viewEditMapRef = useRef(null);
  const filterTimeoutRef = useRef(null);

  // Optimized data fetching function
  const fetchPlotsData = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      
      const searchFilters = buildSearchFilters({
        filterField: filterField,
        filterValue: filterValue?.trim(),
        includeArchived: false,
        ...customFilters
      });
      
      const data = await getPlotsWithData(searchFilters);
    
      setPlots(data.plots || []);
      setMetadata(data.metadata || {
        varieties: [],
        rootstocks: [],
        conduction: [],
        management: [],
        sectors: []
      });
      
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setErrorMessage(error.userMessage || "Error al cargar los datos de las parcelas");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, [filterField, filterValue]);

  useEffect(() => {//logs para debug
    if (plots.length > 0 && metadata.sectors.length > 0) {
      
      // Verificar todos los sector_id únicos
      const uniqueSectors = [...new Set(plots.map(p => p.sector_id))];

      // Verificar si todos los sectores de plots existen en metadata
      uniqueSectors.forEach(sectorId => {
        const found = metadata.sectors.find(s => s.sector_id === sectorId);
        if (!found) {
          console.warn(`⚠️ Sector ID ${sectorId} no encontrado en metadata`);
        }
      });
    }
  }, [plots, metadata]);

  // Initial data load
  useEffect(() => {
    fetchPlotsData();
  }, [fetchPlotsData]);

  // Debounced filter effect
  useEffect(() => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      fetchPlotsData();
    }, 300);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [filterField, filterValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

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
    return [...plots].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [plots, sortConfig]);

  const groupedPlots = useMemo(() => {
    return groupBy ? groupPlots(sortedPlots, groupBy) : { 'all': sortedPlots };
  }, [sortedPlots, groupBy, groupPlots]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSafeSelectValue = (fieldKey, plotDetails, metadata) => {
    if (!plotDetails || plotDetails[fieldKey] === null || plotDetails[fieldKey] === undefined) {
      return null;
    }

    switch (fieldKey) {
      case 'plot_var': {
        const variety = metadata.varieties.find(v => v.gv_id === plotDetails.plot_var);
        return variety ? { value: variety.name, label: variety.name } : null;
      }
      case 'plot_rootstock': {
        const rootstock = metadata.rootstocks.find(r => r.gv_id === plotDetails.plot_rootstock);
        return rootstock ? { value: rootstock.name, label: rootstock.name } : null;
      }
      case 'sector_id': {
        const sector = metadata.sectors.find(s => s.sector_id === plotDetails.sector_id);
        return sector ? { value: sector.id, label: sector.etiqueta } : null;
      }
      case 'plot_conduction': {
        const conduction = metadata.conduction.find(c => c.vy_id === plotDetails.plot_conduction);
        return conduction ? { value: conduction.vy_id, label: conduction.value } : null;
      }
      case 'plot_management': {
        const management = metadata.management.find(m => m.vy_id === plotDetails.plot_management);
        return management ? { value: management.vy_id, label: management.value } : null;
      }
      default:
        return null;
    }
  };

  // Selection handlers
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
    
    setSelectedPlots(prev => 
      isChecked 
        ? [...prev, plotId]
        : prev.filter(id => id !== plotId)
    );
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

  const handleDownloadCSV = () => {
    let selectedData = [];
    
    Object.entries(selectedPlotsByGroup).forEach(([group, plotIds]) => {
      const groupPlots = plots.filter(p => plotIds.includes(p.plot_id));
      selectedData = [...selectedData, ...groupPlots];
    });
    
    if (!groupBy) {
      selectedData = plots.filter((p) => selectedPlots.includes(p.plot_id));
    }
    
    const transformedData = selectedData.map(plot => ({
      ID: plot.plot_id,
      Nombre: plot.plot_name,
      Sector: metadata.sectors.find(s => s.sector_id === plot.sector_id)?.etiqueta || 'Sin sector',
      Variedad: metadata.varieties.find(v => v.gv_id === plot.plot_var)?.name || 'No especificada',
      Portainjerto: metadata.rootstocks.find(r => r.gv_id === plot.plot_rootstock)?.name || 'No especificado',
      'Año de Implantación': plot.plot_implant_year || 'No especificado',
      'Año de Creación': plot.plot_creation_year || 'No especificado',
      'Sistema de Conducción': metadata.conduction.find(c => c.value === plot.plot_conduction)?.value || 'No especificado',
      'Tipo de Manejo': metadata.management.find(m => m.value === plot.plot_management)?.value || 'No especificado',
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

  // CRUD Operations
  const handleCreatePlot = async () => {  
    if (!newPlot.plot_name?.trim()) {
      setErrorMessage("Por favor, completa el campo obligatorio: Nombre.");
      setShowErrorModal(true);
      return;
    }
    
    if (!newPlot.plot_var) {
      setErrorMessage("Por favor, selecciona una variedad.");
      setShowErrorModal(true);
      return;
    }
    
    if (!plotGeoJSON || !plotGeoJSON.geometry) {
      setErrorMessage("Por favor, dibuja la parcela en el mapa.");
      setShowErrorModal(true);
      return;
    }
    
    try {
      // Convert geometry to WKT
      let wktGeom = null;
      try {
        wktGeom = Terraformer.convert(plotGeoJSON.geometry);
      } catch (error) {
        console.error("Error converting to WKT:", error);
        setErrorMessage("Error al procesar la geometría del mapa.");
        setShowErrorModal(true);
        return;
      }

      // Prepare plot data with proper ID conversions
      const selectedVariety = metadata.varieties.find((v) => v.name === newPlot.plot_var);
      const selectedRootstock = metadata.rootstocks.find((r) => r.name === newPlot.plot_rootstock);
      const selectedSector = metadata.sectors.find((s) => s.etiqueta === newPlot.sector_id);

      const plotToCreate = {
        plot_name: newPlot.plot_name.trim(),
        sector_id: newPlot.sector_id || null,
        plot_var: selectedVariety ? selectedVariety.gv_id : null,
        plot_rootstock: selectedRootstock ? selectedRootstock.gv_id : null,
        plot_conduction: newPlot.plot_conduction || null,
        plot_management: newPlot.plot_management || null,
        plot_geom: wktGeom,
        plot_implant_year: newPlot.plot_implant_year ? parseInt(newPlot.plot_implant_year) : null,
        plot_creation_year: newPlot.plot_creation_year ? parseInt(newPlot.plot_creation_year) : null,
        plot_description: newPlot.plot_description?.trim() || null,
      };

      await createPlot(plotToCreate);
      
      // Reload data and reset form
      await fetchPlotsData();
      handleCancelCreate();
      
      setSuccessMessage("La parcela ha sido creada correctamente.");
      setShowSuccessModal(true);

    } catch (error) {
      console.error("Error al crear la parcela:", error);
      setErrorMessage(error.userMessage || error.message || "Error al crear la parcela");
      setShowErrorModal(true);
    }
  };

  const handleUpdatePlot = async () => {
    if (!plotDetails) return;
    
    try {
      // Convert geometry to WKT if it's been changed
      let wktGeom = plotDetails.plot_geom;
      if (plotGeoJSON && plotGeoJSON.geometry) {
        try {
          wktGeom = Terraformer.convert(plotGeoJSON.geometry);
        } catch (error) {
          console.error("Error converting geometry to WKT:", error);
          setErrorMessage("Error al procesar la geometría del mapa.");
          setShowErrorModal(true);
          return;
        }
      }

      // Prepare updated plot data with proper ID conversions
      const updatedPlotDetails = { ...plotDetails };
    
      // Convert names to IDs for varieties
      if (typeof updatedPlotDetails.plot_var === 'string') {
        const selectedVariety = metadata.varieties.find(v => v.name === updatedPlotDetails.plot_var);
        if (selectedVariety) {
          updatedPlotDetails.plot_var = selectedVariety.gv_id;
        }
      }

      // Convert names to IDs for rootstocks
      if (typeof updatedPlotDetails.plot_rootstock === 'string') {
        const selectedRootstock = metadata.rootstocks.find(r => r.name === updatedPlotDetails.plot_rootstock);
        if (selectedRootstock) {
          updatedPlotDetails.plot_rootstock = selectedRootstock.gv_id;
        }
      }

      // Convert etiqueta to ID for sectors
      if (typeof updatedPlotDetails.sector_id === 'string') {
        const selectedSector = metadata.sectors.find(s => s.etiqueta === updatedPlotDetails.sector_id);
        if (selectedSector) {
          updatedPlotDetails.sector_id = selectedSector.id;
        }
      }

      // Ensure conduction and management are strings or null
      if (typeof updatedPlotDetails.plot_conduction === 'object' && updatedPlotDetails.plot_conduction !== null) {
        updatedPlotDetails.plot_conduction = updatedPlotDetails.plot_conduction.value;
      }

      if (typeof updatedPlotDetails.plot_management === 'object' && updatedPlotDetails.plot_management !== null) {
        updatedPlotDetails.plot_management = updatedPlotDetails.plot_management.value;
      }

      // Convert years to numbers
      if (updatedPlotDetails.plot_implant_year) {
        updatedPlotDetails.plot_implant_year = parseInt(updatedPlotDetails.plot_implant_year) || null;
      }
      
      if (updatedPlotDetails.plot_creation_year) {
        updatedPlotDetails.plot_creation_year = parseInt(updatedPlotDetails.plot_creation_year) || null;
      }

      // Update geometry
      updatedPlotDetails.plot_geom = wktGeom;
      await updatePlot(updatedPlotDetails.plot_id, updatedPlotDetails);
      // Reload data and close modal
      await fetchPlotsData();
      setIsEditingDetails(false);
      setShowMapModal(false);
      setPlotDetails(null);
      
      setSuccessMessage("Los detalles de la parcela han sido actualizados.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al guardar los detalles:", error);
      setErrorMessage(error.userMessage || error.message || "Error al guardar los detalles");
      setShowErrorModal(true);
    }
  };

  const handleDeletePlot = async (plotId) => {
    if (!plotId) {
      setErrorMessage("No se ha proporcionado un ID de parcela para eliminar.");
      setShowErrorModal(true);
      return;
    }
    
    if (window.confirm("¿Estás seguro de que deseas eliminar esta parcela? Esta acción no se puede deshacer.")) {
      try {
        await deletePlot(plotId);
        await fetchPlotsData();
        setShowMapModal(false);
        setShowArchiveModal(false);
        setPlotDetails(null);
        setPlotToArchive(null);
        setSuccessMessage("La parcela fue eliminada correctamente.");
        setShowSuccessModal(true);
      } catch (error) {
        console.error("Error al eliminar la parcela:", error);
        setErrorMessage(error.userMessage || "Hubo un error al eliminar la parcela.");
        setShowErrorModal(true);
      }
    }
  };

  const handleArchivePlot = async (plotId) => {
    try {
      await archivePlot(plotId);
      await fetchPlotsData();
      setShowMapModal(false);
      setShowArchiveModal(false);
      setPlotDetails(null);
      setPlotToArchive(null);
      setSuccessMessage("La parcela fue archivada correctamente.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error al archivar la parcela:", error);
      setErrorMessage(error.userMessage || "Hubo un error al archivar la parcela.");
      setShowErrorModal(true);
    }
  };

  const handleViewPlot = (plot) => {
   
  // Verificar qué sector encuentra
  const foundSector = metadata.sectors.find(s => s.sector_id === plot.sector_id);
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

  const handleGeometryChange = (geojson) => {
    if (!geojson || !geojson.geometry) {
      console.log('No hay geojson válido');
      return;
    }

    try {
      const wktGeometry = Terraformer.convert(geojson.geometry);
      
      if (isEditingDetails && plotDetails) {
        const updatedDetails = {
          ...plotDetails,
          plot_geom: wktGeometry,
        };
        setPlotDetails(updatedDetails);
      }
      
      setPlotGeoJSON(geojson);
    } catch (error) {
      console.error("Error converting geometry to WKT:", error);
    }
  };

  const handleCreateGeometryChange = (geojson) => {
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

  const handleSelectChange = (field, selectedOption) => {
    if (!selectedOption) {
      setPlotDetails({
        ...plotDetails,
        [field]: null
      });
      return;
    }

    let value = selectedOption.value;
    setPlotDetails({
      ...plotDetails,
      [field]: value
    });
  };

  const handleEditDetails = () => {
    setIsEditingDetails(true);
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
      sector_id: "",
      plot_var: "",
      plot_rootstock: "",
      plot_implant_year: "",
      plot_creation_year: "",
      plot_conduction: "",
      plot_management: "",
      plot_description: "",
      plot_geom: null,
    });
    setPlotGeoJSON(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg flex items-center">
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
            Cargando datos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          Crear Nueva Parcela
        </button>
        {selectedPlots.length > 0 && (
          <button onClick={handleDownloadCSV} className="btn btn-secondary">
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
            <option value="sector_id">Sector</option>
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

      {/* Table */}
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
                          {metadata.sectors.find(s => s.sector_id === plot.sector_id)?.etiqueta || 'Sin sector'}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {metadata.varieties.find(v => v.gv_id === plot.plot_var)?.name || 'Sin variedad'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">{plot.plot_area || 'N/A'}</td>
                        <td className="border border-gray-300 p-2 text-center">
                          <button
                            onClick={() => handleViewPlot(plot)}
                            className="p-2 rounded text-blue-500 hover:text-blue-700"
                            title="Ver detalles"
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
                required
              />
              
              <label className="modal-form-label" htmlFor="NewPlotSector">Sector:</label>
              <Select
                inputId="NewPlotSector"
                value={newPlot.sector_id ? { value: newPlot.sector_id, label: metadata.sectors.find(s => s.sector_id === newPlot.sector_id)?.etiqueta || newPlot.sector_id } : null}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, sector_id: selectedOption?.value || "" });
                }}
                options={metadata.sectors.map((sector) => ({
                  value: sector.sector_id,
                  label: sector.etiqueta,
                }))}
                isSearchable
                isClearable
                placeholder="Seleccionar sector..."
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
              
              <label className="modal-form-label" htmlFor="NewPlotVar">Variedad:</label>
              <Select
                inputId="NewPlotVar"
                value={newPlot.plot_var ? { value: newPlot.plot_var, label: newPlot.plot_var } : null}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, plot_var: selectedOption?.value || "" });
                }}
                options={metadata.varieties.map((variety) => ({
                  value: variety.name,
                  label: variety.name,
                }))}
                isSearchable
                placeholder="Seleccionar variedad..."
                className="modal-form-input"
                required
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

              <label className="modal-form-label" htmlFor="NewPlotRoots">Portainjerto:</label>
              <Select
                inputId="NewPlotRoots"
                value={newPlot.plot_rootstock ? { value: newPlot.plot_rootstock, label: newPlot.plot_rootstock } : null}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, plot_rootstock: selectedOption?.value || "" });
                }}
                options={metadata.rootstocks.map((rootstock) => ({
                  value: rootstock.name,
                  label: rootstock.name,
                }))}
                isSearchable
                isClearable
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

              <label className="modal-form-label" htmlFor="NewPlotPlantaY">Año de implantación:</label>
              <input
                id="NewPlotPlantaY"
                type="number"
                value={newPlot.plot_implant_year}
                onChange={(e) => setNewPlot({ ...newPlot, plot_implant_year: e.target.value })}
                className="modal-form-input"
                min="1900"
                max={new Date().getFullYear()}
              />

              <label className="modal-form-label" htmlFor="NewPlotCreatY">Año de creación:</label>
              <input
                id="NewPlotCreatY"
                type="number"
                value={newPlot.plot_creation_year}
                onChange={(e) => setNewPlot({ ...newPlot, plot_creation_year: e.target.value })}
                className="modal-form-input"
                min="1900"
                max={new Date().getFullYear()}
              />

              <label className="modal-form-label" htmlFor="NewPlotConduc">Sistema de conducción:</label>
              <Select
                inputId="NewPlotConduc"
                value={newPlot.plot_conduction ? { value: newPlot.plot_conduction, label: metadata.conduction.find(c => c.vy_id === newPlot.plot_conduction)?.value || newPlot.plot_conduction } : null}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, plot_conduction: selectedOption?.value || "" });
                }}
                options={metadata.conduction.map((conduction) => ({
                  value: conduction.vy_id,
                  label: conduction.value,
                }))}
                isSearchable
                isClearable
                placeholder="Seleccionar sistema de conducción..."
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
                value={newPlot.plot_management ? { value: newPlot.plot_management, label: metadata.management.find(m => m.vy_id === newPlot.plot_management)?.value || newPlot.plot_management} : null}
                onChange={(selectedOption) => {
                  setNewPlot({ ...newPlot, plot_management: selectedOption?.value || "" });
                }}
                options={metadata.management.map((management) => ({
                  value: management.vy_id,
                  label: management.value,
                }))}
                isSearchable
                isClearable
                placeholder="Seleccionar tipo de manejo..."
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
                placeholder="Descripción opcional de la parcela..."
              />

              <div className="map-details-container">
                <label className="modal-form-label">Ubicación en el mapa:</label>
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
                    type="button"
                  >
                    Limpiar Mapa
                  </button>
                  {plotGeoJSON && (
                    <span className="text-green-600 text-sm">
                      ✓ Geometría definida
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-buttons mt-4">
                <button onClick={handleCancelCreate} className="btn btn-secondary" type="button">
                  Cancelar
                </button>
                <button onClick={handleCreatePlot} className="btn btn-primary" type="button">
                  Crear Parcela
                </button>
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
        contentLabel="Detalles de Parcela"
      >
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">Detalles de la Parcela</h2>
            <div className="mb-4">
              <div className="map-details-container">
                <div className="leaflet-container" style={{ height: '300px', marginBottom: '20px' }}>
                  {mapToDisplay && (
                    <Map 
                      ref={viewEditMapRef}
                      geojson={mapToDisplay} 
                      onGeometryChange={handleGeometryChange}
                      showPopup={false}
                      editable={isEditingDetails}
                      key={`edit-${plotDetails?.plot_id}-${isEditingDetails}`}
                    />
                  )}
                </div>
                {isEditingDetails && (
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        if (viewEditMapRef.current?.clearMap) {
                          viewEditMapRef.current.clearMap();
                        }
                      }}
                      className="btn btn-danger mr-2"
                      type="button"
                    >
                      Limpiar Geometría
                    </button>
                  </div>
                )}
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
                          inputId={`edit-${field.key}`}
                          name={field.key}
                          value={getSafeSelectValue(field.key, plotDetails, metadata)}
                          onChange={(selectedOption) => handleSelectChange(field.key, selectedOption)}
                          options={
                            field.options === 'varieties' 
                              ? metadata.varieties.map(option => ({ value: option.name, label: option.name }))
                              : field.options === 'rootstocks' 
                              ? metadata.rootstocks.map(option => ({ value: option.name, label: option.name }))
                              : field.options === 'sectors' 
                              ? metadata.sectors.map(option => ({ value: option.sector_id, label: option.etiqueta }))
                              : field.options === 'conduction' 
                              ? metadata.conduction.map(option => ({ value: option.vy_id, label: option.value }))
                              : field.options === 'management' 
                              ? metadata.management.map(option => ({ value: option.vy_id, label: option.value }))
                              : []
                          }
                          isSearchable
                          isClearable={!field.required}
                          placeholder={`Seleccionar ${field.label}...`}
                          className="w-full"
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
                            ) : field.type === 'textarea' ? (
                              <textarea
                                id={`edit-${field.key}`}
                                name={field.key}
                                value={plotDetails[field.key] || ''}
                                onChange={(e) => setPlotDetails({ ...plotDetails, [field.key]: e.target.value })}
                                className="w-full p-2 border rounded"
                                disabled={field.disabled}
                                rows={3}
                              />
                            ) : (
                              <input
                                id={`edit-${field.key}`}
                                name={field.key}
                                type={field.type}
                                value={plotDetails[field.key] || ''}
                                onChange={(e) => setPlotDetails({ ...plotDetails, [field.key]: e.target.value })}
                                className="w-full p-2 border rounded"
                                disabled={field.disabled}
                                min={field.type === 'number' ? "1900" : undefined}
                                max={field.type === 'number' ? new Date().getFullYear() : undefined}
                              />
                            )
                          ) : (
                            <span className="text-gray-800">
                              {field.key === 'plot_var'
                                ? metadata.varieties.find(v => v.gv_id === plotDetails.plot_var)?.name || plotDetails.plot_var || 'Sin especificar'
                                : field.key === 'plot_rootstock'
                                ? metadata.rootstocks.find(r => r.gv_id === plotDetails.plot_rootstock)?.name || plotDetails.plot_rootstock || 'Sin especificar'
                                : field.key === 'sector_id'
                                ? metadata.sectors.find(s => s.sector_id === plotDetails.sector_id)?.etiqueta || plotDetails.sector_id || 'Sin especificar'
                                : field.key === 'plot_conduction'
                                ? metadata.conduction.find(c => c.vy_id === plotDetails.plot_conduction)?.value || plotDetails.plot_conduction || 'Sin especificar'
                                : field.key === 'plot_management'
                                ? metadata.management.find(m => m.vy_id === plotDetails.plot_management)?.value || plotDetails.plot_management || 'Sin especificar'
                                : field.key === 'plot_area'
                                ? `${plotDetails[field.key] || 'No calculada'} ${plotDetails[field.key] ? 'm²' : ''}`
                                : plotDetails[field.key] || 'Sin especificar'
                              }
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  
                  <div className="modal-buttons mt-6">
                    {isEditingDetails ? (
                      <>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          className="btn btn-secondary"
                          type="button"
                        >
                          Cancelar Edición
                        </button>
                        <button
                          onClick={handleUpdatePlot}
                          className="btn btn-primary"
                          type="button"
                        >
                          Guardar Cambios
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowMapModal(false);
                            setPlotDetails(null);
                            setIsEditingDetails(false);
                          }}
                          className="btn btn-secondary"
                          type="button"
                        >
                          Cerrar
                        </button>
                        <button
                          onClick={() => {
                            setPlotToArchive(plotDetails);
                            setShowArchiveModal(true);
                          }}
                          className="btn btn-warning"
                          type="button"
                        >
                          Archivar
                        </button>
                        <button
                          onClick={handleEditDetails}
                          className="btn btn-primary"
                          type="button"
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

    {/* Modal de confirmación de archivo */}
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
            <p className="mb-6 text-gray-700">
              ¿Estás seguro que deseas archivar la parcela <strong>{plotToArchive?.plot_name}</strong>?
              <br />
              <span className="text-sm text-gray-500">
                La parcela se ocultará de la vista principal pero no se eliminará permanentemente.
              </span>
            </p>
            <div className="modal-buttons mt-4">
              <button
                onClick={() => {
                  setShowArchiveModal(false);
                  setPlotToArchive(null);
                }}
                className="btn btn-secondary"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePlot(plotToArchive?.plot_id)}
                className="btn btn-danger mr-2"
                type="button"
              >
                Eliminar Permanentemente
              </button>
              <button
                onClick={() => handleArchivePlot(plotToArchive?.plot_id)}
                className="btn btn-primary"
                type="button"
              >
                Sí, Archivar Parcela
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
    </div>
  );
};

export default TablePlots;