import React, { useState, useEffect } from 'react';
import { getOperacionesVineyard, createOperacion,updateOperacion, deleteOperacion, getPlots, getInputs, getUsers, getVineyardTasks, updateOperacionInputs } from "../services/api";
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Papa from 'papaparse';

function TableOperaciones() {
    const [operaciones, setOperaciones] = useState([]);
    const [selectedOperaciones, setSelectedOperaciones] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newOperacion, setNewOperacion] = useState({  // Estado para los datos de la nueva operación
        id: '',
        parcela_id: '',
        tipo_operacion: '',
        fecha_inicio: '',
        fecha_fin: '',
        estado: '',
        responsable_id: '',
        nota: '',
        comentario: '',
        inputs: []
        });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
    const [filterField, setFilterField] = useState("tipo_operacion");
    const [filterValue, setFilterValue] = useState("");
    const [operacionDetails, setOperacionDetails] = useState(null);
    const [showOperacionModal, setShowOperacionModal] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false); // Nuevo estado para controlar la edición
    const [groupBy, setGroupBy] = useState(null); // Definición del estado groupBy
    const [allSelected, setAllSelected] = useState(false); // Nuevo estado para el checkbox del encabezado
    const [insumos, setInsumos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [tasks, setVineyardsTasks] = useState([]);
    const [plotsData, setPlotsData] = useState([]);
    
    const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [operacionesData, plotsResponse, insumosData, usuariosData, taskData] = await Promise.all([
                    getOperacionesVineyard(),
                    getPlots(),
                    getInputs(),
                    getUsers(),
                    getVineyardTasks(),
                ]);

                const operacionesEnriquecidas = operacionesData.map(operacion => {
                    const plot = plotsResponse.find(p => p.plot_id === operacion.parcela_id);
                    return { ...operacion, parcela: plot || null };
                });

                setOperaciones(operacionesEnriquecidas);
                setPlotsData(plotsResponse); // Guarda todos los plots en el estado
                setInsumos(insumosData);
                setUsuarios(usuariosData);
                setVineyardsTasks(taskData);
            } catch (error) {
                console.error("Error al cargar datos:", error);
            }
        };

        cargarDatos();
    }, []);

    const parcelaOptions = plotsData.map(parcela => ({ // Utiliza plotsData aquí
        value: parcela.plot_id,
        label: parcela.plot_name
    }));

    const handleGroupByChange = (e) => {
        setGroupBy(e.target.value === "none" ? null : e.target.value);
    };

    const groupOperaciones = (data, groupBy) => {
        return data.reduce((acc, operacion) => {
            const key = groupBy === 'parcela' ? operacion.parcela?.plot_name : operacion[groupBy];
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(operacion);
            return acc;
        }, {});
    };
    
    const sortedOperaciones = [...operaciones].sort((a, b) => { // Ordena *antes* de agrupar
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    const filteredSortedOperaciones = sortedOperaciones.filter((p) => {
        if (!filterValue) return true;
        const value = String(p[filterField] || "").toLowerCase();
        return value.includes(filterValue.toLowerCase());
    });
    
    const groupedOperaciones = groupBy ? groupOperaciones(filteredSortedOperaciones, groupBy) : { "Todas las operaciones": filteredSortedOperaciones };   

    const handleSort = (key) => {
        setSortConfig((prev) => ({
          key: key,
          direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const handleSelectAll = (e, group) => {
        setAllSelected({ ...allSelected, [group]: e.target.checked }); // Actualizar el estado de allSelected para el grupo

        const updatedSelections = { ...selectedOperaciones };
        if (e.target.checked) {
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

        const allGroupSelected = groupedOperaciones[group].every((a) => selectedOperaciones[group]?.includes(a.id));
        setAllSelected({ ...allSelected, [group]: allGroupSelected });
    };

    const handleViewOperacion = (operacion) => {
        try {
            setShowOperacionModal(true);
            setIsEditingDetails(false);
            setOperacionDetails(operacion);
            } catch (error) {
                console.error("Error al procesar la operacion:", error);
                alert("Error al visualizar la operacion.");
            }
    };

    const handleEditDetails = () => {  // Definición de la función
        setIsEditingDetails(true);
    };

    const handleSaveDetails = async () => {
        try {
           
            if (!operacionDetails.id) {
                throw new Error("No se puede guardar: ID de operacion no encontrado.");
            }

            // Preparar los datos para actualizar los detalles básicos de la operación
            const datosOperacion = {
                tipo_operacion: operacionDetails.tipo_operacion,
                fecha_inicio: operacionDetails.fecha_inicio,
                fecha_fin: operacionDetails.fecha_fin,
                estado: operacionDetails.estado,
                responsable_id: operacionDetails.responsable_id,
                nota: operacionDetails.nota,
                comentario: operacionDetails.comentario,
                parcela_id: parseInt(operacionDetails.parcela_id),
            };

            // Actualizar los detalles básicos de la operación
            const updatedOperacion = await updateOperacion(operacionDetails.id, datosOperacion);

            // ✅ CORRECCIÓN: Verificar que inputs exista y sea un array antes de procesarlo
            const inputsArray = operacionDetails.inputs || [];
            
            if (inputsArray.length > 0) {
                // Preparar los datos para actualizar los insumos
                const inputsParaEnviar = inputsArray.map(insumo => ({
                    input_id: insumo.input_id,
                    used_quantity: parseInt(insumo.used_quantity) || 0, // Manejar valores undefined/null
                }));

                // ✅ CORRECCIÓN: Enviar en el formato correcto que espera el backend
                await updateOperacionInputs(operacionDetails.id, { inputs: inputsParaEnviar });
            } else {
                // Enviar array vacío para limpiar los inputs si es necesario
                await updateOperacionInputs(operacionDetails.id, { inputs: [] });
            }

            // Actualizar la lista de operaciones
            setOperaciones(operaciones.map((p) => 
                p.id === updatedOperacion.id 
                    ? { ...updatedOperacion, inputs: inputsArray } 
                    : p
            ));

            setIsEditingDetails(false);
            setShowOperacionModal(false);
            setOperacionDetails(null);

            setSuccessMessage("Los detalles de la Operacion han sido actualizados.");
            setShowSuccessModal(true);

        } catch (error) {
            console.error("Error al guardar los detalles:", error);
            
            let errorMessage = "Error al guardar los detalles";
            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = "Operación no encontrada (404)";
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
        alert("No se ha proporcionado un ID de Operacion para eliminar.");
        return;
    }

    if (window.confirm("¿Estás seguro de que deseas eliminar esta Operacion?")) {
        try {
            await deleteOperacion(idOperacion); // Elimina la Operacion específica

            const data = await getOperacionesVineyard();
            setOperaciones(data);

            setShowOperacionModal(false); // Cierra el modal después de eliminar
            setOperacionDetails(null); // Limpia los detalles de la Operacion

            setSuccessMessage("La Operacion fue eliminada correctamente.");
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error al eliminar la Operacion:", error);
            setErrorMessage("Hubo un error al eliminar la Operacion.");
            setShowErrorModal(true);
        }
    }
    };

    const downloadCSV = () => {
        const selectedData = [];
    
        // Iterar sobre los grupos en selectedOperaciones
        for (const group in selectedOperaciones) {
            const selectedIdsInGroup = selectedOperaciones[group];
            if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
                const filteredOperaciones = operaciones.filter(operacion => selectedIdsInGroup.includes(operacion.id));
                selectedData.push(...filteredOperaciones);
            }
        }
    
        if (selectedData.length === 0) {
            alert("No hay operaciones seleccionadas para descargar.");
            return;
        }
    
        const csv = Papa.unparse(selectedData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'operaciones_bodega.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }; 

    const handleCreateOperacion = async () => {
        try {
            const inputsBackend = newOperacion.inputs.map(insumo => ({
                input_id: insumo.insumo_id, // Cambiado a input_id
                used_quantity: insumo.cantidad, // Cambiado a used_quantity
                warehouse_id: 7, // Asegúrate de tener el warehouse_id correcto o un valor predeterminado
                status: "used", // O "planned", según corresponda
                operation_id: null
            }));
            const operacionToCreate = { 
                ...newOperacion, 
                parcela_id: parseInt(newOperacion.parcela_id), // Asegurar que es un entero 
                inputs: inputsBackend,
            };
            const response = await createOperacion(operacionToCreate);
            setOperaciones([...operaciones, response]);
            setNewOperacion({
                id: '',
                parcela_id: '',
                tipo_operacion: '',
                fecha_inicio: '',
                fecha_fin: '',
                estado: '',
                responsable_id: '',
                nota: '',
                comentario: '',
                inputs: []
                });
            setShowForm(false);
            setSuccessMessage("Su operacion ha sido creada correctamente.");
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error al crear la operacion:", error);
            if (error.response && error.response.data) {
                console.log("Detalles de la respuesta del backend:", error.response.data); // Loguea toda la respuesta
                if (error.response.data.detail) {
                    console.error("Detalles del error del backend:", error.response.data.detail); // Loguea solo el detalle
                }
            }
            alert("Error al crear la operacion: " + error.message);
        }
        };
    

    const options = tasks.map((task) => ({
        value: task.task_name,
        label: task.task_name,
    }));

    const responsableOptions = usuarios.map(usuario => ({
        value: usuario.id,
        label: `${usuario.nombre} ${usuario.apellido}`
      }));

       
    const customStyles = {
            control: (provided) => ({
              ...provided,
              minHeight: '57px', // Ajusta la altura aquí
            }),
        };

    const handleChange = (selectedOption) => {
        setNewOperacion({ ...newOperacion, tipo_operacion: selectedOption.value });
    };
    
    return (
        <div className="container mx-auto p-4">
            <div className="table-header">
                <button onClick={() => setShowForm(true)} className="btn btn-primary">Crear Nueva Operacion</button>
                <Spacer width={0.5} />
                {Object.values(selectedOperaciones).flat().length > 0 && (
                <button onClick={downloadCSV} className="btn btn-secondary">
                    Descargar CSV</button>
                )}
            </div>
            <div className="flex gap-2 mb-4">
                <label htmlFor="groupingField" className="mr-2">Agrupar por:</label>
                <Spacer width={0.2} />
                <select
                    id="groupingField"
                    value={groupBy || "none"}
                    onChange={handleGroupByChange}
                    className="border p-2 rounded"
                >
                    <option value="none">Sin Agrupación</option>
                    <option value="tipo_operacion">Tipo de Operación</option>
                    <option value="estado">Estado</option>
                    <option value="parcela">Parcela</option> {/* Nueva opción */}
                    {/* ... otras opciones de agrupación */}
                </select>
                <Spacer width={2} />
                {/*Filtros de operaciones*/}
                <select
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    className="border p-2 rounded">
                    <option value="id">ID</option>
                    <option value="parcela_id">Parcela</option>
                    <option value="estado">Estado</option>
                    <option value="responsable_id">Responsable</option>
                </select>
                <Spacer width={0.2} />
                <input type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={`Buscar por ${filterField}...`}
                    className="border p-2 rounded w-64"
                />               
            </div>         
            {/* Tabla*/}
            {Object.entries(groupedOperaciones).map(([group, operaciones]) => (
                <div key={group} className="mb-4">
                    {groupBy && <h3 className="titulo-seccion">{`${groupBy.charAt(0).toUpperCase() + groupBy.slice(1).replace("_", " ")}: ${group}`}</h3>} {/* Mostrar título solo si hay agrupación */}
                    <table className="table-auto w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                            <th className="border border-gray-300 p-2">
                            <input type="checkbox" checked={allSelected[group] || false} onChange={(e) => handleSelectAll(e, group)} />
                                </th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={()=>handleSort("id")}>ID</th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={()=>handleSort("tipo_operacion")}>Operacion</th>
                                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => handleSort("parcela")}>Parcela</th>
                            </tr>
                        </thead>
                        <tbody>
                            {operaciones.map((operacion) => (
                                <tr key={operacion.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedOperaciones[group]?.includes(operacion.id) || false}
                                            onChange={(e) => handleSelectOperacion(e, operacion, group)}
                                            />
                                    </td>
                                    <td>{operacion.id}</td>
                                    <td>{operacion.tipo_operacion}</td>
                                    <td>{operacion.parcela?.plot_name || "Desconocida"}</td>
                                    <td className="border border-gray-300 p-2 text-center"> {/* Celda de acciones */}
                                        <button
                                        onClick={() => handleViewOperacion(operacion)}
                                        className="p-2 rounded text-blue-500 hover:text-blue-700"
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
            {/* Modal para crear Operacion */}
            <Modal
                isOpen={showForm}
                onRequestClose={() => setShowForm(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Crear operacion"
            >
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title">Crear una Nueva operacion</h2>

                        <div className="modal-form-grid"> {/* Contenedor para las columnas */}
                            <div className="modal-column"> {/* Columna 1 */}
                                <div className="mb-4">
                                    <label className="modal-form-label">Operacion:</label>
                                    <Select
                                        options={options}
                                        onChange={handleChange}
                                        value={options.find((option) => option.value === newOperacion.tipo_operacion)}
                                        placeholder="Selecciona una tarea"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Responsable:</label>
                                    <Select
                                        options={responsableOptions}
                                        onChange={(selectedOption) => setNewOperacion({ ...newOperacion, responsable_id: selectedOption.value })}
                                        value={responsableOptions.find((option) => option.value === newOperacion.responsable_id)}
                                        placeholder="Selecciona un responsable"
                                        isSearchable
                                        styles={customStyles}
                                        />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="modal-form-label">Fecha de inicio:</label>
                                    <input type="date" value={newOperacion.fecha_inicio} onChange={(e) => setNewOperacion({ ...newOperacion, fecha_inicio: e.target.value })} className="modal-form-input" />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Nota:</label>
                                    <input type="text" value={newOperacion.nota} onChange={(e) => setNewOperacion({ ...newOperacion, nota: e.target.value })} className="modal-form-input" />
                                </div>
                            </div>
                            <div className="modal-column"> {/* Columna 2 */}
                                <div className="mb-4">
                                <label className="modal-form-label">Parcela:</label>
                                    <Select
                                        options={parcelaOptions}
                                        onChange={(selectedOption) => setNewOperacion({ ...newOperacion, parcela_id: selectedOption.value })}
                                        value={parcelaOptions.find((option) => option.value === newOperacion.parcela_id)}
                                        placeholder="Selecciona una parcela"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Estado:</label>
                                    <input type="text" value={newOperacion.estado} onChange={(e) => setNewOperacion({ ...newOperacion, estado: e.target.value })} className="modal-form-input" />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Fecha de finalizacion:</label>
                                    <input type="date" value={newOperacion.fecha_fin} onChange={(e) => setNewOperacion({ ...newOperacion, fecha_fin: e.target.value })} className="modal-form-input" />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Comentario:</label>
                                    <input type="text" value={newOperacion.comentario} onChange={(e) => setNewOperacion({ ...newOperacion, comentario: e.target.value })} className="modal-form-input" />
                                </div>
                            </div>
                        </div>
                            <div className="mb-4 insumos-grid">
                                <div className="insumos-column">
                                    <label className="modal-form-label">Insumos Consumidos:</label>
                                    <select multiple value={newOperacion.inputs.map(insumo => insumo.insumo_id)} onChange={(e) => {
                                        const selectedOptions = Array.from(e.target.selectedOptions);
                                        const insumoIdsSeleccionados = selectedOptions.map(option => parseInt(option.value));

                                        const insumosSeleccionados = insumoIdsSeleccionados.map(id => {
                                            const insumoExistente = newOperacion.inputs.find(insumo => insumo.insumo_id === id);
                                            return insumoExistente ? insumoExistente : { insumo_id: id, cantidad: 0 };
                                        });

                                        setNewOperacion({ ...newOperacion, inputs: insumosSeleccionados });
                                    }} className="modal-form-input">
                                        {insumos.map(insumo => (
                                            <option key={insumo.id} value={insumo.id}>{insumo.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="insumos-column">
                                    {newOperacion.inputs.map((insumo) => (
                                        <div key={insumo.insumo_id}>
                                            <label className="modal-form-label">Cantidad Insumo {insumo.name}:</label>
                                            <input type="number" value={insumo.cantidad} onChange={(e) => {
                                                const updatedInsumos = [...newOperacion.inputs];
                                                const index = updatedInsumos.findIndex(i => i.insumo_id === insumo.insumo_id);
                                                updatedInsumos[index].cantidad = parseInt(e.target.value);
                                                setNewOperacion({ ...newOperacion, inputs: updatedInsumos });
                                            }} className="modal-form-input" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        
                        <div className="modal-buttons mt-4">
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
                            <button onClick={handleCreateOperacion} className="btn btn-primary">Crear</button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onRequestClose={() => setShowSuccessModal(false)}
                className="modal-content" // Clase para el contenido del modal
                overlayClassName="modal-overlay" // Clase para el fondo oscuro
                contentLabel="Éxito"
            >
            <div className="modal-overlay"> {/* Fondo oscuro */}
            <div className="modal-wrapper"> {/* Contenedor del modal */}
            <div className="modal-content">
                <h2 className="modal-title">Éxito</h2> {/* Título del modal */}
                <div className="modal-message"> {/* Contenedor para el mensaje */}
                <p>{successMessage}</p>
                </div>
                <div className="modal-buttons"> {/* Contenedor para los botones */}
                <button onClick={() => setShowSuccessModal(false)} className="btn btn-primary">OK</button>
                </div>
            </div></div></div>
            </Modal>

            {/* Error Modal */}
            <Modal
                isOpen={showErrorModal}
                onRequestClose={() => setShowErrorModal(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
                contentLabel="Error"
            >
                <div className="modal-overlay"> {/* Fondo oscuro */}
                <div className="modal-wrapper"> {/* Contenedor del modal */}
                <div className="modal-content">
                <h2 className="modal-title">Error</h2>
                <div className="modal-message">
                    <p>{errorMessage}</p>
                </div>
                <div className="modal-buttons">
                    <button onClick={() => setShowErrorModal(false)} className="btn btn-primary">Reintentar más tarde</button>
                </div>
                </div></div></div>
            </Modal>

            {/* Modal para ver la operacion */}
            <Modal
                isOpen={showOperacionModal}
                onRequestClose={() => { setShowOperacionModal(false); setOperacionDetails(null); setIsEditingDetails(false); }}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-wrapper">
                    <div className="modal-content">
                        <h2 className="modal-title">Su operacion</h2>
                        {operacionDetails && (
                            <div className="modal-form-grid">
                                <div className="modal-column">
                                    <div className="mb-4">
                                        <label className="modal-form-label">Operacion:</label>
                                        {isEditingDetails ? (
                                            <Select
                                                options={options}
                                                onChange={handleChange}
                                                value={options.find((option) => option.value === operacionDetails.tipo_operacion)}
                                                placeholder="Selecciona una tarea"
                                                isSearchable
                                                styles={customStyles}
                                            />
                                        ) : (
                                            <span>{options.find((option) => option.value === operacionDetails.tipo_operacion)?.label || "No Seleccionado"}</span>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Responsable:</label>
                                        {isEditingDetails ? (
                                            <Select
                                                options={responsableOptions}
                                                onChange={handleChange}
                                                value={responsableOptions.find((option) => option.value === operacionDetails.responsable_id)}
                                                placeholder="Selecciona un responsable"
                                                isSearchable
                                                styles={customStyles}
                                            />
                                        ) : (
                                            <span>{usuarios.find((usuario) => usuario.id === operacionDetails.responsable_id)?.nombre + " " + usuarios.find((usuario) => usuario.id === operacionDetails.responsable_id)?.apellido || "No Seleccionado"}</span>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Fecha de inicio:</label>
                                        {isEditingDetails ? (
                                            <input
                                                type="date"
                                                value={operacionDetails.fecha_inicio}
                                                onChange={(e) => setOperacionDetails({ ...operacionDetails, fecha_inicio: e.target.value })}
                                                className="modal-form-input"
                                            />
                                        ) : (
                                            <span>{operacionDetails.fecha_inicio}</span>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Nota:</label>
                                        {isEditingDetails ? (
                                            <input
                                                type="text"
                                                value={operacionDetails.nota}
                                                onChange={(e) => setOperacionDetails({ ...operacionDetails, nota: e.target.value })}
                                                className="modal-form-input"
                                            />
                                        ) : (
                                            <span>{operacionDetails.nota}</span>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Insumos Consumidos:</label>
                                        {isEditingDetails ? (
                                            <select
                                                multiple
                                                value={operacionDetails.inputs ? operacionDetails.inputs.map(insumo => insumo.input_id) : []}
                                                onChange={(e) => {
                                                    const selectedOptions = Array.from(e.target.selectedOptions);
                                                    const insumoIdsSeleccionados = selectedOptions.map(option => parseInt(option.value));

                                                    const nuevosInsumos = insumoIdsSeleccionados.map(id => {
                                                        const insumoExistente = operacionDetails.inputs ? operacionDetails.inputs.find(insumo => insumo.input_id === id) : null;
                                                        return insumoExistente ? { ...insumoExistente, input_id: id } : { input_id: id, used_quantity: 0 };
                                                    });
                                                    setOperacionDetails({ ...operacionDetails, inputs: nuevosInsumos });
                                                }}
                                                className="modal-form-input"
                                            >
                                                {insumos.map(insumo => (
                                                    <option key={insumo.id} value={insumo.id}>{insumo.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            operacionDetails.inputs && Array.isArray(operacionDetails.inputs) && operacionDetails.inputs.length > 0 ? (
                                                <div className="modal-form-grid"> {/* Usamos la clase de grid */}
                                                    {operacionDetails.inputs.map(insumo => {
                                                        const insumoEncontrado = insumos.find(i => i.id === insumo.input_id);
                                                        return (
                                                            <React.Fragment key={insumo.input_id}> {/* Usamos Fragment para evitar divs extra */}
                                                                <span>{insumoEncontrado ? insumoEncontrado.name : "Insumo no encontrado"}</span>
                                                                <span>Cantidad: {insumo.used_quantity}</span>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span>No hay insumos consumidos para esta operación.</span>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div className="modal-column">
                                    <div className="mb-4">
                                        <label className="modal-form-label">Parcela:</label>
                                        {isEditingDetails ? (
                                            <Select
                                            options={parcelaOptions}
                                            onChange={handleChange}
                                            value={parcelaOptions.find((option) => option.value === operacionDetails.parcela_id)}
                                            placeholder="Selecciona una parcela"
                                            isSearchable
                                            styles={customStyles}
                                        />
                                        ) : (
                                        <span>{plotsData.find((parcela) => parcela.plot_id === operacionDetails.parcela_id)?.plot_name || "No Seleccionado"}</span>                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Estado:</label>
                                        {isEditingDetails ? (
                                            <input
                                                type="text"
                                                value={operacionDetails.estado}
                                                onChange={(e) => setOperacionDetails({ ...operacionDetails, estado: e.target.value })}
                                                className="modal-form-input"
                                            />
                                        ) : (
                                            <span>{operacionDetails.estado}</span>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Fecha de finalizacion:</label>
                                        {isEditingDetails ? (
                                            <input
                                                type="date"
                                                value={operacionDetails.fecha_fin}
                                                onChange={(e) => setOperacionDetails({ ...operacionDetails, fecha_fin: e.target.value })}
                                                className="modal-form-input"
                                            />
                                        ) : (
                                            <span>{operacionDetails.fecha_fin}</span>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="modal-form-label">Comentario:</label>
                                        {isEditingDetails ? (
                                            <input
                                                type="text"
                                                value={operacionDetails.comentario}
                                                onChange={(e) => setOperacionDetails({ ...operacionDetails, comentario: e.target.value })}
                                                className="modal-form-input"
                                            />
                                        ) : (
                                            <span>{operacionDetails.comentario}</span>
                                        )}
                                    </div>
                                    <div className="insumos-column">
                                        {isEditingDetails && operacionDetails.inputs && Array.isArray(operacionDetails.inputs) ? (
                                            operacionDetails.inputs.map((insumo) => (
                                                <div key={insumo.input_id}>
                                                    <label className="modal-form-label">Cantidad {insumos.find(i => i.id === insumo.input_id)?.name}:</label>
                                                    <input
                                                        type="number"
                                                        value={insumo.used_quantity || 0}
                                                        onChange={(e) => {
                                                            const updatedInsumos = [...operacionDetails.inputs];
                                                            const index = updatedInsumos.findIndex(i => i.input_id === insumo.input_id);
                                                            if (index !== -1) {
                                                                updatedInsumos[index].used_quantity = parseInt(e.target.value);
                                                                setOperacionDetails({ ...operacionDetails, inputs: updatedInsumos });
                                                            }
                                                        }}
                                                        className="modal-form-input"
                                                    />
                                                </div>
                                            ))
                                        ) : null}
                                    </div>
                                </div>
                                {isEditingDetails ? (
                                    <>
                                        <button onClick={handleSaveDetails} className="btn btn-primary">Guardar</button>
                                        <button onClick={() => setIsEditingDetails(false)} className="btn btn-secondary">Cancelar</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditingDetails(true)} className="btn btn-primary">Editar Operacion</button>
                                        <button onClick={() => handleDeleteOperaciones(operacionDetails.id)} className="btn btn-secondary">Eliminar Operacion</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

        </div>
    );
}

export default TableOperaciones;