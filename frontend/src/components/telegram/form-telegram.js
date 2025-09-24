// src/components/FormTelegram.js
import React, { useEffect } from "react";
import Select from "react-select";
import { createOperacion } from "../../services/api";

export default function FormTelegram({ newOperacion, setNewOperacion, options, responsableOptions, parcelaOptions, insumos }) {
  // Integración con Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      tg.MainButton.setText("✅ Crear Operación");
      tg.MainButton.show();

      tg.onEvent("mainButtonClicked", () => {
        createOperacion(newOperacion)
          .then(() => {
            tg.close(); // cerrar formulario en Telegram
          })
          .catch((err) => {
            alert("❌ Error creando operación: " + err.message);
          });
      });
    }
  }, [newOperacion]);

  const handleCreateChange = (field, value) => {
    setNewOperacion((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateSelectChange = (field, selectedOption) => {
    setNewOperacion((prev) => ({ ...prev, [field]: selectedOption?.value || "" }));
  };

  return (
    <div className="modal-content">
      <h2 className="modal-title">Crear una Nueva operación</h2>

      <div className="modal-form-grid">
        <div className="modal-column">
          <div className="mb-4">
            <label className="modal-form-label">Operación:</label>
            <Select
              options={options}
              onChange={(opt) => handleCreateSelectChange("tipo_operacion", opt)}
              value={options.find((opt) => opt.value === newOperacion.tipo_operacion)}
              placeholder="Selecciona una tarea"
              isSearchable
            />
          </div>
          <div className="mb-4">
            <label className="modal-form-label">Responsable:</label>
            <Select
              options={responsableOptions}
              onChange={(opt) => handleCreateSelectChange("responsable_id", opt)}
              value={responsableOptions.find((opt) => opt.value === newOperacion.responsable_id)}
              placeholder="Selecciona un responsable"
              isSearchable
            />
          </div>
          <div className="mb-4">
            <label className="modal-form-label">Fecha de inicio:</label>
            <input
              type="date"
              value={newOperacion.fecha_inicio}
              onChange={(e) => handleCreateChange("fecha_inicio", e.target.value)}
              className="modal-form-input"
            />
          </div>
          <div className="mb-4">
            <label className="modal-form-label">Nota:</label>
            <input
              type="text"
              value={newOperacion.nota}
              onChange={(e) => handleCreateChange("nota", e.target.value)}
              className="modal-form-input"
            />
          </div>
        </div>

        <div className="modal-column">
          <div className="mb-4">
            <label className="modal-form-label">Parcela:</label>
            <Select
              options={parcelaOptions}
              onChange={(opt) => handleCreateSelectChange("parcela_id", opt)}
              value={parcelaOptions.find((opt) => opt.value === newOperacion.parcela_id)}
              placeholder="Selecciona una parcela"
              isSearchable
            />
          </div>
          <div className="mb-4">
            <label className="modal-form-label">Estado:</label>
            <input
              type="text"
              value={newOperacion.estado}
              onChange={(e) => handleCreateChange("estado", e.target.value)}
              className="modal-form-input"
            />
          </div>
          <div className="mb-4">
            <label className="modal-form-label">Fecha de finalización:</label>
            <input
              type="date"
              value={newOperacion.fecha_fin}
              onChange={(e) => handleCreateChange("fecha_fin", e.target.value)}
              className="modal-form-input"
            />
          </div>
          <div className="mb-4">
            <label className="modal-form-label">Comentario:</label>
            <input
              type="text"
              value={newOperacion.comentario}
              onChange={(e) => handleCreateChange("comentario", e.target.value)}
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
            value={newOperacion.inputs.map((i) => i.insumo_id)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => parseInt(o.value));
              const insumosSeleccionados = selected.map((id) => {
                const existente = newOperacion.inputs.find((i) => i.insumo_id === id);
                return existente ? existente : { insumo_id: id, cantidad: 0 };
              });
              handleCreateChange("inputs", insumosSeleccionados);
            }}
            className="modal-form-input"
          >
            {insumos.map((insumo) => (
              <option key={insumo.id} value={insumo.id}>
                {insumo.name}
              </option>
            ))}
          </select>
        </div>

        <div className="insumos-column">
          {newOperacion.inputs.map((insumo) => (
            <div key={insumo.insumo_id}>
              <label className="modal-form-label">
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
                className="modal-form-input"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
