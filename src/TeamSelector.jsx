
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './TeamSelector.css'

const VACIOS = Array(8).fill('')

function recuperarEquipo(clave) {
  try {
    const guardado = sessionStorage.getItem(clave)
    const equipo = guardado ? JSON.parse(guardado) : null

    return Array.isArray(equipo) && equipo.length === 8
      ? equipo
      : [...VACIOS]
  } catch {
    return [...VACIOS]
  }
}

export default function TeamSelector() {
  const [jugadores, setJugadores] = useState([])
  const [claros, setClaros] = useState(() =>
    recuperarEquipo('enriko-claros')
  )
  const [oscuros, setOscuros] = useState(() =>
    recuperarEquipo('enriko-oscuros')
  )
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pronostico, setPronostico] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    sessionStorage.setItem('enriko-claros', JSON.stringify(claros))
  }, [claros])

  useEffect(() => {
    sessionStorage.setItem('enriko-oscuros', JSON.stringify(oscuros))
  }, [oscuros])

  useEffect(() => {
    async function cargarJugadores() {
      const { data, error } = await supabase
        .from('ranking_completo')
        .select('nombre, rating, pj')
        .order('nombre', { ascending: true })

      if (error) {
        setError('No se pudo cargar el ranking: ' + error.message)
      } else {
        const lista = (data || [])
          .map((j) => ({
            ...j,
            rating: Number(j.rating),
            pj: Number(j.pj),
          }))
          .filter((j) => j.nombre && Number.isFinite(j.rating))

        setJugadores(lista)
      }

      setCargando(false)
    }

    cargarJugadores()
  }, [])

  const porNombre = useMemo(
    () => new Map(jugadores.map((j) => [j.nombre, j])),
    [jugadores]
  )
  const ratingPromedioGeneral = useMemo(() => {
    if (!jugadores.length) return 0
  
    return (
      jugadores.reduce((total, j) => total + j.rating, 0) /
      jugadores.length
    )
  }, [jugadores])
  function cambiarJugador(equipo, indice, nombre) {
    const otroEquipo = equipo === 'Claros' ? oscuros : claros
    const setter = equipo === 'Claros' ? setClaros : setOscuros
  
    if (nombre && otroEquipo.includes(nombre)) {
      setMensaje('Ese jugador ya está en el otro equipo.')
      return
    }
  
    setter((actuales) => {
      const repetido = nombre && actuales.some(
        (seleccionado, i) =>
          i !== indice && seleccionado === nombre
      )
  
      if (repetido) {
        setMensaje('Ese jugador ya está seleccionado en este equipo.')
        return actuales
      }
  
      return actuales.map((valor, i) =>
        i === indice ? nombre : valor
      )
    })
  
    setPronostico(null)
    setMensaje('')
  }

  function obtenerRating(nombre) {
    if (porNombre.has(nombre)) {
      return porNombre.get(nombre).rating
    }
  
    if (nombre.startsWith('Invitado ')) {
      return ratingPromedioGeneral
    }
  
    return null
  }
  
  function promedio(seleccion) {
    const ratings = seleccion
      .filter(Boolean)
      .map(obtenerRating)
      .filter((rating) => Number.isFinite(rating))
  
    if (!ratings.length) return null
  
    return ratings.reduce((total, rating) => total + rating, 0) /
      ratings.length
  }

  const promedioClaros = promedio(claros)
  const promedioOscuros = promedio(oscuros)

  const diferencia =
    promedioClaros !== null && promedioOscuros !== null
      ? promedioClaros - promedioOscuros
      : null

  const seleccionCompleta =
    claros.every(Boolean) &&
    oscuros.every(Boolean) &&
    new Set([...claros, ...oscuros]).size === 16

  
function selector(equipo, seleccion) {
  const otroEquipo = equipo === 'Claros' ? oscuros : claros
  const ratingPromedio =
    equipo === 'Claros' ? promedioClaros : promedioOscuros

  return (
    <div className="ts-equipo">
      <h3>{equipo}</h3>

      <p className="ts-contador">
        {seleccion.filter(Boolean).length} de 8 jugadores
      </p>

      {seleccion.map((nombre, indice) => {
        const invitados = Array.from(
          { length: 8 },
          (_, i) => `Invitado ${i + 1}`
        )

        return (
          <div className="ts-fila" key={indice}>
            <span className="ts-numero">{indice + 1}</span>

            <select
              aria-label={`${equipo}, jugador ${indice + 1}`}
              value={nombre}
              onChange={(e) =>
                cambiarJugador(equipo, indice, e.target.value)
              }
            >
              <option value="">Elegir jugador...</option>

              {invitados
                .filter(
                  (invitado) =>
                    (!otroEquipo.includes(invitado) ||
                      invitado === nombre) &&
                    (!seleccion.some(
                      (elegido, i) =>
                        i !== indice && elegido === invitado
                    ) ||
                      invitado === nombre)
                )
                .map((invitado) => (
                  <option key={invitado} value={invitado}>
                    {invitado} · rating {ratingPromedioGeneral.toFixed(1)}
                  </option>
                ))}

              {jugadores
                .filter(
                  (j) =>
                    (!otroEquipo.includes(j.nombre) ||
                      j.nombre === nombre) &&
                    (!seleccion.some(
                      (elegido, i) =>
                        i !== indice && elegido === j.nombre
                    ) ||
                      j.nombre === nombre)
                )
                .map((j) => (
                  <option key={j.nombre} value={j.nombre}>
                    {j.nombre} · rating {j.rating.toFixed(1)} · {j.pj} PJ
                  </option>
                ))}
            </select>

            <button
              type="button"
              className="ts-quitar"
              aria-label={`Quitar jugador ${indice + 1} de ${equipo}`}
              onClick={() => cambiarJugador(equipo, indice, '')}
            >
              ×
            </button>
          </div>
        )
      })}

      <div className="ts-promedio">
        Rating promedio:{' '}
        {ratingPromedio === null ? '—' : ratingPromedio.toFixed(2)}
      </div>
    </div>
  )
}

  function generarEquiposParejos() {
    if (!seleccionCompleta) {
      setMensaje('Primero seleccioná 16 jugadores diferentes.')
      return
    }

    const lista = [...claros, ...oscuros].map((nombre) => ({
      nombre,
      rating: obtenerRating(nombre),
    }))

    if (lista.some((j) => !j || !Number.isFinite(j.rating))) {
      setMensaje('No se pudieron calcular los ratings de todos los jugadores.')
      return
    }

    setGenerando(true)
    setMensaje('')

    // Fijamos el primer jugador en Claros para no evaluar dos veces
    // la misma división con los nombres de los equipos invertidos.
    const primero = lista[0]
    const restantes = lista.slice(1)
    const candidatos = []
    let mejorDiferencia = Infinity

    function buscar(inicio, elegidos) {
      if (elegidos.length === 7) {
        const equipoA = [primero, ...elegidos]
        const elegidosSet = new Set(equipoA.map((j) => j.nombre))
        const equipoB = lista.filter((j) => !elegidosSet.has(j.nombre))

        const sumaA = equipoA.reduce((s, j) => s + j.rating, 0)
        const sumaB = equipoB.reduce((s, j) => s + j.rating, 0)
        const diferenciaRating = Math.abs(sumaA / 8 - sumaB / 8)

        if (diferenciaRating < mejorDiferencia - 0.000001) {
          mejorDiferencia = diferenciaRating
          candidatos.length = 0
          candidatos.push({ equipoA, equipoB })
        } else if (
          Math.abs(diferenciaRating - mejorDiferencia) < 0.000001
        ) {
          candidatos.push({ equipoA, equipoB })
        }

        return
      }

      for (let i = inicio; i <= restantes.length - (7 - elegidos.length); i++) {
        buscar(i + 1, [...elegidos, restantes[i]])
      }
    }

    buscar(0, [])

    const elegido = candidatos[Math.floor(Math.random() * candidatos.length)]

    setClaros(elegido.equipoA.map((j) => j.nombre))
    setOscuros(elegido.equipoB.map((j) => j.nombre))
    setPronostico(null)
    setMensaje(
      `¡Equipos optimizados! Diferencia mínima de rating: ${mejorDiferencia.toFixed(3)}.`
    )
    setGenerando(false)
  }

  function simularPartido() {
    if (!seleccionCompleta) {
      setMensaje('Completá los dos equipos antes de simular.')
      return
    }

    const ratingA = promedio(claros)
    const ratingB = promedio(oscuros)
    const diferenciaRating = ratingA - ratingB

    const base = Math.round(5 + Math.random() * 4)
    const ruido = Math.round((Math.random() - 0.5) * 6)
    const diferenciaGoles = Math.round(diferenciaRating / 5 + ruido)

    let golesClaros = base + Math.max(diferenciaGoles, 0)
    let golesOscuros = base + Math.max(-diferenciaGoles, 0)

    if (golesClaros === golesOscuros) {
      if (Math.random() < 0.5) golesClaros++
      else golesOscuros++
    }

    setPronostico({
      golesClaros,
      golesOscuros,
      diferenciaRating,
    })
    setMensaje('')
  }

  function reiniciar() {
    setClaros([...VACIOS])
    setOscuros([...VACIOS])
    setPronostico(null)
    setMensaje('Selección limpiada.')
  }

  if (cargando) return <p>Cargando jugadores...</p>
  if (error) return <p className="ts-error">{error}</p>

  if (!jugadores.length) {
    return <p>No hay jugadores con rating disponible en el ranking.</p>
  }

  return (
    <section className="team-selector">
      <div className="ts-encabezado">
        <span className="ts-etiqueta">HERRAMIENTA DE ARMADO</span>
        <h2>Armá el partido</h2>
        <p>Elegí 16 jugadores, equilibrá los equipos y consultá el oráculo.</p>
      </div>

      <div className="ts-equipos">
        {selector('Claros', claros)}
        {selector('Oscuros', oscuros)}
      </div>

      <div className="ts-resumen">
        <h3>Balance del partido</h3>

        {diferencia === null ? (
          <p>Elegí jugadores en ambos equipos para comparar los ratings.</p>
        ) : (
          <>
            <p>
              Rating Claros: <strong>{promedioClaros.toFixed(2)}</strong>
            </p>
            <p>
              Rating Oscuros: <strong>{promedioOscuros.toFixed(2)}</strong>
            </p>
            <p>
              Diferencia: <strong>{Math.abs(diferencia).toFixed(2)}</strong>
            </p>
            <p>
              {Math.abs(diferencia) < 0.01
                ? '¡Paridad absoluta según el rating!'
                : `Ventaja de rating para ${diferencia > 0 ? 'Claros' : 'Oscuros'}.`}
            </p>
          </>
        )}

        {mensaje && <p role="status">{mensaje}</p>}

        <div className="ts-acciones">
          <button
            type="button"
            className="ts-reiniciar"
            onClick={generarEquiposParejos}
            disabled={!seleccionCompleta || generando}
          >
            {generando ? 'Buscando la mejor combinación...' : '⚖️ Generar equipos parejos'}
          </button>

          <button
            type="button"
            className="ts-reiniciar"
            onClick={simularPartido}
            disabled={!seleccionCompleta}
          >
            ⚽ Simular partido
          </button>

          <button
            type="button"
            className="ts-reiniciar"
            onClick={reiniciar}
          >
            Limpiar equipos
          </button>
        </div>

        {pronostico && (
          <div className="ts-pronostico">
            <span>EL ORÁCULO DE LAS CANCHAS OLVIDADAS DICE...</span>
            <h2>
              Claros {pronostico.golesClaros} – {pronostico.golesOscuros} Oscuros
            </h2>
            <p>
              {pronostico.golesClaros > pronostico.golesOscuros
                ? 'La simulación da ganador a Claros.'
                : 'La simulación da ganador a Oscuros.'}
            </p>
            <small>
              Pronóstico recreativo: no representa una probabilidad real de victoria.
            </small>
          </div>
        )}
      </div>
    </section>
  )
}

