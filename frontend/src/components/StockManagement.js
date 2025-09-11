import React, { useState, useEffect } from 'react';
import { getStocksWithDetails, createInventoryMovement } from "../services/api"; // Asegúrate de tener estas funciones en api.js
import Modal from 'react-modal'; // Necesitas instalar react-modal: npm install react-modal

Modal.setAppElement('#root'); // Reemplaza '#root' con el ID del elemento raíz de tu aplicación

function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState('entry'); // 'entry' o 'exit'
  const [selectedStock, setSelectedStock] = useState(null);
  const [movementQuantity, setMovementQuantity] = useState('');
  const [filterField, setFilterField] = useState('input.name');
  const [filterValue, setFilterValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [groupBy, setGroupBy] = useState(null);
  const [selectedStocks, setSelectedStocks] = useState({});
  const [allSelected, setAllSelected] = useState({});
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const data = await getStocksWithDetails();
        setStocks(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  const handleOpenMovementForm = (stock, type) => {
    setSelectedStock(stock);
    setMovementType(type);
    setShowMovementForm(true);
  };

  const handleCloseMovementForm = () => {
    setShowMovementForm(false);
    setSelectedStock(null);
    setMovementQuantity('');
  };

  const handleCreateMovement = async () => {
    if (!selectedStock || !movementQuantity) return;

    const movementData = {
      input_id: selectedStock.input.id,
      warehouse_id: selectedStock.warehouse.id,
      movement_type: movementType,
      quantity: parseFloat(movementQuantity),
      unit_price: selectedStock.input.price, // Puedes ajustar esto según tus necesidades
      operation_id: null, // Ajusta según tus necesidades
      user_id: 1, // Ajusta según tus necesidades
      comments: `${movementType === 'entry' ? 'Ingreso' : 'Salida'} de stock`,
    };

    try {
      await createInventoryMovement(movementData);
      // Recargar los stocks después de crear el movimiento
      const data = await getStocksWithDetails();
      setStocks(data);
      handleCloseMovementForm();
    } catch (err) {
      setError(err);
    }
  };

  const filteredStocks = stocks.filter(stock => {
    const fieldValue = filterField === 'input.name' ? stock.input.name : stock.warehouse.name;
    return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
  });

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    if (!sortConfig.key) return 0;
  
    let aValue, bValue;
    if (sortConfig.key === 'input.name') {
      aValue = a.input.name;
      bValue = b.input.name;
    } else if (sortConfig.key === 'warehouse.name') {
      aValue = a.warehouse.name;
      bValue = b.warehouse.name;
    } else {
      aValue = a.available_quantity;
      bValue = b.available_quantity;
    }
  
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const groupStocks = (data, groupBy) => {
    return data.reduce((acc, stock) => {
      const key = stock[groupBy]?.name || stock[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(stock);
      return acc;
    }, {});
  };

  const groupedStocks = groupBy ? groupStocks(sortedStocks, groupBy) : { "Todos los stocks": sortedStocks };

  const handleSelectAll = (e, group) => {
    setAllSelected({ ...allSelected, [group]: e.target.checked });
    const updatedSelections = { ...selectedStocks };
    if (e.target.checked) {
      updatedSelections[group] = groupedStocks[group].map((stock) => stock.id);
    } else {
      updatedSelections[group] = [];
    }
    setSelectedStocks(updatedSelections);
  };
  
  const handleSelectStock = (e, stock, group) => {
    const groupSelections = selectedStocks[group] || [];
    const updatedSelections = e.target.checked
      ? [...groupSelections, stock.id]
      : groupSelections.filter((id) => id !== stock.id);
    setSelectedStocks({ ...selectedStocks, [group]: updatedSelections });
  
    const allGroupSelected = groupedStocks[group].every((s) => selectedStocks[group]?.includes(s.id));
    setAllSelected({ ...allSelected, [group]: allGroupSelected });
  };

  const generateCSV = () => {
    const selectedData = [];
    
    // Recolectar datos seleccionados
    for (const group in selectedStocks) {
      const selectedIdsInGroup = selectedStocks[group];
      if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
        const filteredStocks = stocks.filter((stock) => selectedIdsInGroup.includes(stock.id));
        selectedData.push(...filteredStocks);
      }
    }
    
    if (selectedData.length === 0) {
      alert("No hay stocks seleccionados para descargar.");
      return;
    }

    // Aplanar los datos para el CSV
    const flattenedData = selectedData.map(stock => ({
      'ID Stock': stock.id,
      'Insumo': stock.input?.name || 'N/A',
      'Categoría': stock.input?.category?.name || 'N/A',
      'Marca': stock.input?.brand || 'N/A',
      'Unidad de Medida': stock.input?.unit_of_measure || 'N/A',
      'Precio Unitario': stock.input?.unit_price || 0,
      'Stock Mínimo': stock.input?.minimum_stock || 0,
      'Almacén': stock.warehouse?.name || 'N/A',
      'Tipo de Almacén': stock.warehouse?.warehouse_type || 'N/A',
      'Ubicación': stock.warehouse?.location || 'N/A',
      'Cantidad Disponible': stock.available_quantity || 0,
      'Cantidad Total': stock.total_quantity || 0,
      'Cantidad Reservada': stock.reserved_quantity || 0,
      'Estado': stock.input?.is_active ? 'Activo' : 'Inactivo',
      'Fecha de Actualización': stock.updated_at ? new Date(stock.updated_at).toLocaleDateString('es-ES') : 'N/A'
    }));

    // Crear el CSV
    const csvRows = [];
    
    // Header
    const headers = Object.keys(flattenedData[0]);
    csvRows.push(headers.join(','));
    
    // Datos
    flattenedData.forEach(item => {
      const values = headers.map(header => {
        const value = item[header];
        // Escapar comillas y envolver en comillas si contiene comas, comillas o saltos de línea
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });

    // Crear y descargar el archivo
    const csvContent = csvRows.join('\n');
    const BOM = '\uFEFF'; // BOM para caracteres especiales
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    
    // Nombre de archivo con fecha y hora
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    link.setAttribute('download', `stocks_${timestamp}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar la URL
    URL.revokeObjectURL(url);
    
    // Mostrar confirmación
    alert(`CSV descargado exitosamente con ${selectedData.length} registros.`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
      {Object.values(selectedStocks).flat().length > 0 && (
        <button className="btn btn-secondary" onClick={generateCSV}>Descargar CSV</button>
      )}
        </div>
      <div className="filter-controls-container">
        <div className="control-group">
          <span htmlFor="groupingFieldstock" className="control-label">
            Agrupar por:
          </span>
          <select
            id="groupingFieldStock"
            value={groupBy || "none"}
            onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)}
            className="control-select"
          >
            <option value="none">Sin Agrupación</option>
            <option value="input">Insumo</option>
            <option value="warehouse">Almacén</option>
          </select>
      </div>
      <div className="control-group">
        <span htmlFor="FilterFieldstock" className="control-label">
          Filtrar por:
        </span>
        <div className="filter-inputs">        <select
          id="FilterFieldStock"
          value={filterField}
          onChange={(e) => setFilterField(e.target.value)}
          className="control-select filter-field"
        >
          <option value="input.name">Nombre del Insumo</option>
          <option value="warehouse.name">Nombre del Almacén</option>
        </select>
        <Spacer width={0.2} />
        <input
          id="FilterValueStock"
          type="text"
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          placeholder={`Buscar por ${filterField}...`}
          className="control-input"
        />   
      </div>
    </div>        
  </div>

      {Object.entries(groupedStocks).map(([group, stocks]) => (
      <div key={group} className="mb-4">
        {groupBy && <h3 className="titulo-seccion">{`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${group}`}</h3>}
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">
                <input id="CheckBoxStock" type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
              </th>
              <th className="border border-gray-300 p-2"onClick={() => handleSort('input.name')}>Insumo</th>
              <th className="border border-gray-300 p-2"onClick={() => handleSort('warehouse.name')}>Almacén</th>
              <th className="border border-gray-300 p-2"onClick={() => handleSort('available_quantity')}>Cantidad Disponible</th>
              <th className="border border-gray-300 p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.id}>
                <td>
                  <input
                    id={`checkboxStock-${group}-${stock.id}`}
                    type="checkbox"
                    checked={selectedStocks[group]?.includes(stock.id) || false}
                    onChange={(e) => handleSelectStock(e, stock, group)}
                  />
                </td>
                <td className="border border-gray-300 p-2">{stock.input.name}</td>
                <td className="border border-gray-300 p-2">{stock.warehouse.name}</td>
                <td className="border border-gray-300 p-2">{stock.available_quantity}</td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => handleOpenMovementForm(stock, 'entry')}
                    className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mr-2"
                  >
                    Ingreso
                  </button>
                  <button
                    onClick={() => handleOpenMovementForm(stock, 'exit')}
                    className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  >
                    Salida
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ))}
      
      <Modal
        isOpen={showMovementForm}
        onRequestClose={handleCloseMovementForm}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Crear Movimiento de Stock"
      >
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">
              {movementType === 'entry' ? 'Ingreso de Stock' : 'Salida de Stock'}
            </h2>
            {selectedStock && (
              <>
                <p>Insumo: {selectedStock.input.name}</p>
                <p>Almacén: {selectedStock.warehouse.name}</p>
                <div className="mb-4">
                  <label className="modal-form-label" htmlFor='NewStockCantidad'>Cantidad:</label>
                  <input
                    id='NewStockCantidad'
                    type="number"
                    value={movementQuantity}
                    onChange={(e) => setMovementQuantity(e.target.value)}
                    className="modal-form-input"
                  />
                </div>
                <div className="modal-buttons mt-4">
                  <button onClick={handleCloseMovementForm} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={handleCreateMovement} className="btn btn-primary">
                    {movementType === 'entry' ? 'Ingresar' : 'Retirar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StockManagement;