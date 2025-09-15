import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

Modal.setAppElement('#root');

function CategoriaImagenes() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [newCategoria, setNewCategoria] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });
  const [filterValue, setFilterValue] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/categorias-imagenes/`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      setError(err.message);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (categoria = null) => {
    setEditingCategoria(categoria);
    if (categoria) {
      setNewCategoria({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || '',
        activo: categoria.activo
      });
    } else {
      setNewCategoria({
        nombre: '',
        descripcion: '',
        activo: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategoria(null);
    setNewCategoria({
      nombre: '',
      descripcion: '',
      activo: true
    });
  };

  const handleSubmit = async () => {
    try {
      const url = editingCategoria 
        ? `${API_BASE_URL}/categorias-imagenes/${editingCategoria.id_categoria_img}`
        : `${API_BASE_URL}/categorias-imagenes/`;
      
      const method = editingCategoria ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategoria),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      await fetchCategorias();
      handleCloseForm();
      alert(editingCategoria ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar la categoría "${nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/categorias-imagenes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      await fetchCategorias();
      alert('Categoría eliminada exitosamente');
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const filteredCategorias = categorias.filter((categoria) => {
    const searchValue = filterValue.toLowerCase();
    return categoria.nombre.toLowerCase().includes(searchValue) ||
           (categoria.descripcion && categoria.descripcion.toLowerCase().includes(searchValue));
  });

  if (loading) return <div className="p-4">Cargando categorías...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">     
        <div className="flex flex-wrap gap-4 items-center mb-4">        
          <button 
            onClick={() => handleOpenForm()} 
            className="btn btn-primary"
          >
            <FontAwesomeIcon icon={faPlus} />   Nueva Categoría
          </button>
        </div>  
          <div className="filter-controls-container">
            <div className="control-group">
              <label htmlFor="filterInput" className="control-label">Buscar :</label>
              <div className="filter-inputs">
                <input
                  id="filterInput"
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Buscar por nombre o descripción..."
                  className="control-input"
                />
              </div>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 p-3 text-left">Nombre</th>
              <th className="border border-gray-300 p-3 text-left">Descripción</th>
              <th className="border border-gray-300 p-3 text-left">Estado</th>
              <th className="border border-gray-300 p-3 text-left">Fecha Creación</th>
              <th className="border border-gray-300 p-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategorias.map((categoria) => (
              <tr key={categoria.id_categoria_img} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-3 font-medium">{categoria.nombre}</td>
                <td className="border border-gray-300 p-3">{categoria.descripcion || '-'}</td>
                <td className="border border-gray-300 p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    categoria.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {categoria.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="border border-gray-300 p-3">
                  {new Date(categoria.fecha_creacion).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenForm(categoria)}
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDelete(categoria.id_categoria_img, categoria.nombre)}
                      className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                      title="Eliminar"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredCategorias.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No se encontraron categorías
          </div>
        )}
      </div>

      {/* Modal para crear/editar categorías */}
      <Modal 
        isOpen={showForm} 
        onRequestClose={handleCloseForm}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <div className="modal-wrapper">
          <div className="modal-content max-w-4xl">
          <h2 className="modal-title">
            {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
          </h2>
          
          <div className="modal-form-grid">
            <div className="modal-column">
                <label htmlFor="nombreCategoria" className="modal-form-label">
                  Nombre
                </label>
                <input
                  id="nombreCategoria"
                  type="text"
                  value={newCategoria.nombre}
                  onChange={(e) => setNewCategoria({ ...newCategoria, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre de la categoría"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="descripcionCategoria" className="modal-form-label">
                  Descripción
                </label>
                <textarea
                  id="descripcionCategoria"
                  value={newCategoria.descripcion}
                  onChange={(e) => setNewCategoria({ ...newCategoria, descripcion: e.target.value })}
                  className="modal-form-input w-full h-20 resize-none"
                  placeholder="Descripción de la categoría"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="activoCategoria"
                  type="checkbox"
                  checked={newCategoria.activo}
                  onChange={(e) => setNewCategoria({ ...newCategoria, activo: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="activoCategoria" className="modal-form-label">
                  Categoría activa
                </label>
              </div>
            </div>
            
            <div className="modal-buttons mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCloseForm}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={!newCategoria.nombre.trim()}
              >
                {editingCategoria ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CategoriaImagenes;