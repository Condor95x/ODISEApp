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
    const zoomAdjustedRef = useRef(false); // Evitar zoom infinito

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
                onGeometryChange(layer.toGeoJSON());
                centerMapToLayer(layer); // Centrar el mapa al dibujar
            });

            mapInstanceRef.current.on(L.Draw.Event.EDITED, (e) => {
                e.layers.eachLayer(layer => {
                    onGeometryChange(layer.toGeoJSON());
                    centerMapToLayer(layer); // Centrar el mapa después de editar
                });
            });

            mapInstanceRef.current.on(L.Draw.Event.DELETED, () => {
                onGeometryChange(drawnItemsRef.current.toGeoJSON());
            });
        }

        // Procesar GeoJSON
        if (geojson && mapInstanceRef.current) {
            drawnItemsRef.current.clearLayers();
            let hasNewData = false;

            L.geoJSON(geojson).eachLayer(layer => {
                drawnItemsRef.current.addLayer(layer);
                hasNewData = true;
            });

            // Solo hacer fitBounds una vez
            if (hasNewData && !zoomAdjustedRef.current && drawnItemsRef.current.getLayers().length > 0) {
                const bounds = drawnItemsRef.current.getBounds();
                if (bounds.isValid()) {
                    mapInstanceRef.current.fitBounds(bounds);
                    zoomAdjustedRef.current = true; // Evitar zoom repetitivo
                }
            }

            // Centrar el mapa sobre el centro de la geometría al visualizar
            if (hasNewData) {
                const bounds = drawnItemsRef.current.getBounds();
                if (bounds.isValid()) {
                    const center = bounds.getCenter();
                    mapInstanceRef.current.setView(center, 15); // Ajustar el zoom y centrar
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
        if (bounds.isValid()) { // Verificación para asegurar que los límites sean válidos
            const center = bounds.getCenter();
            mapInstanceRef.current.setView(center, 15); // Centrar el mapa sobre el centro de la geometría
        }
    };

    return <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }}></div>;
};

export default Map;