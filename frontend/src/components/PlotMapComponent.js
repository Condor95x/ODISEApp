import React, { useState, useEffect, useRef } from 'react';
import Map from './Map';
import { getPlotsWithData } from '../services/api';
import { wktToGeoJSON } from './TablePlots';

const filterFields = [
  { key: 'plot_var', label: 'Variedad', metadataKey: 'varieties' },
  { key: 'plot_management', label: 'Manejo', metadataKey: 'management' },
  { key: 'sector_id', label: 'Sector', metadataKey: 'sectors' },
  { key: 'plot_conduction', label: 'Conducción', metadataKey: 'conduction' },
  { key: 'plot_rootstock', label: 'Portainjerto', metadataKey: 'rootstocks' }
];

const PlotMapComponent = () => {
  const mapRef = useRef(null);
  const [plots, setPlots] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [filteredPlots, setFilteredPlots] = useState([]);
  const [filterField, setFilterField] = useState('plot_var');
  const [filterValue, setFilterValue] = useState('');
  const [legendField, setLegendField] = useState('plot_var');

  // Función para obtener la etiqueta amigable del campo
  const getFieldLabel = (fieldName) => {
    const field = filterFields.find(f => f.key === fieldName);
    return field ? field.label : fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace("_", " ");
  };

  // Función para obtener el nombre amigable de un valor
  const getValueLabel = (fieldKey, value) => {
    if (!value) return 'Sin especificar';
    
    const field = filterFields.find(f => f.key === fieldKey);
    if (!field?.metadataKey || !metadata?.[field.metadataKey]) {
      return value;
    }

    let metaItem;
    
    switch (fieldKey) {
      case 'plot_var':
      case 'plot_rootstock':
        // Para variedades y portainjertos, buscar por gv_id
        metaItem = metadata[field.metadataKey].find(m => m.gv_id === value);
        return metaItem?.name || value;
        
      case 'plot_management':
      case 'plot_conduction':
        // Para manejo y conducción, buscar por vy_id
        metaItem = metadata[field.metadataKey].find(m => m.vy_id === value);
        return metaItem?.value || value;
        
      case 'sector_id':
        // Para sectores, buscar por sector_id
        metaItem = metadata[field.metadataKey].find(m => m.sector_id === value);
        return metaItem?.etiqueta || value;
        
      default:
        // Para otros campos, buscar por id genérico
        metaItem = metadata[field.metadataKey].find(m => 
          m.id === value || m.gv_id === value || m.vy_id === value
        );
        return metaItem?.name || metaItem?.value || metaItem?.etiqueta || value;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { plots, metadata } = await getPlotsWithData();
        setPlots(plots);
        setMetadata(metadata);
        setFilteredPlots(plots);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let result = plots;

    if (filterValue && filterField) {
      result = result.filter(plot => {
        const fieldValue = plot[filterField];
        const searchValue = filterValue.toLowerCase();
        
        if (typeof fieldValue === 'number') {
          return fieldValue.toString().includes(searchValue);
        }
        
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(searchValue);
        }
        
        return String(fieldValue).toLowerCase().includes(searchValue);
      });
    }

    setFilteredPlots(result);
  }, [filterField, filterValue, plots]);

  const generateGeoJSON = () => ({
    type: 'FeatureCollection',
    features: filteredPlots
      .map(plot => {
        const geo = wktToGeoJSON(plot.plot_geom);
        if (!geo) return null;

        return {
          type: 'Feature',
          properties: {
            name: plot.plot_name,
            ...Object.fromEntries(filterFields.map(f => [f.key, plot[f.key]]))
          },
          geometry: geo
        };
      })
      .filter(Boolean)
  });

  const getColorByFieldValue = (value) => {
    const allValues = [...new Set(filteredPlots.map(p => p[legendField]).filter(Boolean))];
    const index = allValues.indexOf(value);
    const palette = ['#FF5733', '#33FF57', '#3357FF', '#F39C12', '#8E44AD', '#1abc9c', '#e74c3c', '#9b59b6'];
    return palette[index % palette.length];
  };

  if (!metadata) return <div>Cargando mapa y datos...</div>;

  return (
    <div className="plot-map-component" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controles de filtros en dos columnas */}
      <div className="filter-controls-container" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '16px',
        alignItems: 'start',
        overflow: 'hidden' // Evita desbordamiento
      }}>
        <div className="control-group" style={{ minWidth: 0 }}>
          <label htmlFor="legendField" className="control-label">Leyenda por:</label>
          <select 
            id="legendField" 
            value={legendField} 
            onChange={(e) => setLegendField(e.target.value)} 
            className="control-select"
            style={{ width: '100%' }}
          >
            {filterFields.map(field => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group" style={{ minWidth: 0 }}>
          <label htmlFor="filterFieldSelect" className="control-label">
            Filtrar por:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', minWidth: 0 }}>
            <select 
              id="filterFieldSelect" 
              value={filterField} 
              onChange={(e) => setFilterField(e.target.value)} 
              className="control-select"
              style={{ width: '100%' }}
            >
              {filterFields.map(field => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
            <input 
              id="filterValueInput" 
              type="text" 
              value={filterValue} 
              onChange={(e) => setFilterValue(e.target.value)} 
              placeholder={`Buscar por ${getFieldLabel(filterField)}...`} 
              className="control-input" 
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: '200px' }}>
        <Map
          ref={mapRef}
          geojson={generateGeoJSON()}
          editable={false}
          onGeometryChange={() => {}}
          styleFunction={feature => {
            const value = feature.properties[legendField];
            const color = getColorByFieldValue(value);
            return {
              color,
              weight: 2,
              fillOpacity: 0.6
            };
          }}
        />
      </div>

      {/* Panel de leyenda */}
      <div className="legend-panel" style={{ 
        padding: '12px', 
        borderTop: '1px solid #e5e5e5', 
        backgroundColor: '#f8f9fa',
        maxHeight: '150px',
        overflowY: 'auto'
      }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px', 
          fontWeight: '600', 
          color: 'var(--primary-color)' 
        }}>
          Leyenda: {getFieldLabel(legendField)}
        </h4>
        <ul style={{ 
          listStyle: 'none', 
          padding: '0', 
          margin: '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {[...new Set(filteredPlots.map(p => p[legendField]).filter(Boolean))].map((val) => (
            <li key={val} style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '12px'
            }}>
              <span
                style={{
                  backgroundColor: getColorByFieldValue(val),
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  marginRight: '8px',
                  borderRadius: '2px',
                  border: '1px solid rgba(0,0,0,0.2)'
                }}
              ></span>
              {getValueLabel(legendField, val)}
            </li>
          ))}
        </ul>
        {filteredPlots.length > 0 && (
          <div style={{ 
            marginTop: '8px', 
            fontSize: '11px', 
            color: '#666',
            borderTop: '1px solid #e5e5e5',
            paddingTop: '6px'
          }}>
            Mostrando {filteredPlots.length} de {plots.length} parcelas
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotMapComponent;