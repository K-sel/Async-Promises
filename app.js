"use strict";

// getCoordinates()
// Demande au navigateur de détecter la position actuelle de l'utilisateur et retourne une Promise
const getCoordinates = () => {
  return new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej)
  );
};

// getPosition()
// Résout la promesse de getCoordinates et retourne un objet {lat: x, long: y}
const getPosition = async () => {
  const position = await getCoordinates();
  return {
    lat: position.coords.latitude,
    long: position.coords.longitude,
  };
};

// renderWeather(min, max)
// Affiche la valeu des deux paramêtres dans le widget de météo
const renderWeather = (min, max) => {
  document.querySelector(".min").textContent = `${min}°C`;
  document.querySelector(".max").textContent = `${max}°C`;
  return;
};

// parseStationData(rawData)
// Reçoit la réponse JSON de l'API Transport/stationboard et recrache un objet
// ne contenant que les informations pertinentes.
const parseStationData = (rawData) => {
  const { stationboard } = rawData;
  const departures = stationboard.map((el) => {
    const date = new Date(el.stop.departure);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedHours = date.getHours() < 10 ? "0" + hours : hours;
    const formattedMinutes = date.getMinutes() < 10 ? "0" + minutes : minutes;
    return {
      departure: `${formattedHours}:${formattedMinutes}`,
      destination: el.to,
      category: el.category,
    };
  });
  return {
    station: rawData.station.name,
    departures,
  };
};

// renderTrain(train)
// Affiche une ligne de départ dans le widget CFF.
const renderTrain = (train) => {
  const board = document.querySelector(".departures");
  const html = `
    <article>
        <div class="time">${train.departure}</div>
        <div class="category" data-category="${train.category}">${train.category}</div>
        <div class="destination">${train.destination}</div>
    </article>
    `;
  board.insertAdjacentHTML("beforeend", html);
  return;
};

// renderStationName(station)
// Affiche le mot passé en paramettre dans le widget CFF.
const renderStationName = (station) => {
  const stationElement = document.querySelector(".departures header p");
  stationElement.textContent = station;
};

// Votre code peut se trouver dans cette fonction. L'appel vers getPosition est
// déjà implémenté. Si vous jetez un coup d'oeil à votre console vous verrez un objet
// contenant votre position.
const getDashboardInformation = () => {
  getPosition().then((res) => {
    console.log(res);
  });
};

// Récupère la position géographique de l'utilisateur
getPosition()
  .then((coords) => {
    // Effectue des requêtes parallèles pour :
    // 1. Obtenir les prévisions météorologiques
    // 2. Récupérer les informations de localisation
    return Promise.all([
      // Requête API météo avec les coordonnées GPS
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.long}&daily=temperature_2m_max,temperature_2m_min`
      ),
      // Requête API transport avec les coordonnées GPS
      fetch(
        `http://transport.opendata.ch/v1/locations?x=${coords.lat}&y=${coords.long}`
      ),
    ]);
  })
  .then((responses) => {
    // Convertit toutes les réponses en JSON en parallèle
    return Promise.all(responses.map((response) => response.json()));
  })
  .then((data) => {
    // Extrait les températures minimale et maximale
    const min = data[0].daily.temperature_2m_min[0];
    const max = data[0].daily.temperature_2m_max[0];
    
    // Affiche les informations météorologiques
    renderWeather(min, max);
    
    // Effectue une nouvelle requête pour obtenir les horaires de train
    // en utilisant le nom de la 6ème station trouvée -> !! A améliorer, pas forcémement fiable !!
    return fetch(
      `http://transport.opendata.ch/v1/stationboard?station=${data[1].stations[5].name}&limit=5`
    );
  })
  .then((data) => data.json())
  .then((response) => {
    // Analyse les données de la station de train
    let locationInfos = parseStationData(response);

    // Affiche le nom de la station
    renderStationName(locationInfos.station);

    // Affiche chaque correspondance de train
    locationInfos.departures.forEach((correspondance) => {
      renderTrain(correspondance);
    });
  })
  // Gère toutes les erreurs potentielles dans la chaîne de promesses
  .catch((error) => console.error("Erreur :", error));