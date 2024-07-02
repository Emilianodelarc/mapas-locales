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

let logoExpress = 'https://carrefourar.vtexassets.com/assets/vtex/assets-builder/carrefourar.theme/74.5.0/store-locator/icons/icon-express.svg'

let logoHiper= 'https://carrefourar.vtexassets.com/assets/vtex/assets-builder/carrefourar.theme/74.5.0/store-locator/icons/icon-hipermercado.svg'


var markers = [];
let div_map = document.querySelector('#map')
div_map.style.display = 'none'
// Function to load and filter markers
function loadMarkers(data) {
    data.forEach(function (local) {
        var color = local.Turnos === 'primera_ventana' ? 'blue' : 'green';
        var logo = local.Categoria.includes('Express') ? logoExpress : logoHiper
        var marker = L.marker([local?.Latitud, local?.Longitud], {
            icon: L.divIcon({
                className: "leaflet-div-icon-custom",
                html: `<div style="background-image: url(${logo}); border: 2px solid ${color}; width: 100%; height: 100%; border-radius: 50%;background-repeat: no-repeat;
  background-position: center;"></div>`,
                iconSize: [25, 25], // Ajusta el tamaño si es necesario
                iconAnchor: [12.5, 12.5] // Ajusta el anclaje si es necesario
            })
        }).bindPopup(`ID: ${local.Identificador}<br>Category: ${local.Categoria}<br>Nombre:${local.Nombre}`);

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
// fetch('js/data.json')
//     .then(response => {
//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }
//         return response.json();
//     })
//     .then(data => {
//         // console.log(data); // Verifica que los datos se carguen correctamente
//         data.forEach(local => {
//             local.Latitud = local.Latitud || 0;
//             local.Longitud = local.Longitud || 0;
//         });
//         loadMarkers(data); // Llama a la función para cargar los marcadores en el mapa
//     })
//     .catch(error => {
//         console.error('Error loading data:', error);
//     });


// Muestra el contenedor de carga
document.getElementById('loadingContainer').style.display = 'block';

fetch('https://script.google.com/macros/s/AKfycbyQNrNj6u4ISk8jyO8xoLl48atIqrYr_f3X_LZIMLtpRBtwCbpeWhRMuQ6fkX29Uq8/exec')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // console.log(data); // Verifica que los datos se carguen correctamente
        data.datos.forEach(local => {
            local.Latitud = local.Latitud || 0;
            local.Longitud = local.Longitud || 0;
            local["CD_ORIGEN"] = local["CD ORIGEN"];
            delete local["CD ORIGEN"];
        });
        // console.log(data.datos);
        loadMarkers(data.datos)// Llama a la función para cargar los marcadores en el mapa
        // Oculta el contenedor de carga
        document.getElementById('loadingContainer').style.display = 'none';
        div_map.style.display = 'block'
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });



