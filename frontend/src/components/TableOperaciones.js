'NEW TABLE OPERACIONES'
import React, { useState, useEffect } from 'react';
import { 
    getOperacionesVineyard, 
    createOperacion,
    updateOperacion, 
    deleteOperacion, 
    getPlots, 
    getInputs, 
    getUsers, 
    getVineyardTasks, 
    updateOperacionInputs,
    getOperacionDetailed 
} from "../services/api";
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEdit, faTrash, faClock, faUser, faMapMarkerAlt, faPlus} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Papa from 'papaparse';

function TableOperaciones() {
    // Estados principales
    const [operaciones, setOperaciones] = useState([]);
    const [selectedOperaciones, setSelectedOperaciones] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para modales y formularios
    const [showForm, setShowForm] = useState(false);
    const [newOperacion, setNewOperacion] = useState({
        id: '',
        parcela_id: '',
        tipo_operacion: '',
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'planned',
        responsable_id: '',
        nota: '',
        comentario: '',
        inputs: []
    });

    // Estados para mensajes y detalles
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [operacionDetails, setOperacionDetails] = useState(null);
    const [showOperacionModal, setShowOperacionModal] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false);

    // Estados para filtros y ordenamiento
    const [sortConfig, setSortConfig] = useState({ key: "creation_date", direction: "desc" });
    const [filterField, setFilterField] = useState("tipo_operacion");
    const [filterValue, setFilterValue] = useState("");
    const [groupBy, setGroupBy] = useState(null);
    const [allSelected, setAllSelected] = useState({});

    // Estados para datos relacionados
    const [insumos, setInsumos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [tasks, setVineyardsTasks] = useState([]);
    const [plotsData, setPlotsData] = useState([]);

    const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

    // Efecto principal para cargar datos
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                setLoading(true);
                const [operacionesData, plotsResponse, insumosData, usuariosData, taskData] = await Promise.all([
                    getOperacionesVineyard(),
                    getPlots(),
                    getInputs(),
                    getUsers(),
                    getVineyardTasks(),
                ]);

                // Con la nueva estructura optimizada, los datos ya vienen enriquecidos
                setOperaciones(operacionesData);
                setPlotsData(plotsResponse);
                setInsumos(insumosData);
                setUsuarios(usuariosData);
                setVineyardsTasks(taskData);
                setError(null);
            } catch (error) {
                console.error("Error al cargar datos:", error);
                setError("Error al cargar los datos. Por favor, intente nuevamente.");
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, []);

    // Opciones para selects
    const parcelaOptions = plotsData.map(parcela => ({
        value: parcela.plot_id,
        label: parcela.plot_name
    }));

    const responsableOptions = usuarios.map(usuario => ({
        value: usuario.id,
        label: `${usuario.nombre} ${usuario.apellido}`
    }));

    const options = tasks.map((task) => ({
        value: task.task_name,
        label: task.task_name,
    }));

    // Función para manejar agrupación
    const handleGroupByChange = (e) => {
        setGroupBy(e.target.value === "none" ? null : e.target.value);
    };

    const groupOperaciones = (data, groupBy) => {
        return data.reduce((acc, operacion) => {
            let key;
            switch(groupBy) {
                case 'parcela':
                    key = operacion.parcela_name || 'Sin parcela';
                    break;
                case 'responsable':
                    const responsable = usuarios.find(u => u.id === operacion.responsable_id);
                    key = responsable ? `${responsable.nombre} ${responsable.apellido}` : 'Sin responsable';
                    break;
                case 'estado':
                    key = operacion.estado || 'Sin estado';
                    break;
                default:
                    key = operacion[groupBy] || 'Sin definir';
            }
            
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(operacion);
            return acc;
        }, {});
    };

    // Funciones de ordenamiento y filtrado optimizadas
    const sortedOperaciones = [...operaciones].sort((a, b) => {
        if (!sortConfig.key) return 0;
        
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Manejo especial para fechas
        if (sortConfig.key.includes('fecha') || sortConfig.key === 'creation_date') {
            aValue = aValue ? new Date(aValue) : new Date(0);
            bValue = bValue ? new Date(bValue) : new Date(0);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    const filteredSortedOperaciones = sortedOperaciones.filter((operacion) => {
        if (!filterValue) return true;
        
        let valueToFilter = '';
        
        switch (filterField) {
            case 'id':
                valueToFilter = String(operacion.id);
                break;
            case 'parcela_name':
                valueToFilter = operacion.parcela_name || '';
                break;
            case 'estado':
                valueToFilter = operacion.estado || '';
                break;
            case 'responsable_name':
                const responsable = usuarios.find(usuario => usuario.id === operacion.responsable_id);
                valueToFilter = responsable ? `${responsable.nombre} ${responsable.apellido}` : '';
                break;
            case 'tipo_operacion':
                valueToFilter = operacion.tipo_operacion || '';
                break;
            case 'inputs_count':
                valueToFilter = String(operacion.inputs_count || 0);
                break;
            case 'jornales':
                valueToFilter = String(operacion.jornales || '');
                break;
            case 'personas':
                valueToFilter = String(operacion.personas || '');
                break;
            case 'porcentaje_avance':
                valueToFilter = String(operacion.porcentaje_avance || '');
                break;
            default:
                valueToFilter = String(operacion[filterField] || '');
        }
        
        return valueToFilter.toLowerCase().includes(filterValue.toLowerCase());
    });

    const groupedOperaciones = groupBy 
        ? groupOperaciones(filteredSortedOperaciones, groupBy) 
        : { "Todas las operaciones": filteredSortedOperaciones };

    // Función para manejar ordenamiento
    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key: key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    // Funciones para selección
    const handleSelectAll = (e, group) => {
        const isChecked = e.target.checked;
        setAllSelected({ ...allSelected, [group]: isChecked });

        const updatedSelections = { ...selectedOperaciones };
        if (isChecked) {
            updatedSelections[group] = groupedOperaciones[group].map((operacion) => operacion.id);
        } else {
            updatedSelections[group] = [];
        }
        setSelectedOperaciones(updatedSelections);
    };

    const handleSelectOperacion = (e, operacion, group) => {
        const groupSelections = selectedOperaciones[group] || [];
        const updatedSelections = e.target.checked
            ? [...groupSelections, operacion.id]
            : groupSelections.filter((id) => id !== operacion.id);
        setSelectedOperaciones({ ...selectedOperaciones, [group]: updatedSelections });

        const allGroupSelected = groupedOperaciones[group].every((a) => 
            updatedSelections.includes(a.id)
        );
        setAllSelected({ ...allSelected, [group]: allGroupSelected });
    };

    // Función para ver detalles de operación
    const handleViewOperacion = async (operacion) => {
        try {
            setLoading(true);
            // Obtener detalles completos usando el endpoint específico
            const operacionDetallada = await getOperacionDetailed(operacion.id);
            if (!operacionDetallada.inputs) {
                operacionDetallada.inputs = [];
            }
            setOperacionDetails(operacionDetallada);
            setShowOperacionModal(true);
            setIsEditingDetails(false);
        } catch (error) {
            console.error("Error al obtener detalles de la operación:", error);
            setErrorMessage("Error al cargar los detalles de la operación.");
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Función optimizada para descargar CSV
    const downloadCSV = () => {
        const selectedData = [];

        for (const group in selectedOperaciones) {
            const selectedIdsInGroup = selectedOperaciones[group];
            if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
                const filteredOperaciones = operaciones.filter(operacion => 
                    selectedIdsInGroup.includes(operacion.id)
                );
                selectedData.push(...filteredOperaciones);
            }
        }

        if (selectedData.length === 0) {
            alert("No hay operaciones seleccionadas para descargar.");
            return;
        }

        const transformedData = selectedData.map(operacion => {
            const responsable = usuarios.find(usuario => usuario.id === operacion.responsable_id);
            const responsableNombre = responsable ? `${responsable.nombre} ${responsable.apellido}` : 'No asignado';

            return {
                'ID': operacion.id,
                'Tipo de Operación': operacion.tipo_operacion || '',
                'Parcela': operacion.parcela_name || 'Parcela desconocida',
                'Responsable': responsableNombre,
                'Estado': operacion.estado || '',
                'Fecha de Inicio': operacion.fecha_inicio || '',
                'Fecha de Creación': operacion.creation_date ? new Date(operacion.creation_date).toLocaleDateString() : '',
                'Jornales': operacion.jornales || '',
                'Personas': operacion.personas || '',
                'Porcentaje de Avance': operacion.porcentaje_avance || '',
                'Cantidad de Insumos': operacion.inputs_count || 0,
                'ID Parcela (Referencia)': operacion.parcela_id,
                'ID Responsable (Referencia)': operacion.responsable_id
            };
        });

        const csv = Papa.unparse(transformedData);
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csv;
        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fechaActual = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `operaciones_vineyard_${fechaActual}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    // Función para formatear fechas
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    // Función para formatear estado con color
    const getEstadoColor = (estado) => {
        const colorMap = {
            'planned': 'bg-yellow-100 text-yellow-800',
            'in_progress': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        return colorMap[estado] || 'bg-gray-100 text-gray-800';
    };

    // Componente de carga
    if (loading && operaciones.length === 0) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Cargando operaciones...</div>
                </div>
            </div>
        );
    }

    // Componente de error
    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    // Funciones para manejar operaciones CRUD
    const handleCreateOperacion = async () => {
        try {
            // Validar campos obligatorios
            if (!newOperacion.tipo_operacion) {
                throw new Error('Tipo de operación es obligatorio');
            }
            if (!newOperacion.parcela_id) {
                throw new Error('Parcela es obligatoria');
            }

            // Preparar inputs para el backend
            const inputsBackend = newOperacion.inputs.map(insumo => ({
                input_id: parseInt(insumo.insumo_id),
                used_quantity: parseInt(insumo.cantidad) || 0,
                warehouse_id: 7,
                status: "planned",
                operation_id: null
            }));

            // Preparar operación completa
            const operacionToCreate = { 
                tipo_operacion: newOperacion.tipo_operacion,
                fecha_inicio: newOperacion.fecha_inicio || null,
                fecha_fin: newOperacion.fecha_fin || null,
                estado: newOperacion.estado || 'planned',
                responsable_id: newOperacion.responsable_id ? parseInt(newOperacion.responsable_id) : null,
                nota: newOperacion.nota || '',
                comentario: newOperacion.comentario || '',
                parcela_id: parseInt(newOperacion.parcela_id),
                inputs: inputsBackend,
                vessel_activity_id: null,
                jornales: newOperacion.jornales ? parseFloat(newOperacion.jornales) : null,
                personas: newOperacion.personas ? parseInt(newOperacion.personas) : null,
                porcentaje_avance: newOperacion.porcentaje_avance ? parseFloat(newOperacion.porcentaje_avance) : null,
            };

            const response = await createOperacion(operacionToCreate);
            
            // Recargar datos para obtener la estructura optimizada
            const operacionesActualizadas = await getOperacionesVineyard();
            setOperaciones(operacionesActualizadas);
            
            // Limpiar formulario
            setNewOperacion({
                id: '',
                parcela_id: '',
                tipo_operacion: '',
                fecha_inicio: '',
                fecha_fin: '',
                estado: 'planned',
                responsable_id: '',
                nota: '',
                comentario: '',
                inputs: [],
                jornales: '',
                personas: '',
                porcentaje_avance: ''
            });
            
            setShowForm(false);
            setSuccessMessage("Su operación ha sido creada correctamente.");
            setShowSuccessModal(true);

        } catch (error) {
            console.error("Error al crear operación:", error);
            
            let errorMessage = "Error al crear la operación";
            if (error.response) {
                if (error.response.status === 422) {
                    errorMessage = "Error de validación: Verifica que todos los datos sean correctos.";
                    if (error.response.data?.detail) {
                        if (Array.isArray(error.response.data.detail)) {
                            const validationErrors = error.response.data.detail
                                .map(err => `${err.loc?.join('.')}: ${err.msg}`)
                                .join(', ');
                            errorMessage += ` (${validationErrors})`;
                        } else {
                            errorMessage += ` (${error.response.data.detail})`;
                        }
                    }
                } else if (error.response.data?.detail) {
                    errorMessage += `: ${error.response.data.detail}`;
                }
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            setErrorMessage(errorMessage);
            setShowErrorModal(true);
        }
    };

    const handleSaveDetails = async () => {
        try {
            if (!operacionDetails.id) {
                throw new Error("No se puede guardar: ID de operación no encontrado.");
            }

            // Preparar datos básicos de la operación
            const datosOperacion = {};
            
            if (operacionDetails.tipo_operacion) {
                datosOperacion.tipo_operacion = operacionDetails.tipo_operacion;
            }
            if (operacionDetails.fecha_inicio) {
                datosOperacion.fecha_inicio = operacionDetails.fecha_inicio;
            }
            if (operacionDetails.fecha_fin) {
                datosOperacion.fecha_fin = operacionDetails.fecha_fin;
            }
            if (operacionDetails.estado) {
                datosOperacion.estado = operacionDetails.estado;
            }
            if (operacionDetails.responsable_id) {
                datosOperacion.responsable_id = parseInt(operacionDetails.responsable_id);
            }
            if (operacionDetails.nota !== undefined) {
                datosOperacion.nota = operacionDetails.nota;
            }
            if (operacionDetails.comentario !== undefined) {
                datosOperacion.comentario = operacionDetails.comentario;
            }
            if (operacionDetails.parcela_id) {
                datosOperacion.parcela_id = parseInt(operacionDetails.parcela_id);
            }
            if (operacionDetails.jornales !== undefined) {
                datosOperacion.jornales = operacionDetails.jornales ? parseFloat(operacionDetails.jornales) : null;
            }
            if (operacionDetails.personas !== undefined) {
                datosOperacion.personas = operacionDetails.personas ? parseInt(operacionDetails.personas) : null;
            }
            if (operacionDetails.porcentaje_avance !== undefined) {
                datosOperacion.porcentaje_avance = operacionDetails.porcentaje_avance ? parseFloat(operacionDetails.porcentaje_avance) : null;
            }

            // Actualizar operación básica
            await updateOperacion(operacionDetails.id, datosOperacion);

            // Actualizar inputs si existen
            const inputsArray = operacionDetails.inputs || [];
            
            if (inputsArray.length > 0) {
                const inputsParaEnviar = inputsArray.map(insumo => ({
                    input_id: parseInt(insumo.input_id),
                    used_quantity: parseInt(insumo.used_quantity) || 0,
                }));
                
                await updateOperacionInputs(operacionDetails.id, { inputs: inputsParaEnviar });
            } else {
                await updateOperacionInputs(operacionDetails.id, { inputs: [] });
            }

            // Recargar datos optimizados
            const operacionesActualizadas = await getOperacionesVineyard();
            setOperaciones(operacionesActualizadas);

            setIsEditingDetails(false);
            setShowOperacionModal(false);
            setOperacionDetails(null);

            setSuccessMessage("Los detalles de la Operación han sido actualizados correctamente.");
            setShowSuccessModal(true);

        } catch (error) {
            console.error("Error al guardar los detalles:", error);
            
            let errorMessage = "Error al guardar los detalles";
            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = "Operación no encontrada (404)";
                } else if (error.response.status === 422) {
                    errorMessage = "Datos inválidos. Verifica los campos obligatorios.";
                    if (error.response.data && error.response.data.detail) {
                        if (Array.isArray(error.response.data.detail)) {
                            const validationErrors = error.response.data.detail
                                .map(err => `${err.loc?.join('.')}: ${err.msg}`)
                                .join(', ');
                            errorMessage += ` (${validationErrors})`;
                        } else {
                            errorMessage = `Error: ${error.response.data.detail}`;
                        }
                    }
                } else if (error.response.data && error.response.data.detail) {
                    errorMessage = `Error: ${error.response.data.detail}`;
                }
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            setErrorMessage(errorMessage);
            setShowErrorModal(true);
        }
    };

    const handleDeleteOperaciones = async (idOperacion) => {
        if (!idOperacion) {
            setErrorMessage("No se ha proporcionado un ID de Operación para eliminar.");
            setShowErrorModal(true);
            return;
        }

        if (window.confirm("¿Estás seguro de que deseas eliminar esta Operación?")) {
            try {
                await deleteOperacion(idOperacion);
                
                // Recargar datos optimizados
                const operacionesActualizadas = await getOperacionesVineyard();
                setOperaciones(operacionesActualizadas);

                setShowOperacionModal(false);
                setOperacionDetails(null);

                setSuccessMessage("La Operación fue eliminada correctamente.");
                setShowSuccessModal(true);
            } catch (error) {
                console.error("Error al eliminar la Operación:", error);
                setErrorMessage("Hubo un error al eliminar la Operación.");
                setShowErrorModal(true);
            }
        }
    };

    // Funciones para manejar cambios en formularios
    const handleCreateChange = (field, value) => {
        setNewOperacion({ ...newOperacion, [field]: value });
    };

    const handleCreateSelectChange = (field, selectedOption) => {
        setNewOperacion({ ...newOperacion, [field]: selectedOption.value });
    };

    const handleDetailChange = (field, value) => {
        setOperacionDetails({ ...operacionDetails, [field]: value });
    };

    const handleDetailSelectChange = (field, selectedOption) => {
        setOperacionDetails({ ...operacionDetails, [field]: selectedOption.value });
    };

    // Estilos para selects
    const customStyles = {
        control: (provided) => ({
            ...provided,
            minHeight: '57px',
        }),
    };

    return (
        <div className="table-container">
            {/* Header con botones */}
            <div className="table-header flex items-center mb-4">
                <button
                    onClick={() => setShowForm(true)}
                    className="btn btn-primary">
                    <FontAwesomeIcon icon={faPlus} /> Crear Nueva Operación
                </button>
                <Spacer width={0.5} />
                {Object.values(selectedOperaciones).flat().length > 0 && (
                    <button
                        onClick={downloadCSV}
                        className="btn btn-secondary">
                        Descargar CSV ({Object.values(selectedOperaciones).flat().length})
                    </button>
                )}
            </div>

            {/* Controles de filtros y agrupación */}
            <div className="filter-controls-container">
                    <div className="control-group">
                        <label htmlFor="groupingFieldOperaciones" className="control-label">
                            Agrupar por:
                        </label>
                        <select
                            id="groupingFieldOperaciones"
                            value={groupBy || "none"}
                            onChange={handleGroupByChange}
                            className="control-select"
                        >
                            <option value="none">Sin Agrupación</option>
                            <option value="tipo_operacion">Tipo de Operación</option>
                            <option value="estado">Estado</option>
                            <option value="parcela">Parcela</option>
                            <option value="responsable">Responsable</option>
                        </select>
                    </div>
                    
                    <div className="control-group">
                        <label htmlFor="FilterFieldOperaciones" className="control-label">
                            Filtrar por:
                        </label>
                        <div className="filter-inputs">
                            <select
                                id="FilterFieldOperaciones"
                                value={filterField}
                                onChange={(e) => setFilterField(e.target.value)}
                                className="control-select filter-field"
                            >
                                <option value="id">ID</option>
                                <option value="tipo_operacion">Tipo de Operación</option>
                                <option value="parcela_name">Parcela</option>
                                <option value="estado">Estado</option>
                                <option value="responsable_name">Responsable</option>
                                <option value="inputs_count">Cantidad de Insumos</option>
                                <option value="jornales">Jornales</option>
                                <option value="personas">Personas</option>
                                <option value="porcentaje_avance">% Avance</option>
                            </select>
                            <input 
                                type="text"
                                id="FilterValueOperaciones"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                placeholder={`Buscar por ${filterField}...`}
                                className="control-input"
                            />
                        </div>
                    </div>
                </div>
            

            {/* Tabla de operaciones */}
            {Object.entries(groupedOperaciones).map(([group, operacionesGroup]) => (
                <div key={group} className="mb-6">
                    {groupBy && (
                        <h3 className="titulo-seccion text-lg font-semibold mb-3 p-2 bg-gray-100 rounded">
                            {`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${group}`}
                        </h3>
                    )}
                    
                    <div className="overflow-x-auto shadow-md rounded-lg">
                        <table className="table-auto w-full border-collapse bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="border border-gray-300 p-3">
                                        <input
                                            id='checkboxops' 
                                            type="checkbox" 
                                            checked={allSelected[group] || false} 
                                            onChange={(e) => handleSelectAll(e, group)} 
                                        />
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("tipo_operacion")}>
                                        Operación
                                        {sortConfig.key === "tipo_operacion" && (
                                            <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("parcela_name")}>
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                                        Parcela
                                        {sortConfig.key === "parcela_name" && (
                                            <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("estado")}>
                                        Estado
                                        {sortConfig.key === "estado" && (
                                            <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("fecha_inicio")}>
                                        <FontAwesomeIcon icon={faClock} className="mr-1" />
                                        Fecha Inicio
                                        {sortConfig.key === "fecha_inicio" && (
                                            <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("responsable_id")}>
                                        <FontAwesomeIcon icon={faUser} className="mr-1" />
                                        Responsable
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("jornales")}>
                                        Jornales
                                        {sortConfig.key === "jornales" && (
                                            <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </th>
                                    <th className="border border-gray-300 p-3 cursor-pointer hover:bg-gray-100" 
                                        onClick={() => handleSort("porcentaje_avance")}>
                                        % Avance
                                        {sortConfig.key === "porcentaje_avance" && (
                                            <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </th>
                                    <th className="border border-gray-300 p-3">Dettalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operacionesGroup.map((operacion) => {
                                    const responsable = usuarios.find(u => u.id === operacion.responsable_id);
                                    
                                    return (
                                        <tr key={operacion.id} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 p-3">
                                                <input
                                                    id={`checkbox-${group}-${operacion.id}`}
                                                    type="checkbox"
                                                    checked={selectedOperaciones[group]?.includes(operacion.id) || false}
                                                    onChange={(e) => handleSelectOperacion(e, operacion, group)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-3 font-medium">
                                                {operacion.tipo_operacion}
                                            </td>
                                            <td className="border border-gray-300 p-3">
                                                {operacion.parcela_name || "Desconocida"}
                                            </td>
                                            <td className="border border-gray-300 p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(operacion.estado)}`}>
                                                    {operacion.estado}
                                                </span>
                                            </td>
                                            <td className="border border-gray-300 p-3">
                                                {formatDate(operacion.fecha_inicio)}
                                            </td>
                                            <td className="border border-gray-300 p-3">
                                                {responsable ? `${responsable.nombre} ${responsable.apellido}` : '-'}
                                            </td>
                                            <td className="border border-gray-300 p-3 text-center">
                                                {operacion.jornales || '-'}
                                            </td>
                                            <td className="border border-gray-300 p-3 text-center">
                                                {operacion.porcentaje_avance ? `${operacion.porcentaje_avance}%` : '-'}
                                            </td>
                                            <td className="border border-gray-300 p-3 text-center">
                                                <button
                                                    onClick={() => handleViewOperacion(operacion)}
                                                    className="p-2 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                    title="Ver detalles"
                                                >
                                                    <FontAwesomeIcon icon={faSearch} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Mostrar mensaje si no hay operaciones */}
            {filteredSortedOperaciones.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    No se encontraron operaciones que coincidan con los filtros aplicados.
                </div>
            )}
        
            {/* Modal para crear Operación */}
            <Modal
                isOpen={showForm}
                onRequestClose={() => setShowForm(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Crear operación"
            >
                <div className="modal-wrapper">
                    <div className="modal-content max-w-4xl">
                        <h2 className="modal-title">Crear una Nueva Operación</h2>

                        <div className="modal-form-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Columna 1 */}
                            <div className="modal-column space-y-4">
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationSelect'>Operación:</label>
                                    <Select
                                        inputId='NewOperationSelect'
                                        options={options}
                                        onChange={(selectedOption) => handleCreateSelectChange('tipo_operacion', selectedOption)}
                                        value={options.find((option) => option.value === newOperacion.tipo_operacion)}
                                        placeholder="Selecciona una tarea"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationResponsable'>Responsable:</label>
                                    <Select
                                        inputId='NewOperationResponsable'
                                        options={responsableOptions}
                                        onChange={(selectedOption) => handleCreateSelectChange('responsable_id', selectedOption)}
                                        value={responsableOptions.find((option) => option.value === newOperacion.responsable_id)}
                                        placeholder="Selecciona un responsable"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationDateIni'>Fecha de inicio:</label>
                                    <input
                                        id='NewOperationDateIni' 
                                        type="date" 
                                        value={newOperacion.fecha_inicio} 
                                        onChange={(e) => handleCreateChange('fecha_inicio', e.target.value)} 
                                        className="modal-form-input w-full" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationDateFin'>Fecha de finalización:</label>
                                    <input
                                        id='NewOperationDateFin' 
                                        type="date" 
                                        value={newOperacion.fecha_fin} 
                                        onChange={(e) => handleCreateChange('fecha_fin', e.target.value)} 
                                        className="modal-form-input w-full" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationJornales'>Jornales:</label>
                                    <input
                                        id='NewOperationJornales' 
                                        type="number" 
                                        step="0.1"
                                        value={newOperacion.jornales} 
                                        onChange={(e) => handleCreateChange('jornales', e.target.value)} 
                                        className="modal-form-input w-full" 
                                        placeholder="0.0"
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationNota'>Nota:</label>
                                    <textarea
                                        id='NewOperationNota' 
                                        value={newOperacion.nota} 
                                        onChange={(e) => handleCreateChange('nota', e.target.value)} 
                                        className="modal-form-input w-full h-20 resize-none" 
                                        placeholder="Notas adicionales..."
                                    />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="modal-column space-y-4">
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationParcela'>Parcela:</label>
                                    <Select
                                        inputId='NewOperationParcela'
                                        options={parcelaOptions}
                                        onChange={(selectedOption) => handleCreateSelectChange('parcela_id', selectedOption)}
                                        value={parcelaOptions.find((option) => option.value === newOperacion.parcela_id)}
                                        placeholder="Selecciona una parcela"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationStatus'>Estado:</label>
                                    <select
                                        id='NewOperationStatus'
                                        value={newOperacion.estado}
                                        onChange={(e) => handleCreateChange('estado', e.target.value)}
                                        className="modal-form-input w-full"
                                    >
                                        <option value="planned">Planificada</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="completed">Completada</option>
                                        <option value="cancelled">Cancelada</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationPersonas'>Personas:</label>
                                    <input
                                        id='NewOperationPersonas' 
                                        type="number" 
                                        value={newOperacion.personas} 
                                        onChange={(e) => handleCreateChange('personas', e.target.value)} 
                                        className="modal-form-input w-full" 
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationAvance'>Porcentaje de Avance:</label>
                                    <input
                                        id='NewOperationAvance' 
                                        type="number" 
                                        value={newOperacion.porcentaje_avance} 
                                        onChange={(e) => handleCreateChange('porcentaje_avance', e.target.value)} 
                                        className="modal-form-input w-full" 
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                
                                <div>
                                    <label className="modal-form-label" htmlFor='NewOperationComentario'>Comentario:</label>
                                    <textarea
                                        id='NewOperationComentario' 
                                        value={newOperacion.comentario} 
                                        onChange={(e) => handleCreateChange('comentario', e.target.value)} 
                                        className="modal-form-input w-full h-20 resize-none" 
                                        placeholder="Comentarios adicionales..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección de Insumos */}
                        <div className="mt-6 border-t pt-6">
                            <h3 className="text-lg font-medium mb-4">Insumos Consumidos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="modal-form-label" htmlFor="NewOperationInsumoConsumido">Seleccionar Insumos:</label>
                                    <select
                                        id='NewOperationInsumoConsumido'
                                        multiple 
                                        value={newOperacion.inputs.map(insumo => insumo.insumo_id)} 
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions);
                                            const insumoIdsSeleccionados = selectedOptions.map(option => parseInt(option.value));

                                            const insumosSeleccionados = insumoIdsSeleccionados.map(id => {
                                                const insumoExistente = newOperacion.inputs.find(insumo => insumo.insumo_id === id);
                                                return insumoExistente ? insumoExistente : { insumo_id: id, cantidad: 0 };
                                            });

                                            handleCreateChange('inputs', insumosSeleccionados);
                                        }} 
                                        className="modal-form-input w-full h-32"
                                    >
                                        {insumos.map(insumo => (
                                            <option key={insumo.id} value={insumo.id}>{insumo.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="space-y-3">
                                    {newOperacion.inputs.map((insumo) => (
                                        <div key={insumo.insumo_id}>
                                            <label className="modal-form-label text-sm" htmlFor={`cantidad-${insumo.insumo_id}`}>
                                                Cantidad {insumos.find(i => i.id === insumo.insumo_id)?.name || 'Insumo'}:
                                            </label>
                                            <input 
                                                id={`cantidad-${insumo.insumo_id}`}
                                                type="number" 
                                                value={insumo.cantidad} 
                                                onChange={(e) => {
                                                    const updatedInsumos = [...newOperacion.inputs];
                                                    const index = updatedInsumos.findIndex(i => i.insumo_id === insumo.insumo_id);
                                                    if (index !== -1) {
                                                        updatedInsumos[index].cantidad = parseInt(e.target.value) || 0;
                                                        handleCreateChange('inputs', updatedInsumos);
                                                    }
                                                }} 
                                                className="modal-form-input w-full" 
                                                min="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-buttons mt-6 flex justify-end space-x-3">
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
                            <button onClick={handleCreateOperacion} className="btn btn-primary">Crear Operación</button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal para ver/editar Operación */}
            <Modal
                isOpen={showOperacionModal}
                onRequestClose={() => { 
                    setShowOperacionModal(false); 
                    setOperacionDetails(null); 
                    setIsEditingDetails(false); 
                }}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Detalles de la operación"
            >
                <div className="modal-wrapper">
                    <div className="modal-content max-w-4xl">
                        <h2 className="modal-title">
                            {isEditingDetails ? "Editar Operación" : "Detalles de la Operación"}
                        </h2>
                        
                        {operacionDetails && (
                            <div className="modal-form-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Columna 1 */}
                                <div className="modal-column space-y-4">
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditOperacion'>Operación:</label>
                                        {isEditingDetails ? (
                                            <Select
                                                inputId='OperacionEditOperacion'
                                                options={options}
                                                onChange={(selectedOption) => handleDetailSelectChange('tipo_operacion', selectedOption)}
                                                value={options.find((option) => option.value === operacionDetails.tipo_operacion)}
                                                placeholder="Selecciona una tarea"
                                                isSearchable
                                                styles={customStyles}
                                            />
                                        ) : (
                                            <div className="text-gray-900 font-medium">
                                                {options.find((option) => option.value === operacionDetails.tipo_operacion)?.label || "No Seleccionado"}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditResponsable'>Responsable:</label>
                                        {isEditingDetails ? (
                                            <Select
                                                inputId='OperacionEditResponsable'
                                                options={responsableOptions}
                                                onChange={(selectedOption) => handleDetailSelectChange('responsable_id', selectedOption)}
                                                value={responsableOptions.find((option) => option.value === operacionDetails.responsable_id)}
                                                placeholder="Selecciona un responsable"
                                                isSearchable
                                                styles={customStyles}
                                            />
                                        ) : (
                                            <div className="text-gray-900">
                                                {(() => {
                                                    const responsable = usuarios.find((usuario) => usuario.id === operacionDetails.responsable_id);
                                                    return responsable ? `${responsable.nombre} ${responsable.apellido}` : "No Asignado";
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditParcela'>Parcela:</label>
                                        {isEditingDetails ? (
                                            <Select
                                                inputId='OperacionEditParcela'
                                                options={parcelaOptions}
                                                onChange={(selectedOption) => handleDetailSelectChange('parcela_id', selectedOption)}
                                                value={parcelaOptions.find((option) => option.value === operacionDetails.parcela_id)}
                                                placeholder="Selecciona una parcela"
                                                isSearchable
                                                styles={customStyles}
                                            />
                                        ) : (
                                            <div className="text-gray-900">
                                                {operacionDetails.parcela_name || "No Seleccionada"}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditEstado'>Estado:</label>
                                        {isEditingDetails ? (
                                            <select
                                                id='OperacionEditEstado'
                                                value={operacionDetails.estado}
                                                onChange={(e) => handleDetailChange('estado', e.target.value)}
                                                className="modal-form-input w-full"
                                            >
                                                <option value="planned">Planificada</option>
                                                <option value="in_progress">En Progreso</option>
                                                <option value="completed">Completada</option>
                                                <option value="cancelled">Cancelada</option>
                                            </select>
                                        ) : (
                                            <div className="text-gray-900">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(operacionDetails.estado)}`}>
                                                    {operacionDetails.estado}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditJornales'>Jornales:</label>
                                        {isEditingDetails ? (
                                            <input
                                                id='OperacionEditJornales'
                                                type="number"
                                                step="0.1"
                                                value={operacionDetails.jornales || ''}
                                                onChange={(e) => handleDetailChange('jornales', e.target.value)}
                                                className="modal-form-input w-full"
                                            />
                                        ) : (
                                            <div className="text-gray-900">{operacionDetails.jornales || '-'}</div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditPersonas'>Personas:</label>
                                        {isEditingDetails ? (
                                            <input
                                                id='OperacionEditPersonas'
                                                type="number"
                                                value={operacionDetails.personas || ''}
                                                onChange={(e) => handleDetailChange('personas', e.target.value)}
                                                className="modal-form-input w-full"
                                            />
                                        ) : (
                                            <div className="text-gray-900">{operacionDetails.personas || '-'}</div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditNota'>Nota:</label>
                                        {isEditingDetails ? (
                                            <textarea
                                                id='OperacionEditNota'
                                                value={operacionDetails.nota || ''}
                                                onChange={(e) => handleDetailChange('nota', e.target.value)}
                                                className="modal-form-input w-full h-20 resize-none"
                                            />
                                        ) : (
                                            <div className="text-gray-900 whitespace-pre-wrap">{operacionDetails.nota || '-'}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Columna 2 */}
                                <div className="modal-column space-y-4">
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditDateIni'>Fecha de inicio:</label>
                                        {isEditingDetails ? (
                                            <input
                                                id='OperacionEditDateIni'
                                                type="date"
                                                value={operacionDetails.fecha_inicio || ''}
                                                onChange={(e) => handleDetailChange('fecha_inicio', e.target.value)}
                                                className="modal-form-input w-full"
                                            />
                                        ) : (
                                            <div className="text-gray-900">{formatDate(operacionDetails.fecha_inicio)}</div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditDateFin'>Fecha de finalización:</label>
                                        {isEditingDetails ? (
                                            <input
                                                id='OperacionEditDateFin'
                                                type="date"
                                                value={operacionDetails.fecha_fin || ''}
                                                onChange={(e) => handleDetailChange('fecha_fin', e.target.value)}
                                                className="modal-form-input w-full"
                                            />
                                        ) : (
                                            <div className="text-gray-900">{formatDate(operacionDetails.fecha_fin)}</div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <span className="modal-form-label">Fecha de Creación:</span>
                                        <div className="text-gray-900">{formatDate(operacionDetails.creation_date)}</div>
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditAvance'>Porcentaje de Avance:</label>
                                        {isEditingDetails ? (
                                            <input
                                                id='OperacionEditAvance'
                                                type="number"
                                                value={operacionDetails.porcentaje_avance || ''}
                                                onChange={(e) => handleDetailChange('porcentaje_avance', e.target.value)}
                                                className="modal-form-input w-full"
                                                min="0"
                                                max="100"
                                            />
                                        ) : (
                                            <div className="text-gray-900">
                                                {operacionDetails.porcentaje_avance ? `${operacionDetails.porcentaje_avance}%` : '-'}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditComent'>Comentario:</label>
                                        {isEditingDetails ? (
                                            <textarea
                                                id='OperacionEditComent'
                                                value={operacionDetails.comentario || ''}
                                                onChange={(e) => handleDetailChange('comentario', e.target.value)}
                                                className="modal-form-input w-full h-20 resize-none"
                                            />
                                        ) : (
                                            <div className="text-gray-900 whitespace-pre-wrap">{operacionDetails.comentario || '-'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sección de Insumos */}
                        <div className="mt-6 border-t pt-6">
                            <h3 className="text-lg font-medium mb-4">Insumos Consumidos</h3>
                            {operacionDetails && isEditingDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="modal-form-label" htmlFor='OperacionEditInsumosConsumidos'>Seleccionar Insumos:</label>
                                        <select
                                            id='OperacionEditInsumosConsumidos'
                                            multiple
                                            value={operacionDetails && operacionDetails.inputs ? operacionDetails.inputs.map(insumo => insumo.input_id) : []}
                                            onChange={(e) => {
                                                if (!operacionDetails) return;
                                                
                                                const selectedOptions = Array.from(e.target.selectedOptions);
                                                const insumoIdsSeleccionados = selectedOptions.map(option => parseInt(option.value));
                                                const nuevosInsumos = insumoIdsSeleccionados.map(id => {
                                                    const insumoExistente = operacionDetails.inputs && Array.isArray(operacionDetails.inputs) ? 
                                                        operacionDetails.inputs.find(insumo => insumo.input_id === id) : null;
                                                    return insumoExistente ? 
                                                        { ...insumoExistente, input_id: id } : 
                                                        { input_id: id, used_quantity: 0 };
                                                });
                                                handleDetailChange('inputs', nuevosInsumos);
                                            }}
                                            className="modal-form-input w-full h-32"
                                        >
                                            {insumos.map(insumo => (
                                                <option key={insumo.id} value={insumo.id}>{insumo.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {operacionDetails && operacionDetails.inputs && Array.isArray(operacionDetails.inputs) ? (
                                            operacionDetails.inputs.map((insumo) => (
                                                <div key={insumo.input_id}>
                                                    <label className="modal-form-label text-sm" htmlFor={`edit-cantidad-${insumo.input_id}`}>
                                                        Cantidad {insumos.find(i => i.id === insumo.input_id)?.name || 'Insumo'}:
                                                    </label>
                                                    <input
                                                        id={`edit-cantidad-${insumo.input_id}`}
                                                        type="number"
                                                        value={insumo.used_quantity || 0}
                                                        onChange={(e) => {
                                                            if (!operacionDetails || !operacionDetails.inputs || !Array.isArray(operacionDetails.inputs)) return;
                                                            
                                                            const updatedInsumos = [...operacionDetails.inputs];
                                                            const index = updatedInsumos.findIndex(i => i.input_id === insumo.input_id);
                                                            if (index !== -1) {
                                                                updatedInsumos[index].used_quantity = parseInt(e.target.value) || 0;
                                                                handleDetailChange('inputs', updatedInsumos);
                                                            }
                                                        }}
                                                        className="modal-form-input w-full"
                                                        min="0"
                                                    />
                                                </div>
                                            ))
                                        ) : null}
                                    </div>
                                </div>
                            ) : operacionDetails ? (
                                <div>
                                    {operacionDetails.inputs && Array.isArray(operacionDetails.inputs) && operacionDetails.inputs.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {operacionDetails.inputs.map(insumo => {
                                                const insumoEncontrado = insumos.find(i => i.id === insumo.input_id);
                                                return (
                                                    <div key={insumo.input_id} className="bg-gray-50 p-3 rounded-lg">
                                                        <div className="font-medium text-gray-900">
                                                            {insumoEncontrado ? insumoEncontrado.name : "Insumo no encontrado"}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            Cantidad: {insumo.used_quantity || 0}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 italic">
                                            No hay insumos consumidos para esta operación.
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        
                        <div className="modal-buttons mt-6 flex justify-end space-x-3">
                            {isEditingDetails ? (
                                <>
                                    <button 
                                        onClick={() => setIsEditingDetails(false)} 
                                        className="btn btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSaveDetails} 
                                        className="btn btn-primary"
                                    >
                                        Guardar Cambios
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => handleDeleteOperaciones(operacionDetails.id)} 
                                        className="btn btn-danger"
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="mr-2" />
                                        Eliminar Operación
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingDetails(true)} 
                                        className="btn btn-primary"
                                    >
                                        <FontAwesomeIcon icon={faEdit} className="mr-2" />
                                        Editar Operación
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onRequestClose={() => setShowSuccessModal(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Éxito"
            >
                <div className="modal-wrapper">
                    <div className="modal-content max-w-md">
                        <h2 className="modal-title text-green-600">
                            <FontAwesomeIcon icon={faSearch} className="mr-2" />   Éxito
                        </h2>
                        <div className="modal-message py-4">
                            <p className="text-gray-700">{successMessage}</p>
                        </div>
                        <div className="modal-buttons flex justify-end">
                            <button 
                                onClick={() => setShowSuccessModal(false)} 
                                className="btn btn-primary"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Error Modal */}
            <Modal
                isOpen={showErrorModal}
                onRequestClose={() => setShowErrorModal(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Error"
            >
                <div className="modal-wrapper">
                    <div className="modal-content max-w-md">
                        <h2 className="modal-title text-red-600">
                            <FontAwesomeIcon icon={faTrash} className="mr-2" />   Error
                        </h2>
                        <div className="modal-message py-4">
                            <p className="text-gray-700">{errorMessage}</p>
                        </div>
                        <div className="modal-buttons flex justify-end">
                            <button 
                                onClick={() => setShowErrorModal(false)} 
                                className="btn btn-primary"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>    
        </div>
       
    );
}

export default TableOperaciones;