if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
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

// Function to load and filter markers
function loadMarkers(data) {
    data.forEach(function (local) {
        var color = local.Turnos === 'primera_ventana' ? 'blue' : 'green';
        // console.log(color);
        var marker = L.marker([local?.Latitud, local?.Longitud], {
            icon: L.divIcon({
                className: "custom-icon",
                html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%;"></div>`
            })
        }).bindPopup(`ID: ${local.Identificador}<br>Category: ${local.Categoria}`);

        markers.push({ marker, turno: local.Turnos, category: local.Categoria, origin: local.CD_ORIGEN });
    });

    filterMarkers(); // Initial filter based on default selections
}

// Function to filter markers based on selected filters
function filterMarkers() {
    var selectedTurno = document.getElementById("turnoFilter").value;
    var selectedCategoria = document.getElementById("categoriaFilter").value;
    var selectedOrigen = document.getElementById("origenFilter").value;

    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (selectedTurno === "" || markerObj.turno === selectedTurno) &&
            (selectedCategoria === "" || markerObj.category.includes(selectedCategoria)) &&
            (selectedOrigen === "" || markerObj.origin === selectedOrigen);

        if (showMarker) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
}

// Load data from JSON file
fetch('js/data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // console.log(data); // Verifica que los datos se carguen correctamente
        data.forEach(local => {
            local.Latitud = local.Latitud || 0;
            local.Longitud = local.Longitud || 0;
        });
        loadMarkers(data); // Llama a la función para cargar los marcadores en el mapa
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });
