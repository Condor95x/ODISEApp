import React, { useState, useEffect } from 'react';
import { getSectors, createSector, updateSector, deleteSector } from '../services/api'; // Asegúrate de que la ruta sea correcta
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';

Modal.setAppElement('#root');

function SectorsManagement() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSectorForm, setShowSectorForm] = useState(false);
  const [editingSector, setEditingSector] = useState(null);
  const [newSector, setNewSector] = useState({
    finca_id: '',
    value: '',
    description: '',
  });
  const [filterField, setFilterField] = useState('value');
  const [filterValue, setFilterValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [groupBy, setGroupBy] = useState(null);
  const [selectedSectors, setSelectedSectors] = useState({});
  const [allSelected, setAllSelected] = useState({});

  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

  // Mapeo de nombres de campos para mostrar etiquetas más amigables
  const fieldLabels = {
    finca_id: 'ID Finca',
    value: 'Valor',
    description: 'Descripción',
    etiqueta: 'Etiqueta'
  };

  // Función para obtener la etiqueta amigable del campo
  const getFieldLabel = (fieldName) => {
    return fieldLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace("_", " ");
  };

  useEffect(() => {
    const fetchSectors = async () => {
      setLoading(true);
      try {
        const response = await getSectors();

        if (response && Array.isArray(response.data)) {
          setSectors(response.data);
        } else {
          setError("La respuesta de la API no es un array válido.");
          setSectors([]);
        }
      } catch (err) {
        setError(err);
        setSectors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, []);

  const handleOpenSectorForm = (sector = null) => {
    setEditingSector(sector);
    if (sector) {
      setNewSector({ ...sector });
    } else {
      setNewSector({ finca_id: '', value: '', description: '' });
    }
    setShowSectorForm(true);
  };

  const handleCloseSectorForm = () => {
    setShowSectorForm(false);
    setEditingSector(null);
  };

  const handleCreateOrUpdateSector = async () => {
    try {
      const payload = {
        finca_id: parseInt(newSector.finca_id, 10),
        value: newSector.value,
        description: newSector.description,
      };

      if (editingSector) {
        await updateSector(editingSector.sector_id, payload);
      } else {
        await createSector(payload);
      }
      const response = await getSectors();
      if (response && Array.isArray(response.data)) {
        setSectors(response.data);
      } else {
        setError("La respuesta de la API no es un array válido.");
        setSectors([]);
      }
      handleCloseSectorForm();
    } catch (err) {
      setError(err);
    }
  };

  const handleDeleteSector = async (id) => {
    try {
      await deleteSector(id);
      const response = await getSectors();
      if (response && Array.isArray(response.data)) {
        setSectors(response.data);
      } else {
        setError("La respuesta de la API no es un array válido.");
        setSectors([]);
      }
    } catch (err) {
      setError(err);
    }
  };

  const filteredSectors = sectors.filter((sector) => {
    const fieldValue = sector[filterField];
    const searchValue = filterValue.toLowerCase();
    
    // Si el campo es numérico, convertir a string para el filtro
    if (typeof fieldValue === 'number') {
      return fieldValue.toString().includes(searchValue);
    }
    
    // Si el campo es string, usar toLowerCase
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

  const sortedSectors = [...filteredSectors].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const groupSectors = (data, groupBy) => {
    return data.reduce((acc, sector) => {
      const key = sector[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(sector);
      return acc;
    }, {});
  };

  const groupedSectors = groupBy ? groupSectors(sortedSectors, groupBy) : { "Todos los Sectores": sortedSectors };

  const handleSelectAll = (e, group) => {
    setAllSelected({ ...allSelected, [group]: e.target.checked });
    const updatedSelections = { ...selectedSectors };
    if (e.target.checked) {
      updatedSelections[group] = groupedSectors[group].map((sector) => sector.sector_id);
    } else {
      updatedSelections[group] = [];
    }
    setSelectedSectors(updatedSelections);
  };

  const handleSelectSector = (e, sector, group) => {
    const groupSelections = selectedSectors[group] || [];
    const updatedSelections = e.target.checked
      ? [...groupSelections, sector.sector_id]
      : groupSelections.filter((id) => id !== sector.sector_id);
    setSelectedSectors({ ...selectedSectors, [group]: updatedSelections });

    const allGroupSelected = groupedSectors[group].every((s) => updatedSelections.includes(s.sector_id));
    setAllSelected({ ...allSelected, [group]: allGroupSelected });
  };

  const generateCSV = () => {
    const selectedData = [];
    for (const group in selectedSectors) {
      const selectedIdsInGroup = selectedSectors[group];
      if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
        const filteredSectors = sectors.filter((sector) => selectedIdsInGroup.includes(sector.sector_id));
        selectedData.push(...filteredSectors);
      }
    }
    
    if (selectedData.length === 0) {
      alert("No hay sectores seleccionados para descargar.");
      return;
    }

    const columnConfig = [
      { key: 'sector_id', header: 'ID Sector' },
      { key: 'finca_id', header: 'ID Finca' },
      { key: 'value', header: 'Valor' },
      { key: 'description', header: 'Descripción' },
      { key: 'etiqueta', header: 'Etiqueta' }
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
    
    selectedData.forEach((sector) => {
      const row = columnConfig.map(col => {
        let value = sector[col.key];
        return escapeCSVValue(value);
      });
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `Sectores_${timestamp}.csv`;

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
        <button onClick={() => handleOpenSectorForm()} className="btn btn-primary"><FontAwesomeIcon icon={faPlus} /> Crear Sector</button>
        <Spacer width={0.5} />
        {Object.values(selectedSectors).flat().length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={generateCSV}>
            Descargar CSV ({Object.values(selectedSectors).flat().length})
          </button>
        )}
      </div>
      <div className="filter-controls-container">
        <div className="control-group">
          <label htmlFor="groupingFieldSector" className="control-label">Agrupar por:</label>
          <select id="groupingFieldSector" value={groupBy || "none"} onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)} className="control-select">
            <option value="none">Sin Agrupación</option>
            <option value="finca_id">ID Finca</option>
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="FilterFieldSector" className="control-label">
            Filtrar por:
          </label>
          <div className="filter-inputs">
            <select id="FilterFieldSector" value={filterField} onChange={(e) => setFilterField(e.target.value)} className="control-select filter-field">
              <option value="value">Valor</option>
              <option value="description">Descripción</option>
              <option value="etiqueta">Etiqueta</option>
            </select>
            <input id="FilterValueSector" type="text" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder={`Buscar por ${getFieldLabel(filterField)}...`} className="control-input" />
          </div>
        </div>
      </div>
  
      {Object.entries(groupedSectors).map(([group, sectors]) => (
        <div key={group} className="mb-4">
          {groupBy && <h3 className="titulo-seccion">{`${getFieldLabel(groupBy)}: ${group}`}</h3>}
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">
                  <input id="CheckBoxSector" type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
                </th>
                <th className="border border-gray-300 p-2" onClick={() => handleSort('value')}>Valor</th>
                <th className="border border-gray-300 p-2" onClick={() => handleSort('description')}>Descripción</th>
                <th className="border border-gray-300 p-2" onClick={() => handleSort('finca_id')}>ID Finca</th>
                <th className="border border-gray-300 p-2" onClick={() => handleSort('etiqueta')}>Etiqueta</th>
                <th className="border border-gray-300 p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => (
                <tr key={sector.sector_id}>
                  <td className="border border-gray-300 p-2">
                    <input id={`checkboxSector-${group}-${sector.sector_id}`} type="checkbox" checked={selectedSectors[group]?.includes(sector.sector_id) || false} onChange={(e) => handleSelectSector(e, sector, group)} />
                  </td>
                  <td className="border border-gray-300 p-2">{sector.value}</td>
                  <td className="border border-gray-300 p-2">{sector.description}</td>
                  <td className="border border-gray-300 p-2">{sector.finca_id}</td>
                  <td className="border border-gray-300 p-2">{sector.etiqueta}</td>
                  <td className="border border-gray-300 p-2">
                    <button onClick={() => handleOpenSectorForm(sector)}
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2">
                      <FontAwesomeIcon icon={faSearch} />
                    </button>
                    <button onClick={() => handleDeleteSector(sector.sector_id)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
  
      <Modal isOpen={showSectorForm} onRequestClose={handleCloseSectorForm} className="modal-content" overlayClassName="modal-overlay" contentLabel="Crear/Editar Sector">
        <div className="modal-wrapper">
          <div className="modal-content">
            <h2 className="modal-title">{editingSector ? 'Editar Sector' : 'Crear Sector'}</h2>
            <div className="modal-form-grid">
              <div className="modal-column">
                <div className="mb-4">
                  <label className="modal-form-label" htmlFor='NewSectorFincaId'>ID Finca:</label>
                  <input type="number" id='NewSectorFincaId' value={newSector.finca_id} onChange={(e) => setNewSector({ ...newSector, finca_id: e.target.value })} className="modal-form-input" />
                </div>
                <div className="mb-4">
                  <label className="modal-form-label" htmlFor='NewSectorValue'>Valor:</label>
                  <input type="text" id='NewSectorValue' value={newSector.value} onChange={(e) => setNewSector({ ...newSector, value: e.target.value })} className="modal-form-input" />
                </div>
              </div>
              <div className="modal-column">
                <div className="mb-4">
                  <label className="modal-form-label" htmlFor='NewSectorDescription'>Descripción:</label>
                  <textarea id='NewSectorDescription' value={newSector.description} onChange={(e) => setNewSector({ ...newSector, description: e.target.value })} className="modal-form-input" />
                </div>
              </div>
            </div>
            <div className="modal-buttons mt-4">
              <button onClick={handleCloseSectorForm} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleCreateOrUpdateSector} className="btn btn-primary">{editingSector ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SectorsManagement;