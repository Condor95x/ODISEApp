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

    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            // Inicializar el mapa
            mapInstanceRef.current = L.map(mapRef.current).setView([-31.65394, -68.49125], 13);
            L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                attribution: '© <a href="https://www.google.com/maps">Google Maps</a>',
                maxZoom: 20
            }).addTo(mapInstanceRef.current);

            // IMPORTANTE: Agregar drawnItems al mapa ANTES de crear el control de dibujo
            mapInstanceRef.current.addLayer(drawnItemsRef.current);

            // Agregar control de dibujo
            const drawControl = new L.Control.Draw({
                edit: { 
                    featureGroup: drawnItemsRef.current,
                    remove: true // Permitir eliminar
                },
                draw: { 
                    polygon: {
                        allowIntersection: false, // Evitar intersecciones
                        showArea: true // Mostrar área
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

            // Evento para centrar el mapa al seleccionar ubicación
            geocoder.on('markgeocode', (e) => {
                mapInstanceRef.current.setView(e.geocode.center, 15);
            });

            // Eventos de dibujo - CORREGIDOS
            mapInstanceRef.current.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                
                // Agregar la capa al grupo de elementos dibujados
                drawnItemsRef.current.addLayer(layer);
                
                // Asegurar que la capa sea visible
                if (!mapInstanceRef.current.hasLayer(drawnItemsRef.current)) {
                    mapInstanceRef.current.addLayer(drawnItemsRef.current);
                }
                
                // Llamar al callback con la geometría
                if (onGeometryChange) {
                    onGeometryChange(layer.toGeoJSON());
                }
                
                // Centrar el mapa al dibujar
                centerMapToLayer(layer);
                
                console.log('Parcela dibujada y agregada al mapa', layer.toGeoJSON());
            });

            mapInstanceRef.current.on(L.Draw.Event.EDITED, (e) => {
                e.layers.eachLayer(layer => {
                    if (onGeometryChange) {
                        onGeometryChange(layer.toGeoJSON());
                    }
                    centerMapToLayer(layer);
                });
                console.log('Parcela editada');
            });

            mapInstanceRef.current.on(L.Draw.Event.DELETED, (e) => {
                // Obtener todas las geometrías restantes
                const remainingGeometries = drawnItemsRef.current.toGeoJSON();
                if (onGeometryChange) {
                    onGeometryChange(remainingGeometries);
                }
                console.log('Parcela eliminada');
            });

            // Eventos adicionales para debug
            mapInstanceRef.current.on(L.Draw.Event.DRAWSTART, () => {
                console.log('Iniciando dibujo...');
            });

            mapInstanceRef.current.on(L.Draw.Event.DRAWSTOP, () => {
                console.log('Dibujo finalizado');
            });
        }

        // Procesar GeoJSON - MEJORADO
        if (geojson && mapInstanceRef.current) {
            // Limpiar capas existentes
            drawnItemsRef.current.clearLayers();
            let hasNewData = false;

            try {
                // Verificar si geojson tiene features
                if (geojson.features && geojson.features.length > 0) {
                    L.geoJSON(geojson, {
                        style: {
                            color: '#3388ff',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.2
                        }
                    }).eachLayer(layer => {
                        drawnItemsRef.current.addLayer(layer);
                        hasNewData = true;
                    });
                } else if (geojson.type === 'Feature') {
                    // Si es una sola feature
                    const layer = L.geoJSON(geojson, {
                        style: {
                            color: '#3388ff',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.2
                        }
                    });
                    drawnItemsRef.current.addLayer(layer);
                    hasNewData = true;
                }

                // Asegurar que drawnItems esté en el mapa
                if (!mapInstanceRef.current.hasLayer(drawnItemsRef.current)) {
                    mapInstanceRef.current.addLayer(drawnItemsRef.current);
                }

                // Ajustar vista solo una vez
                if (hasNewData && !zoomAdjustedRef.current && drawnItemsRef.current.getLayers().length > 0) {
                    const bounds = drawnItemsRef.current.getBounds();
                    if (bounds.isValid()) {
                        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
                        zoomAdjustedRef.current = true;
                    }
                }
            } catch (error) {
                console.error('Error procesando GeoJSON:', error);
            }
        }

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                zoomAdjustedRef.current = false;
            }
        };
    }, [geojson, onGeometryChange]);

    // Función para centrar el mapa sobre la capa
    const centerMapToLayer = (layer) => {
        try {
            let bounds;
            
            if (layer.getBounds) {
                bounds = layer.getBounds();
            } else if (layer.getLatLng) {
                // Para markers
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
    };

    return (
        <div 
            id="map" 
            ref={mapRef} 
            style={{ 
                height: '400px', 
                width: '100%',
                position: 'relative',
                zIndex: 1
            }}
        />
    );
};

export default Map;