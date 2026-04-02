// Google Maps API completely replaces Leaflet.
let map;
let markers = [];
let savedMarkers = [];
let infoWindow;
let directionsService;
let directionsRenderer;
let placesService;

// Default location: New Delhi
const defaultLocation = { lat: 28.6139, lng: 77.2090 };

function initMap() {
    // 1. Initialize Map
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
    });

    infoWindow = new google.maps.InfoWindow();
    placesService = new google.maps.places.PlacesService(map);
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
    });

    // 2. Search Autocomplete
    const searchInput = document.getElementById('search-input');
    const searchAutocomplete = new google.maps.places.Autocomplete(searchInput);
    searchAutocomplete.bindTo('bounds', map);
    
    // Instead of Nominatim fetch we use Places Autocomplete event
    searchAutocomplete.addListener('place_changed', () => {
        infoWindow.close();
        const place = searchAutocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
            alert("No details available for input: '" + place.name + "'");
            return;
        }

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }

        clearMarkers();
        const marker = createMarker(place.geometry.location, place.name, place.formatted_address, true);
        markers.push(marker);
        
        // Show in sidebar
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `<strong>${place.name}</strong><br><span style="font-size:0.8em;color:#666;">${place.formatted_address || ''}</span>`;
        searchResults.appendChild(div);
    });

    const searchBtn = document.getElementById('search-btn');

    function performManualSearch() {
        const query = searchInput.value;
        if (!query) return;

        const request = {
            query: query,
        };
        
        infoWindow.close();
        
        placesService.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                const place = results[0];
                if (place.geometry.viewport) {
                    map.fitBounds(place.geometry.viewport);
                } else {
                    map.setCenter(place.geometry.location);
                    map.setZoom(17);
                }

                clearMarkers();
                const marker = createMarker(place.geometry.location, place.name, place.formatted_address, true);
                markers.push(marker);
                
                const searchResults = document.getElementById('search-results');
                searchResults.innerHTML = '';
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<strong>${place.name}</strong><br><span style="font-size:0.8em;color:#666;">${place.formatted_address || ''}</span>`;
                searchResults.appendChild(div);
            } else {
                alert("Location not found");
            }
        });
    }

    searchBtn.onclick = performManualSearch;
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performManualSearch();
        }
    });

    // Quick Actions
    const quickBtns = document.querySelectorAll('.quick-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            
            // Map our custom categories to types supported by Google Places if possible, 
            // otherwise use text search
            const request = {
                location: map.getCenter(),
                radius: '5000',
                query: category
            };

            const searchResults = document.getElementById('search-results');
            searchResults.innerHTML = '<div class="result-item">Searching...</div>';
            
            placesService.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    clearMarkers();
                    const bounds = new google.maps.LatLngBounds();
                    searchResults.innerHTML = '';

                    results.slice(0, 15).forEach((place) => {
                        const marker = createMarker(place.geometry.location, place.name, place.formatted_address, false);
                        markers.push(marker);
                        bounds.extend(place.geometry.location);
                        
                        // Sidebar item
                        const div = document.createElement('div');
                        div.className = 'result-item';
                        div.innerHTML = `<strong>${place.name}</strong><br><span style="font-size:0.8em;color:#666;">${place.formatted_address || ''}</span>`;
                        div.onclick = () => {
                            map.setCenter(place.geometry.location);
                            map.setZoom(16);
                            google.maps.event.trigger(marker, 'click');
                        };
                        searchResults.appendChild(div);
                    });
                    
                    map.fitBounds(bounds);
                } else {
                    searchResults.innerHTML = '<div class="result-item">No results found nearby</div>';
                }
            });
        });
    });

    // Map Click
    map.addListener("click", (e) => {
        clearMarkers();
        const marker = createMarker(e.latLng, 'Dropped Pin', `${e.latLng.lat().toFixed(4)}, ${e.latLng.lng().toFixed(4)}`, true);
        markers.push(marker);
    });

    function createMarker(latLng, title, description, isOpen) {
        const marker = new google.maps.Marker({
            position: latLng,
            map: map,
            title: title,
            animation: google.maps.Animation.DROP
        });
        
        marker.addListener('click', () => {
            let content = `
                <div>
                    <h3>${title}</h3>
                    <p style="color: #666; font-size: 0.85em; margin-bottom: 10px;">${description}</p>`;
            
            if (isAuthenticated) {
                // Attach temporary function to window to be called from infowindow HTML
                window.tempOpenSaveModal = function() {
                    openSaveModal(latLng.lat(), latLng.lng(), title);
                };
                content += `<button class='primary-btn' style='padding: 5px 10px;' onclick='window.tempOpenSaveModal()'>Save Location</button>`;
            } else {
                content += `<p style="font-size: 0.8em; color: var(--primary-color);">Log in to save places</p>`;
            }
            content += "</div>";

            infoWindow.setContent(content);
            infoWindow.open(map, marker);
        });
        
        if (isOpen) {
             google.maps.event.trigger(marker, 'click');
        }
        
        return marker;
    }

    function clearMarkers() {
        for (let i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = [];
    }

    // Directions
    const startInput = document.getElementById('start-input');
    const endInput = document.getElementById('end-input');
    
    // Autocompletes for routing
    const startAutocomplete = new google.maps.places.Autocomplete(startInput);
    const endAutocomplete = new google.maps.places.Autocomplete(endInput);

    const getDirectionsBtn = document.getElementById('get-directions-btn');
    const clearRouteBtn = document.getElementById('clear-directions-btn');

    getDirectionsBtn.onclick = () => {
        if (!startInput.value || !endInput.value) {
            alert("Please enter a start and destination.");
            return;
        }

        getDirectionsBtn.innerText = "Calculating...";
        let origin = startInput.value;
        if (origin === "Your Location" && startCoord) {
            origin = startCoord;
        }

        directionsService.route(
            {
                origin: origin,
                destination: endInput.value,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(Date.now()), // for traffic
                    trafficModel: 'bestguess'
                }
            },
            (response, status) => {
                getDirectionsBtn.innerText = "Get Directions";
                if (status === "OK") {
                     directionsRenderer.setDirections(response);
                     clearRouteBtn.style.display = 'inline-block';
                     
                     const route = response.routes[0];
                     const leg = route.legs[0];
                     
                     // Duration in traffic if available
                     const durationText = leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text;
                     const distanceText = leg.distance.text;
                     
                     let trafficCondition = "Normal";
                     let trafficColor = "#34a853";
                     
                     if (leg.duration_in_traffic && leg.duration) {
                         const ratio = leg.duration_in_traffic.value / leg.duration.value;
                         if (ratio > 1.3) { trafficCondition = "Heavy"; trafficColor = "#ea4335"; }
                         else if (ratio > 1.1) { trafficCondition = "Moderate"; trafficColor = "#fbbc04"; }
                     }

                     document.getElementById('route-eta').innerText = durationText;
                     document.getElementById('route-distance').innerText = distanceText;
                     document.getElementById('route-traffic').innerHTML = `<span style="color: ${trafficColor}; font-weight: bold;">${trafficCondition}</span>`;
                     
                     document.getElementById('route-info').style.display = 'block';
                } else {
                    window.alert("Directions request failed due to " + status);
                }
            }
        );
    };

    clearRouteBtn.onclick = () => {
        directionsRenderer.setDirections({routes: []}); // Clear route
        startInput.value = '';
        endInput.value = '';
        clearRouteBtn.style.display = 'none';
        document.getElementById('route-info').style.display = 'none';
    };

    // My Location
    const currentLocBtn = document.getElementById('use-current-location');
    let startCoord = null;
    currentLocBtn.onclick = () => {
        if ("geolocation" in navigator) {
            startInput.value = "Getting location...";
            navigator.geolocation.getCurrentPosition(position => {
                startCoord = { lat: position.coords.latitude, lng: position.coords.longitude };
                startInput.value = "Your Location";
            }, () => {
                alert("Could not get location.");
                startInput.value = "";
            });
        }
    };
    
    const locateMeBtn = document.getElementById('locate-me-btn');
    let myLocMarker = null;

    if (locateMeBtn) {
        locateMeBtn.addEventListener('click', () => {
            if ("geolocation" in navigator) {
                 navigator.geolocation.getCurrentPosition(position => {
                     const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                     map.setCenter(pos);
                     map.setZoom(16);
                     if (!myLocMarker) {
                         myLocMarker = new google.maps.Marker({
                             position: pos,
                             map: map,
                             icon: {
                                 path: google.maps.SymbolPath.CIRCLE,
                                 scale: 8,
                                 fillColor: "#4285F4",
                                 fillOpacity: 1,
                                 strokeColor: "white",
                                 strokeWeight: 2,
                             }
                         });
                     } else {
                         myLocMarker.setPosition(pos);
                     }
                 }, () => {
                    alert("Error retrieving location.");
                 });
            }
        });
    }

    // Try HTML5 geolocation initially
    if (navigator.geolocation && !savedMarkers.length) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                map.setCenter(pos);
            }
        );
    }

    loadSavedLocations();
}

// 5. Handling Saved Locations (AJAX)
const modal = document.getElementById('save-modal');
const closeBtn = document.querySelector('.close-modal');
const saveForm = document.getElementById('save-location-form');

function openSaveModal(lat, lng, name='') {
    document.getElementById('save-lat').value = lat;
    document.getElementById('save-lng').value = lng;
    document.getElementById('save-name').value = name === 'Dropped Pin' ? '' : name;
    document.getElementById('save-desc').value = '';
    modal.classList.add('active');
}

closeBtn.onclick = () => modal.classList.remove('active');
window.onclick = (e) => { if (e.target == modal) modal.classList.remove('active'); }

saveForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('save-name').value,
        description: document.getElementById('save-desc').value,
        latitude: document.getElementById('save-lat').value,
        longitude: document.getElementById('save-lng').value,
    };

    try {
        const res = await fetch(saveLocationUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.status === 'success') {
            modal.classList.remove('active');
            if(infoWindow) infoWindow.close();
            loadSavedLocations();
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error('Error saving:', err);
    }
};

const savedLocationsList = document.getElementById('saved-locations-list');

async function loadSavedLocations() {
    if (!isAuthenticated) return;
    
    try {
        const res = await fetch(getLocationsUrl);
        const data = await res.json();
        
        // Clear old saved markers
        savedMarkers.forEach(m => m.setMap(null));
        savedMarkers = [];
        
        if (savedLocationsList) savedLocationsList.innerHTML = '';
        const bounds = new google.maps.LatLngBounds();

        data.locations.forEach(loc => {
            const pos = { lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) };
            
            const marker = new google.maps.Marker({
                position: pos,
                map: map,
                icon: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
            });
            savedMarkers.push(marker);
            bounds.extend(pos);

            marker.addListener('click', () => {
                const popupContent = `
                    <h3><i class="fas fa-star" style="color: gold;"></i> ${loc.name}</h3>
                    <p style="font-size:0.9em;">${loc.description}</p>
                `;
                infoWindow.setContent(popupContent);
                infoWindow.open(map, marker);
            });

            if (savedLocationsList) {
                const li = document.createElement('li');
                li.className = 'location-item';
                li.innerHTML = `
                    <div class="location-info" style="cursor: pointer;">
                        <h4>${loc.name}</h4>
                        <p>${loc.description.substring(0, 30)}${loc.description.length > 30 ? '...' : ''}</p>
                    </div>
                    <div class="location-actions">
                        <button class="del-btn" data-id="${loc.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                li.querySelector('.location-info').onclick = () => {
                    map.setCenter(pos);
                    map.setZoom(15);
                    google.maps.event.trigger(marker, 'click');
                };

                li.querySelector('.del-btn').onclick = async (e) => {
                    e.stopPropagation();
                    if(confirm('Delete this location?')) {
                        await fetch(deleteLocationUrl + loc.id + '/', {
                            method: 'DELETE',
                            headers: {'X-CSRFToken': csrfToken}
                        });
                        loadSavedLocations();
                    }
                };

                savedLocationsList.appendChild(li);
            }
        });
        
        // Fit bounds if no directions on map currently
        if (data.locations.length > 0 && document.getElementById('route-info').style.display === 'none') {
            map.fitBounds(bounds);
        }

    } catch (err) {
        console.error('Error loading saved locations:', err);
    }
}

// Initialization is handled via the &callback=initMap query parameter on the Google Maps script tag.
