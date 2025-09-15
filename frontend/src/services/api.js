import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Base API client
const API = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error handling
    if (error.response?.data?.detail) {
      error.userMessage = error.response.data.detail;
    } else if (error.response?.status >= 500) {
      error.userMessage = 'Error interno del servidor. Por favor, inténtalo más tarde.';
    } else if (error.response?.status >= 400) {
      error.userMessage = 'Error en la solicitud. Verifica los datos e inténtalo nuevamente.';
    } else if (error.code === 'ECONNABORTED') {
      error.userMessage = 'La solicitud tardó demasiado. Por favor, inténtalo nuevamente.';
    } else {
      error.userMessage = 'Error de conexión. Verifica tu conexión a internet.';
    }
    return Promise.reject(error);
  }
);

// ====== PLOTS ENDPOINTS ======

/**
 * Obtener parcelas con datos completos y metadatos
 * Esta función combina múltiples llamadas para simular el endpoint optimizado
 */
export const getPlotsWithData = async (filters = {}) => {
  try {
    // Parallel requests for better performance
    const [plotsResponse, metadataResponse] = await Promise.all([
      getPlots(filters.active_only !== false), // Default to active only
      getPlotsMetadata()
    ]);

    let plots = plotsResponse;

    // Apply client-side filtering if needed
    if (filters.filter_field && filters.filter_value) {
      plots = plots.filter(plot => {
        const fieldValue = plot[filters.filter_field];
        if (fieldValue === null || fieldValue === undefined) return false;
        return fieldValue.toString().toLowerCase().includes(filters.filter_value.toLowerCase());
      });
    }

    // Apply additional filters
    if (filters.variety_ids?.length > 0) {
      plots = plots.filter(plot => filters.variety_ids.includes(plot.plot_var));
    }

    if (filters.rootstock_ids?.length > 0) {
      plots = plots.filter(plot => filters.rootstock_ids.includes(plot.plot_rootstock));
    }

    if (filters.sector_ids?.length > 0) {
      plots = plots.filter(plot => filters.sector_ids.includes(plot.plot_sector));
    }

    if (filters.conduction_systems?.length > 0) {
      plots = plots.filter(plot => filters.conduction_systems.includes(plot.plot_conduction));
    }

    if (filters.management_types?.length > 0) {
      plots = plots.filter(plot => filters.management_types.includes(plot.plot_management));
    }

    // Area filters
    if (filters.min_area !== undefined && filters.min_area !== null) {
      plots = plots.filter(plot => plot.plot_area >= filters.min_area);
    }

    if (filters.max_area !== undefined && filters.max_area !== null) {
      plots = plots.filter(plot => plot.plot_area <= filters.max_area);
    }

    // Year filters
    if (filters.implant_year_from !== undefined && filters.implant_year_from !== null) {
      plots = plots.filter(plot => plot.plot_implant_year >= filters.implant_year_from);
    }

    if (filters.implant_year_to !== undefined && filters.implant_year_to !== null) {
      plots = plots.filter(plot => plot.plot_implant_year <= filters.implant_year_to);
    }

    return {
      plots: plots,
      metadata: metadataResponse
    };
  } catch (error) {
    console.error('Error fetching plots with data:', error);
    throw error;
  }
};

//Obtengo los plotarchived solamente
export const getArchivedPlotsWithData = async () => {
  try {
    const response = await getPlotsWithData({ active_only: false });
    return response;
  } catch (error) {
    console.error("Error fetching archived plots:", error);
    throw error;
  }
};

/**
 * Obtener metadatos agregados para el componente
 */
export const getPlotsMetadata = async () => {
  try {
    // Parallel requests for all metadata
    const [varietiesResponse, rootstocksResponse, conductionResponse, managementResponse, sectorsResponse] = await Promise.all([
      getVarieties(),
      getRootstocks(),
      getConduction(),
      getManagement(),
      getSectors()
    ]);

    return {
      varieties: varietiesResponse.data || varietiesResponse,
      rootstocks: rootstocksResponse.data || rootstocksResponse,
      conduction: conductionResponse.data || conductionResponse,
      management: managementResponse.data || managementResponse,
      sectors: sectorsResponse.data || sectorsResponse
    };
  } catch (error) {
    console.error('Error fetching plots metadata:', error);
    throw error;
  }
};



// ====== EXISTING PLOTS ENDPOINTS (Updated) ======

export const getPlots = async (activeOnly = true) => {
  try {
    const response = await API.get(`/plots/?active_only=${activeOnly}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching plots:', error);
    throw error;
  }
};

export const getPlot = async (plotId) => {
  try {
    const response = await API.get(`/plots/${plotId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching plot:', error);
    throw error;
  }
};

export const createPlot = async (plotData) => {
  try {
    // Validate required fields
    if (!plotData.plot_name?.trim()) {
      throw new Error('El nombre de la parcela es requerido');
    }
    if (!plotData.plot_var) {
      throw new Error('La variedad es requerida');
    }
    if (!plotData.plot_geom) {
      throw new Error('La geometría de la parcela es requerida');
    }

    const response = await API.post('/plots/', plotData);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error creating plot:', error.response.data);
      console.error('Status code:', error.response.status);
      throw error.response.data;
    } else if (error.request) {
      console.error('Error creating plot: No response received', error.request);
      throw new Error('No response received from server');
    } else {
      console.error('Error creating plot:', error.message);
      throw error;
    }
  }
};

export const updatePlot = async (plotId, plotData) => {
  try {
    if (!plotId) {
      throw new Error('ID de parcela es requerido');
    }
    const response = await API.put(`/plots/${plotId}`, plotData);
    return response.data;
  } catch (error) {
    console.error('Error updating plot:', error);
    throw error;
  }
};

export const deletePlot = async (plotId) => {
  try {
    if (!plotId) {
      throw new Error('ID de parcela es requerido');
    }
    await API.delete(`/plots/${plotId}/permanent`);
    return { success: true, message: 'Parcela eliminada correctamente' };
  } catch (error) {
    console.error('Error deleting plot:', error);
    throw error;
  }
};

export const archivePlot = async (plotId) => {
  try {
    if (!plotId) {
      throw new Error('ID de parcela es requerido');
    }
    const response = await API.patch(`/plots/${plotId}/archive`);
    return response.data;
  } catch (error) {
    console.error('Error archiving plot:', error);
    throw error;
  }
};

export const activatePlot = async (plotId) => {
  try {
    if (!plotId) {
      throw new Error('ID de parcela es requerido');
    }
    const response = await API.patch(`/plots/${plotId}/activate`);
    return response.data;
  } catch (error) {
    console.error('Error activating plot:', error);
    throw error;
  }
};

export const getPlotStatistics = async () => {
  try {
    const response = await API.get('/plots/statistics/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching plot statistics:', error);
    throw error;
  }
};

// ====== VINEYARD ENDPOINTS ======

export const getAllVineyards = async () => {
  try {
    const response = await API.get('/vineyard/vineyard/');
    return response.data;
  } catch (error) {
    console.error('Error fetching vineyards:', error);
    throw error;
  }
};

export const getManagement = async () => {
  try {
    const response = await API.get('/vineyard/vineyard/management');
    return response.data;
  } catch (error) {
    console.error('Error fetching management:', error);
    throw error;
  }
};

export const getConduction = async () => {
  try {
    const response = await API.get('/vineyard/vineyard/conduction');
    return response.data;
  } catch (error) {
    console.error('Error fetching conduction:', error);
    throw error;
  }
};

// ====== GRAPEVINE ENDPOINTS ======

export const getAllGrapevines = async () => {
  try {
    const response = await API.get('/grapevines');
    return response.data;
  } catch (error) {
    console.error('Error fetching grapevines:', error);
    throw error;
  }
};

export const getVarieties = async () => {
  try {
    const response = await API.get('/grapevines/grapevines/varieties');
    return response.data;
  } catch (error) {
    console.error('Error fetching varieties:', error);
    throw error;
  }
};

export const getRootstocks = async () => {
  try {
    const response = await API.get('/grapevines/grapevines/rootstocks');
    return response.data;
  } catch (error) {
    console.error('Error fetching rootstocks:', error);
    throw error;
  }
};

// ====== SECTORS ENDPOINTS ======

export const getSectors = async () => {
  try {
    const response = await fetch(`${API_URL}/sectores/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error al obtener sectores:', error);
    throw error;
  }
};

export const createSector = async (sectorData) => {
  try {
    return await axios.post(`${API_URL}/sectores/`, sectorData);
  } catch (error) {
    throw error;
  }
};

export const updateSector = async (sectorId, sectorData) => {
  try {
    return await axios.put(`${API_URL}/sectores/${sectorId}`, sectorData);
  } catch (error) {
    throw error;
  }
};

export const deleteSector = async (sectorId) => {
  try {
    return await axios.delete(`${API_URL}/sectores/${sectorId}`);
  } catch (error) {
    throw error;
  }
};

// ====== UTILITY FUNCTIONS ======

/**
 * Build search filters for the API
 */
export const buildSearchFilters = (searchCriteria = {}) => {
  const filters = {};

  // Basic filter
  if (searchCriteria.filterField && searchCriteria.filterValue) {
    filters.filter_field = searchCriteria.filterField;
    filters.filter_value = searchCriteria.filterValue;
  }

  // Specific filters
  if (searchCriteria.sectorIds?.length > 0) {
    filters.sector_ids = searchCriteria.sectorIds;
  }
  
  if (searchCriteria.varietyIds?.length > 0) {
    filters.variety_ids = searchCriteria.varietyIds;
  }
  
  if (searchCriteria.rootstockIds?.length > 0) {
    filters.rootstock_ids = searchCriteria.rootstockIds;
  }
  
  if (searchCriteria.conductionSystems?.length > 0) {
    filters.conduction_systems = searchCriteria.conductionSystems;
  }
  
  if (searchCriteria.managementTypes?.length > 0) {
    filters.management_types = searchCriteria.managementTypes;
  }

  // Range filters
  if (searchCriteria.minArea !== undefined && searchCriteria.minArea !== null) {
    filters.min_area = parseFloat(searchCriteria.minArea);
  }
  
  if (searchCriteria.maxArea !== undefined && searchCriteria.maxArea !== null) {
    filters.max_area = parseFloat(searchCriteria.maxArea);
  }
  
  if (searchCriteria.implantYearFrom !== undefined && searchCriteria.implantYearFrom !== null) {
    filters.implant_year_from = parseInt(searchCriteria.implantYearFrom);
  }
  
  if (searchCriteria.implantYearTo !== undefined && searchCriteria.implantYearTo !== null) {
    filters.implant_year_to = parseInt(searchCriteria.implantYearTo);
  }

  // Active only filter
  filters.active_only = searchCriteria.includeArchived ? false : true;

  return filters;
};


//ENDPOINTS OPERACIONES
export const getOperaciones = async () => {
  try {
      const response = await API.get('/operaciones');
      return response.data;
  } catch (error) {
      console.error("Error al obtener operaciones:", error);
      throw error;
  }
};
export const getOperacionesWinery = async () => {
  try {
    const response = await API.get('/operaciones/winery');
    return response.data;
  } catch (error) {
    console.error("Error al obtener operaciones de bodega:", error);
    throw error;
  }
};
export const getOperacionesVineyard = async () => {
  try {
    const response = await API.get('/operaciones/vineyard');
    return response.data;
  } catch (error) {
    console.error("Error al obtener operaciones de viñedo:", error);
    throw error;
  }
};
export const updateOperacion = async (id, data) => {
  const response = await API.put(`/operaciones/${id}`, data);
  return response.data;
};
export const updateOperacionInputs = async (operacionId, inputsData) => {
  try {
    console.log(`Updating inputs for operacion ${operacionId}:`, inputsData);
    
    // Verificar que operacionId sea válido
    if (!operacionId || operacionId === 'undefined') {
      throw new Error('ID de operación inválido');
    }
      console.log('Payload being sent:', inputsData);

      const response = await API.put(`/operaciones/${operacionId}/inputs`, inputsData);
    
    console.log('Response received:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error al actualizar los insumos de la operación:', error);
    
    // Log más detallado del error
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    throw error;
  }
};
export const createOperacion = async (operacion) => {
  try {
    console.log('Datos enviados al backend:', operacion); // Debug
    console.log('URL completa:', `${API.defaults.baseURL}/operaciones`); // Debug
    
    // ✅ IMPORTANTE: Asegurar que usamos la ruta correcta
    const response = await API.post("/operaciones/", operacion); // Agregar / al final
    
    console.log('Respuesta del backend:', response.data); // Debug
    return response.data;
  } catch (error) {
    console.error("Error completo:", error); // Debug más detallado
    console.error("URL del error:", error.config?.url); // Debug URL
    console.error("Método del error:", error.config?.method); // Debug método
    console.error("Datos enviados:", error.config?.data); // Debug datos enviados
    console.error("Error en la solicitud:", error.response?.data || error.message);
    throw error;
  }
};
export const deleteOperacion = async (id) => {
  const response = await API.delete(`/operaciones/${id}`);
  return response.data;
};

export const getOperacionDetailed = async (operacionId) => {
    try {
        // Usando la misma instancia API
        const response = await API.get(`/operaciones/${operacionId}`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener detalles de operación:', error);
        throw error;
    }
};

//USERS
export const getUsers = async () => {
  const response = await API.get('/users/users/');
  return response.data;
};

//TASKLIST
export const getVineyardTasks = async () => {
  const response = await API.get('/task/task/vineyard');
  return response.data;
};
export const getWineryTasks = async () => {
  const response = await API.get('/task/task/winery');
  return response.data;
};

//ENDPOINTS INVENTORY
//INPUT CATEGORIES
export const createCategory = async (category) => {
  const response = await API.post('/inventory/inventory/categories/', category);
  return response.data;
};
export const getCategory = async (categoryId) => {
  const response = await API.get(`/inventory/inventory/categories/${categoryId}`);
  return response.data;
};
export const getCategories = async (params) => {
  const response = await API.get('/inventory/inventory/categories/', { params });
  return response.data;
};
export const updateCategory = async (categoryId, category) => {
  const response = await API.put(`/inventory/inventory/categories/${categoryId}`, category);
  return response.data;
};
export const deleteCategory = async (categoryId) => {
  const response = await API.delete(`/inventory/inventory/categories/${categoryId}`);
  return response.data;
};

//INPUTS

export const createInput = async (input) => {
  const response = await API.post('/inventory/inventory/inputs/', input);
  return response.data;
};
export const getInput = async (inputId) => {
  const response = await API.get(`/inventory/inventory/inputs/${inputId}`);
  return response.data;
};
export const getInputs = async (params) => {
  const response = await API.get('/inventory/inventory/inputs/', { params });
  return response.data;
};
export const updateInput = async (inputId, input) => {
  const response = await API.put(`/inventory/inventory/inputs/${inputId}`, input);
  return response.data;
};
export const deleteInput = async (inputId) => {
  const response = await API.delete(`/inventory/inventory/inputs/${inputId}`);
  return response.data;
};

//WAREHOUSE

export const createWarehouse = async (warehouse) => {
  const response = await API.post('/inventory/inventory/warehouses/', warehouse);
  return response.data;
};
export const getWarehouse = async (warehouseId) => {
  const response = await API.get(`/inventory/inventory/warehouses/${warehouseId}`);
  return response.data;
};
export const getWarehouses = async (params) => {
  const response = await API.get('/inventory/inventory/warehouses/', { params });
  return response.data;
};
export const updateWarehouse = async (warehouseId, warehouse) => {
  const response = await API.put(`/inventory/inventory/warehouses/${warehouseId}`, warehouse);
  return response.data;
};
export const deleteWarehouse = async (warehouseId) => {
  const response = await API.delete(`/inventory/inventory/warehouses/${warehouseId}`);
  return response.data;
};

//INPUTS STOCKS

export const createStock = async (stock) => {
  const response = await API.post('/inventory/inventory/stocks/', stock);
  return response.data;
};
export const getStock = async (stockId) => {
  const response = await API.get(`/inventory/inventory/stocks/${stockId}`);
  return response.data;
};
export const getStockByInputWarehouse = async (params) => {
  const response = await API.get('/inventory/inventory/stocks/by_input_warehouse/', { params });
  return response.data;
};
export const getStocks = async (params) => {
  const response = await API.get('/inventory/inventory/stocks/', { params });
  return response.data;
};
export const getStocksWithDetails = async (params) => {
  const response = await API.get('/inventory/inventory/stocks/details/', { params });
  return response.data;
};

//TASK INPUTS

export const createTaskInput = async (taskInput) => {
  const response = await API.post('/inventory/inventory/task_inputs/', taskInput);
  return response.data;
};
export const getTaskInput = async (taskInputId) => {
  const response = await API.get(`/inventory/inventory/task_inputs/${taskInputId}`);
  return response.data;
};
export const getTaskInputs = async (params) => {
  const response = await API.get('/inventory/inventory/task_inputs/', { params });
  return response.data;
};
export const getTaskInputsWithDetails = async (operationId) => {
  const response = await API.get(`/inventory/inventory/task_inputs/details/${operationId}`);
  return response.data;
};
export const updateTaskInput = async (taskInputId, taskInput) => {
  const response = await API.put(`/inventory/inventory/task_inputs/${taskInputId}`, taskInput);
  return response.data;
};
export const deleteTaskInput = async (taskInputId) => {
  const response = await API.delete(`/inventory/inventory/task_inputs/${taskInputId}`);
  return response.data;
};
export const createInventoryMovement = async (movementData) => {
  const response = await API.post('/inventory/inventory/movements/', movementData);
  return response.data;
};

///Winery

export const getVesselActivities = async (skip = 0, limit = 100) => {
  return API.get('/winery/winery/vessel_activities/', { skip, limit });
};
export const createVesselActivity = async (activityData) => {
  return API.post('/winery/winery/vessel_activities/', activityData);
};
export const updateVesselActivity = async (vessel_activity_id, activityData) => {
  return API.put(`/winery/winery/vessel_activities/${vessel_activity_id}`, activityData);
};
export const deleteVesselActivity = async (vessel_activity_id) => {
  return API.delete(`/winery/winery/vessel_activities/${vessel_activity_id}`);
};
export const getVessels = async (skip = 0, limit = 100) => {
  return API.get('/winery/winery/vessels/', { skip, limit });
};
export const getVessel = async (vessel_id) => {
  try {
    const response = await API.get(`/winery/winery/vessels/${vessel_id}`); // Asegurate que la ruta es correcta.
    return response; // Devuelve la respuesta completa.
  } catch (error) {
    console.error("Error al obtener las vasijas:", error);
    throw error; // Propaga el error para que se maneje en el componente.
  }
};
export const createVessel = async (vesselData) => {
  return API.post('/winery/winery/vessels/', vesselData);
};
export const updateVessel = async (vessel_id, vesselData) => {
  return API.put(`/winery/winery/vessels/${vessel_id}`, vesselData);
};
export const deleteVessel = async (vessel_id) => {
  return API.delete(`/winery/winery/vessels/${vessel_id}`);
};
export const getBatches = async (skip = 0, limit = 100) => {
  return API.get('/winery/winery/batches/', { skip, limit });
};
export const getBatch = async (batch_id) => {
  return API.get(`/winery/winery/batches/${batch_id}`);
};
export const createBatch = async (batchData) => {
  return API.post('/winery/winery/batches/', batchData);
};
export const updateBatch = async (batch_id, batchData) => {
  return API.put(`/winery/winery/batches/${batch_id}`, batchData);
};
export const deleteBatch = async (batch_id) => {
  return API.delete(`/winery/winery/batches/${batch_id}`);
};

// Función para obtener todas las fincas
export const getFincas = async () => {
    try {
        return await axios.get(`${API_URL}/fincas/`);
    } catch (error) {
        throw error;
    }
};

// Función para crear una nueva finca
export const createFinca = async (fincaData) => {
    try {
        return await axios.post(`${API_URL}/fincas/`, fincaData);
    } catch (error) {
        throw error;
    }
};

// Función para actualizar una finca existente
export const updateFinca = async (fincaId, fincaData) => {
    try {
        return await axios.put(`${API_URL}/fincas/${fincaId}`, fincaData);
    } catch (error) {
        throw error;
    }
};

// Función para eliminar una finca
export const deleteFinca = async (fincaId) => {
    try {
        return await axios.delete(`${API_URL}/fincas/${fincaId}`);
    } catch (error) {
        throw error;
    }
};
// Funciones para Vitacora
/*
export const getCategoriasImagenes = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/categorias-imagenes/${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const getCategoriaImagen = async (id) => {
  const response = await fetch(`${API_BASE_URL}/categorias-imagenes/${id}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const createCategoriaImagen = async (categoria) => {
  const response = await fetch(`${API_BASE_URL}/categorias-imagenes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoria),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `Error ${response.status}`);
  }
  return response.json();
};
*/
export default API;
