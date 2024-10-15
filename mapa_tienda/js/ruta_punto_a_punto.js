
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('../service-worker.js')
            .then(registration => {
                //console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.error('Error al registrar el Service Worker:', error);
            });
    });
}

// var map = L.map('map').setView([-34.6037, -58.3816], 5);
var map = L.map('map', {
    center: [-34.6037, -58.3816], // Coordenadas de CABA
    zoom: 10, // Nivel de zoom adecuado para ver GBA y CABA
    // maxBounds: [
    //     [-35.05, -58.85], // Suroeste de GBA
    //     [-34.35, -57.85]  // Noreste de GBA
    // ], // Limites visibles (bounding box)
    // maxBoundsViscosity: 1.0 // Impide que el mapa salga de los límites
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
}).addTo(map);

var markers = [];
let div_map = document.querySelector('#map')
div_map.style.display = 'none'

function loadMarkers(data) {
    data.forEach(function (local) {
        var color = (local.Categoria == 'Paradas Seguras')
            ? 'yellow'
            : (local.Categoria == 'Zonas Peligrosas')
                ? 'red'
                : (local.Turnos === 'primera_ventana')
                    ? 'blue'
                    : 'green';
        var marker = L.marker([local?.Latitud, local?.Longitud], {
            icon: L.divIcon({
                className: "custom-icon",
                html: `<span style="color: ${color};" class="material-icons">location_on</span><span style="background:aqua">${local.Identificador}</span>`,
                iconSize: [30, 30],
            })
        }).bindPopup(`ID: ${local.Identificador}<br>Category: ${local.Categoria}<br>Origen:${local.CD_ORIGEN}`);

        markers.push({ marker, turno: local.Turnos, category: local.Categoria, origin: local.CD_ORIGEN, id: local.Identificador, ruta: local.RUTA, envioRecep: local.DIAS_SUGERIDO,viaje_tms: local.VIAJE_TMS, transporte:local.TRANSPORTE, fechaEntrega:local.FECHA_ENTREGA });
    });

    filterMarkers();
}

let inputFecha = document.getElementById('fechaEntrega')
const hoy = new Date().toISOString().split('T')[0];
inputFecha.value = hoy

// inputFecha.addEventListener('change', function () {
//     //console.log(inputFecha.value)
// })

// Inicializa un array para almacenar las coordenadas de la ruta seleccionada
let selectedRoute = [];
let transporte_TMS;
let selecViajesTMS = document.getElementById('selectViajes');
selecViajesTMS.addEventListener('change', function () {
    filterMarkers()
    let seViaTMS = markers.filter(obj=> obj.viaje_tms == selecViajesTMS.value)
    transporte_TMS = seViaTMS[0].transporte
    
    // Obtén las coordenadas de los marcadores filtrados
    if (seViaTMS.length > 0) {
        // Extraer solo las coordenadas de los marcadores filtrados
        const routeCoordinates = seViaTMS.map(mk => {
            const latLng = mk.marker.getLatLng();
            return [latLng.lng, latLng.lat];  // Invertir el orden: [lng, lat]
        });
        // //console.log(routeCoordinates);
        // Llamar a la función para dibujar la ruta con las coordenadas obtenidas
        drawRoute(routeCoordinates);
    } else {
        console.error('No se encontraron coordenadas para la ruta seleccionada.');
    }
})

var routeLine;

// Función para dibujar la ruta en el mapa
function drawRoute(routeCoordinates) {
    // API Key de OpenRouteService (coloca aquí tu propia API key)
    const apiKey = '5b3ce3597851110001cf6248a70894e2480c4f3d9bb911c80b5f7d46';

    // Crear la URL para la solicitud de ruta a OpenRouteService, usando las coordenadas seleccionadas
    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car`;

    // Cuerpo de la solicitud en formato JSON
    const body = {
        coordinates: routeCoordinates,
        format: 'geojson'
    };

    // Realizar la solicitud de la ruta
    fetch(orsUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
        },
        body: JSON.stringify(body)
    })
        .then(response => response.json())
        .then(data => {
            // console.log(data);
            const route = data.routes[0].geometry;

            // Decodificar la geometría
            const latLngs = decodePolyline(route);

            // Obtener la distancia de la ruta
            const distance = data.routes[0].summary.distance; // Distancia en metros
            let durationInSeconds = data.routes[0].summary.duration; // Duración en segundos

            // Calcular horas y minutos
            let hours = Math.floor(durationInSeconds / 3600);
            let minutes = Math.floor((durationInSeconds % 3600) / 60);

            // Formatear la duración como una cadena legible
            let duration = `${hours}h ${minutes}m`; // Ejemplo: "1h 30m"

            // Limpiar rutas anteriores
            map.eachLayer(layer => {
                if (layer instanceof L.Polyline) {
                    map.removeLayer(layer);
                }
            });

            // Dibujar la línea de la nueva ruta
            routeLine = L.polyline(latLngs, { color: '#050502', weight: 4 }).addTo(map);

            // Mostrar distancia al pasar el mouse
            routeLine.on('mouseover', function () {
                L.popup()
                    .setLatLng(routeLine.getBounds().getCenter()) // Centrar el popup sobre la línea
                    .setContent(`Distancia: ${(distance / 1000).toFixed(2)} km<br>Duración: ${duration}<br>Transporte: ${transporte_TMS}`) // Convertir a km
                    .openOn(map);
            });
        })
        .catch(error => console.error('Error al cargar la ruta:', error));
}

// Función para decodificar la polilínea
function decodePolyline(polyline) {
    const coordinates = [];
    let index = 0, len = polyline.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = polyline.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result >> 1) ^ -(result & 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = polyline.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result >> 1) ^ -(result & 1));
        lng += dlng;

        coordinates.push([lat / 1E5, lng / 1E5]);
    }

    return coordinates;
}

document.getElementById('removeLastPoint').addEventListener('click', function () {
    if (routeLine) {  // Verifica si existe una ruta dibujada
        // Eliminar la línea de la ruta del mapa
        map.removeLayer(routeLine);
        routeLine = null;  // Reinicia la variable para indicar que no hay ruta
    } else {
        Toastify({
            text: "No hay rutas para eliminar.",
            className: "warning",
            style: {
                background: "#ffcc00",
            }
        }).showToast();
    }
});


// Agregar el evento de clic en el botón de búsqueda
document.getElementById('searchButton').addEventListener('click', function () {
    const searchValue = document.getElementById('searchInput').value;
    if (searchValue != "") {
        document.getElementById('reset').style.display = 'block'
        markers.forEach(function (markerObj) {
            var marker = markerObj.marker;
            var showMarker = markerObj.id == searchValue;

            if (showMarker) {
                map.addLayer(marker);
            } else {
                map.removeLayer(marker);
            }
        });

        let noexiste = markers.some(mark => mark.id == searchValue);
        if (!noexiste) {
            Toastify({
                text: "No se encontró ningún local.",
                className: "warning",
                style: {
                    background: "#ffcc00",
                }
            }).showToast();
        }
    } else {
        Toastify({
            text: "El campo de búsqueda está vacío.",
            className: "danger",
            style: {
                background: "red",
            }
        }).showToast();
    }
});

// Evento para restablecer la búsqueda
document.getElementById('reset').addEventListener('click', function () {
    let searchValue = document.getElementById('searchInput').value;
    document.getElementById('searchInput').value = "";
    searchValue = "";
    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (searchValue === "" || markerObj.id == searchValue);
        if (showMarker) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
    document.getElementById('reset').style.display = 'none';
    Toastify({
        text: "Se restableció la búsqueda.",
        className: "info"
    }).showToast();
});

function filterMarkers() {
    var selectedTurno = document.getElementById("turnoFilter").value;
    var selectedCategoria = document.getElementById("categoriaFilter").value;
    var selectedOrigen = document.getElementById("origenFilter").value;
    var selectedRuta = document.getElementById("ruta").value;
    var selectedEnvioRecep = document.getElementById("envioDia").value;
    var selectedViaje = document.getElementById("selectViajes").value;
    var selectedTransporte = document.getElementById("selectTransporte").value;
    var fechaEntregaInput = document.getElementById("fechaEntrega").value;
    //console.log(fechaEntregaInput);
    const valorFormateado = fechaEntregaInput.replace(/-/g, ''); 
    var count = 0;
    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (selectedTurno === "" || markerObj.turno === selectedTurno) &&
            (selectedCategoria === "" || markerObj.category === selectedCategoria) &&
            (selectedOrigen === "" || markerObj.origin === selectedOrigen) &&
            (selectedRuta === "" || markerObj.ruta === selectedRuta) &&
            (selectedEnvioRecep === "" || markerObj.envioRecep === selectedEnvioRecep) &&
            (selectedViaje === "" || markerObj.viaje_tms == selectedViaje) && 
            (selectedTransporte === "" || markerObj.transporte == selectedTransporte) && 
            (valorFormateado == "" || markerObj.fechaEntrega == valorFormateado);

        if (showMarker) {
            map.addLayer(marker);
            count++;
        } else {
            map.removeLayer(marker);
        }
    });
    document.getElementById("markerCount").innerText = count;
}

function resetFilters() {
    document.querySelectorAll('.filters select').forEach(select => {
        select.value = "";
    });

    document.getElementById("searchInput").value = "";

    if (routeLine) {  // Verifica si existe una ruta dibujada
        // Eliminar la línea de la ruta del mapa
        map.removeLayer(routeLine);
        routeLine = null;  // Reinicia la variable para indicar que no hay ruta
    }

    filterMarkers();
}

// Mostrar el loading y cargar los datos del fetch
document.getElementById('loadingContainer').style.display = 'block';

fetch('https://script.google.com/macros/s/AKfycbzF9ARtSzpEzhQOLbFgWq5FQ--3Abtc1jHMD5ezqPgPD9AX-C8FuLfxqAiUGeR7Chq6/exec')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {

        data.datos.forEach(local => {
            local.Latitud = local.Latitud || 0;
            local.Longitud = local.Longitud || 0;
            local["CD_ORIGEN"] = local["CD ORIGEN"];
            delete local["CD ORIGEN"];
            local["DIAS_SUGERIDO"] = local["DIAS SUGERIDO"];
            delete local["DIAS SUGERIDO"];
            local["VIAJE_TMS"] = local["VIAJE TMS"];
            delete local["VIAJE TMS"];
            local['FECHA_ENTREGA'] = local['FECHA ENTREGA'];
            delete local['FECHA ENTREGA'];
        });
        //console.log(data);
        loadMarkers(data.datos);
        document.getElementById('loadingContainer').style.display = 'none';
        div_map.style.display = 'block';

        // Obtener los valores únicos de viajes_tms
        let viajesUnicos = [...new Set(data.datos.map(item => item.VIAJE_TMS))];

        // Crear el elemento select
        let select = document.getElementById('selectViajes');

        // Añadir los options al select
        viajesUnicos.forEach(viaje => {
            let option = document.createElement('option');
            option.value = viaje;
            option.text = viaje;
            select.appendChild(option);
        });
        // Obtener los valores únicos de selectTransporte
        let transporte = [...new Set(data.datos.map(item => item.TRANSPORTE))];

        // Crear el elemento select
        let selectTRans = document.getElementById('selectTransporte');

        // Añadir los options al select
        transporte.forEach(transp => {
            let option = document.createElement('option');
            option.value = transp;
            option.text = transp;
            selectTRans.appendChild(option);
        });

        

    })
    .catch(error => {
        console.error('Error loading data:', error);
    });

