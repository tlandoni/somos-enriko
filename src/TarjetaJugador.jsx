import { useState } from 'react'

const EMBLEMAS = {
  '10Y_CAMPEON': { icono: '🏆', nombre: 'Campeón aniversario' },
  '10Y_PARTICIPANTE': { icono: '🏅', nombre: 'Participante aniversario' },
  SALVADOR_FULBITO: { icono: '🆘', nombre: 'Salvador del fulbito' },
}

const PERFIL = {
  ofensivo: '⚡ Ofensivo',
  defensivo: '🛡️ Defensivo',
  hibrido: '⚽ Híbrido',
}

const ZONA = { central: 'Central', lateral: 'Lateral', mixto: 'Mixto' }

const PIE = {
  derecho: 'Derecho',
  izquierdo: 'Zurdo',
  ambidiestro: 'Ambidiestro',
}

const POSICIONES_VISIBLES = 3

export default function TarjetaJugador({
  jugador,
  invitadoPor,
  esFundador,
  esConstructor,
  insignias,
  campania,
}) {
  const [verTodas, setVerTodas] = useState(false)

  const posiciones = jugador.posiciones_habituales || []
  const mostradas = verTodas
    ? posiciones
    : posiciones.slice(0, POSICIONES_VISIBLES)
  const ocultas = posiciones.length - POSICIONES_VISIBLES

  const datos = [
    jugador.perfil_tactico && {
      etiqueta: 'Perfil',
      valor: PERFIL[jugador.perfil_tactico] || jugador.perfil_tactico,
    },
    jugador.zona_preferida && {
      etiqueta: 'Zona',
      valor: ZONA[jugador.zona_preferida] || jugador.zona_preferida,
    },
    jugador.pie_habil && {
      etiqueta: 'Pie hábil',
      valor: PIE[jugador.pie_habil] || jugador.pie_habil,
    },
  ].filter(Boolean)

  const estadoMundial = !campania
    ? 'Fase de grupos'
    : campania.es_campeon
      ? '🏆 Campeón del mundo'
      : !campania.mejor_historico || campania.mejor_historico === 'Sin clasificar'
        ? 'Fase de grupos'
        : campania.mejor_historico

  return (
    <article className="jug-card">
      <header className="jug-cabecera">
        <div className="jug-avatar" aria-hidden="true">
          {(jugador.nombre || '?').trim().charAt(0).toUpperCase()}
        </div>

        <div className="jug-identidad">
          <h3>{jugador.nombre}</h3>
          <p>
            {esFundador
              ? '★ Fundador'
              : `Invitado por ${invitadoPor || 'sin información'}`}
          </p>
        </div>
      </header>

      {esConstructor && (
        <span className="jug-sello">🏗️ Principal constructor</span>
      )}

      {datos.length > 0 && (
        <dl className="jug-datos">
          {datos.map((dato) => (
            <div key={dato.etiqueta}>
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {posiciones.length > 0 && (
        <div className="jug-posiciones" aria-label="Posiciones habituales">
          {mostradas.map((posicion) => (
            <span key={posicion}>{posicion}</span>
          ))}

          {ocultas > 0 && (
            <button
              type="button"
              onClick={() => setVerTodas((actual) => !actual)}
              aria-expanded={verTodas}
            >
              {verTodas ? 'Ver menos' : `+${ocultas} más`}
            </button>
          )}
        </div>
      )}

      <footer className="jug-pie">
        <div className="jug-mundial">
          <span>🌎 Mundial Personal</span>
          <strong className={campania?.es_campeon ? 'es-campeon' : ''}>
            {estadoMundial}
          </strong>
        </div>

        {insignias.length > 0 && (
          <div className="jug-insignias">
            {insignias.map((insignia) => {
              const emblema = EMBLEMAS[insignia.codigo] || {
                icono: '🎖️',
                nombre: insignia.codigo,
              }

              return (
                <span
                  key={insignia.id}
                  title={`${emblema.nombre}: ${insignia.descripcion}`}
                  aria-label={`${emblema.nombre}: ${insignia.descripcion}`}
                  role="img"
                >
                  {emblema.icono}
                </span>
              )
            })}
          </div>
        )}
      </footer>
    </article>
  )
}