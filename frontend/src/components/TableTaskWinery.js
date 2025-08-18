import React, { useState, useEffect } from 'react';
import { getVesselActivities, getVessels, createVesselActivity, getUsers, updateVesselActivity, getInputs, createTaskInput,getWineryTasks } from "../services/api";
import Modal from 'react-modal';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

const TableWineryTask = () => {
    const [activities, setactivities] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showActividadModal, setShowActividadModal] = useState(false);
    const [actividadDetails, setActividadDetails] = useState(null);
    const initialNewActividad = { // Define initialNewActividad aquí
        task_id: '',
        responsible_id: '',
        origin_vessel_id: '',
        destination_vessel_id: '',
        start_date: '',
        end_date: '',
        status: '',
        comments:'',
        notes: '',
        inputs: [],
        origin_batch_id: '',
        destination_batch_id: '',
        volume: '',
    };
    const [newActividad, setNewActividad] = useState(initialNewActividad);
    const [usuarios, setusuarios] = useState([]);
    const [vessels, setVasijas] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [groupBy, setGroupBy] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [filterField, setFilterField] = useState('task_id');
    const [filterValue, setFilterValue] = useState('');
    const [selectedActivities, setSelectedActivities] = useState({});
    const [allSelected, setAllSelected] = useState({});
    const [editingActividad, setEditingActividad] = useState(null);
    const [actividadToEdit, setActividadToEdit] = useState(null);
    const [insumos, setInsumos] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [successMessage, setSuccessMessage] = useState("");
    const handleOpenForm = () => setShowForm(true);
    const handleCloseForm = () => setShowForm(false);
    const handleOpenSuccessModal = () => setShowSuccessModal(true);
    const handleCloseSuccessModal = () => setShowSuccessModal(false);
    const handleOpenErrorModal = () => setShowErrorModal(true);
    const handleCloseErrorModal = () => setShowErrorModal(false);
    const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;
    
    useEffect(()=>{
        async function chargeInputs(){
            setInsumos(await getInputs());
        }
        chargeInputs()
    },[])

    const handleAddInput = ()=>{
        setNewActividad({...newActividad, inputs:[...newActividad.inputs,{id:undefined,cantidad:0}]})
    }
    const handleInputChange = (e, index)=>{
        const inputs = [...newActividad.inputs];
        inputs[index].id = parseInt(e.target.value);
        setNewActividad({...newActividad, inputs:inputs})
    }
    const handleInputCantidadChange = (e, index)=>{
        const inputs = [...newActividad.inputs];
        inputs[index].cantidad = parseInt(e.target.value);
        setNewActividad({...newActividad, inputs:inputs})
    }
    const handleEditActividad = () => {
        setEditingActividad({ ...actividadDetails });
    };

    const handleSaveActividad = async () => {
        try {
            await updateVesselActivity(actividadToEdit.id, actividadToEdit);
            cargarDatos();
            setEditingActividad(null);
            setActividadDetails(actividadToEdit);
        } catch (error) {
            console.error('Error updating vessel activity:', error);
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
    };

    const cargarDatos = async () => {
        try {
            const [actividadesData, vesselsData, usuariosData, tasksData] = await Promise.all([
                getVesselActivities(),
                getVessels(),
                getUsers(),
                getWineryTasks(), 
            ]);

            if (Array.isArray(actividadesData.data)) {
                setactivities(actividadesData.data);
            } else {
                console.error("La respuesta de la API no es un array:", actividadesData);
                setactivities([]);
            }

            if (Array.isArray(vesselsData.data)) {
                setVasijas(vesselsData.data);
            } else {
                console.error("La respuesta de la API de vasijas no es un array:", vesselsData);
                setVasijas([]);
            }

            if (Array.isArray(usuariosData)) {
                setusuarios(usuariosData);
            } else {
                console.error("La respuesta de la API de usuarios no es un array:", usuariosData);
                setusuarios([]);
            }

            if (Array.isArray(tasksData)) {
                setTasks(tasksData); // Guardar las tareas en el estado
            } else {
                console.error("La respuesta de la API de tareas no es un array:", tasksData);
                setTasks([]);
            }

        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleCreateActividad = async () => {
        try {
            
            const inputsBackend = newActividad.inputs.map(insumo => ({
                input_id: insumo.id, // Verifica que insumo.id tenga el valor correcto
                used_quantity: insumo.cantidad,
                warehouse_id: 8,
                status: "used",
                operation_id: null
            }));
    
            const vesselActivityData = {
                origin_vessel_id: parseInt(newActividad.origin_vessel_id),
                destination_vessel_id: parseInt(newActividad.destination_vessel_id),
                task_id: newActividad.task_id,
                start_date: newActividad.start_date || null,
                end_date: newActividad.end_date || null,
                status: newActividad.status,
                responsible_id: newActividad.responsible_id,
                notes: newActividad.notes,
                comments: newActividad.comments,
                origin_batch_id: newActividad.origin_batch_id || null,
                destination_batch_id: newActividad.destination_batch_id || null,
                volume: newActividad.volume || null,
            };
    
            const ActividadToCreate = {
                vessel_activity: vesselActivityData,
                inputs: inputsBackend,
            };
    
            console.log("Datos enviados al backend:", ActividadToCreate); // Verifica los datos
    
            const response = await createVesselActivity(ActividadToCreate);
    
            setactivities([...activities, response]);
            setNewActividad({
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
            });
            setShowForm(false);
            setSuccessMessage("Su actividad ha sido creada correctamente.");
            setShowSuccessModal(true);
    
        } catch (error) {
            console.error("Error al crear la operacion:", error);
            if (error.response && error.response.data) {
                console.log("Detalles de la respuesta del backend:", error.response.data);
                if (error.response.data.detail) {
                    console.error("Detalles del error del backend:", error.response.data.detail);
                }
            }
            alert("Error al crear la actividad: " + error.message);
        }
    };

    const filteredActivities = activities.filter(activity => {
        const fieldValue = activity[filterField];
        return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase());
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

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    const groupActivities = (data, groupBy) => {
        return data.reduce((acc, activity) => {
            const key = activity[groupBy];
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(activity);
            return acc;
        }, {});
    };

    const groupedActivities = groupBy ? groupActivities(sortedActivities, groupBy) : { "Todas las actividades": sortedActivities };

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

        const allGroupSelected = groupedActivities[group].every((a) => selectedActivities[group]?.includes(a.id));
        setAllSelected({ ...allSelected, [group]: allGroupSelected });
    };

    const downloadCSV = (selectedActivities) => {
        try {
            // Validar que hay actividades seleccionadas
            if (!selectedActivities || selectedActivities.length === 0) {
                alert('No hay actividades seleccionadas para descargar.');
                return;
            }

            // Transformar los datos para mostrar valores legibles en lugar de IDs
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

            // Configuración de Papa Parse para manejar correctamente los caracteres especiales
            const csv = Papa.unparse(transformedData, {
                delimiter: ',',
                header: true,
                encoding: 'utf-8',
                // Asegurar que los campos con comas, saltos de línea o comillas se escapen correctamente
                quotes: true,
                quoteChar: '"',
                escapeChar: '"',
                // Configuración adicional para manejar caracteres especiales
                skipEmptyLines: false,
                transform: {
                    // Limpiar y normalizar los valores
                    value: function(value, field) {
                        if (value === null || value === undefined) {
                            return 'N/A';
                        }
                        // Convertir a string y limpiar caracteres problemáticos
                        return String(value).trim();
                    }
                }
            });

            // Agregar BOM (Byte Order Mark) para UTF-8 para mejor compatibilidad con Excel
            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csv;

            // Crear el blob con encoding UTF-8 explícito
            const blob = new Blob([csvWithBOM], { 
                type: 'text/csv;charset=utf-8;' 
            });

            // Crear el enlace de descarga
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                
                // Generar nombre de archivo con timestamp para evitar conflictos
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `actividades_bodega_${timestamp}.csv`;
                
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                
                // Agregar al DOM, hacer click y remover
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Limpiar la URL del objeto para liberar memoria
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);

                console.log(`CSV descargado exitosamente: ${filename}`);
                
            } else {
                // Fallback para navegadores muy antiguos
                throw new Error('Su navegador no soporta la descarga de archivos.');
            }
        } catch (error) {
            console.error('Error al generar el archivo CSV:', error);
            alert('Ocurrió un error al generar el archivo CSV. Por favor, inténtelo de nuevo.');
        }
    };

    const getVesselName = (vesselId) => {
        const vessel = vessels.find(vess => vess.id === vesselId);
        return vessel ? vessel.name : 'N/A';
    };

    const getResponsibleName = (responsibleId) => {
        const responsible = usuarios.find(user => user.id === responsibleId);
        return responsible ? `${responsible.nombre} ${responsible.apellido}` : 'N/A';
    };

    const getTaskName = (taskId) => {
        const task = tasks.find(task => task.task_list_id === taskId);
        return task ? task.task_name : 'N/A';
    };

    return (
        <div className="table-container">
            <div className="table-header">
                <button onClick={handleOpenForm} className="btn btn-primary">Agregar Actividad</button>
                <Spacer width={0.5} />
                {Object.values(selectedActivities).flat().length > 0 && (
                    <button
                        onClick={() => downloadCSV(Object.values(selectedActivities).flat().map(id => activities.find(a => a.id === id)))}
                        className="btn btn-secondary"
                    >
                        Descargar CSV
                    </button>
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
                    <option value="responsible_id">Responsable</option>
                    <option value="origin_vessel_id">Vasija</option>
                    <option value="status">Estado</option>
                </select>
                <Spacer width={2} />
                <select
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    className="border p-2 rounded"
                >
                    <option value="task_id">Tarea</option>
                    <option value="responsible_id">Responsable</option>
                    <option value="origin_vessel_id">Vasija</option>
                    <option value="start_date">Fecha</option>
                    <option value="status">Estado</option>
                    <option value="comments">Comentarios</option>
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
    
            {Object.entries(groupedActivities).map(([group, activities]) => (
                <div key={group} className="mb-4">
                    {groupBy && <h3 className="titulo-seccion">{`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${group}`}</h3>}
                    <table className="table-auto w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 p-2">
                                    <input type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
                                </th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('task_id')}>Tarea</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('responsible_id')}>Responsable</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('origin_vessel_id')}>Vasija</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('start_date')}>Fecha</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('status')}>Estado</th>
                                <th className="border border-gray-300 p-2" onClick={() => handleSort('comments')}>Comentarios</th>
                                <th className="border border-gray-300 p-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((activity) => (
                                <tr key={activity.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedActivities[group]?.includes(activity.id) || false}
                                            onChange={(e) => handleSelectActivity(e, activity, group)}
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-2">{getTaskName(activity.task_id)}</td>
                                    <td className="border border-gray-300 p-2">{getResponsibleName(activity.responsible_id)}</td>
                                    <td className="border border-gray-300 p-2">{getVesselName(activity.origin_vessel_id)}</td>
                                    <td className="border border-gray-300 p-2">{activity.start_date}</td>
                                    <td className="border border-gray-300 p-2">{activity.status}</td>
                                    <td className="border border-gray-300 p-2">{activity.comments}</td>
                                    <td className="border border-gray-300 p-2">
                                        <button onClick={() => handleOpenActividadModal(activity)}
                                            className="p-2 rounded text-blue-500 hover:text-blue-700">
                                            <FontAwesomeIcon icon={faSearch} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
    
            {/* Modales */}
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
                                <label className="modal-form-label">Tarea:</label>
                                <select
                                    value={newActividad.task_id}
                                    onChange={(e) => setNewActividad({ ...newActividad, task_id: e.target.value })}
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
                                <label className="modal-form-label">Responsable:</label>
                                    <select
                                        value={newActividad.responsible_id}
                                        onChange={(e) => setNewActividad({ ...newActividad, responsible_id: e.target.value })}
                                        className="modal-form-input"
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
                                <label className="modal-form-label">Vasija de origen:</label>
                                <select
                                    value={newActividad.origin_vessel_id}
                                    onChange={(e) => setNewActividad({ ...newActividad, origin_vessel_id: e.target.value })}
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
                                <label className="modal-form-label">Vasija de destino:</label>
                                <select
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
                                <label className="modal-form-label">Fecha de inicio :</label>
                                <input
                                    type="date"
                                    value={newActividad.start_date}
                                    onChange={(e) => setNewActividad({ ...newActividad, start_date: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label">Fecha de fin :</label>
                                <input
                                    type="date"
                                    value={newActividad.end_date}
                                    onChange={(e) => setNewActividad({ ...newActividad, end_date: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label">Volumen:</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newActividad.volume || ''}
                                    onChange={(e) => setActividadToEdit({ ...newActividad, volume: e.target.value ? parseFloat(e.target.value) : null })}
                                    className="modal-form-input"
                                />
                            </div>                               
                            <div className="mb-4">
                                <label className="modal-form-label">Estado:</label>
                                <input
                                    type="text"
                                    value={newActividad.status}
                                    onChange={(e) => setNewActividad({ ...newActividad, status: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label">Comentarios:</label>
                                <textarea
                                    value={newActividad.comments}
                                    onChange={(e) => setNewActividad({ ...newActividad, comments: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label">Nota:</label>
                                <textarea
                                    value={newActividad.notes}
                                    onChange={(e) => setNewActividad({ ...newActividad, notes: e.target.value })}
                                    className="modal-form-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="modal-form-label">Insumos Consumidos:</label>
                                <button type='button' onClick={()=> handleAddInput()}>Agregar Insumo</button>
                                {newActividad.inputs.map((input, index) =>(
                                    <div key={index}>
                                        <select
                                            value={input.id}
                                            onChange={(e) => handleInputChange(e,index)}
                                            className="modal-form-input"
                                        >
                                            <option value="">Selecciona un insumo</option>
                                            {insumos.map((insumo) => (
                                                <option key={insumo.id} value={insumo.id}>
                                                    {insumo.name}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={input.cantidad}
                                            onChange={(e)=> handleInputCantidadChange(e,index)}
                                            placeholder="Cantidad"
                                            className="modal-form-input"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-buttons mt-4">
                            <button onClick={handleCloseForm} className="btn btn-secondary">Cancelar</button>
                            <button onClick={handleCreateActividad} className="btn btn-primary">Crear</button>
                        </div>
                    </div>
                </div>
            </Modal>
            {/* Modal de éxito */}
            {/* Modal de error */}
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
                                        <label className="modal-form-label">Tarea:</label>
                                        <select
                                            value={actividadToEdit.task_id || ''}
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
                                        <label className="modal-form-label">Vasija de origen:</label>
                                        <select
                                            value={actividadToEdit.origin_vessel_id || ''}
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
                                        <label className="modal-form-label">Vasija de destino:</label>
                                        <select
                                            value={actividadToEdit.destination_vessel_id || ''}
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
                                        <label className="modal-form-label">Fecha de inicio:</label>
                                        <input
                                            type="date"
                                            value={actividadToEdit.start_date ? actividadToEdit.start_date.slice(0, 16) : ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, start_date: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Fecha de fin:</label>
                                        <input
                                            type="date"
                                            value={actividadToEdit.end_date ? actividadToEdit.end_date.slice(0, 16) : ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, end_date: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Estado:</label>
                                        <input
                                            type="text"
                                            value={actividadToEdit.status || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, status: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Responsable:</label>
                                        <select
                                            value={actividadToEdit.responsible_id}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, responsible_id: parseInt(e.target.value) })}
                                            className="modal-form-input"
                                        >
                                            {usuarios.map((usuario) => (
                                                <option key={usuario.id} value={usuario.id}>
                                                    {usuario.username}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Notas:</label>
                                        <textarea
                                            value={actividadToEdit.notes || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, notes: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Comentarios:</label>
                                        <textarea
                                            value={actividadToEdit.comments || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, comments: e.target.value })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Lote de origen:</label>
                                        <input
                                            type="number"
                                            value={actividadToEdit.origin_batch_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, origin_batch_id: e.target.value ? parseInt(e.target.value) : null })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Lote de destino:</label>
                                        <input
                                            type="number"
                                            value={actividadToEdit.destination_batch_id || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, destination_batch_id: e.target.value ? parseInt(e.target.value) : null })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Volumen:</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={actividadToEdit.volume || ''}
                                            onChange={(e) => setActividadToEdit({ ...actividadToEdit, volume: e.target.value ? parseFloat(e.target.value) : null })}
                                            className="modal-form-input"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="modal-details-grid">
                                    <div className="mb-4"><strong>Tarea:</strong> {tasks.find((task) => task.task_list_id === actividadDetails.task_id)?.task_name || 'N/A'}</div>
                                    <div className="mb-4"><strong>Vasija de origen:</strong> {vessels.find((v) => v.id === actividadDetails.origin_vessel_id)?.name || 'N/A'}</div>
                                    <div className="mb-4"><strong>Vasija de destino:</strong> {vessels.find((v) => v.id === actividadDetails.destination_vessel_id)?.name || 'N/A'}</div>
                                    <div className="mb-4"><strong>Fecha de inicio:</strong> {actividadDetails.start_date}</div>
                                    <div className="mb-4"><strong>Fecha de fin:</strong> {actividadDetails.end_date || 'N/A'}</div>
                                    <div className="mb-4"><strong>Estado:</strong> {actividadDetails.status || 'N/A'}</div>
                                    <div className="mb-4"><strong>Responsable:</strong> {usuarios.find((u) => u.id === actividadDetails.responsible_id)?.username}</div>
                                    <div className="mb-4"><strong>Notas:</strong> {actividadDetails.notes || 'N/A'}</div>
                                    <div className="mb-4"><strong>Comentarios:</strong> {actividadDetails.comments || 'N/A'}</div>
                                    <div className="mb-4"><strong>Lote de origen:</strong> {actividadDetails.origin_batch_id || 'N/A'}</div>
                                    <div className="mb-4"><strong>Lote de destino:</strong> {actividadDetails.destination_batch_id || 'N/A'}</div>
                                    <div className="mb-4"><strong>Volumen:</strong> {actividadDetails.volume || 'N/A'}</div>
                                </div>
                            )}
                            <div className="modal-buttons mt-4">
                                <button onClick={handleCloseActividadModal} className="btn btn-secondary">Cerrar</button>
                                {editingActividad ? (
                                    <button onClick={handleSaveActividad} className="btn btn-primary">Guardar</button>
                                ) : (
                                    <button onClick={handleEditActividad} className="btn btn-primary">Editar</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default TableWineryTask