import React, { useState, useEffect } from 'react';
import { getBatches, createBatch, updateBatch, deleteBatch, getVarieties } from '../services/api'; // Asegúrate de que la ruta sea correcta
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Papa from 'papaparse';

Modal.setAppElement('#root');

function BatchManagement({ onBatchCreated }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);
    const [newBatch, setNewBatch] = useState({
        name: '',
        variety: '',
        entry_date: '',
        exit_date: '',
        initial_initial_volume: '',
        description: '',
    });
    const [filterField, setFilterField] = useState('name');
    const [filterValue, setFilterValue] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [groupBy, setGroupBy] = useState(null);
    const [selectedBatches, setSelectedBatches] = useState({});
    const [allSelected, setAllSelected] = useState({});
    const [grapevines, setGrapevines] = useState([]); 
    const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

    useEffect(() => {
        const fetchBatchesAndGrapevines = async () => {
            setLoading(true);
            try {
                const [batchesResponse, grapevinesResponse] = await Promise.all([
                    getBatches(),
                    getVarieties(),
                ]);

                if (batchesResponse && Array.isArray(batchesResponse.data)) {
                    setBatches(batchesResponse.data);
                } else {
                    console.error("API did not return an array for batches:", batchesResponse);
                    setError("API did not return an array for batches.");
                    setBatches([]);
                }

                if (grapevinesResponse && Array.isArray(grapevinesResponse)) {
                    setGrapevines(grapevinesResponse);
                } else {
                    console.error("API did not return an array for grapevines:", grapevinesResponse);
                    setError("API did not return an array for grapevines.");
                    setGrapevines([]);
                }

            } catch (err) {
                setError(err);
                setBatches([]);
                setGrapevines([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBatchesAndGrapevines();

    }, []);

    const getVarName = (grapevineId) => {
        const grapevine = grapevines.find(gv => gv.gv_id === grapevineId);
        return grapevine ? grapevine.name : 'N/A';
      };

    const handleOpenBatchForm = (batch = null) => {
        setEditingBatch(batch);
        if (batch) {
            setNewBatch({ ...batch });
        } else {
            setNewBatch({
                name: '',
                variety: '',
                entry_date: '',
                exit_date: '',
                initial_volume: '',
                description: '',
            });
        }
        setShowBatchForm(true);
    };

    const handleCloseBatchForm = () => {
        setShowBatchForm(false);
        setEditingBatch(null);
    };

    const handleCreateOrUpdateBatch = async () => {
        try {
            if (editingBatch) {
                await updateBatch(editingBatch.id, newBatch);
            } else {
                await createBatch(newBatch);
            }
        const response = await getBatches();
        if (response && Array.isArray(response.data)) {
            setBatches(response.data);
        } else {
            setError("La respuesta de la API no es un array válido.");
            setBatches([]);
        }
        handleCloseBatchForm();
        } catch (err) {
            setError(err);
        }
    };

  const handleDeleteBatch = async (id) => {
    try {
      await deleteBatch(id);
      const response = await getBatches(); // Cambia data por response para acceder a response.data
      if (response && Array.isArray(response.data)) {
        setBatches(response.data);
      } else {
        setError("La respuesta de la API no es un array válido.");
        setBatches([]);
      }
    } catch (err) {
      setError(err);
    }
  };

    const filteredBatches = batches.filter((batch) =>
        batch[filterField].toLowerCase().includes(filterValue.toLowerCase())
    );

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedBatches = [...filteredBatches].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    const groupBatches = (data, groupBy) => {
        return data.reduce((acc, batch) => {
            const key = groupBy === 'variety' ? getVarName(batch[groupBy]) : batch[groupBy];
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(batch);
            return acc;
        }, {});
    };

    const groupedBatches = groupBy ? groupBatches(sortedBatches, groupBy) : { "Todos los lotes": sortedBatches };

    const handleSelectAll = (e, group) => {
        setAllSelected({ ...allSelected, [group]: e.target.checked });
        const updatedSelections = { ...selectedBatches };
        if (e.target.checked) {
            updatedSelections[group] = groupedBatches[group].map((batch) => batch.id);
        } else {
            updatedSelections[group] = [];
        }
        setSelectedBatches(updatedSelections);
    };

    const handleSelectBatch = (e, batch, group) => {
        const groupSelections = selectedBatches[group] || [];
        const updatedSelections = e.target.checked
            ? [...groupSelections, batch.id]
            : groupSelections.filter((id) => id !== batch.id);
        setSelectedBatches({ ...selectedBatches, [group]: updatedSelections });

        const allGroupSelected = groupedBatches[group].every((s) => selectedBatches[group]?.includes(s.id));
        setAllSelected({ ...allSelected, [group]: allGroupSelected });
    };

    const generateCSV = () => {
        try {
            // Obtener datos seleccionados
            const selectedData = [];
            for (const group in selectedBatches) {
                const selectedIdsInGroup = selectedBatches[group];
                if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
                    const filteredBatches = batches.filter((batch) => selectedIdsInGroup.includes(batch.id));
                    selectedData.push(...filteredBatches);
                }
            }

            // Validar que hay datos para descargar
            if (selectedData.length === 0) {
                alert('No hay lotes seleccionados para descargar.');
                return;
            }

            // Transformar datos para CSV con nombres de columnas amigables
            const transformedData = selectedData.map(batch => ({
                'ID': batch.id || 'N/A',
                'Nombre': batch.name || 'N/A',
                'Descripción': batch.description || 'N/A',
                'Variedad': getVarName(batch.variety),
                'Fecha de Inicio': batch.entry_date || 'N/A',
                'Fecha de Fin': batch.exit_date || 'N/A',
                'Volumen Inicial': batch.initial_volume || 'N/A'
            }));

            // Generar CSV usando Papa Parse
            const csv = Papa.unparse(transformedData, {
                delimiter: ',',
                header: true,
                encoding: 'utf-8',
                quotes: true,
                quoteChar: '"',
                escapeChar: '"',
                skipEmptyLines: false,
            });

            // Agregar BOM para compatibilidad con Excel en español
            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csv;

            // Crear y descargar archivo
            const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                
                // Generar nombre de archivo con timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `lotes_${timestamp}.csv`;
                
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Limpiar URL después de un tiempo
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);

            } else {
                throw new Error('Su navegador no soporta la descarga de archivos.');
            }
        } catch (error) {
            console.error('Error al generar el archivo CSV:', error);
            alert('Ocurrió un error al generar el archivo CSV. Por favor, inténtelo de nuevo.');
        }
    };

    const getSelectedCount = () => {
        return Object.values(selectedBatches).flat().length;
    };

    if (loading) return <p>Cargando...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div className="container mx-auto p-4">
            <div className="table-header">
                <button onClick={() => handleOpenBatchForm()} className="btn btn-primary">Crear Lote</button>
                {getSelectedCount() > 0 && (
                    <button className="btn btn-secondary" onClick={generateCSV}>
                        Descargar CSV ({getSelectedCount()})
                    </button>
                )}
            </div>
            <div className="flex gap-2 mb-4">
                <label htmlFor="groupingField" className="mr-2">Agrupar por:</label>
                <Spacer width={0.2} />
                <select id="groupingField" value={groupBy || "none"} onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)} className="border p-2 rounded">
                    <option value="none">Sin Agrupación</option>
                    <option value="variety">Variedad de Uva</option>
                </select>
                <Spacer width={2} />
                <select value={filterField} onChange={(e) => setFilterField(e.target.value)} className="border p-2 rounded">
                    <option value="name">Nombre</option>
                    <option value="variety">Variedad de Uva</option>
                    <option value="entry_date">Fecha de Inicio</option>
                </select>
                <Spacer width={0.2} />
                <input type="text" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder={`Buscar por ${filterField}...`} className="border p-2 rounded w-64" />
                
            </div>
    
            {Object.entries(groupedBatches).map(([groupKey, batches]) => (
                <div key={groupKey} className="mb-4">
                    {groupBy === 'variety' && <h3 className="titulo-seccion">{`Variedad: ${groupKey}`}</h3>}
                    {groupBy !== 'variety' && groupBy && <h3 className="titulo-seccion">{`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${groupKey}`}</h3>}
                    <table className="table-auto w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 p-2">
                                    <input type="checkbox" checked={allSelected[groupKey] || false} onChange={(e) => handleSelectAll(e, groupKey)} />
                                </th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('name')}>Nombre</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('description')}>Descripcion</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('variety')}>Variedad</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('entry_date')}>Fecha de Inicio</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('exit_date')}>Fecha de Fin</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('initial_volume')}>Volumen inicial</th>
                                <th className="border border-gray-300 p-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                        {batches.map((batch) => (
                        <tr key={batch.id}>
                            <td className="border border-gray-300 p-2">
                                <input type="checkbox" checked={selectedBatches[groupKey]?.includes(batch.id) || false} onChange={(e) => handleSelectBatch(e, batch, groupKey)} />
                            </td>
                            <td className="border border-gray-300 p-2">{batch.name}</td>
                            <td className="border border-gray-300 p-2">{batch.description}</td>
                            <td className="border border-gray-300 p-2">{getVarName(batch.variety)}</td>
                            <td className="border border-gray-300 p-2">{batch.entry_date}</td>
                            <td className="border border-gray-300 p-2">{batch.exit_date}</td>

                            <td className="border border-gray-300 p-2">{batch.initial_volume}</td>
                            <td className="border border-gray-300 p-2">
                                <button onClick={() => handleOpenBatchForm(batch)}
                                    className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2">
                                    <FontAwesomeIcon icon={faSearch} />
                                </button>
                                <button onClick={() => handleDeleteBatch(batch.id)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">Eliminar</button>
                            </td>
                        </tr>
                    ))}
                        </tbody>
                    </table>
                </div>
            ))}
    
            <Modal isOpen={showBatchForm} onRequestClose={handleCloseBatchForm} className="modal-content" overlayClassName="modal-overlay" contentLabel="Crear/Editar Lote">
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title">{editingBatch ? 'Editar Lote' : 'Crear Lote'}</h2>
                        <div className="modal-form-grid">
                            <div className="modal-column">
                                <div className="mb-4">
                                    <label className="modal-form-label">Nombre:</label>
                                    <input type="text" value={newBatch.name} onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })} className="modal-form-input" />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Fecha de Inicio:</label>
                                    <input type="date" value={newBatch.entry_date} onChange={(e) => setNewBatch({ ...newBatch, entry_date: e.target.value })} className="modal-form-input" />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">initial_volumen:</label>
                                    <input type="number" value={newBatch.initial_volume} onChange={(e) => setNewBatch({ ...newBatch, initial_volume: e.target.value })} className="modal-form-input" />
                                </div>
                            </div>
                            <div className="modal-column">
                            <div className="mb-4">
                                    <label className="modal-form-label">Variedad de Uva:</label>
                                    <Select
                                        value={{ value: newBatch.variety, label: newBatch.variety}}
                                        onChange={(selectedOption) => setNewBatch({ ...newBatch, variety: selectedOption.value })}
                                        options={grapevines.map((grapevines) => ({
                                            value: grapevines.gv_id,
                                            label: grapevines.name,
                                        }))}
                                        isSearchable
                                        placeholder="Seleccionar variedad..."
                                        className="modal-form-input"
                                        />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Fecha de Fin:</label>
                                    <input type="date" value={newBatch.exit_date} onChange={(e) => setNewBatch({ ...newBatch, exit_date: e.target.value })} className="modal-form-input" />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Observaciones:</label>
                                    <textarea value={newBatch.description} onChange={(e) => setNewBatch({ ...newBatch, description: e.target.value })} className="modal-form-input" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-buttons mt-4">
                            <button onClick={handleCloseBatchForm} className="btn btn-secondary">Cancelar</button>
                            <button onClick={handleCreateOrUpdateBatch} className="btn btn-primary">{editingBatch ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
export default BatchManagement;
