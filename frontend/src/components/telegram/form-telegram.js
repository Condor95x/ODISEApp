import { useEffect } from "react";
import { createOperacion } from "../services/api";

function FormTelegram({ newOperacion, setNewOperacion }) {
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      // Configurar botón principal de Telegram
      tg.MainButton.setText("✅ Crear Operación");
      tg.MainButton.show();

      // Evento cuando el usuario hace click en el botón principal
      tg.onEvent("mainButtonClicked", () => {
        createOperacion(newOperacion)
          .then(() => {
            tg.close(); // cierra el formulario en Telegram
          })
          .catch((err) => {
            alert("❌ Error creando operación: " + err.message);
          });
      });
    }
  }, [newOperacion]);

  return (
    <div>
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
                                        onChange={(selectedOption) => handleCreateSelectChange('tipo_operacion', selectedOption)}
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
                                        onChange={(selectedOption) => handleCreateSelectChange('responsable_id', selectedOption)}
                                        value={responsableOptions.find((option) => option.value === newOperacion.responsable_id)}
                                        placeholder="Selecciona un responsable"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="modal-form-label">Fecha de inicio:</label>
                                    <input 
                                        type="date" 
                                        value={newOperacion.fecha_inicio} 
                                        onChange={(e) => handleCreateChange('fecha_inicio', e.target.value)} 
                                        className="modal-form-input" 
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Nota:</label>
                                    <input 
                                        type="text" 
                                        value={newOperacion.nota} 
                                        onChange={(e) => handleCreateChange('nota', e.target.value)} 
                                        className="modal-form-input" 
                                    />
                                </div>
                            </div>
                            <div className="modal-column"> {/* Columna 2 */}
                                <div className="mb-4">
                                    <label className="modal-form-label">Parcela:</label>
                                    <Select
                                        options={parcelaOptions}
                                        onChange={(selectedOption) => handleCreateSelectChange('parcela_id', selectedOption)}
                                        value={parcelaOptions.find((option) => option.value === newOperacion.parcela_id)}
                                        placeholder="Selecciona una parcela"
                                        isSearchable
                                        styles={customStyles}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Estado:</label>
                                    <input 
                                        type="text" 
                                        value={newOperacion.estado} 
                                        onChange={(e) => handleCreateChange('estado', e.target.value)} 
                                        className="modal-form-input" 
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Fecha de finalizacion:</label>
                                    <input 
                                        type="date" 
                                        value={newOperacion.fecha_fin} 
                                        onChange={(e) => handleCreateChange('fecha_fin', e.target.value)} 
                                        className="modal-form-input" 
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="modal-form-label">Comentario:</label>
                                    <input 
                                        type="text" 
                                        value={newOperacion.comentario} 
                                        onChange={(e) => handleCreateChange('comentario', e.target.value)} 
                                        className="modal-form-input" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mb-4 insumos-grid">
                            <div className="insumos-column">
                                <label className="modal-form-label">Insumos Consumidos:</label>
                                <select 
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
                                    className="modal-form-input"
                                >
                                    {insumos.map(insumo => (
                                        <option key={insumo.id} value={insumo.id}>{insumo.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="insumos-column">
                                {newOperacion.inputs.map((insumo) => (
                                    <div key={insumo.insumo_id}>
                                        <label className="modal-form-label">
                                            Cantidad {insumos.find(i => i.id === insumo.insumo_id)?.name || 'Insumo'}:
                                        </label>
                                        <input 
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
                                            className="modal-form-input" 
                                        />
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
    </div>
  );
}

export default FormTelegram;
