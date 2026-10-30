
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './Votacion.css'

export default function Votacion({ partidoId }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [votanteId, setVotanteId] = useState('')
  const [elegidoMvp, setElegidoMvp] = useState('')
  const [golElegido, setGolElegido] = useState('')
  const [descripcionGol, setDescripcionGol] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [filtroJugador, setFiltroJugador] = useState('')
    const [filtroEquipo, setFiltroEquipo] = useState('Todos')
    const [mostrarResultados, setMostrarResultados] = useState(false)
  const [confirmado, setConfirmado] = useState(false)

  async function cargarDetalle() {
    setCargando(true)
    setError('')

    const { data, error: errorConsulta } = await supabase.rpc(
      'obtener_detalle_votacion',
      { p_partido_id: Number(partidoId) }
    )

    if (errorConsulta) {
      setError(errorConsulta.message)
      setCargando(false)
      return
    }

    if (!data?.partido) {
      setError('No encontramos ese partido.')
      setCargando(false)
      return
    }

    setDetalle(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarDetalle()
  }, [partidoId])

  const participantes = detalle?.participantes || []

  const miJugador = participantes.find(
    (jugador) => String(jugador.jugador_id) === String(votanteId)
  )

  const candidatosMvp = useMemo(() => {
    return participantes.filter((jugador) => {
      const noEsUnoMismo =
        String(jugador.jugador_id) !== String(votanteId)
  
      const coincideNombre = jugador.nombre
        .toLowerCase()
        .includes(filtroJugador.toLowerCase().trim())
  
      const coincideEquipo =
        filtroEquipo === 'Todos' || jugador.equipo === filtroEquipo
  
      return noEsUnoMismo && coincideNombre && coincideEquipo
    })
  }, [participantes, votanteId, filtroJugador, filtroEquipo])
  

  const goles = detalle?.goles_fecha || []

  function cambiarVotante(valor) {
    setVotanteId(valor)
    setElegidoMvp('')
    setGolElegido('')
    setConfirmado(false)
    setMensaje('')
  }

  async function proponerGol(evento) {
    evento.preventDefault()
    setMensaje('')

    if (!votanteId) {
      setMensaje('Primero identificáte seleccionando tu nombre.')
      return
    }

    if (!descripcionGol.trim()) {
      setMensaje('Escribí una descripción del gol.')
      return
    }

    setGuardando(true)

    const { data, error: errorPropuesta } = await supabase.rpc(
      'proponer_gol',
      {
        p_partido_id: Number(partidoId),
        p_jugador_id: Number(votanteId),
        p_descripcion: descripcionGol.trim(),
      }
    )

    if (errorPropuesta) {
      setMensaje(errorPropuesta.message)
      setGuardando(false)
      return
    }

    await cargarDetalle()
    setGolElegido(String(data))
    setDescripcionGol('')
    setMensaje('Gol incorporado a las propuestas. ¡Ya podés votarlo!')
    setGuardando(false)
  }

  async function confirmarVotos() {
    setMensaje('')

    if (!votanteId) {
      setMensaje('Seleccioná tu nombre para continuar.')
      return
    }

    if (!elegidoMvp || !golElegido) {
      setMensaje('Elegí al Premio Toño y un Gol de la Fecha.')
      return
    }

    setGuardando(true)

    const { error: errorMvp } = await supabase.rpc('votar_mvp', {
      p_partido_id: Number(partidoId),
      p_votante_id: Number(votanteId),
      p_elegido_id: Number(elegidoMvp),
    })

    if (errorMvp) {
      setMensaje(errorMvp.message)
      setGuardando(false)
      return
    }

    const { error: errorGol } = await supabase.rpc('votar_gol', {
      p_partido_id: Number(partidoId),
      p_votante_id: Number(votanteId),
      p_gol_id: Number(golElegido),
    })

    if (errorGol) {
      setMensaje(
        `El voto al Premio Toño se guardó, pero el voto al gol no: ${errorGol.message}`
      )
      setGuardando(false)
      await cargarDetalle()
      return
    }

    setConfirmado(true)
    setMostrarResultados(true)
    setMensaje('¡Votos registrados! Podés modificarlos mientras la votación siga abierta.')
    await cargarDetalle()
  }

  if (cargando) {
    return <div className="votacion-pagina">Cargando votación…</div>
  }

  if (error) {
    return (
      <div className="votacion-pagina">
        <p className="votacion-error">No pudimos cargar la votación: {error}</p>
      </div>
    )
  }

  const abierta = detalle.estado === 'abierta'
  const resultadosVisibles = mostrarResultados || !abierta
  
  return (
    <main className="votacion-pagina">
      <header className="votacion-encabezado">
        <span className="votacion-etiqueta">SOMOS ENRIKO · PREMIOS</span>
        <button
  type="button"
  className="votacion-volver"
  onClick={() => {
    window.location.href = window.location.pathname
  }}
>
  ← Volver al sitio
</button>
        <h1>El cuarto tiempo</h1>
        <p>
          {detalle.partido.tipo_partido || 'Partido'} ·{' '}
          {new Date(`${detalle.partido.fecha}T12:00:00`).toLocaleDateString(
            'es-AR',
            { day: 'numeric', month: 'long', year: 'numeric' }
          )}
        </p>
        <div className="votacion-marcador">
          <span>Claros</span>
          <strong>
            {detalle.partido.goles_claros} – {detalle.partido.goles_oscuros}
          </strong>
          <span>Oscuros</span>
        </div>
        <span className={`votacion-estado ${abierta ? 'abierta' : 'cerrada'}`}>
          {abierta ? 'VOTACIÓN ABIERTA' : 'VOTACIÓN CERRADA'}
        </span>
        <button
  type="button"
  className="votacion-ver-resultados"
  onClick={() => setMostrarResultados((actual) => !actual)}
>
  {mostrarResultados
    ? 'Ocultar resultados parciales'
    : 'Ver resultados parciales'}
</button>
      </header>

      <section className="votacion-bloque">
        <span className="votacion-numero">01</span>
        <h2>Identificate</h2>
        <p>Seleccioná tu nombre entre quienes jugaron este partido.</p>

        <select
          value={votanteId}
          onChange={(e) => cambiarVotante(e.target.value)}
          disabled={!abierta}
        >
          <option value="">Seleccionar jugador…</option>
          {participantes.map((jugador) => (
            <option
              key={jugador.jugador_id}
              value={jugador.jugador_id}
            >
              {jugador.nombre} · {jugador.equipo}
            </option>
          ))}
        </select>

        {miJugador && (
          <p className="votacion-identificado">
            Estás participando como <strong>{miJugador.nombre}</strong>.
          </p>
        )}
      </section>

      <section className="votacion-bloque">
        <span className="votacion-numero">02</span>
        <h2>🏆 Premio Toño</h2>
        <h3>Al Mejor Jugador de la Fecha</h3>
        <p>¿Quién fue la figura del partido?</p>
        <div className="votacion-filtros">
  <input
    type="search"
    value={filtroJugador}
    onChange={(e) => setFiltroJugador(e.target.value)}
    placeholder="Buscar jugador..."
    disabled={!abierta || !votanteId}
  />

  <select
    value={filtroEquipo}
    onChange={(e) => setFiltroEquipo(e.target.value)}
    disabled={!abierta || !votanteId}
    aria-label="Filtrar jugadores por equipo"
  >
    <option value="Todos">Ambos equipos</option>
    <option value="Claros">Claros</option>
    <option value="Oscuros">Oscuros</option>
  </select>
</div>

{votanteId && (
  <p className="votacion-cantidad">
    {candidatosMvp.length} jugadores disponibles para votar
  </p>
)}
        <div className="votacion-opciones">
          {candidatosMvp.map((jugador) => (
            <label
              className={`votacion-opcion ${
                elegidoMvp === String(jugador.jugador_id) ? 'seleccionada' : ''
              }`}
              key={jugador.jugador_id}
            >
              <input
                type="radio"
                name="premio-tono"
                value={jugador.jugador_id}
                checked={elegidoMvp === String(jugador.jugador_id)}
                onChange={(e) => setElegidoMvp(e.target.value)}
                disabled={!abierta || !votanteId}
              />
              <span>{jugador.nombre}</span>
              <small>{jugador.equipo}</small>
            </label>
          ))}
        </div>

        {resultadosVisibles && (
  <div className="votacion-resultados">
    <h4>Resultados parciales</h4>

    {detalle.premio_tono.length === 0 ? (
      <p>Todavía no hay votos.</p>
    ) : (
      detalle.premio_tono.map((resultado) => {
        const porcentaje = detalle.total_votos_premio_tono > 0
          ? (resultado.votos / detalle.total_votos_premio_tono) * 100
          : 0

        return (
          <div className="votacion-resultado-item" key={resultado.jugador_id}>
            <div className="votacion-resultado-datos">
              <span>{resultado.nombre}</span>
              <strong>
                {resultado.votos} · {porcentaje.toFixed(0)}%
              </strong>
            </div>

            <div className="votacion-barra-fondo">
              <div
                className="votacion-barra-valor"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )
      })
    )}

    <small>{detalle.total_votos_premio_tono} votos emitidos</small>
  </div>
)}
      </section>

      <section className="votacion-bloque">
        <span className="votacion-numero">03</span>
        <h2>⚽ Gol de la Fecha</h2>
        <p>Elegí el mejor gol o sumá uno que todavía no esté en la lista.</p>

        {goles.length === 0 ? (
          <p className="votacion-sin-goles">
            Todavía no hay goles propuestos. ¡Inaugurá la lista!
          </p>
        ) : (
          <div className="votacion-opciones">
            {goles.map((gol) => (
              <label
                className={`votacion-opcion ${
                  golElegido === String(gol.gol_id) ? 'seleccionada' : ''
                }`}
                key={gol.gol_id}
              >
                <input
                  type="radio"
                  name="gol-fecha"
                  value={gol.gol_id}
                  checked={golElegido === String(gol.gol_id)}
                  onChange={(e) => setGolElegido(e.target.value)}
                  disabled={!abierta || !votanteId}
                />
                <span>{gol.descripcion}</span>
                <small>Propuesto por {gol.nombre_proponente}</small>
              </label>
            ))}
          </div>
        )}

        <form className="votacion-proponer" onSubmit={proponerGol}>
          <label htmlFor="descripcion-gol">¿Falta algún gol?</label>
          <textarea
            id="descripcion-gol"
            value={descripcionGol}
            onChange={(e) => setDescripcionGol(e.target.value)}
            placeholder="Ej.: Sablazo de Fede Black a donde duermen las arañas"
            maxLength={300}
            minLength={5}
            disabled={!abierta || !votanteId || guardando}
          />
          <button
            type="submit"
            disabled={!abierta || !votanteId || guardando}
          >
            + Proponer gol
          </button>
        </form>

        {resultadosVisibles && (
  <div className="votacion-resultados">
    <h4>Resultados parciales</h4>

    {goles.length === 0 ? (
      <p>Todavía no hay propuestas.</p>
    ) : (
      goles.map((gol) => {
        const porcentaje = detalle.total_votos_gol > 0
          ? (gol.votos / detalle.total_votos_gol) * 100
          : 0

        return (
          <div className="votacion-resultado-item" key={gol.gol_id}>
            <div className="votacion-resultado-datos">
              <span>{gol.descripcion}</span>
              <strong>
                {gol.votos} · {porcentaje.toFixed(0)}%
              </strong>
            </div>

            <div className="votacion-barra-fondo">
              <div
                className="votacion-barra-valor"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )
      })
    )}

    <small>{detalle.total_votos_gol} votos emitidos</small>
  </div>
)}
      </section>

      {abierta && (
        <div className="votacion-confirmacion">
          <button
            type="button"
            onClick={confirmarVotos}
            disabled={!votanteId || !elegidoMvp || !golElegido || guardando}
          >
            {guardando ? 'Guardando…' : confirmado ? 'Actualizar mis votos' : 'Confirmar mis votos'}
          </button>
        </div>
      )}

      {mensaje && <p className="votacion-mensaje" role="status">{mensaje}</p>}

      {!abierta && (
        <div className="votacion-cierre">
          Esta votación ya cerró. ¡Gracias por participar!
        </div>
      )}
    </main>
  )
}
