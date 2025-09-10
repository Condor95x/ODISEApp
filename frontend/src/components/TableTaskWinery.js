import React, { useState, useEffect } from 'react';
import { deleteVesselActivity,getVesselActivities, getVessels, getUsers, updateVesselActivity, getInputs, getWineryTasks } from "../services/api";
import Modal from 'react-modal';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

const TableWineryTask = () => {
    // Estados principales
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialLoad, setInitialLoad] = useState(true);
    
    // Estados de modales
    const [showForm, setShowForm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showActividadModal, setShowActividadModal] = useState(false);
    const [actividadDetails, setActividadDetails] = useState(null);
    
    // Estado inicial para nueva actividad
    const initialNewActividad = {
        task_id: '',
        responsible_id: '',
        origin_vessel_id: '',
        destination_vessel_id: '',
        start_date: '',
        end_date: '',
        status: '',
        comments: '',
        notes: '',
        inputs: [],
        origin_batch_id: '',
        destination_batch_id: '',
        volume: '',
    };
    
    const [newActividad, setNewActividad] = useState(initialNewActividad);
    const [usuarios, setUsuarios] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Estados para funcionalidades de tabla
    const [groupBy, setGroupBy] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [filterField, setFilterField] = useState('task_id');
    const [filterValue, setFilterValue] = useState('');
    const [selectedActivities, setSelectedActivities] = useState({});
    const [allSelected, setAllSelected] = useState({});
    
    // Estados para edición
    const [editingActividad, setEditingActividad] = useState(null);
    const [actividadToEdit, setActividadToEdit] = useState(null);
    
    const [successMessage, setSuccessMessage] = useState("");
    
    // Handlers de modales
    const handleOpenForm = () => setShowForm(true);
    const handleCloseForm = () => {
        setShowForm(false);
        setNewActividad(initialNewActividad);
        setError(null);
    };
    //const handleOpenSuccessModal = () => setShowSuccessModal(true);
    const handleCloseSuccessModal = () => setShowSuccessModal(false);
    //const handleOpenErrorModal = () => setShowErrorModal(true);
    const handleCloseErrorModal = () => setShowErrorModal(false);
    const handleOpenDeleteModal = () => setShowDeleteModal(true);
    const handleCloseDeleteModal = () => setShowDeleteModal(false)
    const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;
    
    // Cargar insumos al montar el componente
    useEffect(() => {
        const chargeInputs = async () => {
            try {
                const inputsData = await getInputs();
                setInsumos(Array.isArray(inputsData) ? inputsData : []);
            } catch (error) {
                console.error('Error al cargar insumos:', error);
                setInsumos([]);
            }
        };
        chargeInputs();
    }, []);

    // Handlers para inputs
    const handleAddInput = () => {
        setNewActividad({
            ...newActividad, 
            inputs: [...newActividad.inputs, { id: undefined, cantidad: 0 }]
        });
    };
    
    const handleInputChange = (e, index) => {
        const inputs = [...newActividad.inputs];
        inputs[index].id = parseInt(e.target.value);
        setNewActividad({ ...newActividad, inputs });
    };
    
    const handleInputCantidadChange = (e, index) => {
        const inputs = [...newActividad.inputs];
        inputs[index].cantidad = parseInt(e.target.value) || 0;
        setNewActividad({ ...newActividad, inputs });
    };

    const handleEditActividad = () => {
        setEditingActividad({ ...actividadDetails });
    };

    const handleSaveActividad = async () => {
        try {
            setLoading(true);
            await updateVesselActivity(actividadToEdit.id, actividadToEdit);
            await cargarDatos();
            setEditingActividad(null);
            setActividadDetails(actividadToEdit);
            setSuccessMessage("Actividad actualizada correctamente");
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error updating vessel activity:', error);
            setError('Error al actualizar la actividad: ' + error.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const handleOpenActividadModal = (actividad) => {
        setActividadDetails(actividad);
        setEditingActividad(null);
        setActividadToEdit({ ...actividad });
        setShowActividadModal(true);
    };

    const handleCloseActividadModal = () => {
        setActividadDetails(null);
        setShowActividadModal(false);
        setEditingActividad(null);
    };

    const handleDeleteActividad = async () => {
        try {
            setLoading(true);
            // Asumiendo que existe una función deleteVesselActivity en tu API
            await deleteVesselActivity(actividadDetails.id);
            
            // Recargar datos
            await cargarDatos();
            
            // Cerrar modales
            setShowDeleteModal(false);
            setShowActividadModal(false);
            
            // Mostrar mensaje de éxito
            setSuccessMessage("Actividad eliminada correctamente");
            setShowSuccessModal(true);
            
        } catch (error) {
            console.error('Error deleting vessel activity:', error);
            let errorMessage = "Error al eliminar la actividad";
            if (error.response?.data?.detail) {
                errorMessage += ": " + error.response.data.detail;
            } else if (error.message) {
                errorMessage += ": " + error.message;
            }
            setError(errorMessage);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [actividadesData, vesselsData, usuariosData, tasksData] = await Promise.all([
                getVesselActivities(),
                getVessels(),
                getUsers(),
                getWineryTasks(),
            ]);

            // Procesar actividades
            if (actividadesData?.data && Array.isArray(actividadesData.data)) {
                setActivities(actividadesData.data);
            } else if (Array.isArray(actividadesData)) {
                setActivities(actividadesData);
            } else {
                console.error("La respuesta de actividades no es un array:", actividadesData);
                setActivities([]);
            }

            // Procesar vessels
            if (vesselsData?.data && Array.isArray(vesselsData.data)) {
                setVessels(vesselsData.data);
            } else if (Array.isArray(vesselsData)) {
                setVessels(vesselsData);
            } else {
                console.error("La respuesta de vessels no es un array:", vesselsData);
                setVessels([]);
            }

            // Procesar usuarios
            if (Array.isArray(usuariosData)) {
                setUsuarios(usuariosData);
            } else {
                console.error("La respuesta de usuarios no es un array:", usuariosData);
                setUsuarios([]);
            }

            // Procesar tareas
            if (Array.isArray(tasksData)) {
                setTasks(tasksData);
            } else {
                console.error("La respuesta de tareas no es un array:", tasksData);
                setTasks([]);
            }

        } catch (error) {
            console.error('Error al cargar datos:', error);
            setError('Error al cargar datos: ' + error.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Funciones helper
    const getVesselName = (vesselId) => {
        if (!vesselId) return 'N/A';
        const vessel = vessels.find(vess => vess.id === vesselId);
        return vessel ? vessel.name : 'N/A';
    };

    const getResponsibleName = (responsibleId) => {
        if (!responsibleId) return 'N/A';
        const responsible = usuarios.find(user => user.id === responsibleId);
        return responsible ? `${responsible.nombre || ''} ${responsible.apellido || ''}`.trim() || responsible.username : 'N/A';
    };

    const getTaskName = (taskId) => {
        if (!taskId) return 'N/A';
        const task = tasks.find(task => task.task_list_id === taskId);
        return task ? task.task_name : 'N/A';
    };

    const handleCreateActividad = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Validaciones básicas
            if (!newActividad.task_id) {
                throw new Error('Debe seleccionar una tarea');
            }
            if (!newActividad.responsible_id) {
                throw new Error('Debe seleccionar un responsable');
            }
            if (!newActividad.origin_vessel_id) {
                throw new Error('Debe seleccionar una vasija de origen');
            }
            
            /*const inputsBackend = newActividad.inputs.map(insumo => ({
                input_id: insumo.id,
                used_quantity: insumo.cantidad,
                warehouse_id: 8,
                status: "used",
                vessel_activity_id: null,
                operation_id: null
            }));*/
    
            /*const vesselActivityData = {
                origin_vessel_id: parseInt(newActividad.origin_vessel_id),
                destination_vessel_id: newActividad.destination_vessel_id ? parseInt(newActividad.destination_vessel_id) : null,
                task_id: newActividad.task_id,
                start_date: newActividad.start_date || null,
                end_date: newActividad.end_date || null,
                status: newActividad.status || 'pending',
                responsible_id: parseInt(newActividad.responsible_id),
                notes: newActividad.notes || '',
                comments: newActividad.comments || '',
                origin_batch_id: newActividad.origin_batch_id ? parseInt(newActividad.origin_batch_id) : null,
                destination_batch_id: newActividad.destination_batch_id ? parseInt(newActividad.destination_batch_id) : null,
                volume: newActividad.volume ? parseFloat(newActividad.volume) : null,
            };*/
    
            /*const actividadToCreate = {
                vessel_activity: vesselActivityData,
                inputs: inputsBackend,
            };*/

            //const response = await createVesselActivity(actividadToCreate);
    
            // Actualizar la lista de actividades
            await cargarDatos();
            
            // Resetear formulario
            setNewActividad(initialNewActividad);
            setShowForm(false);
            setSuccessMessage("Actividad creada correctamente");
            setShowSuccessModal(true);
    
        } catch (error) {
            console.error("Error al crear la actividad:", error);
            
            let errorMessage = "Error al crear la actividad";
            if (error.response?.data?.detail) {
                errorMessage += ": " + error.response.data.detail;
            } else if (error.message) {
                errorMessage += ": " + error.message;
            }
            
            setError(errorMessage);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const filteredActivities = activities.filter(activity => {
        if (!filterValue) return true;
        const fieldValue = activity[filterField];
        return String(fieldValue || '').toLowerCase().includes(filterValue.toLowerCase());
    });

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedActivities = [...filteredActivities].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Manejar valores null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (bValue == null) return sortConfig.direction === 'ascending' ? -1 : 1;

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    /*const groupActivities = (data, groupBy) => {
        return data.reduce((acc, activity) => {
            let key = activity[groupBy] || 'Sin asignar';
            
            // Convertir IDs a nombres legibles según el campo de agrupación
            switch (groupBy) {
                case 'responsible_id':
                    key = activity[groupBy] ? getResponsibleName(activity[groupBy]) : 'Sin asignar';
                    break;
                case 'origin_vessel_id':
                    key = activity[groupBy] ? getVesselName(activity[groupBy]) : 'Sin asignar';
                    break;
                case 'destination_vessel_id':
                    key = activity[groupBy] ? getVesselName(activity[groupBy]) : 'Sin asignar';
                    break;
                case 'task_id':
                    key = activity[groupBy] ? getTaskName(activity[groupBy]) : 'Sin asignar';
                    break;
                default:
                    // Para campos que no necesitan conversión (como 'status')
                    key = activity[groupBy] || 'Sin asignar';
            }
            
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(activity);
            return acc;
        }, {});
    };*/

    const groupedActivities = groupBy ? 
        sortedActivities.reduce((acc, activity) => {
            let key = activity[groupBy] || 'Sin asignar';
            
            // Convertir IDs a nombres legibles según el campo de agrupación
            switch (groupBy) {
                case 'responsible_id':
                    key = activity[groupBy] ? getResponsibleName(activity[groupBy]) : 'Sin asignar';
                    break;
                case 'origin_vessel_id':
                    key = activity[groupBy] ? getVesselName(activity[groupBy]) : 'Sin asignar';
                    break;
                case 'destination_vessel_id':
                    key = activity[groupBy] ? getVesselName(activity[groupBy]) : 'Sin asignar';
                    break;
                case 'task_id':
                    key = activity[groupBy] ? getTaskName(activity[groupBy]) : 'Sin asignar';
                    break;
                default:
                    // Para campos que no necesitan conversión (como 'status')
                    key = activity[groupBy] || 'Sin asignar';
            }
            
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(activity);
            return acc;
        }, {}) 
        : { "Todas las actividades": sortedActivities};
    
        const getGroupByDisplayName = (groupBy) => {
            const displayNames = {
                'task_id': 'Tarea',
                'responsible_id': 'Responsable',
                'origin_vessel_id': 'Vasija de Origen',
                'destination_vessel_id': 'Vasija de Destino',
                'status': 'Estado',
                'start_date': 'Fecha de Inicio',
                'end_date': 'Fecha de Fin',
                'comments': 'Comentarios',
                'notes': 'Notas',
                'origin_batch_id': 'Lote de Origen',
                'destination_batch_id': 'Lote de Destino',
                'volume': 'Volumen'
            };
            return displayNames[groupBy] || groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ");
        };

    
    const handleSelectAll = (e, group) => {
        setAllSelected({ ...allSelected, [group]: e.target.checked });
        const updatedSelections = { ...selectedActivities };
        if (e.target.checked) {
            updatedSelections[group] = groupedActivities[group].map((activity) => activity.id);
        } else {
            updatedSelections[group] = [];
        }
        setSelectedActivities(updatedSelections);
    };

    const handleSelectActivity = (e, activity, group) => {
        const groupSelections = selectedActivities[group] || [];
        const updatedSelections = e.target.checked
            ? [...groupSelections, activity.id]
            : groupSelections.filter((id) => id !== activity.id);
        setSelectedActivities({ ...selectedActivities, [group]: updatedSelections });

        const allGroupSelected = groupedActivities[group].every((a) => updatedSelections.includes(a.id));
        setAllSelected({ ...allSelected, [group]: allGroupSelected });
    };

    const downloadCSV = (selectedActivities) => {
        try {
            if (!selectedActivities || selectedActivities.length === 0) {
                alert('No hay actividades seleccionadas para descargar.');
                return;
            }

            const transformedData = selectedActivities.map(activity => ({
                'ID': activity.id || 'N/A',
                'Tarea': getTaskName(activity.task_id),
                'Responsable': getResponsibleName(activity.responsible_id),
                'Vasija de Origen': getVesselName(activity.origin_vessel_id),
                'Vasija de Destino': getVesselName(activity.destination_vessel_id),
                'Fecha de Inicio': activity.start_date || 'N/A',
                'Fecha de Fin': activity.end_date || 'N/A',
                'Estado': activity.status || 'N/A',
                'Comentarios': activity.comments || 'N/A',
                'Notas': activity.notes || 'N/A',
                'Lote de Origen': activity.origin_batch_id || 'N/A',
                'Lote de Destino': activity.destination_batch_id || 'N/A',
                'Volumen': activity.volume || 'N/A'
            }));

            const csv = Papa.unparse(transformedData, {
                delimiter: ',',
                header: true,
                encoding: 'utf-8',
                quotes: true,
                quoteChar: '"',
                escapeChar: '"',
                skipEmptyLines: false,
            });

            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csv;
            const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `actividades_bodega_${timestamp}.csv`;
                
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
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

    // Si está cargando por primera vez, mostrar spinner
    if (loading && initialLoad) {
        return (
            <div className="table-container">
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Cargando datos...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-screen-lg mx-auto px-4">
        <div className="table-container">
            <div className="table-header">
                <button 
                    onClick={handleOpenForm} 
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Cargando...' : 'Agregar Actividad'}
                </button>
                <Spacer width={0.5} />
                {Object.values(selectedActivities).flat().length > 0 && (
                    <button
                        onClick={() => downloadCSV(Object.values(selectedActivities).flat().map(id => activities.find(a => a.id === id)).filter(Boolean))}
                        className="btn btn-secondary"
                    >
                        Descargar CSV ({Object.values(selectedActivities).flat().length})
                    </button>
                )}
            </div>
    
            <div className="filter-controls-container">
                <div className="control-group">
                    <label htmlFor="groupingFieldWineryTasks" className="control-label">Agrupar por:</label>
                    <select
                        id="groupingFieldWineryTasks"
                        value={groupBy || "none"}
                        onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)}
                        className="control-select"
                    >
                        <option value="none">Sin Agrupación</option>
                        <option value="responsible_id">Responsable</option>
                        <option value="origin_vessel_id">Vasija de Origen</option>
                        <option value="destination_vessel_id">Vasija de Destino</option>
                        <option value="task_id">Tarea</option>
                        <option value="status">Estado</option>
                    </select>
                </div>
                <div className="control-group">
                    <label htmlFor="FilterFieldWineryTasks" className="control-label">
                        Filtrar por:
                    </label>
                    <div className="filter-inputs">
                        <select
                            id="FilterFieldWineryTasks"
                            value={filterField}
                            onChange={(e) => setFilterField(e.target.value)}
                            className="control-select filter-field"
                        >
                            <option value="task_id">Tarea</option>
                            <option value="responsible_id">Responsable</option>
                            <option value="origin_vessel_id">Vasija</option>
                            <option value="start_date">Fecha</option>
                            <option value="status">Estado</option>
                            <option value="comments">Comentarios</option>
                        </select>
                        <input
                            id="FilteValueWineryTasks"
                            type="text"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            placeholder={`Buscar por ${filterField}...`}
                            className="control-input"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
    
            {Object.entries(groupedActivities).map(([group, activities]) => (
                <div key={group} className="mb-4">
                    {groupBy && <h3 className="titulo-seccion">{`${getGroupByDisplayName(groupBy)}: ${group}`}</h3>}
                    <table className="table-auto w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 p-2">
                                    <input
                                        id="CheckBoxWineryTasks" 
                                        type="checkbox" 
                                        checked={allSelected[group] || false} 
                                        onChange={(e) => handleSelectAll(e, group)} 
                                    />
                                </th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort('task_id')}>
                                    Tarea {sortConfig.key === 'task_id' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                </th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort('responsible_id')}>
                                    Responsable {sortConfig.key === 'responsible_id' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                </th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort('origin_vessel_id')}>
                                    Vasija {sortConfig.key === 'origin_vessel_id' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                </th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort('start_date')}>
                                    Fecha {sortConfig.key === 'start_date' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                </th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort('status')}>
                                    Estado {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                </th>
                                <th className="border border-gray-300 p-2">Comentarios</th>
                                <th className="border border-gray-300 p-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((activity) => (
                                <tr key={activity.id}>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            id={`checkboxWineryTasks-${group}-${activity.id}`}
                                            type="checkbox"
                                            checked={selectedActivities[group]?.includes(activity.id) || false}
                                            onChange={(e) => handleSelectActivity(e, activity, group)}
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">{getTaskName(activity.task_id)}</td>
                                    <td className="border border-gray-300 p-2">{getResponsibleName(activity.responsible_id)}</td>
                                    <td className="border border-gray-300 p-2">{getVesselName(activity.origin_vessel_id)}</td>
                                    <td className="border border-gray-300 p-2">{activity.start_date || 'N/A'}</td>
                                    <td className="border border-gray-300 p-2">{activity.status || 'N/A'}</td>
                                    <td className="border border-gray-300 p-2">{activity.comments || 'N/A'}</td>
                                    <td className="border border-gray-300 p-2">
                                        <button 
                                            onClick={() => handleOpenActividadModal(activity)}
                                            className="p-2 rounded text-blue-500 hover:text-blue-700"
                                            title="Ver detalles"
                                        >
                                            <FontAwesomeIcon icon={faSearch} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {activities.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    No hay actividades disponibles
                </div>
            )}
    
            {/* Modal de creación */}
            <Modal
                isOpen={showForm}
                onRequestClose={handleCloseForm}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Crear actividad de bodega"
            >
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title">Crear una Nueva actividad de bodega</h2>

                        <div className="modal-form-grid">
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskTarea'>Tarea: *</label>
                                <select
                                    id='NewWTaskTarea'
                                    value={newActividad.task_id}
                                    onChange={(e) => setNewActividad({ ...newActividad, task_id: e.target.value })}
                                    className="modal-form-input"
                                    required
                                >
                                    <option value="">Selecciona una tarea</option>
                                    {tasks.map((task) => (
                                        <option key={task.task_list_id} value={task.task_list_id}>
                                            {task.task_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskResponsable'>Responsable: *</label>
                                <select
                                    id='NewWTaskResponsable'
                                    value={newActividad.responsible_id}
                                    onChange={(e) => setNewActividad({ ...newActividad, responsible_id: e.target.value })}
                                    className="modal-form-input"
                                    required
                                >
                                    <option value="">Selecciona un responsable</option>
                                    {usuarios.map((responsable) => (
                                        <option key={responsable.id} value={responsable.id}>
                                            {responsable.nombre} {responsable.apellido}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskOriginVessel'>Vasija de origen: *</label>
                                <select
                                    id='NewWTaskOriginVessel'
                                    value={newActividad.origin_vessel_id}
                                    onChange={(e) => setNewActividad({ ...newActividad, origin_vessel_id: e.target.value })}
                                    className="modal-form-input"
                                    required
                                >
                                    <option value="">Selecciona una vasija</option>
                                    {vessels.map((vessel) => (
                                        <option key={vessel.id} value={vessel.id}>
                                            {vessel.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskDestinyVessel'>Vasija de destino:</label>
                                <select
                                    id='NewWTaskDestinyVessel'
                                    value={newActividad.destination_vessel_id}
                                    onChange={(e) => setNewActividad({ ...newActividad, destination_vessel_id: e.target.value })}
                                    className="modal-form-input"
                                >
                                    <option value="">Selecciona una vasija</option>
                                    {vessels.map((vessel) => (
                                        <option key={vessel.id} value={vessel.id}>
                                            {vessel.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskDateIni'>Fecha de inicio:</label>
                                <input
                                    id='NewWTaskDateIni'
                                    type="date"
                                    value={newActividad.start_date}
                                    onChange={(e) => setNewActividad({ ...newActividad, start_date: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskDateFin'>Fecha de fin:</label>
                                <input
                                    id='NewWTaskDateFin'
                                    type="date"
                                    value={newActividad.end_date}
                                    onChange={(e) => setNewActividad({ ...newActividad, end_date: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskVol'>Volumen:</label>
                                <input
                                    id='NewWTaskVol'
                                    type="number"
                                    step="any"
                                    value={newActividad.volume || ''}
                                    onChange={(e) => setNewActividad({ ...newActividad, volume: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskEstado'>Estado:</label>
                                <input
                                    id='NewWTaskEstado'
                                    type="text"
                                    value={newActividad.status}
                                    onChange={(e) => setNewActividad({ ...newActividad, status: e.target.value })}
                                    className="modal-form-input"
                                    placeholder="Ej: pending, in-progress, completed"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskBatchOrigin'>Lote de origen:</label>
                                <input
                                    id='NewWTaskBatchOrigin'
                                    type="number"
                                    value={newActividad.origin_batch_id || ''}
                                    onChange={(e) => setNewActividad({ ...newActividad, origin_batch_id: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskBatchFin'>Lote de destino:</label>
                                <input
                                    id='NewWTaskBatchFin'
                                    type="number"
                                    value={newActividad.destination_batch_id || ''}
                                    onChange={(e) => setNewActividad({ ...newActividad, destination_batch_id: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskComentario'>Comentarios:</label>
                                <textarea
                                    id='NewWTaskComentario'
                                    value={newActividad.comments}
                                    onChange={(e) => setNewActividad({ ...newActividad, comments: e.target.value })}
                                    className="modal-form-input"
                                    rows="3"
                                    placeholder="Ingrese comentarios..."
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label" htmlFor='NewWTaskNota'>Notas:</label>
                                <textarea
                                    id='NewWTaskNota'
                                    value={newActividad.notes}
                                    onChange={(e) => setNewActividad({ ...newActividad, notes: e.target.value })}
                                    className="modal-form-input"
                                    rows="3"
                                    placeholder="Ingrese notas adicionales..."
                                />
                            </div>
                            <fieldset className="mb-4">
                                <legend className="modal-form-label">Insumos Consumidos:</legend>
                                <button 
                                    type='button' 
                                    onClick={handleAddInput}
                                    className="mb-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    Agregar Insumo
                                </button>
                                {newActividad.inputs.map((input, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <select
                                            id={`NewWTaskInsumo-${index}`}
                                            value={input.id || ''}
                                            onChange={(e) => handleInputChange(e, index)}
                                            className="modal-form-input flex-1"
                                        >
                                            <option value="">Selecciona un insumo</option>
                                            {insumos.map((insumo) => (
                                                <option key={insumo.id} value={insumo.id}>
                                                    {insumo.name}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            id={`NewWTaskInsumoCantidad-${index}`}
                                            type="number"
                                            value={input.cantidad}
                                            onChange={(e) => handleInputCantidadChange(e, index)}
                                            placeholder="Cantidad"
                                            className="modal-form-input w-24"
                                            min="0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const inputs = [...newActividad.inputs];
                                                inputs.splice(index, 1);
                                                setNewActividad({ ...newActividad, inputs });
                                            }}
                                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </fieldset>
                        </div>

                        <div className="modal-buttons mt-4">
                            <button 
                                onClick={handleCloseForm} 
                                className="btn btn-secondary mr-2"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateActividad} 
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creando...' : 'Crear Actividad'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal de éxito */}
            <Modal
                isOpen={showSuccessModal}
                onRequestClose={handleCloseSuccessModal}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Éxito"
            >
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title text-green-600">¡Éxito!</h2>
                        <p className="mb-4">{successMessage}</p>
                        <div className="modal-buttons">
                            <button onClick={handleCloseSuccessModal} className="btn btn-primary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal de error */}
            <Modal
                isOpen={showErrorModal}
                onRequestClose={handleCloseErrorModal}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Error"
            >
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title text-red-600">Error</h2>
                        <p className="mb-4">{error}</p>
                        <div className="modal-buttons">
                            <button onClick={handleCloseErrorModal} className="btn btn-primary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal de detalles de actividad */}
            <Modal
                isOpen={showActividadModal}
                onRequestClose={handleCloseActividadModal}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Detalles de la actividad"
            >
                {actividadDetails && (
                    <div className="modal-wrapper">
                        <div className="modal-content">
                            <h2 className="modal-title">Detalles de la actividad</h2>
                            
                            {editingActividad ? (
                                <div className="modal-form-grid">
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskTask'>Tarea:</label>
                                        <select
                                            id='EditWTaskTask'
                                            value={actividadToEdit?.task_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, task_id: e.target.value })}
                                            className="modal-form-input"
                                        >
                                            <option value="">Selecciona una tarea</option>
                                            {tasks.map((task) => (
                                                <option key={task.task_list_id} value={task.task_list_id}>
                                                    {task.task_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskResponsable'>Responsable:</label>
                                        <select
                                            id='EditWTaskResponsable'
                                            value={actividadToEdit?.responsible_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, responsible_id: parseInt(e.target.value) })}
                                            className="modal-form-input"
                                        >
                                            <option value="">Seleccionar responsable</option>
                                            {usuarios.map((usuario) => (
                                                <option key={usuario.id} value={usuario.id}>
                                                    {usuario.nombre} {usuario.apellido}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskOriginVessel'>Vasija de origen:</label>
                                        <select
                                            id='EditWTaskOriginVessel'
                                            value={actividadToEdit?.origin_vessel_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, origin_vessel_id: e.target.value ? parseInt(e.target.value) : null })}
                                            className="modal-form-input"
                                        >
                                            <option value="">Seleccionar vasija</option>
                                            {vessels.map((vessel) => (
                                                <option key={vessel.id} value={vessel.id}>
                                                    {vessel.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskDestinoVessel'>Vasija de destino:</label>
                                        <select
                                            id='EditWTaskDestinoVessel'
                                            value={actividadToEdit?.destination_vessel_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, destination_vessel_id: e.target.value ? parseInt(e.target.value) : null })}
                                            className="modal-form-input"
                                        >
                                            <option value="">Seleccionar vasija</option>
                                            {vessels.map((vessel) => (
                                                <option key={vessel.id} value={vessel.id}>
                                                    {vessel.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskDateIni'>Fecha de inicio:</label>
                                        <input
                                            id='EditWTaskDateIni'
                                            type="date"
                                            value={actividadToEdit?.start_date ? actividadToEdit.start_date.slice(0, 10) : ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, start_date: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskDateFin'>Fecha de fin:</label>
                                        <input
                                            id='EditWTaskDateFin'
                                            type="date"
                                            value={actividadToEdit?.end_date ? actividadToEdit.end_date.slice(0, 10) : ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, end_date: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskStatus'>Estado:</label>
                                        <input
                                            id='EditWTaskStatus'
                                            type="text"
                                            value={actividadToEdit?.status || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, status: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskNotas'>Notas:</label>
                                        <textarea
                                            id='EditWTaskNotas'
                                            value={actividadToEdit?.notes || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, notes: e.target.value })}
                                            className="modal-form-input"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskComents'>Comentarios:</label>
                                        <textarea
                                            id='EditWTaskComents'
                                            value={actividadToEdit?.comments || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, comments: e.target.value })}
                                            className="modal-form-input"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskOriginBatch'>Lote de origen:</label>
                                        <input
                                            id='EditWTaskOriginBatch'
                                            type="number"
                                            value={actividadToEdit?.origin_batch_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, origin_batch_id: e.target.value ? parseInt(e.target.value) : null })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskDestinyBatch'>Lote de destino:</label>
                                        <input
                                            id='EditWTaskDestinyBatch'
                                            type="number"
                                            value={actividadToEdit?.destination_batch_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, destination_batch_id: e.target.value ? parseInt(e.target.value) : null })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label" htmlFor='EditWTaskVol'>Volumen:</label>
                                        <input
                                            id='EditWTaskVol'
                                            type="number"
                                            step="any"
                                            value={actividadToEdit?.volume || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, volume: e.target.value ? parseFloat(e.target.value) : null })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="modal-details-grid">
                                    <div className="mb-4"><strong>Tarea:</strong> {getTaskName(actividadDetails.task_id)}</div>
                                    <div className="mb-4"><strong>Responsable:</strong> {getResponsibleName(actividadDetails.responsible_id)}</div>
                                    <div className="mb-4"><strong>Vasija de origen:</strong> {getVesselName(actividadDetails.origin_vessel_id)}</div>
                                    <div className="mb-4"><strong>Vasija de destino:</strong> {getVesselName(actividadDetails.destination_vessel_id)}</div>
                                    <div className="mb-4"><strong>Fecha de inicio:</strong> {actividadDetails.start_date || 'N/A'}</div>
                                    <div className="mb-4"><strong>Fecha de fin:</strong> {actividadDetails.end_date || 'N/A'}</div>
                                    <div className="mb-4"><strong>Estado:</strong> {actividadDetails.status || 'N/A'}</div>
                                    <div className="mb-4"><strong>Notas:</strong> {actividadDetails.notes || 'N/A'}</div>
                                    <div className="mb-4"><strong>Comentarios:</strong> {actividadDetails.comments || 'N/A'}</div>
                                    <div className="mb-4"><strong>Lote de origen:</strong> {actividadDetails.origin_batch_id || 'N/A'}</div>
                                    <div className="mb-4"><strong>Lote de destino:</strong> {actividadDetails.destination_batch_id || 'N/A'}</div>
                                    <div className="mb-4"><strong>Volumen:</strong> {actividadDetails.volume || 'N/A'}</div>
                                </div>
                            )}
                            
                            <div className="modal-buttons mt-4">

                                {editingActividad ? (
                                    <button 
                                        onClick={handleSaveActividad} 
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Guardando...' : 'Guardar'}
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={handleOpenDeleteModal} 
                                            className="btn btn-danger mr-2"
                                            disabled={loading}
                                        >
                                            Eliminar
                                        </button>
                                        <button onClick={handleEditActividad} className="btn btn-primary">
                                            Editar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={showDeleteModal}
                onRequestClose={handleCloseDeleteModal}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Confirmar eliminación"
            >
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title text-red-600">Confirmar Eliminación</h2>
                        <p className="mb-4">
                            ¿Está seguro de que desea eliminar esta actividad? Esta acción no se puede deshacer.
                        </p>
                        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                            <strong>Actividad a eliminar:</strong> {getTaskName(actividadDetails?.task_id)} - {getResponsibleName(actividadDetails?.responsible_id)}
                        </div>
                        <div className="modal-buttons">
                            <button 
                                onClick={handleCloseDeleteModal} 
                                className="btn btn-secondary mr-2"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleDeleteActividad} 
                                className="btn btn-danger"
                                disabled={loading}
                            >
                                {loading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

        </div>
        </div>
    );
};

export default TableWineryTask;
