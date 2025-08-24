import React, { useState, useEffect } from 'react';
import { getInputs, createInput, updateInput, deleteInput, getWarehouses, getCategories} from '../services/api';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
Modal.setAppElement('#root');

function InputManagement({ onInputCreated }) {
  const [inputs, setInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInputForm, setShowInputForm] = useState(false);
  const [editingInput, setEditingInput] = useState(null);
  const [newInput, setNewInput] = useState({
    name: '',
    category_id: null,
    brand: '',
    description: '',
    unit_of_measure: '',
    unit_price: '',
    minimum_stock: '',
    is_active: true,
    warehouse_id: null, // ID del almacén seleccionado
    initial_quantity: 0, // Cantidad inicial
  });
  const [filterField, setFilterField] = useState('name');
  const [filterValue, setFilterValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [groupBy, setGroupBy] = useState(null);
  const [selectedInputs, setSelectedInputs] = useState({});
  const [allSelected, setAllSelected] = useState({});
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]); // Estado para los almacenes
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  useEffect(() => {
    const fetchInputs = async () => {
      setLoading(true);
      try {
        const data = await getInputs();
        setInputs(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchWarehouses = async () => { // Función para obtener los almacenes
      try {
        const data = await getWarehouses();
        setWarehouses(data);
      } catch (err) {
        setError(err);
      }
    };

    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        setError(err);
      }
    };
    fetchCategories();
    fetchWarehouses(); // Llamar a fetchWarehouses
    fetchInputs();
  }, []);

  const handleCloseInputForm = () => {
    setShowInputForm(false);
    setEditingInput(null);
  };

  const handleCreateOrUpdateInput = async () => {
    try {
      // Validaciones básicas antes de enviar
      if (!newInput.name.trim()) {
        alert('El nombre es requerido');
        return;
      }
      if (!newInput.category_id) {
        alert('La categoría es requerida');
        return;
      }
      
      const categoryId = parseInt(newInput.category_id);
      if (isNaN(categoryId)) {
        alert('La categoría es requerida y debe ser un número válido.');
        return;
      }

      const inputData = {
        name: newInput.name.trim(),
        category_id: parseInt(newInput.category_id), // ✅ Corregido: category_id en lugar de categoryId
        brand: newInput.brand?.trim() || "",
        description: newInput.description?.trim() || "",
        unit_of_measure: newInput.unit_of_measure?.trim() || "",
        unit_price: parseFloat(newInput.unit_price) || 0,
        minimum_stock: parseInt(newInput.minimum_stock) || 0,
        is_active: newInput.is_active,
      };

      // Solo agregar warehouse_id y initial_quantity si warehouse_id existe
      if (newInput.warehouse_id && newInput.warehouse_id !== '') {
        inputData.warehouse_id = parseInt(newInput.warehouse_id);
        inputData.initial_quantity = parseInt(newInput.initial_quantity) || 0;
      }

      if (editingInput) {
        await updateInput(editingInput.id, inputData);
      } else {
        await createInput(inputData);
      }

      const data = await getInputs();
      setInputs(data);
      handleCloseInputForm();
    } catch (err) {
      console.error('=== ERROR COMPLETO ===');
      console.error('Error:', err);
      console.error('Response status:', err.response?.status);
      console.error('Response data:', err.response?.data);
      console.error('Response headers:', err.response?.headers);
      console.error('=====================');
      
      // Mostrar error más específico al usuario
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          const errors = err.response.data.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('\n');
          alert(`Errores de validación:\n${errors}`);
        } else {
          alert(`Error: ${err.response.data.detail}`);
        }
      } else {
        alert(`Error: ${err.message || 'Error desconocido'}`);
      }
      setError(err);
    }
  };

  const handleOpenInputForm = (input = null) => {
    setEditingInput(input);
    if (input) {
      setNewInput({ ...input });
    } else {
      setNewInput({
        name: '',
        category_id: '',
        brand: '',
        description: '',
        unit_of_measure: '',
        unit_price: 0,
        minimum_stock: 0,
        is_active: true,
        warehouse_id: '',
        initial_quantity: 0,
      });
    }
    setShowInputForm(true);
  };

  const handleDeleteInput = async (id) => {
    try {
      await deleteInput(id);
      const data = await getInputs();
      setInputs(data);
    } catch (err) {
      setError(err);
    }
  };

  const filteredInputs = inputs.filter((input) =>
    input[filterField].toLowerCase().includes(filterValue.toLowerCase())
  );

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedInputs = [...filteredInputs].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const groupInputs = (data, groupBy) => {
    return data.reduce((acc, input) => {
      const key = input[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(input);
      return acc;
    }, {});
  };

  const groupedInputs = groupBy ? groupInputs(sortedInputs, groupBy) : { "Todos los inputs": sortedInputs };

  const handleSelectAll = (e, group) => {
    setAllSelected({ ...allSelected, [group]: e.target.checked });
    const updatedSelections = { ...selectedInputs };
    if (e.target.checked) {
      updatedSelections[group] = groupedInputs[group].map((input) => input.id);
    } else {
      updatedSelections[group] = [];
    }
    setSelectedInputs(updatedSelections);
  };

  const handleSelectInput = (e, input, group) => {
    const groupSelections = selectedInputs[group] || [];
    const updatedSelections = e.target.checked
      ? [...groupSelections, input.id]
      : groupSelections.filter((id) => id !== input.id);
    setSelectedInputs({ ...selectedInputs, [group]: updatedSelections });

    const allGroupSelected = groupedInputs[group].every((s) => selectedInputs[group]?.includes(s.id));
    setAllSelected({ ...allSelected, [group]: allGroupSelected });
  };

  const generateCSV = () => {
    const selectedData = [];
    for (const group in selectedInputs) {
      const selectedIdsInGroup = selectedInputs[group];
      if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
        const filteredInputs = inputs.filter((input) => selectedIdsInGroup.includes(input.id));
        selectedData.push(...filteredInputs);
      }
    }
    if (selectedData.length === 0) {
      alert("No hay inputs seleccionados para descargar.");
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
    link.setAttribute("download", "inputs.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'N/A';
  };


  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
        <button onClick={() => handleOpenInputForm()} className="btn btn-primary">Crear Input</button>
        <Spacer width={0.5} />
        {Object.values(selectedInputs).flat().length > 0 && (
        <button className="btn btn-secondary" onClick={generateCSV}>Descargar CSV</button>
        )}
      </div>
      <div className="flex gap-2 mb-4">
      <label htmlFor="groupingField" className="mr-2">Agrupar por:</label>
        <Spacer width={0.2} />
        <select id="groupingField" value={groupBy || "none"} onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)} className="border p-2 rounded">
          <option value="none">Sin Agrupación</option>
          <option value="category_id">Categoría</option>
          <option value="brand">Marca</option>
        </select>
        <Spacer width={2} />
        <select value={filterField} onChange={(e) => setFilterField(e.target.value)} className="border p-2 rounded">
            <option value="name">Nombre</option>
            <option value="category_id">Categoría</option>
            <option value="brand">Marca</option>
        </select>
        <Spacer width={0.2} />
        <input type="text" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder={`Buscar por ${filterField}...`} className="border p-2 rounded w-64" />
      </div>

      {Object.entries(groupedInputs).map(([group, inputs]) => (
        <div key={group} className="mb-4">
          {groupBy && <h3 className="titulo-seccion">{`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${group}`}</h3>}
          <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2">
                    <input type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
                  </th>
                  <th className="border border-gray-300 p-2" onClick={() => handleSort('name')}>Nombre</th>
                  <th className="border border-gray-300 p-2" onClick={() => handleSort('category_id')}>Categoría</th>
                  <th className="border border-gray-300 p-2" onClick={() => handleSort('brand')}>Marca</th>
                  <th className="border border-gray-300 p-2" onClick={() => handleSort('unit_of_measure')}>Unidad de Medida</th>
                  <th className="border border-gray-300 p-2" onClick={() => handleSort('unit_price')}>Precio Unitario</th>
                  <th className="border border-gray-300 p-2" onClick={() => handleSort('minimum_stock')}>Stock Mínimo</th>
                  <th className="border border-gray-300 p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inputs.map((input) => (
                  <tr key={input.id}>
                    <td className="border border-gray-300 p-2">
                      <input type="checkbox" checked={selectedInputs[group]?.includes(input.id) || false} onChange={(e) => handleSelectInput(e, input, group)} />
                    </td>
                    <td className="border border-gray-300 p-2">{input.name}</td>
                    <td className="border border-gray-300 p-2">{getCategoryName(input.category_id)}</td>
                    <td className="border border-gray-300 p-2">{input.brand}</td>
                    <td className="border border-gray-300 p-2">{input.unit_of_measure}</td>
                    <td className="border border-gray-300 p-2">{input.unit_price}</td>
                    <td className="border border-gray-300 p-2">{input.minimum_stock}</td>
                    <td className="border border-gray-300 p-2">
                      <button
                       onClick={() => handleOpenInputForm(input)}
                       className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2">
                        <FontAwesomeIcon icon={faSearch} />
                       </button>
                      <button onClick={() => handleDeleteInput(input.id)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        
        <Modal isOpen={showInputForm} onRequestClose={handleCloseInputForm} className="modal-content" overlayClassName="modal-overlay" contentLabel="Crear/Editar Input">
          <div className="modal-wrapper">
            <div className="modal-content">
              <h2 className="modal-title">{editingInput ? 'Editar Input' : 'Crear Input'}</h2>
              <div className="modal-form-grid"> {/* Contenedor para las columnas */}
                <div className="modal-column"> {/* Columna 1 */}
                  <div className="mb-4">
                    <label className="modal-form-label">Nombre:</label>
                    <input type="text" value={newInput.name} onChange={(e) => setNewInput({ ...newInput, name: e.target.value })} className="modal-form-input" />
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Categoría:</label>
                    <select
                      value={newInput.category_id || ''} // Usar category_id como valor
                      onChange={(e) => {
                          const value = e.target.value;
                          setNewInput({ 
                              ...newInput, 
                              category_id: value ? parseInt(value) : null 
                          });
                      }}
                      className="modal-form-input"
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories.map((category) => (
                          <option key={category.id} value={category.id}> {/* Usar category.id como valor */}
                              {category.name}
                          </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Marca:</label>
                    <input type="text" value={newInput.brand} onChange={(e) => setNewInput({ ...newInput, brand: e.target.value })} className="modal-form-input" />
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Cantidad Inicial:</label>
                    <input
                      type="number"
                      value={newInput.initial_quantity}
                      onChange={(e) => {
                          const parsedValue = Number(e.target.value);
                          setNewInput({ ...newInput, initial_quantity: isNaN(parsedValue) ? 0 : parsedValue });
                      }}
                      className="modal-form-input"
                  />
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Descripción:</label>
                    <textarea value={newInput.description} onChange={(e) => setNewInput({ ...newInput, description: e.target.value })} className="modal-form-input" />
                  </div>
                </div>
                <div className="modal-column">
                  <div className="mb-4">
                    <label className="modal-form-label">Unidad de Medida:</label>
                    <input type="text" value={newInput.unit_of_measure} onChange={(e) => setNewInput({ ...newInput, unit_of_measure: e.target.value })} className="modal-form-input" />
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Precio Unitario:</label>
                    <input type="number" value={newInput.unit_price} onChange={(e) => setNewInput({ ...newInput, unit_price: e.target.value })} className="modal-form-input" />
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Almacén:</label>
                    <select
                      value={newInput.warehouse_id || ''}
                      onChange={(e) => setNewInput({ ...newInput, warehouse_id: e.target.value })}
                      className="modal-form-input"
                    >
                      <option value="">Seleccionar Almacén</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Stock Mínimo:</label>
                    <input type="number" value={newInput.minimum_stock} onChange={(e) => setNewInput({ ...newInput, minimum_stock: e.target.value })} className="modal-form-input" />
                  </div>
                  <div className="mb-4">
                    <label className="modal-form-label">Activo:</label>
                    <input type="checkbox" checked={newInput.is_active} onChange={(e) => setNewInput({ ...newInput, is_active: e.target.checked })} className="modal-form-input" />
                  </div>
                  </div></div>
              <div className="modal-buttons mt-4">
                <button onClick={handleCloseInputForm} className="btn btn-secondary">Cancelar</button>
                <button onClick={handleCreateOrUpdateInput} className="btn btn-primary">{editingInput ? 'Actualizar' : 'Crear'}</button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

export default InputManagement;