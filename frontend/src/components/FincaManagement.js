import React, { useState, useEffect } from 'react';
import { getFincas, createFinca, updateFinca, deleteFinca } from '../services/api'; // Asegúrate de que la ruta sea correcta
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';

Modal.setAppElement('#root');

function FincaManagement() {
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFincaForm, setShowFincaForm] = useState(false);
  const [editingFinca, setEditingFinca] = useState(null);
  const [newFinca, setNewFinca] = useState({
    value: '',
    description: '',
  });
  const [filterField, setFilterField] = useState('value');
  const [filterValue, setFilterValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [groupBy, setGroupBy] = useState(null);
  const [selectedFincas, setSelectedFincas] = useState({});
  const [allSelected, setAllSelected] = useState({});

  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  // Mapeo de nombres de campos para mostrar etiquetas más amigables
  const fieldLabels = {
    value: 'Valor',
    description: 'Descripción',
  };

  // Función para obtener la etiqueta amigable del campo
  const getFieldLabel = (fieldName) => {
    return fieldLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace("_", " ");
  };

  useEffect(() => {
    const fetchFincas = async () => {
      setLoading(true);
      try {
        const response = await getFincas();

        if (response && Array.isArray(response.data)) {
          setFincas(response.data);
        } else {
          setError("La respuesta de la API no es un array válido.");
          setFincas([]);
        }
      } catch (err) {
        setError(err);
        setFincas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFincas();
  }, []);

  const handleOpenFincaForm = (finca = null) => {
    setEditingFinca(finca);
    if (finca) {
      setNewFinca({ ...finca });
    } else {
      setNewFinca({ value: '', description: '' });
    }
    setShowFincaForm(true);
  };

  const handleCloseFincaForm = () => {
    setShowFincaForm(false);
    setEditingFinca(null);
  };

  const handleCreateOrUpdateFinca = async () => {
    try {
      const payload = {
        value: newFinca.value,
        description: newFinca.description,
      };

      if (editingFinca) {
        await updateFinca(editingFinca.finca_id, payload);
      } else {
        await createFinca(payload);
      }
      const response = await getFincas();
      if (response && Array.isArray(response.data)) {
        setFincas(response.data);
      } else {
        setError("La respuesta de la API no es un array válido.");
        setFincas([]);
      }
      handleCloseFincaForm();
    } catch (err) {
      setError(err);
    }
  };

  const handleDeleteFinca = async (id) => {
    try {
      await deleteFinca(id);
      const response = await getFincas();
      if (response && Array.isArray(response.data)) {
        setFincas(response.data);
      } else {
        setError("La respuesta de la API no es un array válido.");
        setFincas([]);
      }
    } catch (err) {
      setError(err);
    }
  };

  const filteredFincas = fincas.filter((finca) => {
    const fieldValue = finca[filterField];
    const searchValue = filterValue.toLowerCase();
    
    if (typeof fieldValue === 'number') {
      return fieldValue.toString().includes(searchValue);
    }
    
    if (typeof fieldValue === 'string') {
      return fieldValue.toLowerCase().includes(searchValue);
    }
    
    return String(fieldValue).toLowerCase().includes(searchValue);
  });

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedFincas = [...filteredFincas].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const groupFincas = (data, groupBy) => {
    return data.reduce((acc, finca) => {
      const key = finca[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(finca);
      return acc;
    }, {});
  };

  const groupedFincas = groupBy ? groupFincas(sortedFincas, groupBy) : { "Todas las Fincas": sortedFincas };

  const handleSelectAll = (e, group) => {
    setAllSelected({ ...allSelected, [group]: e.target.checked });
    const updatedSelections = { ...selectedFincas };
    if (e.target.checked) {
      updatedSelections[group] = groupedFincas[group].map((finca) => finca.finca_id);
    } else {
      updatedSelections[group] = [];
    }
    setSelectedFincas(updatedSelections);
  };

  const handleSelectFinca = (e, finca, group) => {
    const groupSelections = selectedFincas[group] || [];
    const updatedSelections = e.target.checked
      ? [...groupSelections, finca.finca_id]
      : groupSelections.filter((id) => id !== finca.finca_id);
    setSelectedFincas({ ...selectedFincas, [group]: updatedSelections });

    const allGroupSelected = groupedFincas[group].every((s) => updatedSelections.includes(s.finca_id));
    setAllSelected({ ...allSelected, [group]: allGroupSelected });
  };

  const generateCSV = () => {
    const selectedData = [];
    for (const group in selectedFincas) {
      const selectedIdsInGroup = selectedFincas[group];
      if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
        const filteredFincas = fincas.filter((finca) => selectedIdsInGroup.includes(finca.finca_id));
        selectedData.push(...filteredFincas);
      }
    }
    
    if (selectedData.length === 0) {
      alert("No hay fincas seleccionadas para descargar.");
      return;
    }

    const columnConfig = [
      { key: 'finca_id', header: 'ID Finca' },
      { key: 'value', header: 'Valor' },
      { key: 'description', header: 'Descripción' },
    ];

    const escapeCSVValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvRows = [];
    const headers = columnConfig.map(col => col.header);
    csvRows.push(headers.join(','));
    
    selectedData.forEach((finca) => {
      const row = columnConfig.map(col => {
        let value = finca[col.key];
        return escapeCSVValue(value);
      });
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `Fincas_${timestamp}.csv`;

    try {
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      alert(`CSV descargado exitosamente: ${filename}\nRegistros exportados: ${selectedData.length}`);
    } catch (error) {
      console.error('Error al generar CSV:', error);
      alert('Error al generar el archivo CSV. Por favor, inténtalo de nuevo.');
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="container mx-auto p-4">
      <div className="table-header">
        <button onClick={() => handleOpenFincaForm()} className="btn btn-primary"><FontAwesomeIcon icon={faPlus} /> Crear Finca</button>
        <Spacer width={0.5} />
        {Object.values(selectedFincas).flat().length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={generateCSV}>
            Descargar CSV ({Object.values(selectedFincas).flat().length})
          </button>
        )}
      </div>
      <div className="filter-controls-container">
        <div className="control-group">
          <label htmlFor="groupingFieldFinca" className="control-label">Agrupar por:</label>
          <select id="groupingFieldFinca" value={groupBy || "none"} onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)} className="control-select">
            <option value="none">Sin Agrupación</option>
            <option value="value">Valor</option>
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="FilterFieldFinca" className="control-label">
            Filtrar por:
          </label>
          <div className="filter-inputs">
            <select id="FilterFieldFinca" value={filterField} onChange={(e) => setFilterField(e.target.value)} className="control-select filter-field">
              <option value="value">Valor</option>
              <option value="description">Descripción</option>
            </select>
            <input id="FilterValueFinca" type="text" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder={`Buscar por ${getFieldLabel(filterField)}...`} className="control-input" />
          </div>
        </div>
      </div>
  
      {Object.entries(groupedFincas).map(([group, fincas]) => (
        <div key={group} className="mb-4">
          {groupBy && <h3 className="titulo-seccion">{`${getFieldLabel(groupBy)}: ${group}`}</h3>}
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">
                  <input id="CheckBoxFinca" type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
                </th>
                <th className="border border-gray-300 p-2" onClick={() => handleSort('value')}>Valor</th>
                <th className="border border-gray-300 p-2" onClick={() => handleSort('description')}>Descripción</th>
                <th className="border border-gray-300 p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fincas.map((finca) => (
                <tr key={finca.finca_id}>
                  <td className="border border-gray-300 p-2">
                    <input id={`checkboxFinca-${group}-${finca.finca_id}`} type="checkbox" checked={selectedFincas[group]?.includes(finca.finca_id) || false} onChange={(e) => handleSelectFinca(e, finca, group)} />
                  </td>
                  <td className="border border-gray-300 p-2">{finca.value}</td>
                  <td className="border border-gray-300 p-2">{finca.description}</td>
                  <td className="border border-gray-300 p-2">
                    <button onClick={() => handleOpenFincaForm(finca)}
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2">
                      <FontAwesomeIcon icon={faSearch} />
                    </button>
                    <button onClick={() => handleDeleteFinca(finca.finca_id)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
  
      <Modal isOpen={showFincaForm} onRequestClose={handleCloseFincaForm} className="modal-content" overlayClassName="modal-overlay" contentLabel="Crear/Editar Finca">
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">{editingFinca ? 'Editar Finca' : 'Crear Finca'}</h2>
            <div className="modal-form-grid">
              <div className="modal-column">
                <div className="mb-4">
                  <label className="modal-form-label" htmlFor='NewFincaValue'>Valor:</label>
                  <input type="text" id='NewFincaValue' value={newFinca.value} onChange={(e) => setNewFinca({ ...newFinca, value: e.target.value })} className="modal-form-input" />
                </div>
              </div>
              <div className="modal-column">
                <div className="mb-4">
                  <label className="modal-form-label" htmlFor='NewFincaDescription'>Descripción:</label>
                  <textarea id='NewFincaDescription' value={newFinca.description} onChange={(e) => setNewFinca({ ...newFinca, description: e.target.value })} className="modal-form-input" />
                </div>
              </div>
            </div>
            <div className="modal-buttons mt-4">
              <button onClick={handleCloseFincaForm} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleCreateOrUpdateFinca} className="btn btn-primary">{editingFinca ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FincaManagement;