import React, { useEffect, useState } from "react";
import Select from "react-select";
import { createOperacion, getPlots, getInputs, getUsers, getVineyardTasks } from "../../services/api";

export default function FormTelegram({ 
  newOperacion, 
  setNewOperacion
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Estados para los datos de las listas
  const [insumos, setInsumos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tasks, setVineyardsTasks] = useState([]);
  const [plotsData, setPlotsData] = useState([]);

  // Cargar datos al inicializar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [plotsResponse, insumosData, usuariosData, taskData] = await Promise.all([
          getPlots(),
          getInputs(),
          getUsers(),
          getVineyardTasks(),
        ]);

        setPlotsData(plotsResponse);
        setInsumos(insumosData);
        setUsuarios(usuariosData);
        setVineyardsTasks(taskData);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        const tg = window.Telegram?.WebApp;
        if (tg) {
          tg.showAlert("Error al cargar los datos iniciales");
        }
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Mostrar botón de Telegram cuando los datos estén cargados
  useEffect(() => {
    if (window.Telegram?.WebApp && !loading) {
      const tg = window.Telegram.WebApp;
      tg.MainButton.show();
    }
  }, [loading]);
  const options = tasks.map((task) => ({
    value: task.task_name,
    label: task.task_name,
  }));

  const responsableOptions = usuarios.map(usuario => ({
    value: usuario.id,
    label: `${usuario.nombre} ${usuario.apellido}`
  }));

  const parcelaOptions = plotsData.map(parcela => ({
    value: parcela.plot_id,
    label: parcela.plot_name
  }));

  // Validación de campos obligatorios
  const validateForm = () => {
    const errors = {};
    
    if (!newOperacion.tipo_operacion) {
      errors.tipo_operacion = "Tipo de operación es obligatorio";
    }
    if (!newOperacion.parcela_id) {
      errors.parcela_id = "Parcela es obligatoria";
    }
    if (!newOperacion.fecha_inicio) {
      errors.fecha_inicio = "Fecha de inicio es obligatoria";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Función mejorada para crear operación
  const handleCreateOperacion = async () => {
    if (!validateForm()) {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showAlert("❌ Por favor completa todos los campos obligatorios");
      }
      return;
    }

    setIsProcessing(true);
    const tg = window.Telegram?.WebApp;
    
    // Mostrar feedback de procesamiento
    if (tg) {
      tg.MainButton.setText("⏳ Creando...");
      tg.MainButton.disable();
    }

    try {
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
        fecha_inicio: newOperacion.fecha_inicio,
        fecha_fin: newOperacion.fecha_fin || null,
        estado: newOperacion.estado || 'planned',
        responsable_id: newOperacion.responsable_id ? parseInt(newOperacion.responsable_id) : null,
        nota: newOperacion.nota || '',
        comentario: newOperacion.comentario || '',
        parcela_id: parseInt(newOperacion.parcela_id),
        inputs: inputsBackend,
        vessel_activity_id: null,
      };

      // Enviar al backend
      await createOperacion(operacionToCreate);

      // Mostrar mensaje de éxito y cerrar
      if (tg) {
        tg.showAlert("✅ Operación creada exitosamente", () => {
          tg.close();
        });
      } else {
        alert("✅ Operación creada exitosamente");
      }

    } catch (error) {
      console.error("Error creando operación:", error);
      
      let errorMessage = "❌ Error al crear la operación";
      
      if (error.response) {
        if (error.response.status === 422) {
          errorMessage = "❌ Datos inválidos. Verifica los campos.";
          if (error.response.data?.detail) {
            if (Array.isArray(error.response.data.detail)) {
              const validationErrors = error.response.data.detail
                .map(err => `${err.loc?.join('.')}: ${err.msg}`)
                .join(', ');
              errorMessage += ` (${validationErrors})`;
            }
          }
        } else if (error.response.data?.detail) {
          errorMessage = `❌ ${error.response.data.detail}`;
        }
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      // Mostrar error en Telegram
      if (tg) {
        tg.showAlert(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsProcessing(false);
      
      // Restaurar botón
      if (tg) {
        tg.MainButton.setText("✅ Crear Operación");
        tg.MainButton.enable();
      }
    }
  };

  // Integración con Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      // Expandir la WebApp
      tg.expand();
      
      // Configurar tema
      tg.setHeaderColor('secondary_bg_color');
      tg.setBackgroundColor('bg_color');

      // Configurar botón principal
      tg.MainButton.setText("✅ Crear Operación");
      tg.MainButton.color = tg.themeParams.button_color || '#0088cc';
      tg.MainButton.textColor = tg.themeParams.button_text_color || '#ffffff';
      
      // Solo mostrar el botón si no está cargando
      if (!loading) {
        tg.MainButton.show();
      }

      // Configurar botón de regreso
      tg.BackButton.show();
      
      const handleMainButtonClick = () => {
        if (!isProcessing && !loading) {
          handleCreateOperacion();
        }
      };

      const handleBackButtonClick = () => {
        tg.close();
      };

      tg.onEvent("mainButtonClicked", handleMainButtonClick);
      tg.onEvent("backButtonClicked", handleBackButtonClick);

      // Cleanup
      // Mostrar pantalla de carga
  if (loading) {
    return (
      <div style={{
        backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
        color: 'var(--tg-theme-text-color, #000000)',
        minHeight: '100vh',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--tg-theme-hint-color, #999999)',
          borderTop: '3px solid var(--tg-theme-button-color, #0088cc)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <p style={{ 
          fontSize: '16px',
          color: 'var(--tg-theme-hint-color, #999999)'
        }}>
          Cargando datos...
        </p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return () => {
        tg.offEvent("mainButtonClicked", handleMainButtonClick);
        tg.offEvent("backButtonClicked", handleBackButtonClick);
      };
    }
  }, [newOperacion, isProcessing, loading]);

  // Funciones de manejo de cambios (sin cambios)
  const handleCreateChange = (field, value) => {
    setNewOperacion((prev) => ({ ...prev, [field]: value }));
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCreateSelectChange = (field, selectedOption) => {
    setNewOperacion((prev) => ({ ...prev, [field]: selectedOption?.value || "" }));
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Estilos adaptados para Telegram
  const telegramSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '44px',
      border: validationErrors[state.selectProps.name] 
        ? '2px solid #ff3b30' 
        : '1px solid var(--tg-theme-hint-color, #999999)',
      borderRadius: '10px',
      backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
      color: 'var(--tg-theme-text-color, #000000)',
      boxShadow: state.isFocused ? '0 0 0 1px var(--tg-theme-button-color, #0088cc)' : 'none',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
      border: '1px solid var(--tg-theme-hint-color, #999999)',
      borderRadius: '10px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'var(--tg-theme-button-color, #0088cc)' 
        : state.isFocused 
        ? 'var(--tg-theme-secondary-bg-color, #f1f1f1)' 
        : 'transparent',
      color: state.isSelected 
        ? 'var(--tg-theme-button-text-color, #ffffff)' 
        : 'var(--tg-theme-text-color, #000000)',
    }),
  };

  return (
    <div style={{
      backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
      color: 'var(--tg-theme-text-color, #000000)',
      minHeight: '100vh',
      padding: '16px'
    }}>
      <h2 style={{
        color: 'var(--tg-theme-text-color, #000000)',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Nueva Operación
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Tipo de Operación */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: validationErrors.tipo_operacion ? '#ff3b30' : 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Operación *
          </label>
          <Select
            name="tipo_operacion"
            options={options}
            onChange={(opt) => handleCreateSelectChange("tipo_operacion", opt)}
            value={options.find((opt) => opt.value === newOperacion.tipo_operacion)}
            placeholder={options.length > 0 ? "Selecciona una tarea" : "Cargando tareas..."}
            isSearchable
            isDisabled={options.length === 0}
            styles={telegramSelectStyles}
            noOptionsMessage={() => "No hay tareas disponibles"}
          />
          {validationErrors.tipo_operacion && (
            <span style={{ color: '#ff3b30', fontSize: '12px' }}>
              {validationErrors.tipo_operacion}
            </span>
          )}
        </div>

        {/* Parcela */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: validationErrors.parcela_id ? '#ff3b30' : 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Parcela *
          </label>
          <Select
            name="parcela_id"
            options={parcelaOptions}
            onChange={(opt) => handleCreateSelectChange("parcela_id", opt)}
            value={parcelaOptions.find((opt) => opt.value === newOperacion.parcela_id)}
            placeholder={parcelaOptions.length > 0 ? "Selecciona una parcela" : "Cargando parcelas..."}
            isSearchable
            isDisabled={parcelaOptions.length === 0}
            styles={telegramSelectStyles}
            noOptionsMessage={() => "No hay parcelas disponibles"}
          />
          {validationErrors.parcela_id && (
            <span style={{ color: '#ff3b30', fontSize: '12px' }}>
              {validationErrors.parcela_id}
            </span>
          )}
        </div>

        {/* Responsable */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Responsable
          </label>
          <Select
            options={responsableOptions}
            onChange={(opt) => handleCreateSelectChange("responsable_id", opt)}
            value={responsableOptions.find((opt) => opt.value === newOperacion.responsable_id)}
            placeholder={responsableOptions.length > 0 ? "Selecciona un responsable" : "Cargando responsables..."}
            isSearchable
            isDisabled={responsableOptions.length === 0}
            styles={telegramSelectStyles}
            noOptionsMessage={() => "No hay responsables disponibles"}
          />
        </div>

        {/* Fecha de inicio */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: validationErrors.fecha_inicio ? '#ff3b30' : 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Fecha de inicio *
          </label>
          <input
            type="date"
            value={newOperacion.fecha_inicio}
            onChange={(e) => handleCreateChange("fecha_inicio", e.target.value)}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px',
              border: validationErrors.fecha_inicio 
                ? '2px solid #ff3b30' 
                : '1px solid var(--tg-theme-hint-color, #999999)',
              borderRadius: '10px',
              backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
              color: 'var(--tg-theme-text-color, #000000)',
              fontSize: '16px'
            }}
          />
          {validationErrors.fecha_inicio && (
            <span style={{ color: '#ff3b30', fontSize: '12px' }}>
              {validationErrors.fecha_inicio}
            </span>
          )}
        </div>

        {/* Fecha de fin */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Fecha de finalización
          </label>
          <input
            type="date"
            value={newOperacion.fecha_fin}
            onChange={(e) => handleCreateChange("fecha_fin", e.target.value)}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px',
              border: '1px solid var(--tg-theme-hint-color, #999999)',
              borderRadius: '10px',
              backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
              color: 'var(--tg-theme-text-color, #000000)',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Estado */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Estado
          </label>
          <input
            type="text"
            value={newOperacion.estado}
            onChange={(e) => handleCreateChange("estado", e.target.value)}
            placeholder="planned"
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px',
              border: '1px solid var(--tg-theme-hint-color, #999999)',
              borderRadius: '10px',
              backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
              color: 'var(--tg-theme-text-color, #000000)',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Nota */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Nota
          </label>
          <textarea
            value={newOperacion.nota}
            onChange={(e) => handleCreateChange("nota", e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--tg-theme-hint-color, #999999)',
              borderRadius: '10px',
              backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
              color: 'var(--tg-theme-text-color, #000000)',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Comentario */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Comentario
          </label>
          <textarea
            value={newOperacion.comentario}
            onChange={(e) => handleCreateChange("comentario", e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--tg-theme-hint-color, #999999)',
              borderRadius: '10px',
              backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
              color: 'var(--tg-theme-text-color, #000000)',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Insumos */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: 'var(--tg-theme-text-color, #000000)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Insumos Consumidos
          </label>
          
          {insumos.length > 0 ? (
            <>
              <select
                multiple
                value={newOperacion.inputs.map((i) => i.insumo_id)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => parseInt(o.value));
                  const insumosSeleccionados = selected.map((id) => {
                    const existente = newOperacion.inputs.find((i) => i.insumo_id === id);
                    return existente ? existente : { insumo_id: id, cantidad: 0 };
                  });
                  handleCreateChange("inputs", insumosSeleccionados);
                }}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid var(--tg-theme-hint-color, #999999)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
                  color: 'var(--tg-theme-text-color, #000000)',
                  fontSize: '16px'
                }}
              >
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.name}
                  </option>
                ))}
              </select>

              {/* Cantidades de insumos */}
              {newOperacion.inputs.map((insumo) => (
                <div key={insumo.insumo_id} style={{ marginTop: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    color: 'var(--tg-theme-text-color, #000000)',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Cantidad {insumos.find((i) => i.id === insumo.insumo_id)?.name || "Insumo"}:
                  </label>
                  <input
                    type="number"
                    value={insumo.cantidad}
                    onChange={(e) => {
                      const updated = [...newOperacion.inputs];
                      const idx = updated.findIndex((i) => i.insumo_id === insumo.insumo_id);
                      if (idx !== -1) {
                        updated[idx].cantidad = parseInt(e.target.value) || 0;
                        handleCreateChange("inputs", updated);
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '12px',
                      border: '1px solid var(--tg-theme-hint-color, #999999)',
                      borderRadius: '10px',
                      backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
                      color: 'var(--tg-theme-text-color, #000000)',
                      fontSize: '16px'
                    }}
                  />
                </div>
              ))}
            </>
          ) : (
            <div style={{
              padding: '20px',
              backgroundColor: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
              borderRadius: '10px',
              textAlign: 'center',
              color: 'var(--tg-theme-hint-color, #999999)',
              fontSize: '14px'
            }}>
              No hay insumos disponibles
            </div>
          )}
        </div>

        {/* Espacio adicional para el botón de Telegram */}
        <div style={{ height: '80px' }} />
      </div>
    </div>
  );
}
