import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet-control-geocoder';
import "leaflet-control-geocoder/dist/Control.Geocoder.css";

const Map = forwardRef(({ geojson, onGeometryChange, editable = false, styleFunction, showPopup = true }, ref) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(new L.FeatureGroup());
    const zoomAdjustedRef = useRef(false);
    const [currentGeometry, setCurrentGeometry] = useState(null); // Estado para mantener la geometría actual

    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            // Inicializar el mapa
            mapInstanceRef.current = L.map(mapRef.current).setView([-31.65394, -68.49125], 13);
            L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                attribution: '© <a href="https://www.google.com/maps">Google Maps</a>',
                maxZoom: 20
            }).addTo(mapInstanceRef.current);

            mapInstanceRef.current.addLayer(drawnItemsRef.current);

            // Agregar control de dibujo
            const drawControl = new L.Control.Draw({
                edit: { featureGroup: drawnItemsRef.current },
                draw: { polygon: true, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false }
            });
            mapInstanceRef.current.addControl(drawControl);

            // Geocodificador
            const geocoder = L.Control.geocoder({
                geocoder: new L.Control.Geocoder.nominatim({}),
                defaultMarkGeocode: false
            }).addTo(mapInstanceRef.current);

            const geocoderContainer = geocoder.getContainer();
            geocoderContainer.classList.add('my-geocoder-styles');

            // Evento para centrar el mapa al seleccionar ubicación
            geocoder.on('markgeocode', (e) => {
                mapInstanceRef.current.setView(e.geocode.center, 15);
            });

            // Eventos de dibujo
            mapInstanceRef.current.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                drawnItemsRef.current.addLayer(layer);
                const geoJSON = layer.toGeoJSON();
                
                // Guardar la geometría en el estado local
                setCurrentGeometry(geoJSON);
                
                // Llamar al callback
                onGeometryChange(geoJSON);
                centerMapToLayer(layer);
            });

            mapInstanceRef.current.on(L.Draw.Event.EDITED, (e) => {
                e.layers.eachLayer(layer => {
                    const geoJSON = layer.toGeoJSON();
                    setCurrentGeometry(geoJSON);
                    onGeometryChange(geoJSON);
                    centerMapToLayer(layer);
                });
            });

            mapInstanceRef.current.on(L.Draw.Event.DELETED, (e) => {
                setCurrentGeometry(null);
                onGeometryChange(drawnItemsRef.current.toGeoJSON());
            });

            // Restaurar geometría actual si existe al inicializar
            if (currentGeometry) {
                L.geoJSON(currentGeometry).eachLayer(layer => {
                    drawnItemsRef.current.addLayer(layer);
                });
            }
        }

        // Procesar GeoJSON externo (cuando viene de props)
        if (geojson && mapInstanceRef.current) {
            drawnItemsRef.current.clearLayers();
            let hasNewData = false;

        L.geoJSON(geojson, {
        style: styleFunction || undefined,
        onEachFeature: (feature, layer) => {
            drawnItemsRef.current.addLayer(layer);

            if (showPopup) {
            const props = feature.properties || {};
            const popupContent = `
                <strong>${props.name || 'Parcela'}</strong><br/>
                Variedad: ${props.plot_var || '—'}<br/>
                Manejo: ${props.plot_management || '—'}<br/>
                Sector: ${props.sector_id || '—'}<br/>
                Conducción: ${props.plot_conduction || '—'}<br/>
                Portainjerto: ${props.plot_rootstock || '—'}
            `;

            layer.bindPopup(popupContent);
            layer.on('mouseover', () => layer.openPopup());
            layer.on('mouseout', () => layer.closePopup());
            }
        }
        });


            setCurrentGeometry(geojson);

            if (hasNewData && !zoomAdjustedRef.current && drawnItemsRef.current.getLayers().length > 0) {
                const bounds = drawnItemsRef.current.getBounds();
                if (bounds.isValid()) {
                    mapInstanceRef.current.fitBounds(bounds);
                    zoomAdjustedRef.current = true;
                }
            }

            if (hasNewData) {
                const bounds = drawnItemsRef.current.getBounds();
                if (bounds.isValid()) {
                    const center = bounds.getCenter();
                    mapInstanceRef.current.setView(center, 15);
                }
            }
        }

    }, [geojson, onGeometryChange, currentGeometry]);

    useEffect(() => {
        if (mapInstanceRef.current) {
            const drawControl = mapInstanceRef.current._container.querySelector('.leaflet-draw');
            if (drawControl) {
            drawControl.style.display = editable ? 'block' : 'none';
            }
        }
    }, [editable]);

    // Efecto para restaurar la geometría si el mapa se reinicializa
    useEffect(() => {
        if (mapInstanceRef.current && currentGeometry && drawnItemsRef.current.getLayers().length === 0) {
            L.geoJSON(currentGeometry).eachLayer(layer => {
                drawnItemsRef.current.addLayer(layer);
            });
        }
    }, [currentGeometry]);

    const centerMapToLayer = (layer) => {
        if (layer.getBounds) {
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                const center = bounds.getCenter();
                mapInstanceRef.current.setView(center, 15);
            }
        } else if (layer.getLatLng) {
            // Para markers u otros tipos de capas
            mapInstanceRef.current.setView(layer.getLatLng(), 15);
        }
    };

    // Función para limpiar el mapa manualmente (opcional)
    const clearMap = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            setCurrentGeometry(null);
            onGeometryChange(null);
        }
    };

    // Exponer método para obtener la geometría actual
    useImperativeHandle(ref, () => ({
        getCurrentGeometry: () => currentGeometry,
        clearMap: clearMap
    }));

    return (
        <div>
            <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }}></div>
            {/* Botón opcional para limpiar el mapa */}
            {currentGeometry && (
                <div style={{ marginTop: '10px' }}>
                    <button 
                        onClick={clearMap}
                        style={{
                            padding: '5px 10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        Limpiar Parcela
                    </button>
                </div>
            )}
        </div>
    );
});

export default Map;