const express = require("express");
const app = express();
app.use(express.json());

const data = require("./concesionarios.json");

// Haversine distance in km
function distancia(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /GetConcesionariosCercanos
app.post("/GetConcesionariosCercanos", (req, res) => {
  const { ubicacion, filtros = {} } = req.body;

  if (!ubicacion?.latitud || !ubicacion?.longitud) {
    return res.status(400).json({
      ok: false,
      error: "Se requieren ubicacion.latitud y ubicacion.longitud",
    });
  }

  const lat = parseFloat(ubicacion.latitud);
  const lng = parseFloat(ubicacion.longitud);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ ok: false, error: "Coordenadas inválidas" });
  }

  let resultados = data
    .map((c) => ({ ...c, distanciaKm: distancia(lat, lng, c.lat, c.lng) }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  // Filtros opcionales (se ignorán si no se envían)
  if (filtros.mecanica === true)     resultados = resultados.filter((c) => c.mecanica);
  if (filtros.carroceria === true)   resultados = resultados.filter((c) => c.carroceria);
  if (filtros.renaultMinuto === true) resultados = resultados.filter((c) => c.renaultMinuto);
  if (filtros.sitioVN === true)      resultados = resultados.filter((c) => c.sitioVN);
  if (filtros.sitioETech === true)   resultados = resultados.filter((c) => c.sitioETech);
  if (filtros.negocio)               resultados = resultados.filter((c) => c.negocio === filtros.negocio);
  if (filtros.provincia)             resultados = resultados.filter((c) =>
    c.provincia?.toLowerCase().includes(filtros.provincia.toLowerCase())
  );

  const limite = parseInt(filtros.limite) || 5;
  const top = resultados.slice(0, limite);

  const concesionarios = top.map((c) => ({
    codSAP: c.codSAP,
    nombre: c.nombre,
    domicilio: `${c.domicilio}, ${c.localidad}, ${c.provincia}`,
    telefono: c.telefono,
    distanciaKm: parseFloat(c.distanciaKm.toFixed(1)),
    servicios: {
      mecanica: c.mecanica,
      carroceria: c.carroceria,
      renaultMinuto: c.renaultMinuto,
      sitioVN: c.sitioVN,
      sitioETech: c.sitioETech,
    },
    mapsLink: `https://www.google.com/maps?q=${c.lat},${c.lng}`,
  }));

  // llmresponse listo para presentar al usuario
  let llmresponse = "";
  if (concesionarios.length === 0) {
    llmresponse = "No encontré concesionarios cercanos con los filtros indicados.";
  } else {
    llmresponse = concesionarios
      .map(
        (c, i) =>
          `${i + 1}. *${c.nombre}*\n` +
          `   📍 ${c.domicilio}\n` +
          `   📞 ${c.telefono || "Sin teléfono registrado"}\n` +
          `   📏 ${c.distanciaKm} km de distancia\n` +
          `   🗺 ${c.mapsLink}`
      )
      .join("\n\n");
  }

  return res.json({
    ok: true,
    total: concesionarios.length,
    concesionarios,
    llmresponse,
  });
});

// GET /health
app.get("/health", (_, res) => res.json({ ok: true, registros: data.length }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Mock API corriendo en puerto ${PORT}`)
);
