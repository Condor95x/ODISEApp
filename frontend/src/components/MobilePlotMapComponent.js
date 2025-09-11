import React, { useState, useEffect, useRef } from 'react';
import Map from '../components/Map';
import { getPlotsWithData } from '../services/api';
import { wktToGeoJSON } from '../components/TablePlots';

const filterFields = [
  { key: 'plot_var', label: 'Variedad', metadataKey: 'varieties' },
  { key: 'plot_management', label: 'Manejo', metadataKey: 'management' },
  { key: 'sector_id', label: 'Sector', metadataKey: 'sectors' },
  { key: 'plot_conduction', label: 'Conducción', metadataKey: 'conduction' },
  { key: 'plot_rootstock', label: 'Portainjerto', metadataKey: 'rootstocks' }
];


// Componente móvil integrado
const MobilePlotMapComponent = () => {
  const mapRef = useRef(null);
  const [plots, setPlots] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [filteredPlots, setFilteredPlots] = useState([]);
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
        metaItem = metadata[field.metadataKey].find(m => m.gv_id === value);
        return metaItem?.name || value;
        
      case 'plot_management':
      case 'plot_conduction':
        metaItem = metadata[field.metadataKey].find(m => m.vy_id === value);
        return metaItem?.value || value;
        
      case 'sector_id':
        metaItem = metadata[field.metadataKey].find(m => m.sector_id === value);
        return metaItem?.etiqueta || value;
        
      default:
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

  // Para móvil, mostramos todas las parcelas sin filtros
  useEffect(() => {
    setFilteredPlots(plots);
  }, [plots]);

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
            ...Object.fromEntries(filterFields.map(f => [f.key, plot[f.key]])),
            plot_var_label: getValueLabel('plot_var', plot.plot_var),
            plot_management_label: getValueLabel('plot_management', plot.plot_management),
            sector_id_label: getValueLabel('sector_id', plot.sector_id),
            plot_conduction_label: getValueLabel('plot_conduction', plot.plot_conduction),
            plot_rootstock_label: getValueLabel('plot_rootstock', plot.plot_rootstock)
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

  if (!metadata) return (
    <div className="mobile-map-layout">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#666',
        fontSize: '14px'
      }}>
        Cargando mapa y datos...
      </div>
    </div>
  );

  const uniqueValues = [...new Set(filteredPlots.map(p => p[legendField]).filter(Boolean))];

  return (
    <div className="mobile-map-layout">
      {/* Panel izquierdo: Selector + Leyenda */}
      <div className="mobile-map-sidebar">
        {/* Selector de leyenda */}
        <div className="mobile-legend-selector">
          <label className="control-label" htmlFor='legendFieldSelect'>Leyenda por:</label>
          <select
            id="legendFieldSelect"
            name='legendFieldSelect'
            value={legendField} 
            onChange={(e) => setLegendField(e.target.value)} 
            className="control-select"
          >
            {filterFields.map(field => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        {/* Leyenda */}
        <div className="mobile-legend-panel">
          <h4>Leyenda: {getFieldLabel(legendField)}</h4>
          <ul>
            {uniqueValues.map((val) => (
              <li key={val}>
                <span
                  style={{
                    backgroundColor: getColorByFieldValue(val)
                  }}
                ></span>
                {getValueLabel(legendField, val)}
              </li>
            ))}
          </ul>
          {filteredPlots.length > 0 && (
            <div className="legend-stats">
              Mostrando {filteredPlots.length} de {plots.length} parcelas
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: Mapa */}
      <div className="mobile-map-area">
        <Map
          //ref={mapRef}
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
    </div>
  );
};

export default MobilePlotMapComponent