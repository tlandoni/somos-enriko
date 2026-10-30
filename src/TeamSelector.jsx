import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './TeamSelector.css'

const CLAVE_SELECCION = 'enriko-proximo-partido'

const NIVELES = [
  { valor: 'bajo', etiqueta: 'Bajo', factor: -1.5 },
  { valor: 'medio-bajo', etiqueta: 'Medio-bajo', factor: -0.75 },
  { valor: 'promedio', etiqueta: 'Promedio', factor: 0 },
  { valor: 'medio-alto', etiqueta: 'Medio-alto', factor: 0.75 },
  { valor: 'alto', etiqueta: 'Alto', factor: 1.5 },
]

function leerGuardado() {
  try {
    const guardado = sessionStorage.getItem(CLAVE_SELECCION)
    return guardado ? JSON.parse(guardado) : null
  } catch {
    return null
  }
}

export default function TeamSelector() {
  const [jugadores, setJugadores] = useState([])
  const [invitados, setInvitados] = useState([])
  const [disponibles, setDisponibles] = useState([])
  const [claros, setClaros] = useState([])
  const [oscuros, setOscuros] = useState([])

  const [nombreInvitado, setNombreInvitado] = useState('')
  const [nivelInvitado, setNivelInvitado] = useState('promedio')

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [pronostico, setPronostico] = useState(null)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    async function cargarJugadores() {
      const { data, error } = await supabase
        .from('ranking_completo')
        .select('nombre, rating, pj')
        .order('nombre', { ascending: true })

      if (error) {
        setError('No se pudo cargar el ranking: ' + error.message)
        setCargando(false)
        return
      }

      const lista = (data || [])
        .map((j) => ({
          nombre: j.nombre,
          rating: Number(j.rating),
          pj: Number(j.pj),
          invitado: false,
        }))
        .filter(
          (j) =>
            j.nombre &&
            Number.isFinite(j.rating)
        )

      setJugadores(lista)

      const guardado = leerGuardado()

      if (guardado) {
        const invitadosGuardados = Array.isArray(guardado.invitados)
          ? guardado.invitados
          : []

        const nombresValidos = new Set([
          ...lista.map((j) => j.nombre),
          ...invitadosGuardados.map((j) => j.nombre),
        ])

        const limpiar = (nombres) =>
          Array.isArray(nombres)
            ? nombres.filter((nombre) => nombresValidos.has(nombre))
            : []

        const clarosGuardados = limpiar(guardado.claros)
        const oscurosGuardados = limpiar(guardado.oscuros)

        const ocupados = new Set([
          ...clarosGuardados,
          ...oscurosGuardados,
        ])

        setInvitados(invitadosGuardados)
        setClaros(clarosGuardados)
        setOscuros(oscurosGuardados)
        setDisponibles(
          [...lista.map((j) => j.nombre),
            ...invitadosGuardados.map((j) => j.nombre)]
            .filter((nombre) => !ocupados.has(nombre))
        )
      } else {
        setDisponibles(lista.map((j) => j.nombre))
      }

      setCargando(false)
    }

    cargarJugadores()
  }, [])

  useEffect(() => {
    if (cargando) return

    sessionStorage.setItem(
      CLAVE_SELECCION,
      JSON.stringify({
        disponibles,
        claros,
        oscuros,
        invitados,
      })
    )
  }, [disponibles, claros, oscuros, invitados, cargando])

  const todosLosJugadores = useMemo(
    () => [...jugadores, ...invitados],
    [jugadores, invitados]
  )

  const porNombre = useMemo(
    () => new Map(todosLosJugadores.map((j) => [j.nombre, j])),
    [todosLosJugadores]
  )

  const ratingPromedioGeneral = useMemo(() => {
    if (!jugadores.length) return 0

    return (
      jugadores.reduce((total, j) => total + j.rating, 0) /
      jugadores.length
    )
  }, [jugadores])

  const desviacionEstandar = useMemo(() => {
    if (!jugadores.length) return 0

    const varianza =
      jugadores.reduce(
        (total, j) =>
          total + Math.pow(j.rating - ratingPromedioGeneral, 2),
        0
      ) / jugadores.length

    return Math.sqrt(varianza)
  }, [jugadores, ratingPromedioGeneral])

  function obtenerRating(nombre) {
    return porNombre.get(nombre)?.rating ?? null
  }

  function promedio(seleccion) {
    const ratings = seleccion
      .map(obtenerRating)
      .filter((rating) => Number.isFinite(rating))

    if (!ratings.length) return null

    return (
      ratings.reduce((total, rating) => total + rating, 0) /
      ratings.length
    )
  }

  const promedioClaros = promedio(claros)
  const promedioOscuros = promedio(oscuros)

  const diferencia =
    promedioClaros !== null && promedioOscuros !== null
      ? promedioClaros - promedioOscuros
      : null

      const convocados = [...claros, ...oscuros]
      const convocadosUnicos = new Set(convocados)
      
      const seleccionCompleta =
        claros.length === 8 &&
        oscuros.length === 8 &&
        convocados.length === 16 &&
        convocadosUnicos.size === 16

  function moverJugador(nombre, destino) {
    setDisponibles((actuales) =>
      actuales.filter((jugador) => jugador !== nombre)
    )
    setClaros((actuales) =>
      actuales.filter((jugador) => jugador !== nombre)
    )
    setOscuros((actuales) =>
      actuales.filter((jugador) => jugador !== nombre)
    )

    if (destino === 'disponibles') {
      setDisponibles((actuales) => [...actuales, nombre])
    } else if (destino === 'claros') {
      setClaros((actuales) => [...actuales, nombre])
    } else if (destino === 'oscuros') {
      setOscuros((actuales) => [...actuales, nombre])
    }

    setPronostico(null)
    setMensaje('')
  }

  function agregarInvitado(e) {
    e.preventDefault()

    const nombre = nombreInvitado.trim()

    if (!nombre) {
      setMensaje('Escribí el nombre del invitado.')
      return
    }

    if (porNombre.has(nombre)) {
      setMensaje('Ya existe un jugador con ese nombre.')
      return
    }

    const nivel = NIVELES.find((n) => n.valor === nivelInvitado)
    const ratingEstimado = Math.max(
      0,
      ratingPromedioGeneral + nivel.factor * desviacionEstandar
    )

    const nuevoInvitado = {
      nombre,
      rating: Number(ratingEstimado.toFixed(2)),
      pj: 0,
      invitado: true,
      nivel: nivel.etiqueta,
    }

    setInvitados((actuales) => [...actuales, nuevoInvitado])
    setDisponibles((actuales) => [...actuales, nombre])
    setNombreInvitado('')
    setNivelInvitado('promedio')
    setPronostico(null)
    setMensaje(`${nombre} fue agregado a los disponibles.`)
  }

  function quitarInvitado(nombre) {
    setInvitados((actuales) =>
      actuales.filter((j) => j.nombre !== nombre)
    )
    moverJugador(nombre, null)
    setMensaje(`Se quitó a ${nombre} de la convocatoria.`)
  }

  function generarEquiposParejos() {
    if (convocados.length !== 16 || convocadosUnicos.size !== 16) {
      setMensaje(
        `Necesitás exactamente 16 jugadores. Actualmente hay ${convocadosUnicos.size}.`
      )
      return
    }

    const lista = convocados.map((nombre) => ({
      nombre,
      rating: obtenerRating(nombre),
    }))

    if (lista.some((j) => !j || !Number.isFinite(j.rating))) {
      setMensaje('No se pudieron calcular los ratings de todos los jugadores.')
      return
    }

    setGenerando(true)
    setMensaje('')

    // Se conserva el algoritmo de búsqueda de la versión anterior.
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

      for (
        let i = inicio;
        i <= restantes.length - (7 - elegidos.length);
        i++
      ) {
        buscar(i + 1, [...elegidos, restantes[i]])
      }
    }

    buscar(0, [])

    const elegido =
      candidatos[Math.floor(Math.random() * candidatos.length)]

    setClaros(elegido.equipoA.map((j) => j.nombre))
    setOscuros(elegido.equipoB.map((j) => j.nombre))
    setPronostico(null)
    setMensaje(
      `¡Equipos optimizados! Diferencia mínima de rating: ${mejorDiferencia.toFixed(2)}.`
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
    setClaros([])
    setOscuros([])
    setDisponibles(
      todosLosJugadores.map((j) => j.nombre)
    )
    setPronostico(null)
    setMensaje('Selección limpiada. Todos los jugadores están disponibles.')
  }

  function tarjetaJugador(nombre) {
    const jugador = porNombre.get(nombre)
    if (!jugador) return null

    return (
      <article className="ts-jugador" key={nombre}>
        <div className="ts-jugador-info">
          <strong>{jugador.nombre}</strong>
          <span>
            {jugador.invitado
              ? `Invitado · ${jugador.nivel}`
              : `${jugador.pj} PJ`}
          </span>
        </div>

        <div className="ts-jugador-rating">
          <span>RATING</span>
          <strong>{jugador.rating.toFixed(2)}</strong>
        </div>

        <div className="ts-mover">
          <button
            type="button"
            onClick={() => moverJugador(nombre, 'disponibles')}
            disabled={disponibles.includes(nombre)}
            aria-label={`Mover ${nombre} a disponibles`}
            title="Disponibles"
          >
            ↔
          </button>
          <button
            type="button"
            onClick={() => moverJugador(nombre, 'claros')}
            disabled={claros.includes(nombre)}
            aria-label={`Mover ${nombre} a Claros`}
            title="Claros"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => moverJugador(nombre, 'oscuros')}
            disabled={oscuros.includes(nombre)}
            aria-label={`Mover ${nombre} a Oscuros`}
            title="Oscuros"
          >
            O
          </button>
        </div>

        {jugador.invitado && (
          <button
            type="button"
            className="ts-eliminar-invitado"
            onClick={() => quitarInvitado(nombre)}
            aria-label={`Eliminar invitado ${nombre}`}
            title="Eliminar invitado"
          >
            ×
          </button>
        )}
      </article>
    )
  }

  function columna(titulo, nombres, clase) {
    return (
      <div className={`ts-columna ${clase}`}>
        <div className="ts-columna-titulo">
          <h3>{titulo}</h3>
          <span>{nombres.length}</span>
        </div>

        {nombres.length === 0 ? (
          <p className="ts-vacio">No hay jugadores en esta columna.</p>
        ) : (
          <div className="ts-lista-jugadores">
            {nombres.map(tarjetaJugador)}
          </div>
        )}

        {clase !== 'ts-disponibles' && (
          <div className="ts-promedio">
            Rating promedio:{' '}
            {promedio(nombres) === null
              ? '—'
              : promedio(nombres).toFixed(2)}
          </div>
        )}
      </div>
    )
  }

  if (cargando) return <p>Cargando jugadores...</p>
  if (error) return <p className="ts-error">{error}</p>

  if (!jugadores.length) {
    return <p>No hay jugadores con rating disponible en el ranking.</p>
  }

  return (
    <section className="team-selector">
      <div className="ts-encabezado">
        <span className="ts-etiqueta">PRÓXIMO PARTIDO</span>
        <h2>Armá el partido</h2>
        <p>
          Distribuí a los jugadores, equilibrá los equipos y consultá el oráculo.
        </p>
      </div>

      <form className="ts-form-invitado" onSubmit={agregarInvitado}>
        <div>
          <label htmlFor="ts-nombre-invitado">Sumar invitado</label>
          <input
            id="ts-nombre-invitado"
            type="text"
            value={nombreInvitado}
            onChange={(e) => setNombreInvitado(e.target.value)}
            placeholder="Nombre del invitado"
          />
        </div>

        <div>
          <label htmlFor="ts-nivel-invitado">Nivel estimado</label>
          <select
            id="ts-nivel-invitado"
            value={nivelInvitado}
            onChange={(e) => setNivelInvitado(e.target.value)}
          >
            {NIVELES.map((nivel) => (
              <option key={nivel.valor} value={nivel.valor}>
                {nivel.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="ts-reiniciar">
          + Agregar
        </button>
      </form>

      <p className="ts-ayuda-invitado">
        El rating del invitado se estima a partir del promedio y la desviación
        estándar de los ratings actuales.
      </p>

      <div className="ts-equipos">
        {columna('Disponibles', disponibles, 'ts-disponibles')}
        {columna('Claros', claros, 'ts-claros')}
        {columna('Oscuros', oscuros, 'ts-oscuros')}
      </div>

      <div className="ts-resumen">
        <h3>Balance del partido</h3>

        {diferencia === null ? (
          <p>Ubicá jugadores en ambos equipos para comparar los ratings.</p>
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

        <p className="ts-contador">
          Convocados: {convocadosUnicos.size} de 16
        </p>

        {mensaje && <p className="ts-mensaje" role="status">{mensaje}</p>}

        <div className="ts-acciones">
          <button
            type="button"
            className="ts-reiniciar"
            onClick={generarEquiposParejos}
            disabled={convocados.length !== 16 || generando}
          >
            {generando
              ? 'Buscando la mejor combinación...'
              : '⚖️ Generar equipos parejos'}
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
            className="ts-reiniciar ts-boton-secundario"
            onClick={reiniciar}
          >
            Limpiar equipos
          </button>
        </div>

        {pronostico && (
          <div className="ts-pronostico">
            <span>Suena un cascabel. Una voz rasposa canta "¡Falta envido y truco! Por mi botella que este partido va a salir</span>
            <h2>  
              Claros {pronostico.golesClaros} – {pronostico.golesOscuros} Oscuros
            </h2>
            <p>
              {pronostico.golesClaros > pronostico.golesOscuros
                ? 'Andate Fernando, que los Claros se lo llevan como yo a esta mano'
                : 'Por el ancho que tengo en la mano juro que a los Oscuros no se les escapa'}
            </p>
            <small>
              Jugar compulsivamente es perjudicial para la salud (y la sociedad)
            </small>
          </div>
        )}
      </div>
    </section>
  )
}

