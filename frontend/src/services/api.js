import axios from 'axios';

// Base URL del backend
const API = axios.create({
  baseURL: "http://localhost:8000", // Cambia según la configuración de tu backend
  headers: {
    'Content-Type': 'application/json',
  },
});

//ENDPOINTS PLOTS
// Función auxiliar para manejar errores
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ha ocurrido un error con la petición');
  }
  return response.json();
};
// Obtener todas las parcelas
export const getPlots = async (activeOnly = true) => {
  try {
    const response = await API.get(`/plots/?active_only=${activeOnly}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching plots:', error);
    throw error;
  }
};
// Obtener una parcela específica
export const getPlot = async (plotId) => {
  try {
    const response = await API.get(`/plots/${plotId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching plot:', error);
    throw error;
  }
};
// Crear una nueva parcela
export const createPlot = async (plotData) => {
  try {
      const response = await API.post('/plots', plotData);
      return response.data;
  } catch (error) {
      if (error.response) {
          // El servidor respondió con un código de estado fuera del rango 2xx
          console.error('Error creating plot:', error.response.data);
          console.error('Status code:', error.response.status);
          console.error('Headers:', error.response.headers);
          console.log('Error details:', error.response.data.detail); // Asegurate de que esta linea esta aqui.
          throw error.response.data; // Lanza el error del servidor
      } else if (error.request) {
          // La solicitud fue hecha pero no se recibió respuesta
          console.error('Error creating plot: No response received', error.request);
          throw new Error('No response received from server');
      } else {
          // Algo más causó el error
          console.error('Error creating plot:', error.message);
          throw error;
      }
  }
};
// Actualizar una parcela existente
export const updatePlot = async (plotId, plotData) => {
  try {
    const response = await API.put(`/plots/${plotId}`, plotData);
    return response.data;
  } catch (error) {
    console.error('Error updating plot:', error);
    throw error;
  }
};
// Eliminar una parcela permanentemente
export const deletePlot = async (plotId) => {
  try {
    await API.delete(`/plots/${plotId}/permanent`);
    return true; // No es necesario devolver datos si el DELETE es exitoso
  } catch (error) {
    console.error('Error deleting plot:', error);
    throw error;
  }
};
// Archivar una parcela (cambiar a inactivo)
export const archivePlot = async (plotId) => {
  try {
    const response = await API.patch(`/plots/${plotId}/archive`);
    return response.data;
  } catch (error) {
    console.error('Error archiving plot:', error);
    throw error;
  }
};
// Activar una parcela
export const activatePlot = async (plotId) => {
  try {
    const response = await API.patch(`/plots/${plotId}/activate`);
    return response.data;
  } catch (error) {
    console.error('Error activating plot:', error);
    throw error;
  }
};
// Obtener estadísticas de parcelas
export const getPlotStatistics = async () => {
  try {
    const response = await API.get('/plots/statistics/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching plot statistics:', error);
    throw error;
  }
};

//ENPOINTS VINEYARD
// Obtener todas las vineyards
export const getAllVineyards = async () => {
  try {
    const response = await API.get('/vineyard/vineyard/');
    return response.data;
  } catch (error) {
    console.error('Error fetching vineyards:', error);
    throw error;
  }
};
// Obtener solo las management
export const getManagement = async () => {
  try {
    const response = await API.get('/vineyard/vineyard/management');
    return response.data;
  } catch (error) {
    console.error('Error fetching management:', error);
    throw error;
  }
};
// Obtener solo los conduction
export const getConduction = async () => {
  try {
    const response = await API.get('/vineyard/vineyard/conduction');
    return response.data;
  } catch (error) {
    console.error('Error fetching conduction:', error);
    throw error;
  }
};

//ENPOINTS GRAPEVINE
// Obtener todas las grapevines
export const getAllGrapevines = async () => {
  try {
    const response = await API.get('/grapevines');
    return response.data;
  } catch (error) {
    console.error('Error fetching grapevines:', error);
    throw error;
  }
};
// Obtener solo las variedades
export const getVarieties = async () => {
  try {
  const response = await API.get('/grapevines/grapevines/varieties');
  return response.data;
  } catch (error) {
    console.error('Error fetching varieties:', error);
    throw error;
  }
};
// Obtener solo los portainjertos
export const getRootstocks = async () => {
  try {
    const response = await API.get('/grapevines/grapevines/rootstocks');
    return response.data;
  } catch (error) {
    console.error('Error fetching rootstocks:', error);
    throw error;
  }
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
    // Usamos API.post para que utilice el baseURL configurado
    const response = await API.post("/operaciones", operacion);
    return response.data;
  } catch (error) {
    console.error("Error en la solicitud:", error.response?.data || error.message);
    throw error;
  }
};
export const deleteOperacion = async (id) => {
  const response = await API.delete(`/operaciones/${id}`);
  return response.data;
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


export default API;