import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faDownload, faCalendar, faImage, faTrash } from '@fortawesome/free-solid-svg-icons';
import CategoriaImagenes from './ImageCategoryManagement';

Modal.setAppElement('#root');

function VitacoraCampo() {
  const [imagenes, setImagenes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    archivo: null,
    fecha_captura: '',
    descripcion: '',
    id_categoria_img: ''
  });
  
  // ✅ AGREGAR estos nuevos estados para manejo de archivos
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fileError, setFileError] = useState('');
  
  // Estados para filtros y agrupación
  const [filterField, setFilterField] = useState('categoria_nombre');
  const [filterValue, setFilterValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [groupBy, setGroupBy] = useState(null);
  const [selectedImagenes, setSelectedImagenes] = useState({});
  const [allSelected, setAllSelected] = useState({});

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  const [showCategorias, setShowCategorias] = useState(false);
  const Spacer = ({ width }) => <div style={{ width: `${width}rem`, display: 'inline-block' }}></div>;
  
  // Mapeo de nombres de campos para mostrar etiquetas más amigables
  const fieldLabels = {
    categoria_nombre: 'Categoría',
    descripcion: 'Descripción',
    fecha_creacion: 'Fecha de Creación',
    fecha_captura: 'Fecha de Captura',
    nombre_archivo: 'Nombre del Archivo'
  };

  const getFieldLabel = (fieldName) => {
    return fieldLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace("_", " ");
  };

  useEffect(() => {
    fetchImagenes();
    fetchCategorias();
  }, []);

  const fetchImagenes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vitacora-campo/`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setImagenes(data);
    } catch (err) {
      setError(err.message);
      setImagenes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categorias-imagenes/?activo=true`);
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (err) {
      console.error('Error fetching categorias:', err);
    }
  };

  const handleOpenUploadForm = () => {
    setUploadForm({
      archivo: null,
      fecha_captura: new Date().toISOString().slice(0, 16), // Formato datetime-local
      descripcion: '',
      id_categoria_img: ''
    });
    setShowUploadForm(true);
  };

  const handleCloseUploadForm = () => {
    setShowUploadForm(false);
    setUploadForm({
      archivo: null,
      fecha_captura: '',
      descripcion: '',
      id_categoria_img: ''
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    
    if (!file) {
      setSelectedFile(null);
      setImagePreview(null);
      // ✅ Limpiar también uploadForm.archivo
      setUploadForm(prev => ({
        ...prev,
        archivo: null
      }));
      return;
    }
    
    // Validaciones...
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];
    
    if (file.size > maxSize) {
      setFileError('El archivo es demasiado grande. Máximo 10MB permitido.');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      setFileError('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y archivos PDF.');
      return;
    }
    
    setSelectedFile(file);
    
    // ✅ AGREGAR: Actualizar uploadForm con el archivo seleccionado
    setUploadForm(prev => ({
      ...prev,
      archivo: file
    }));
    
    // Preview solo para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.archivo || !uploadForm.fecha_captura || !uploadForm.id_categoria_img) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('archivo', uploadForm.archivo);
      formData.append('fecha_captura', uploadForm.fecha_captura);
      formData.append('descripcion', uploadForm.descripcion);
      formData.append('id_categoria_img', uploadForm.id_categoria_img);

      const response = await fetch(`${API_BASE_URL}/vitacora-campo/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      await fetchImagenes();
      handleCloseUploadForm();
    } catch (err) {
      alert(`Error al subir Archivo: ${err.message}`);
    }
  };

  const handleViewImage = (imagen) => {
    setSelectedImage(imagen);
    setShowImageModal(true);
  };

  const handleDeleteImage = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar la imagen "${nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/vitacora-campo/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      await fetchImagenes();
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Funciones de filtrado y ordenamiento
  const filteredImagenes = imagenes.filter((imagen) => {
    const fieldValue = imagen[filterField];
    const searchValue = filterValue.toLowerCase();
    
    if (typeof fieldValue === 'number') {
      return fieldValue.toString().includes(searchValue);
    }
    
    if (typeof fieldValue === 'string') {
      return fieldValue.toLowerCase().includes(searchValue);
    }
    
    return String(fieldValue).toLowerCase().includes(searchValue);
  });

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedImagenes = [...filteredImagenes].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const groupImagenes = (data, groupBy) => {
    return data.reduce((acc, imagen) => {
      const key = imagen[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(imagen);
      return acc;
    }, {});
  };

  const groupedImagenes = groupBy ? groupImagenes(sortedImagenes, groupBy) : { "Todas las Imágenes": sortedImagenes };

  const handleSelectAll = (e, group) => {
    setAllSelected({ ...allSelected, [group]: e.target.checked });
    const updatedSelections = { ...selectedImagenes };
    if (e.target.checked) {
      updatedSelections[group] = groupedImagenes[group].map((imagen) => imagen.id_vitacora);
    } else {
      updatedSelections[group] = [];
    }
    setSelectedImagenes(updatedSelections);
  };

  const handleSelectImagen = (e, imagen, group) => {
    const groupSelections = selectedImagenes[group] || [];
    const updatedSelections = e.target.checked
      ? [...groupSelections, imagen.id_vitacora]
      : groupSelections.filter((id) => id !== imagen.id_vitacora);
    setSelectedImagenes({ ...selectedImagenes, [group]: updatedSelections });

    const allGroupSelected = groupedImagenes[group].every((img) => updatedSelections.includes(img.id_vitacora));
    setAllSelected({ ...allSelected, [group]: allGroupSelected });
  };

  const downloadSelectedImages = async () => {
    const selectedIds = [];
    for (const group in selectedImagenes) {
      const selectedIdsInGroup = selectedImagenes[group];
      if (selectedIdsInGroup && selectedIdsInGroup.length > 0) {
        selectedIds.push(...selectedIdsInGroup);
      }
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/vitacora-campo/descargar-zip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedIds),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vitacora_imagenes_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      alert(`Error al descargar: ${err.message}`);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleShowCategorias = () => {
    setShowCategorias(!showCategorias);
  };

  if (loading) return <div className="p-4">Cargando imágenes...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <button 
            onClick={handleOpenUploadForm} 
            className="btn btn-primary"
          >
            <FontAwesomeIcon icon={faPlus} />   Subir Archivo
          </button>

          <Spacer width={0.5} />

          {Object.values(selectedImagenes).flat().length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={downloadSelectedImages}
            >
              <FontAwesomeIcon icon={faDownload} />
              Descargar ZIP ({Object.values(selectedImagenes).flat().length})
            </button>
          )}

          <Spacer width={0.5} />

          <button
            onClick={handleShowCategorias}
            className={showCategorias ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showCategorias ? 'Ocultar Gestión de Categorías' : 'Gestión de Categorías'}
          </button>

        </div>

        {/* Controles de filtrado y agrupación */}
        <div className="filter-controls-container">
          <div className="control-group">
            <label htmlFor="groupingField" className="control-label">
              Agrupar por:
            </label>
            <select 
              id="groupingField"
              value={groupBy || "none"} 
              onChange={(e) => setGroupBy(e.target.value === "none" ? null : e.target.value)}
              className="control-select"
            >
              <option value="none">Sin Agrupación</option>
              <option value="categoria_nombre">Categoría</option>
              <option value="fecha_captura">Fecha de Captura</option>
            </select>
          </div>
          
          <div className="control-group">
            <label htmlFor="filterField" className="control-label">
              Buscar por:
            </label>
            <div className="filter-inputs">
              <select 
                id="filterField"
                value={filterField} 
                onChange={(e) => setFilterField(e.target.value)}
                className="control-select filter-field"
              >
                <option value="categoria_nombre">Categoría</option>
                <option value="descripcion">Descripción</option>
                <option value="nombre_archivo">Nombre del Archivo</option>
              </select>
              <input
                id="filterValue"
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={`Buscar por ${getFieldLabel(filterField)}...`}
                className="control-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tablas agrupadas */}
      {Object.entries(groupedImagenes).map(([group, imagenesGroup]) => (
        <div key={group} className="mb-6">
          {groupBy && <h3 className="titulo-seccion text-lg font-semibold mb-3 p-2 bg-gray-100 rounded">{`${getFieldLabel(groupBy)}: ${group}`}</h3>}
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 p-3">
                    <input 
                      type="checkbox" 
                      checked={allSelected[group] || false} 
                      onChange={(e) => handleSelectAll(e, group)} 
                    />
                  </th>
                  <th className="border border-gray-300 p-3 text-left cursor-pointer" onClick={() => handleSort('fecha_creacion')}>
                    Fecha Creación
                  </th>
                  <th className="border border-gray-300 p-3 text-left cursor-pointer" onClick={() => handleSort('categoria_nombre')}>
                    Categoría
                  </th>
                  <th className="border border-gray-300 p-3 text-left cursor-pointer" onClick={() => handleSort('descripcion')}>
                    Descripción
                  </th>
                  <th className="border border-gray-300 p-3 text-left">
                    Archivo
                  </th>
                  <th className="border border-gray-300 p-3 text-left">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {imagenesGroup.map((imagen) => (
                  <tr key={imagen.id_vitacora} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3">
                      <input 
                        type="checkbox" 
                        checked={selectedImagenes[group]?.includes(imagen.id_vitacora) || false} 
                        onChange={(e) => handleSelectImagen(e, imagen, group)} 
                      />
                    </td>
                    <td className="border border-gray-300 p-3">
                      {formatDateTime(imagen.fecha_creacion)}
                    </td>
                    <td className="border border-gray-300 p-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {imagen.categoria_nombre}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3">
                      {imagen.descripcion || '-'}
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="text-sm">
                        <div className="font-medium">{imagen.nombre_archivo}</div>
                        <div className="text-gray-500">{formatFileSize(imagen.tamaño_archivo)}</div>
                      </div>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewImage(imagen)}
                          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                          title="Ver imagen"
                        >
                          <FontAwesomeIcon icon={faSearch} />
                        </button>
                        <button
                          onClick={() => handleDeleteImage(imagen.id_vitacora, imagen.nombre_archivo)}
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
            

          </div>
        </div>
      ))}

      {/* Modal para subir Archivo */}
      <Modal 
        isOpen={showUploadForm} 
        onRequestClose={handleCloseUploadForm}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <div className="modal-wrapper">
          <div className="modal-content max-w-4xl">
            <h2 className="modal-title">
              <FontAwesomeIcon icon={faImage} />   Subir Nuevo Archivo
            </h2>
            
            <div className="modal-form-grid">
              <div className="modal-column">
                <div className="mb-4">
                  <label htmlFor="archivoInput" className="modal-form-label">
                    Seleccionar Archivo (Imagen o PDF)
                  </label>
                  
                  <input
                    id="archivoInput"
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="form-control-file"
                    required
                  />
                  
                  {selectedFile && (
                    <div className="file-info mt-2">
                      <small className="text-muted">
                        Archivo: {selectedFile.name} 
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        <br />
                        Tipo: {selectedFile.type}
                      </small>
                    </div>
                  )}
                  
                  {/* Preview condicional */}
                  {selectedFile && (
                    <div className="file-preview mt-3">
                      {selectedFile.type.startsWith('image/') ? (
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          style={{maxWidth: '200px', maxHeight: '200px', objectFit: 'cover'}}
                          className="img-thumbnail"
                        />
                      ) : selectedFile.type === 'application/pdf' ? (
                        <div className="pdf-preview">
                          <i className="fas fa-file-pdf fa-3x text-danger"></i>
                          <p>Archivo PDF seleccionado</p>
                        </div>
                      ) : (
                        <div className="file-preview">
                          <i className="fas fa-file fa-3x"></i>
                          <p>Archivo seleccionado</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="fechaCapturaInput" className="modal-form-label">
                    Fecha de Captura
                  </label>
                  <input
                    id="fechaCapturaInput"
                    type="datetime-local"
                    value={uploadForm.fecha_captura}
                    onChange={(e) => setUploadForm({ ...uploadForm, fecha_captura: e.target.value })}
                    className="modal-form-input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="categoriaSelect" className="modal-form-label">
                    Seleccionar una Categoría
                  </label>
                  <select
                    id="categoriaSelect"
                    value={uploadForm.id_categoria_img}
                    onChange={(e) => setUploadForm({ ...uploadForm, id_categoria_img: e.target.value })}
                    className="modal-form-input"
                    required
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id_categoria_img} value={categoria.id_categoria_img}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="descripcionInput" className="modal-form-label">
                    Descripción
                  </label>
                  <textarea
                    id="descripcionInput"
                    value={uploadForm.descripcion}
                    onChange={(e) => setUploadForm({ ...uploadForm, descripcion: e.target.value })}
                    className="modal-form-input w-full h-20 resize-none"
                    placeholder="Descripción de la imagen..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal-buttons mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCloseUploadForm}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadSubmit}
                className="btn btn-primary"
                disabled={!uploadForm.archivo || !uploadForm.fecha_captura || !uploadForm.id_categoria_img}
              >
                Subir Archivo
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal para visualizar archivo */}
      <Modal 
        isOpen={showImageModal} 
        onRequestClose={() => setShowImageModal(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        {selectedImage && (
          <div className="modal-wrapper">
            <div className="modal-content">
              <div className="modal-form-grid">
                <div><span className="modal-form-label"><strong>Fecha de creación:</strong></span> {formatDateTime(selectedImage.fecha_creacion)}</div>
                <div><span className="modal-form-label"><strong>Fecha de captura:</strong></span> {formatDateTime(selectedImage.fecha_captura)}</div>
                <div><span className="modal-form-label"><strong>Categoría:</strong></span> {selectedImage.categoria_nombre}</div>
                <div><span className="modal-form-label"><strong>Descripción:</strong></span> {selectedImage.descripcion || 'Sin descripción'}</div>

              </div>
              <div className="text-center">
                <img 
                  src={`${API_BASE_URL}/vitacora-campo/${selectedImage.id_vitacora}/imagen`}
                  alt={selectedImage.nombre_archivo}
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg shadow-lg"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="modal-buttons mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="btn btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {showCategorias && (
        <div>
          <div className="titulo-seccion">
            <h3>Gestión de Categorías de Imágenes</h3>
          </div>  
          <CategoriaImagenes />
        </div>
      )}

    </div>
  );
}

export default VitacoraCampo;