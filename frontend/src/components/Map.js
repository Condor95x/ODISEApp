import React, { useEffect, useRef, useCallback } from 'react';
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
    const isInitializedRef = useRef(false);

    // Función para forzar el re-renderizado del mapa
    const forceMapUpdate = useCallback(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
                // Forzar re-dibujado de las capas
                if (drawnItemsRef.current) {
                    mapInstanceRef.current.removeLayer(drawnItemsRef.current);
                    mapInstanceRef.current.addLayer(drawnItemsRef.current);
                }
            }, 100);
        }
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            // Inicializar el mapa
            mapInstanceRef.current = L.map(mapRef.current, {
                preferCanvas: true, // Mejor rendimiento
                zoomControl: true,
                attributionControl: true
            }).setView([-31.65394, -68.49125], 13);

            L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                attribution: '© <a href="https://www.google.com/maps">Google Maps</a>',
                maxZoom: 20
            }).addTo(mapInstanceRef.current);

            // IMPORTANTE: Agregar drawnItems al mapa ANTES de crear el control de dibujo
            mapInstanceRef.current.addLayer(drawnItemsRef.current);

            // Agregar control de dibujo con configuración mejorada
            const drawControl = new L.Control.Draw({
                edit: { 
                    featureGroup: drawnItemsRef.current,
                    remove: true,
                    edit: {
                        selectedPathOptions: {
                            maintainColor: true,
                            opacity: 0.8,
                            dashArray: '10, 10',
                            fill: true,
                            fillColor: '#fe57a1',
                            fillOpacity: 0.1,
                            weight: 3
                        }
                    }
                },
                draw: { 
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        drawError: {
                            color: '#e1e100',
                            message: '<strong>Error:</strong> Las líneas no pueden cruzarse!'
                        },
                        shapeOptions: {
                            color: '#3388ff',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.3,
                            fillColor: '#3388ff'
                        }
                    }, 
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

            geocoder.on('markgeocode', (e) => {
                mapInstanceRef.current.setView(e.geocode.center, 15);
            });

            // Eventos de dibujo - MEJORADOS con persistencia
            mapInstanceRef.current.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                
                console.log('Evento CREATED disparado', layer);
                
                // Configurar estilo persistente
                if (layer.setStyle) {
                    layer.setStyle({
                        color: '#3388ff',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.3,
                        fillColor: '#3388ff'
                    });
                }
                
                // Agregar la capa al grupo ANTES de notificar
                drawnItemsRef.current.addLayer(layer);
                
                // Verificar que esté agregado correctamente
                console.log('Capas en drawnItems después de agregar:', drawnItemsRef.current.getLayers().length);
                
                // Asegurar visibilidad
                if (!mapInstanceRef.current.hasLayer(drawnItemsRef.current)) {
                    mapInstanceRef.current.addLayer(drawnItemsRef.current);
                }
                
                // Forzar actualización visual
                forceMapUpdate();
                
                // Llamar al callback con la geometría
                if (onGeometryChange) {
                    const geoJson = layer.toGeoJSON();
                    console.log('Enviando geometría al callback:', geoJson);
                    onGeometryChange(geoJson);
                }
                
                // Centrar el mapa
                centerMapToLayer(layer);
                
                console.log('Parcela dibujada y procesada completamente');
            });

            mapInstanceRef.current.on(L.Draw.Event.EDITED, (e) => {
                console.log('Evento EDITED disparado');
                e.layers.eachLayer(layer => {
                    // Mantener estilo después de edición
                    if (layer.setStyle) {
                        layer.setStyle({
                            color: '#3388ff',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.3,
                            fillColor: '#3388ff'
                        });
                    }
                    
                    if (onGeometryChange) {
                        onGeometryChange(layer.toGeoJSON());
                    }
                    centerMapToLayer(layer);
                });
                forceMapUpdate();
                console.log('Parcela editada');
            });

            mapInstanceRef.current.on(L.Draw.Event.DELETED, (e) => {
                console.log('Evento DELETED disparado');
                const remainingGeometries = drawnItemsRef.current.toGeoJSON();
                if (onGeometryChange) {
                    onGeometryChange(remainingGeometries);
                }
                forceMapUpdate();
                console.log('Parcela eliminada');
            });

            // Eventos adicionales para debugging
            mapInstanceRef.current.on(L.Draw.Event.DRAWSTART, () => {
                console.log('Iniciando dibujo...');
            });

            mapInstanceRef.current.on(L.Draw.Event.DRAWSTOP, () => {
                console.log('Dibujo finalizado');
                // Asegurar que las capas estén visibles después del dibujo
                setTimeout(forceMapUpdate, 50);
            });

            // Evento para detectar cambios de tamaño del modal
            mapInstanceRef.current.on('resize', forceMapUpdate);

            isInitializedRef.current = true;
            
            // Forzar actualización inicial
            setTimeout(forceMapUpdate, 100);
        }

        // Procesar GeoJSON - MEJORADO con mejor manejo
        if (geojson && mapInstanceRef.current && isInitializedRef.current) {
            console.log('Procesando GeoJSON:', geojson);
            
            // Solo limpiar si hay nuevo GeoJSON diferente
            const currentLayers = drawnItemsRef.current.getLayers();
            let shouldUpdate = true;
            
            // Verificación básica para evitar limpiar innecesariamente
            if (currentLayers.length === 1 && geojson.type === 'Feature') {
                try {
                    const existingGeoJson = currentLayers[0].toGeoJSON();
                    if (JSON.stringify(existingGeoJson.geometry) === JSON.stringify(geojson.geometry)) {
                        shouldUpdate = false;
                    }
                } catch (error) {
                    console.log('Error comparando geometrías, actualizando de todos modos');
                }
            }

            if (shouldUpdate) {
                drawnItemsRef.current.clearLayers();
                let hasNewData = false;

                try {
                    if (geojson.features && geojson.features.length > 0) {
                        L.geoJSON(geojson, {
                            style: {
                                color: '#3388ff',
                                weight: 3,
                                opacity: 0.8,
                                fillOpacity: 0.3,
                                fillColor: '#3388ff'
                            }
                        }).eachLayer(layer => {
                            drawnItemsRef.current.addLayer(layer);
                            hasNewData = true;
                        });
                    } else if (geojson.type === 'Feature' && geojson.geometry) {
                        const layer = L.geoJSON(geojson, {
                            style: {
                                color: '#3388ff',
                                weight: 3,
                                opacity: 0.8,
                                fillOpacity: 0.3,
                                fillColor: '#3388ff'
                            }
                        });
                        layer.eachLayer(subLayer => {
                            drawnItemsRef.current.addLayer(subLayer);
                        });
                        hasNewData = true;
                    }

                    // Asegurar visibilidad
                    if (!mapInstanceRef.current.hasLayer(drawnItemsRef.current)) {
                        mapInstanceRef.current.addLayer(drawnItemsRef.current);
                    }

                    // Ajustar vista solo una vez por sesión
                    if (hasNewData && !zoomAdjustedRef.current && drawnItemsRef.current.getLayers().length > 0) {
                        const bounds = drawnItemsRef.current.getBounds();
                        if (bounds.isValid()) {
                            mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
                            zoomAdjustedRef.current = true;
                        }
                    }

                    // Forzar actualización visual
                    forceMapUpdate();
                    
                    console.log('GeoJSON procesado exitosamente, capas actuales:', drawnItemsRef.current.getLayers().length);
                } catch (error) {
                    console.error('Error procesando GeoJSON:', error);
                }
            }
        }
    }, [geojson, onGeometryChange, forceMapUpdate]);

    // Efecto para manejar cambios de visibilidad del modal
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && mapInstanceRef.current) {
                forceMapUpdate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // También escuchar eventos de resize del window
        const handleResize = () => forceMapUpdate();
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('resize', handleResize);
        };
    }, [forceMapUpdate]);

    // Función mejorada para centrar el mapa
    const centerMapToLayer = useCallback((layer) => {
        try {
            let bounds;
            
            if (layer.getBounds && typeof layer.getBounds === 'function') {
                bounds = layer.getBounds();
            } else if (layer.getLatLng && typeof layer.getLatLng === 'function') {
                const latLng = layer.getLatLng();
                bounds = L.latLngBounds([latLng, latLng]);
            }
            
            if (bounds && bounds.isValid()) {
                const center = bounds.getCenter();
                mapInstanceRef.current.setView(center, Math.max(mapInstanceRef.current.getZoom(), 15));
            }
        } catch (error) {
            console.error('Error centrando el mapa:', error);
        }
    }, []);

    // Cleanup mejorado
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.off(); // Remover todos los event listeners
                    mapInstanceRef.current.remove();
                } catch (error) {
                    console.error('Error durante cleanup:', error);
                } finally {
                    mapInstanceRef.current = null;
                    isInitializedRef.current = false;
                    zoomAdjustedRef.current = false;
                }
            }
        };
    }, []);

    return (
        <div 
            id="map" 
            ref={mapRef} 
            style={{ 
                height: '400px', 
                width: '100%',
                position: 'relative',
                zIndex: 1,
                backgroundColor: '#f0f0f0' // Fondo para debug visual
            }}
        />
    );
};

export default Map;