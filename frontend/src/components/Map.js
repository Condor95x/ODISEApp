import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet-control-geocoder';
import "leaflet-control-geocoder/dist/Control.Geocoder.css";

const Map = ({ geojson, onGeometryChange }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(new L.FeatureGroup());
    const zoomAdjustedRef = useRef(false);
    const tempLayerRef = useRef(null); // Para mantener referencia de la capa temporal

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
                draw: { 
                    polygon: true, 
                    polyline: false, 
                    rectangle: false, 
                    circle: false, 
                    marker: false, 
                    circlemarker: false 
                }
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

            // Eventos de dibujo mejorados
            mapInstanceRef.current.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                
                // Limpiar cualquier capa temporal anterior
                if (tempLayerRef.current) {
                    drawnItemsRef.current.removeLayer(tempLayerRef.current);
                }
                
                // Agregar la nueva capa y mantener referencia
                drawnItemsRef.current.addLayer(layer);
                tempLayerRef.current = layer;
                
                // Notificar el cambio (esto debería manejar la lógica de "pendiente de confirmación")
                onGeometryChange(layer.toGeoJSON());
                centerMapToLayer(layer);
            });

            mapInstanceRef.current.on(L.Draw.Event.EDITED, (e) => {
                e.layers.eachLayer(layer => {
                    onGeometryChange(layer.toGeoJSON());
                    centerMapToLayer(layer);
                });
            });

            mapInstanceRef.current.on(L.Draw.Event.DELETED, () => {
                tempLayerRef.current = null;
                onGeometryChange(drawnItemsRef.current.toGeoJSON());
            });

            // Evento cuando se inicia el dibujo (opcional)
            mapInstanceRef.current.on(L.Draw.Event.DRAWSTART, () => {
                // Limpiar capa temporal si existe
                if (tempLayerRef.current) {
                    drawnItemsRef.current.removeLayer(tempLayerRef.current);
                    tempLayerRef.current = null;
                }
            });
        }

        // Procesar GeoJSON - Mejorado para evitar conflictos
        if (geojson && mapInstanceRef.current) {
            // Solo limpiar si no es una capa temporal
            if (!tempLayerRef.current) {
                drawnItemsRef.current.clearLayers();
            }
            
            let hasNewData = false;

            // Verificar si el GeoJSON es diferente al temporal
            const isTemporaryGeometry = tempLayerRef.current && 
                JSON.stringify(tempLayerRef.current.toGeoJSON()) === JSON.stringify(geojson);

            if (!isTemporaryGeometry) {
                // Limpiar todo incluyendo temporales
                drawnItemsRef.current.clearLayers();
                tempLayerRef.current = null;

                L.geoJSON(geojson).eachLayer(layer => {
                    drawnItemsRef.current.addLayer(layer);
                    hasNewData = true;
                });

                // Solo hacer fitBounds una vez para datos nuevos (no temporales)
                if (hasNewData && !zoomAdjustedRef.current && drawnItemsRef.current.getLayers().length > 0) {
                    const bounds = drawnItemsRef.current.getBounds();
                    if (bounds.isValid()) {
                        mapInstanceRef.current.fitBounds(bounds);
                        zoomAdjustedRef.current = true;
                    }
                }

                // Centrar el mapa sobre el centro de la geometría al visualizar
                if (hasNewData) {
                    const bounds = drawnItemsRef.current.getBounds();
                    if (bounds.isValid()) {
                        const center = bounds.getCenter();
                        mapInstanceRef.current.setView(center, 15);
                    }
                }
            }
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [geojson, onGeometryChange]);

    // Función para centrar el mapa sobre la capa (parcela)
    const centerMapToLayer = (layer) => {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
            const center = bounds.getCenter();
            mapInstanceRef.current.setView(center, 15);
        }
    };

    // Función para confirmar la geometría (llamar desde el componente padre)
    const confirmGeometry = () => {
        if (tempLayerRef.current) {
            // La geometría ya está en el mapa, solo limpiar la referencia temporal
            tempLayerRef.current = null;
            zoomAdjustedRef.current = false; // Permitir ajuste de zoom para futuras geometrías
        }
    };

    // Función para cancelar la geometría (llamar desde el componente padre)
    const cancelGeometry = () => {
        if (tempLayerRef.current) {
            drawnItemsRef.current.removeLayer(tempLayerRef.current);
            tempLayerRef.current = null;
        }
    };

    // Exponer funciones al componente padre (opcional)
    React.useImperativeHandle(mapRef, () => ({
        confirmGeometry,
        cancelGeometry
    }));

    return <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }}></div>;
};

export default Map;