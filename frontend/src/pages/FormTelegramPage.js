import React, { useState } from "react";
import FormTelegram from "../components/telegram/form-telegram";

export default function FormTelegramPage() {
  const [newOperacion, setNewOperacion] = useState({
    tipo_operacion: "",
    responsable_id: "",
    fecha_inicio: "",
    nota: "",
    parcela_id: "",
    estado: "",
    fecha_fin: "",
    comentario: "",
    inputs: []
  });

  return (
    <div style={{ padding: "20px" }}>
      <h2>Crear Operación</h2>
      <FormTelegram
        newOperacion={newOperacion}
        setNewOperacion={setNewOperacion}
        options={[]}             // lista de tareas
        responsableOptions={[]}  // lista de responsables
        parcelaOptions={[]}      // lista de parcelas
        insumos={[]}             // lista de insumos
      />
    </div>
  );
}
