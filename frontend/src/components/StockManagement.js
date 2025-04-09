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
    const csvRows = [];
    const header = Object.keys(selectedData[0]).join(",");
    csvRows.push(header);
    selectedData.forEach((item) => {
      const values = Object.values(item).map((value) => `"${value}"`).join(",");
      csvRows.push(values);
    });
    const csvContent = csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", "stocks.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
      {Object.values(selectedStocks).flat().length > 0 && (
        <button className="btn btn-secondary" onClick={generateCSV}>Descargar CSV</button>
      )}
        </div>
      <div className="flex gap-2 mb-4">
        <label htmlFor="groupingField" className="mr-2">Agrupar por:</label>
          <Spacer width={0.2} />
          <select
            id="groupingField"
            value={groupBy || "none"}
            onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)}
            className="border p-2 rounded"
          >
            <option value="none">Sin Agrupación</option>
            <option value="input">Insumo</option>
            <option value="warehouse">Almacén</option>
          </select>
        <Spacer width={2} />
        <select
          value={filterField}
          onChange={(e) => setFilterField(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="input.name">Nombre del Insumo</option>
          <option value="warehouse.name">Nombre del Almacén</option>
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

      {Object.entries(groupedStocks).map(([group, stocks]) => (
      <div key={group} className="mb-4">
        {groupBy && <h3 className="titulo-seccion">{`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${group}`}</h3>}
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">
                <input type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
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
                  <label className="modal-form-label">Cantidad:</label>
                  <input
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