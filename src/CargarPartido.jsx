import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const TIPOS = ['Oficial', 'Amistoso']

function hoyArgentina() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function SelectorEquipo({
  titulo,
  equipo,
  setEquipo,
  disponibles,
  jugadores,
  nombresUsados,
}) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [padrino, setPadrino] = useState('')
  const [aviso, setAviso] = useState('')

  function agregarExistente(id) {
    const jugador = jugadores.find((j) => String(j.id) === String(id))
    if (!jugador) return
    setEquipo([...equipo, { id: jugador.id, nombre: jugador.nombre }])
  }

  function quitar(indice) {
    setEquipo(equipo.filter((_, i) => i !== indice))
  }

  function agregarNuevo() {
    const limpio = nombre.trim()

    if (!limpio) return setAviso('Escribí el nombre.')
    if (limpio.length > 40) return setAviso('El nombre es demasiado largo.')
    if (nombresUsados.has(limpio.toLowerCase())) {
      return setAviso('Ese nombre ya existe. Elegilo de la lista.')
    }
    if (!whatsapp) {
      return setAviso('Indicá si está en el grupo de WhatsApp.')
    }

    setEquipo([
      ...equipo,
      {
        nuevo: true,
        nombre: limpio,
        en_whatsapp: whatsapp === 'si',
        introducido_por: padrino ? Number(padrino) : null,
      },
    ])
    setNombre('')
    setWhatsapp('')
    setPadrino('')
    setAviso('')
    setCreando(false)
  }

  return (
    <div className="carga-equipo">
      <h3>{titulo}</h3>

      <div className="carga-chips">
        {equipo.length === 0 && (
          <span className="mini-etiqueta">Sin jugadores todavía</span>
        )}
        {equipo.map((j, indice) => (
          <span
            key={j.id ?? `nuevo-${j.nombre}`}
            className={`carga-chip ${j.nuevo ? 'carga-chip-nuevo' : ''}`}
          >
            {j.nombre}
            {j.nuevo && ' (nuevo)'}
            <button
              type="button"
              onClick={() => quitar(indice)}
              aria-label={`Quitar a ${j.nombre}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <select
        value=""
        onChange={(e) => agregarExistente(e.target.value)}
        aria-label={`Agregar jugador a ${titulo}`}
      >
        <option value="">+ Agregar jugador…</option>
        {disponibles.map((j) => (
          <option key={j.id} value={j.id}>
            {j.nombre}
          </option>
        ))}
      </select>

      {!creando ? (
        <button
          type="button"
          className="boton-secundario"
          onClick={() => setCreando(true)}
        >
          ¿No está en la lista? Jugador nuevo
        </button>
      ) : (
        <div className="carga-nuevo">
          <label>Nombre del jugador nuevo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={40}
          />

          <label>¿Está en el grupo de WhatsApp?</label>
          <select value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}>
            <option value="">Elegí una opción</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>

          <label>¿Quién lo invitó? (opcional)</label>
          <select value={padrino} onChange={(e) => setPadrino(e.target.value)}>
            <option value="">No sé / nadie</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre}
              </option>
            ))}
          </select>

          {aviso && <p role="alert" className="muro-aviso">{aviso}</p>}

          <div className="portada-acciones">
            <button type="button" className="boton-principal" onClick={agregarNuevo}>
              Agregar
            </button>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => {
                setCreando(false)
                setAviso('')
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CargarPartido({ navegar }) {
  const [jugadores, setJugadores] = useState([])
  const [errorLista, setErrorLista] = useState(null)

  const [codigo, setCodigo] = useState('')
  const [fecha, setFecha] = useState(hoyArgentina())
  const [tipo, setTipo] = useState('Oficial')
  const [golesClaros, setGolesClaros] = useState('')
  const [golesOscuros, setGolesOscuros] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [claros, setClaros] = useState([])
  const [oscuros, setOscuros] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [exito, setExito] = useState(false)

  async function cargarJugadores() {
    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre')
      .order('nombre', { ascending: true })

    if (error) {
      setErrorLista(error.message)
      return
    }
    setJugadores(data || [])
  }

  useEffect(() => {
    cargarJugadores()
  }, [])

  const idsUsados = new Set(
    [...claros, ...oscuros].filter((j) => !j.nuevo).map((j) => j.id)
  )

  const disponibles = jugadores.filter((j) => !idsUsados.has(j.id))

  const nombresUsados = new Set([
    ...jugadores.map((j) => j.nombre.toLowerCase()),
    ...[...claros, ...oscuros]
      .filter((j) => j.nuevo)
      .map((j) => j.nombre.toLowerCase()),
  ])

  function armarEquipo(lista) {
    return lista.map((j) =>
      j.nuevo
        ? {
            nombre: j.nombre,
            en_whatsapp: j.en_whatsapp,
            introducido_por: j.introducido_por,
          }
        : { id: j.id }
    )
  }

  async function enviar(evento) {
    evento.preventDefault()
    setAviso('')
    setExito(false)

    if (!codigo.trim()) return setAviso('Escribí el código del grupo.')
    if (!fecha) return setAviso('Elegí la fecha.')
    if (golesClaros === '' || golesOscuros === '') {
      return setAviso('Cargá los goles de los dos equipos.')
    }
    if (claros.length === 0 || oscuros.length === 0) {
      return setAviso('Cada equipo necesita al menos un jugador.')
    }

    setEnviando(true)

    const { data, error } = await supabase.rpc('cargar_partido_con_codigo', {
      p_codigo: codigo,
      p_fecha: fecha,
      p_goles_claros: Number(golesClaros),
      p_goles_oscuros: Number(golesOscuros),
      p_tipo: tipo,
      p_observaciones: observaciones,
      p_claros: armarEquipo(claros),
      p_oscuros: armarEquipo(oscuros),
    })

    setEnviando(false)

    if (error) {
      setAviso(error.message)
      return
    }

    if (!data?.ok) {
      setAviso(
        data?.motivo === 'bloqueado'
          ? 'Demasiados intentos fallidos. Probá de nuevo en 15 minutos.'
          : 'El código no es correcto.'
      )
      return
    }

    setExito(true)
    setGolesClaros('')
    setGolesOscuros('')
    setObservaciones('')
    setClaros([])
    setOscuros([])
    cargarJugadores()
  }

  if (errorLista) {
    return (
      <div className="estado-datos estado-error">
        <strong>No pudimos cargar la lista de jugadores.</strong>
        <p>{errorLista}</p>
      </div>
    )
  }

  return (
    <form className="muro-formulario carga-formulario" onSubmit={enviar}>
      <h2>Datos del partido</h2>

      <label htmlFor="carga-codigo">Código del grupo</label>
      <input
        id="carga-codigo"
        type="password"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        autoComplete="off"
      />

      <div className="carga-fila">
        <div>
          <label htmlFor="carga-fecha">Fecha</label>
          <input
            id="carga-fecha"
            type="date"
            value={fecha}
            max={hoyArgentina()}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="carga-tipo">Tipo de partido</label>
          <select
            id="carga-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="carga-fila">
        <div>
          <label htmlFor="carga-goles-claros">Goles de Claros ◇</label>
          <input
            id="carga-goles-claros"
            type="number"
            inputMode="numeric"
            min="0"
            max="50"
            value={golesClaros}
            onChange={(e) => setGolesClaros(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="carga-goles-oscuros">Goles de Oscuros ⚫</label>
          <input
            id="carga-goles-oscuros"
            type="number"
            inputMode="numeric"
            min="0"
            max="50"
            value={golesOscuros}
            onChange={(e) => setGolesOscuros(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="carga-equipos">
        <SelectorEquipo
          titulo="◇ Claros"
          equipo={claros}
          setEquipo={setClaros}
          disponibles={disponibles}
          jugadores={jugadores}
          nombresUsados={nombresUsados}
        />
        <SelectorEquipo
          titulo="⚫ Oscuros"
          equipo={oscuros}
          setEquipo={setOscuros}
          disponibles={disponibles}
          jugadores={jugadores}
          nombresUsados={nombresUsados}
        />
      </div>

      <label htmlFor="carga-obs">Observaciones (opcional)</label>
      <textarea
        id="carga-obs"
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        maxLength={500}
        rows={3}
      />

      <div className="muro-formulario-pie">
        <span>{observaciones.length}/500</span>
        <button type="submit" className="boton-principal" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Cargar partido'}
        </button>
      </div>

      {aviso && <p role="alert" className="muro-aviso">{aviso}</p>}

      {exito && (
        <p role="status" className="muro-aviso">
          ¡Partido cargado! 🎉{' '}
          <button
            type="button"
            className="enlace"
            onClick={() => navegar('Historial')}
          >
            Ver el historial ↗
          </button>
        </p>
      )}
    </form>
  )
}

export default CargarPartido
