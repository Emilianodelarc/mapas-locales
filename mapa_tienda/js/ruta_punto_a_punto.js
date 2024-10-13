
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('../service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.error('Error al registrar el Service Worker:', error);
            });
    });
}

var map = L.map('map').setView([-34.6037, -58.3816], 5);

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
                html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%;"></div>`
            })
        }).bindPopup(`ID: ${local.Identificador}<br>Category: ${local.Categoria}<br>Origen:${local.CD_ORIGEN}`);

        // Agregar evento de clic al marcador
        marker.on('click', function () {
            // Verificar si la categoría es "Zonas Peligrosas" o "Paradas Seguras"
            if (local.Categoria === 'Zonas Peligrosas' || local.Categoria === 'Paradas Seguras') {
                return; // No hacer nada si la categoría es una de estas
            }
            // Agregar la coordenada del marcador a la ruta seleccionada
            selectedRoute.push([local.Longitud, local.Latitud]);

            // Dibujar la ruta si hay al menos 2 puntos seleccionados
            if (selectedRoute.length > 1) {
                drawRoute(selectedRoute);
            }
        });

        markers.push({ marker, turno: local.Turnos, category: local.Categoria, origin: local.CD_ORIGEN, id: local.Identificador, ruta: local.RUTA, envioRecep: local.DIAS_SUGERIDO });
    });

    filterMarkers();
}



// Inicializa un array para almacenar las coordenadas de la ruta seleccionada
let selectedRoute = [];

// Función para obtener el color de la línea basado en el número de puntos
function getColorForRoute(pointCount) {
    if (pointCount <= 2) {
        return 'blue';  // Color para 1 o 2 puntos
    } else if (pointCount <= 4) {
        return 'violet'; // Color para 3 o 4 puntos
    } else {
        return 'pink';   // Color para más de 4 puntos
    }
}

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
            console.log(data);
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
            // Obtener el color para la nueva ruta
            const color = getColorForRoute(routeCoordinates.length);


            // Dibujar la línea de la nueva ruta
            routeLine = L.polyline(latLngs, { color: color, weight: 4 }).addTo(map);

            // Mostrar distancia al pasar el mouse
            routeLine.on('mouseover', function () {
                L.popup()
                    .setLatLng(routeLine.getBounds().getCenter()) // Centrar el popup sobre la línea
                    .setContent(`Distancia: ${(distance / 1000).toFixed(2)} km<br>Duración: ${duration}`) // Convertir a km
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
    if (selectedRoute.length > 0) {
        // Eliminar el último punto
        selectedRoute = []

        // Redibujar la ruta
        map.removeLayer(routeLine)
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
    var count = 0;
    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (selectedTurno === "" || markerObj.turno === selectedTurno) &&
            (selectedCategoria === "" || markerObj.category === selectedCategoria) &&
            (selectedOrigen === "" || markerObj.origin === selectedOrigen) &&
            (selectedRuta === "" || markerObj.ruta === selectedRuta) &&
            (selectedEnvioRecep === "" || markerObj.envioRecep === selectedEnvioRecep);

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

    filterMarkers();
}

// Mostrar el loading y cargar los datos del fetch
document.getElementById('loadingContainer').style.display = 'block';

fetch('https://script.google.com/macros/s/AKfycbyQNrNj6u4ISk8jyO8xoLl48atIqrYr_f3X_LZIMLtpRBtwCbpeWhRMuQ6fkX29Uq8/exec')
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
        });

        loadMarkers(data.datos);
        document.getElementById('loadingContainer').style.display = 'none';
        div_map.style.display = 'block';

    })
    .catch(error => {
        console.error('Error loading data:', error);
    });

