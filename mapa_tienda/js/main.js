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
let div_map = document.querySelector('#map')
div_map.style.display = 'none'

function loadMarkers(data) {
    data.forEach(function (local) {
        var color = local.Turnos === 'primera_ventana' ? 'blue' : 'green';
        var marker = L.marker([local?.Latitud, local?.Longitud], {
            icon: L.divIcon({
                className: "custom-icon",
                html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%;"></div>`
            })
        }).bindPopup(`ID: ${local.Identificador}<br>Category: ${local.Categoria}<br>Origen:${local.CD_ORIGEN}`);

        markers.push({ marker, turno: local.Turnos, category: local.Categoria, origin: local.CD_ORIGEN, id: local.Identificador });
    });

    filterMarkers();
}
document.getElementById('searchButton').addEventListener('click', function () {
    const searchValue = document.getElementById('searchInput').value;
    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (searchValue === "" || markerObj.id == searchValue)

        if (showMarker) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
});

function filterMarkers() {
    var selectedTurno = document.getElementById("turnoFilter").value;
    var selectedCategoria = document.getElementById("categoriaFilter").value;
    var selectedOrigen = document.getElementById("origenFilter").value;

    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (selectedTurno === "" || markerObj.turno === selectedTurno) &&
            (selectedCategoria === "" || markerObj.category == selectedCategoria) &&
            (selectedOrigen === "" || markerObj.origin === selectedOrigen);

        if (showMarker) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
}

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
        });
        loadMarkers(data.datos)
        document.getElementById('loadingContainer').style.display = 'none';
        div_map.style.display = 'block'
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });



