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

        markers.push({ marker, turno: local.Turnos, category: local.Categoria, origin: local.CD_ORIGEN, id: local.Identificador, ruta:local.RUTA,envioRecep: local.DIAS_SUGERIDO });
    });

    filterMarkers();
}
document.getElementById('searchButton').addEventListener('click', function () {
    
    const searchValue = document.getElementById('searchInput').value;
    if(searchValue != ""){
        document.getElementById('reset').style.display ='block'
        markers.forEach(function (markerObj) {
            var marker = markerObj.marker;
            var showMarker = markerObj.id == searchValue
             
            if (showMarker) {
                map.addLayer(marker);
            } else {
                map.removeLayer(marker); 
            }
            
        });

       let noexiste = markers.some(mark => mark.id == searchValue)
       if(!noexiste){
        Toastify({
            text: "No se encontró ningún local.",
            className: "warning",
            style: {
              background: "#ffcc00",
            }
          }).showToast();
       }
    }else{
        Toastify({
            text: "El campo de búsqueda está vacío.",
            className: "danger",
            style: {
              background: "red",
            }
          }).showToast();
    }
    
});
document.getElementById('reset').addEventListener('click', function () {
    let searchValue = document.getElementById('searchInput').value;
    document.getElementById('searchInput').value = ""
    searchValue = ""
    markers.forEach(function (markerObj) {
        var marker = markerObj.marker;
        var showMarker = (searchValue === "" || markerObj.id == searchValue)
        if (showMarker) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
    document.getElementById('reset').style.display ='none'
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
            count++
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
        
        loadMarkers(data.datos)
        document.getElementById('loadingContainer').style.display = 'none';
        div_map.style.display = 'block'
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });



