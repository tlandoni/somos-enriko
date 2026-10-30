import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './App.css'
import TeamSelector from './TeamSelector'
import Votacion from './Votacion'


const SECCIONES = [
  '¿Quiénes somos?',
  'Historial',
  'Estadísticas',
  'Mundial Personal 🌎',
  'El Muro Enriko',
  'Próximo sábado',
  'Nosotros',
]


function formatearFecha(fecha) {
  if (!fecha) return 'Fecha no disponible'

  const fechaLocal = new Date(`${fecha.slice(0, 10)}T12:00:00`)

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(fechaLocal)
}

function numero(valor, decimales = 0) {
  if (valor === null || valor === undefined || valor === '') return '—'

  const n = Number(valor)

  if (!Number.isFinite(n)) return '—'

  return n.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

function ErrorDatos({ mensaje }) {
  return (
    <div className="estado-datos estado-error">
      <strong>No pudimos cargar esta información.</strong>
      <p>{mensaje}</p>
    </div>
  )
}

function SinDatos({ children }) {
  return (
    <div className="estado-datos">
      <span className="estado-icono">◎</span>
      <p>{children}</p>
    </div>
  )
}

function TarjetaSeccion({ numero, titulo, descripcion, onClick }) {
  return (
    <button className="acceso-card" onClick={onClick}>
      <span className="acceso-numero">{numero}</span>
      <div>
        <h3>{titulo}</h3>
        <p>{descripcion}</p>
      </div>
      <span className="acceso-flecha" aria-hidden="true">↗</span>
    </button>
  )
}

function App() {
  const [seccion, setSeccion] = useState('¿Quiénes somos?')
  const partidoParaVotar = new URLSearchParams(
    window.location.search
  ).get('votar')
  const [ranking, setRanking] = useState([])
  const [puntosJugadores, setPuntosJugadores] = useState([])
  const [arbolJugadores, setArbolJugadores] = useState([])
  const [insignias, setInsignias] = useState([])
  const [duplas, setDuplas] = useState([])
  const [partidos, setPartidos] = useState([])
  const [resumenPartidos, setResumenPartidos] = useState(null)
  const [detallesVotacion, setDetallesVotacion] = useState({})
  const [jugadores, setJugadores] = useState([])
  const [mundial, setMundial] = useState([])
  const [ordenRanking, setOrdenRanking] = useState({
    columna: 'diferencia_gol',
    direccion: 'desc',
  })
  
  const [ordenDuplas, setOrdenDuplas] = useState({
    columna: 'indice_quimica',
    direccion: 'desc',
  })
const [cargandoMundial, setCargandoMundial] = useState(true)
const [errorMundial, setErrorMundial] = useState(null)

const [mensajesMuro, setMensajesMuro] = useState([])
const [cargandoMuro, setCargandoMuro] = useState(true)
const [errorMuro, setErrorMuro] = useState(null)
const [nombreMuro, setNombreMuro] = useState('')
const [textoMuro, setTextoMuro] = useState('')
const [categoriaMuro, setCategoriaMuro] = useState('Libre')
const [publicandoMuro, setPublicandoMuro] = useState(false)
const [avisoMuro, setAvisoMuro] = useState('')

  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState({})
  
  useEffect(() => {
    let activo = true

    async function cargarDatos() {
      setCargando(true)

const resultados = await Promise.all([
  supabase
    .from('resumen_partidos')
    .select('*')
    .single(),

  supabase
    .from('ranking_completo')
    .select('*')
    .order('porcentaje_victorias', {
      ascending: false,
      nullsFirst: false,
    }),

  supabase
    .from('puntos_jugadores')
    .select('*')
    .order('puntos', { ascending: false })
    .order('promedio_puntos', { ascending: false }),

  supabase
    .from('ranking_duplas')
    .select('*')
    .order('indice_quimica', {
      ascending: false,
      nullsFirst: false,
    })
    .limit(20),

    supabase
    .from('partidos')
    .select(`
      *,
      participaciones (
        equipo,
        jugadores (nombre)
      )
    `)
    .order('fecha', { ascending: false }),

  supabase
    .from('jugadores')
    .select('*')
    .order('nombre', { ascending: true }),

  supabase
    .from('arbol_jugadores')
    .select('*'),

  supabase
    .from('insignias')
    .select('*'),
])

      if (!activo) return

      const nombres = [
        'resumenPartidos',
        'ranking',
        'puntosJugadores',
        'duplas',
        'partidos',
        'jugadores',
        'arbolJugadores',
        'insignias',
      ]
      
      const nuevosErrores = {}
      
      resultados.forEach((resultado, indice) => {
        if (resultado.error) {
          nuevosErrores[nombres[indice]] = resultado.error.message
        }
      })
      
      setResumenPartidos(resultados[0].data || null)
      setRanking(resultados[1].data || [])
      setPuntosJugadores(resultados[2].data || [])
      setDuplas(resultados[3].data || [])
      
      setPartidos(resultados[4].data || [])
      setJugadores(resultados[5].data || [])
      setArbolJugadores(resultados[6].data || [])
      setInsignias(resultados[7].data || [])
      setErrores(nuevosErrores)
      setCargando(false)

    }

    cargarDatos()

    return () => {
      activo = false
    }
  }, [])
  useEffect(() => {
    let activo = true
  
    async function cargarDetallesVotacion() {
      if (!partidos.length) return
  
      const resultados = await Promise.all(
        partidos.map(async (partido) => {
          const { data, error } = await supabase.rpc(
            'obtener_detalle_votacion',
            { p_partido_id: partido.id }
          )
  
          if (error) {
            console.error(
              `Error al cargar votación del partido ${partido.id}:`,
              error.message
            )
            return [partido.id, null]
          }
  
          return [partido.id, data]
        })
      )
  
      if (!activo) return
  
      setDetallesVotacion(Object.fromEntries(resultados))
    }
  
    cargarDetallesVotacion()
  
    return () => {
      activo = false
    }
  }, [partidos])
  useEffect(() => {
    let activo = true
  
    async function cargarMundial() {
      setCargandoMundial(true)
      setErrorMundial(null)
  
      const { data, error } = await supabase.rpc(
        'mundial_personal_estados'
      )
  
      if (!activo) return
  
      if (error) {
        setErrorMundial(error.message)
        setMundial([])
      } else {
        setMundial(data || [])
      }
  
      setCargandoMundial(false)
    }
  
    cargarMundial()
  
    return () => {
      activo = false
    }
  }, [])
  
  
  useEffect(() => {
    let activo = true

    async function cargarMensajesMuro() {
      setCargandoMuro(true)
      setErrorMuro(null)

      const { data, error } = await supabase
        .from('mensajes_muro')
        .select('id, nombre, mensaje, categoria, created_at')
        .order('created_at', { ascending: false })

      if (!activo) return

      if (error) {
        setErrorMuro(error.message)
        setMensajesMuro([])
      } else {
        setMensajesMuro(data || [])
      }

      setCargandoMuro(false)
    }

    cargarMensajesMuro()

    return () => {
      activo = false
    }
  }, [])

  
  async function publicarMensajeMuro(evento) {
    evento.preventDefault()
    setAvisoMuro('')

    const nombre = nombreMuro.trim()
    const mensaje = textoMuro.trim()

    if (!nombre || !mensaje) {
      setAvisoMuro('Completá tu nombre y tu mensaje.')
      return
    }

    setPublicandoMuro(true)

    const { data, error } = await supabase
      .from('mensajes_muro')
      .insert({
        nombre,
        mensaje,
        categoria: categoriaMuro,
      })
      .select('id, nombre, mensaje, categoria, created_at')
      .single()

    setPublicandoMuro(false)

    if (error) {
      setAvisoMuro(`No se pudo publicar: ${error.message}`)
      return
    }

    setMensajesMuro((actuales) => [data, ...actuales])
    setNombreMuro('')
    setTextoMuro('')
    setCategoriaMuro('Libre')
    setAvisoMuro('¡Pintada publicada! 💜')
  }

  function navegar(destino) {
    setSeccion(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function irAEstadisticas() {
    navegar('Estadísticas')
  }

  function irACalendario() {
    navegar('Historial')
  }

  function irAExplorar() {
     document.getElementById('explorar')?.scrollIntoView({
       behavior: 'smooth',
       block: 'start',
     })
  }
  
  function renderError(clave) {
    if (!errores[clave]) return null
    return <ErrorDatos mensaje={errores[clave]} />
  }

  
function renderRankingIndividual(limite = ranking.length) {
  if (errores.ranking) {
    return renderError('ranking')
  }

  if (cargando) {
    return <SinDatos>Cargando estadísticas…</SinDatos>
  }

  if (!ranking.length) {
    return (
      <SinDatos>
        Todavía no hay jugadores con estadísticas disponibles en el ranking.
      </SinDatos>
    )
  }

  const rankingOrdenado = ordenarFilas(
    ranking,
    ordenRanking,
    (a, b) => Number(b.pj ?? 0) - Number(a.pj ?? 0)
  )

  const columnas = [
    { clave: 'nombre', titulo: 'Jugador', tipo: 'texto' },
    { clave: 'pj', titulo: 'PJ' },
    { clave: 'pg', titulo: 'PG' },
    { clave: 'pe', titulo: 'PE' },
    { clave: 'pp', titulo: 'PP' },
    {
      clave: 'porcentaje_victorias',
      titulo: '% victorias',
      formato: (j) => `${numero(j.porcentaje_victorias, 1)}%`,
    },
    { clave: 'diferencia_gol', titulo: 'Dif. de gol' },
    {
      clave: 'diferencia_gol_promedio',
      titulo: 'Dif. promedio',
      formato: (j) => numero(j.diferencia_gol_promedio, 2),
    },
    {
      clave: 'rating',
      titulo: 'Rating',
      formato: (j) => numero(j.rating, 2),
    },
    {
      clave: 'Mundial Personal 🌎',
      titulo: 'Mundial Personal 🌎',
      tipo: 'texto',
      formato: (j) => j['Mundial Personal 🌎'] ?? '—',
    },
  ]

  return (
    <div className="tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>#</th>
            {columnas.map((columna) => (
              <th key={columna.clave}>
                <button
                  type="button"
                  className="boton-orden-tabla"
                  onClick={() =>
                    cambiarOrden(
                      ordenRanking,
                      setOrdenRanking,
                      columna.clave
                    )
                  }
                >
                  {columna.titulo}
                  {ordenRanking.columna === columna.clave
                    ? ordenRanking.direccion === 'desc'
                      ? ' ↓'
                      : ' ↑'
                    : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rankingOrdenado.slice(0, limite).map((jugador, indice) => (
            <tr
              key={
                jugador.jugador_id ??
                jugador.id ??
                jugador.nombre
              }
            >
              <td className="puesto">{indice + 1}</td>

              {columnas.map((columna) => (
                <td
                  key={columna.clave}
                  className={
                    columna.clave === 'nombre'
                      ? 'celda-nombre'
                      : columna.clave === 'porcentaje_victorias'
                        ? 'dato-destacado'
                        : ''
                  }
                >
                  {columna.formato
                    ? columna.formato(jugador)
                    : columna.tipo === 'texto'
                      ? jugador[columna.clave] ?? '—'
                      : numero(jugador[columna.clave])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      
        </table>

<div className="criterios-tabla">
  <strong>¿Cómo se calcula el rating?</strong>
  <p>
    El rating combina dos factores: el porcentaje de victorias y
    la diferencia de gol promedio por partido. Ganar más seguido
    y obtener mejores diferencias de gol contribuye a elevarlo.
  </p>
  <p>
    Para que una muestra pequeña de partidos no pese demasiado,
    el cálculo ajusta el rating hacia el promedio general de los
    jugadores. Cuantos más partidos disputás, mayor es la influencia
    de tu propio rendimiento.
  </p>
  <p>
    <strong>Importante:</strong> es un indicador estadístico
    comparativo, no una predicción exacta de cómo vas a jugar
    en el próximo partido. Se consideran únicamente partidos oficiales.
  </p>
</div>
</div>
)
}


function renderTablaPuntos() {
  if (errores.puntosJugadores) {
    return (
      <SinDatos>
        No se pudieron cargar los puntos: {errores.puntosJugadores}
      </SinDatos>
    )
  }

  if (cargando) {
    return <SinDatos>Cargando tabla de puntos…</SinDatos>
  }

  if (!puntosJugadores.length) {
    return <SinDatos>Todavía no hay puntos para mostrar.</SinDatos>
  }

  return (
    <div className="tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PE</th>
            <th>PP</th>
            <th>Puntos</th>
            <th>Promedio</th>
          </tr>
        </thead>
        <tbody>
          {puntosJugadores.map((jugador, indice) => (
            <tr key={jugador.nombre}>
              <td className="puesto">{indice + 1}</td>
              <td className="celda-nombre">{jugador.nombre}</td>
              <td>{numero(jugador.pj)}</td>
              <td>{numero(jugador.pg)}</td>
              <td>{numero(jugador.pe)}</td>
              <td>{numero(jugador.pp)}</td>
              <td className="dato-destacado">
                {numero(jugador.puntos)}
              </td>
              <td>{numero(jugador.promedio_puntos, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="criterios-tabla">
        <strong>¿Cómo se puntúa?</strong>
        <p>
          Victoria: 4 puntos · Empate: 2 puntos · Derrota: 1 punto.
        </p>
        <p>
          El promedio se calcula dividiendo los puntos acumulados
          por los partidos jugados. Se consideran los partidos oficiales
          de todo el historial.
        </p>
      </div>
    </div>
  )
}

  function ordenarFilas(filas, orden, desempate = null) {
    return [...filas].sort((a, b) => {
      const valorA = a[orden.columna]
      const valorB = b[orden.columna]
  
      let comparacion = 0
  
      if (valorA == null && valorB != null) return 1
      if (valorA != null && valorB == null) return -1
  
      if (typeof valorA === 'string' && typeof valorB === 'string') {
        comparacion = valorA.localeCompare(valorB, 'es')
      } else {
        comparacion = Number(valorA ?? 0) - Number(valorB ?? 0)
      }
  
      if (comparacion !== 0) {
        return orden.direccion === 'asc'
          ? comparacion
          : -comparacion
      }
  
      if (desempate) {
        return desempate(b, a)
      }
  
      return 0
    })
  }
  
  function cambiarOrden(orden, setOrden, columna) {
    setOrden((actual) => ({
      columna,
      direccion:
        actual.columna === columna && actual.direccion === 'desc'
          ? 'asc'
          : 'desc',
    }))
  }
  function renderRankingDuplas(limite = duplas.length) {
    if (errores.duplas) {
      return renderError('duplas')
    }

    if (cargando) {
      return <SinDatos>Cargando estadísticas de las duplas…</SinDatos>
    }

    if (!duplas.length) {
      return (
        <SinDatos>
          Todavía no hay duplas con estadísticas disponibles.
        </SinDatos>
      )
    }

    return (
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Dupla</th>
              <th>PJ juntos</th>
              <th>PG juntos</th>
              <th>% victorias</th>
              <th>Dif. de gol</th>
              <th>Dif. promedio</th>
              <th>Índice de química</th>
              <th>Índice de sinergia</th>
            </tr>
          </thead>

          <tbody>
            {duplas.slice(0, limite).map((dupla, indice) => {
              const nombreDupla =
                dupla.jugador_1 && dupla.jugador_2
                  ? `${dupla.jugador_1} + ${dupla.jugador_2}`
                  : dupla.dupla ?? 'Dupla'

              const porcentaje =
                dupla.porcentaje_victorias ??
                (
                  Number(dupla.pj_juntos) > 0
                    ? 100 * Number(dupla.pg_juntos) /
                      Number(dupla.pj_juntos)
                    : null
                )

              return (
                <tr
                  key={
                    dupla.jugador_1_id && dupla.jugador_2_id
                      ? `${dupla.jugador_1_id}-${dupla.jugador_2_id}`
                      : nombreDupla
                  }
                >
                  <td className="puesto">{indice + 1}</td>
                  <td className="celda-nombre">{nombreDupla}</td>
                  <td>{numero(dupla.pj_juntos)}</td>
                  <td>{numero(dupla.pg_juntos)}</td>
                  <td className="dato-destacado">
                    {numero(porcentaje, 1)}%
                  </td>
                  <td>{numero(dupla.diferencia_gol_juntos)}</td>
                  <td>{numero(dupla.diferencia_gol_promedio, 2)}</td>
                  
                  <td className="quimica">
                 {numero(dupla.indice_quimica, 2)}
                </td>
                  <td className="quimica">
                  {numero(dupla.indice_sinergia, 2)}
                  </td>

                </tr>
              )
            })}
          </tbody>
        
          </table>

<div className="criterios-tabla">
  <strong>¿Cómo se evalúan las duplas?</strong>
  <p>
    <strong>Índice de química:</strong> combina el porcentaje
    de victorias compartidas con la cantidad de partidos jugados
    juntos. Una dupla que gana con frecuencia y tiene más partidos
    en común obtiene un índice mayor.
  </p>
  <p>
    <strong>Índice de sinergia:</strong> parte del índice de química
    y suma la diferencia de gol promedio de la dupla, multiplicada
    por 5. Así incorpora no solo cuántas veces gana, sino también
    por cuánto suele ganar o perder.
  </p>
  <p>
    Ambos indicadores se calculan con partidos oficiales.
    Son referencias estadísticas: no garantizan que una dupla
    vaya a repetir esos resultados en el próximo partido.
  </p>
</div>
</div>
)
}



  
  
function renderCalendario() {
  if (errores.partidos) return renderError('partidos')

  if (cargando) {
    return <SinDatos>Cargando historial…</SinDatos>
  }

  if (!partidos.length) {
    return (
      <SinDatos>
        Todavía no hay partidos registrados en el historial.
      </SinDatos>
    )
  }

  return (
    <div className="partidos-lista">
      {partidos.map((partido) => {
        const claros = partido.goles_claros
        const oscuros = partido.goles_oscuros

        const tieneResultado =
          claros !== null &&
          claros !== undefined &&
          oscuros !== null &&
          oscuros !== undefined

        const participaciones = partido.participaciones || []

        const jugadoresClaros = participaciones
          .filter((p) => p.equipo === 'Claros')
          .map((p) => p.jugadores?.nombre)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'es'))

        const jugadoresOscuros = participaciones
          .filter((p) => p.equipo === 'Oscuros')
          .map((p) => p.jugadores?.nombre)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'es'))
          const detalleVotacion = detallesVotacion[partido.id]

          const premioTono = detalleVotacion?.premio_tono || []
          const golesFecha = detalleVotacion?.goles_fecha || []
          
          const maxVotosTono = Math.max(
            0,
            ...premioTono.map((item) => Number(item.votos || 0))
          )
          
          const maxVotosGol = Math.max(
            0,
            ...golesFecha.map((item) => Number(item.votos || 0))
          )
          
          const ganadoresTono = premioTono.filter(
            (item) => Number(item.votos || 0) === maxVotosTono && maxVotosTono > 0
          )
          
          const ganadoresGol = golesFecha.filter(
            (item) => Number(item.votos || 0) === maxVotosGol && maxVotosGol > 0
          )
          
          const votacionAbierta = detalleVotacion?.estado === 'abierta'
        return (
          <article className="partido-card" key={partido.id}>
            <div className="partido-fecha">
              <span className="mini-etiqueta">FECHA</span>
              <strong>{formatearFecha(partido.fecha)}</strong>
            </div>

            <div className="partido-info">
              <span className="tipo-partido">
                {partido.tipo_partido || 'Partido'}
              </span>

              <div className="partido-marcador">
  {tieneResultado ? (
    <>
      <div className="marcador-equipo marcador-claros">
        <span>◇ CLAROS</span>
        <strong>{claros}</strong>
        <small>GOLES</small>
      </div>

      <span className="marcador-separador">—</span>

      <div className="marcador-equipo marcador-oscuros">
        <span>⚫ OSCUROS</span>
        <strong>{oscuros}</strong>
        <small>GOLES</small>
      </div>
    </>
  ) : (
    <h3>Claros <span>vs.</span> Oscuros</h3>
  )}
</div>

              <div className="partido-equipos">
                <div className="partido-equipo equipo-claros">
                <strong>◇ Claros</strong>
                  {jugadoresClaros.length > 0 ? (
                    <p>{jugadoresClaros.join(' · ')}</p>
                  ) : (
                    <p className="sin-jugadores">Sin jugadores registrados</p>
                  )}
                </div>

                <div className="partido-equipo equipo-oscuros">
                  <strong>⚫ Oscuros</strong>
                  {jugadoresOscuros.length > 0 ? (
                    <p>{jugadoresOscuros.join(' · ')}</p>
                  ) : (
                    <p className="sin-jugadores">Sin jugadores registrados</p>
                  )}
                </div>
              </div>

              {partido.observaciones && (
                <p>{partido.observaciones}</p>
              )}
            </div>

            <div className="partido-resultado">
  {!tieneResultado && (
    <span className="sin-resultado">Sin resultado</span>
  )}

  {detalleVotacion?.estado === 'abierta' && (
    <button
      type="button"
      className="boton-premios"
      onClick={() => {
        window.location.href =
          `${window.location.pathname}?votar=${partido.id}`
      }}
    >
      ¡Votá! 🏆
    </button>
  )}

  {detalleVotacion?.estado === 'cerrada' && (
    <div className="partido-premiados">
      {ganadoresTono.length > 0 && (
        <p>
          🏅 <strong>Premio Toño:</strong>{' '}
          {ganadoresTono.map((item) => (
            <span key={item.jugador_id}>
              {item.nombre} ({item.votos})
            </span>
          ))}
        </p>
      )}

      {ganadoresGol.length > 0 && (
        <p>
          ⚽ <strong>Mejor gol:</strong>{' '}
          {ganadoresGol.map((item) => (
            <span key={item.gol_id}>
              {item.descripcion} ({item.votos})
            </span>
          ))}
        </p>
      )}
    </div>
  )}
</div>
</article>
)
})}
</div>
)
}

  function renderMundialPersonal() {
    if (cargandoMundial) {
      return <SinDatos>Calculando las campañas mundialistas…</SinDatos>
    }
  
    if (errorMundial) {
      return (
        <ErrorDatos
          mensaje={`No pudimos cargar el Mundial Personal: ${errorMundial}`}
        />
      )
    }
  
    if (!mundial.length) {
      return <SinDatos>No hay jugadores para mostrar.</SinDatos>
    }
  
    const ordenEstados = {
      'Campeón del mundo': 7,
      'Final': 6,
      'Partido por el tercer puesto': 5,
      'Semifinal': 4,
      'Cuartos de final': 3,
      'Octavos de final': 2,
      'Fase de grupos': 1,
    }
  
    const jugadoresOrdenados = [...mundial].sort((a, b) => {
      if (a.es_campeon !== b.es_campeon) {
        return a.es_campeon ? -1 : 1
      }
  
      const rangoA = ordenEstados[a.estado_actual] || 0
      const rangoB = ordenEstados[b.estado_actual] || 0
  
      return rangoB - rangoA || a.nombre.localeCompare(b.nombre, 'es')
    })

    return (
      <div className="mundial-contenido">
        <div className="mundial-intro">
          <span className="mini-etiqueta">CADA PARTIDO CUENTA</span>
          <h2>El camino a la gloria.</h2>
          <p>
            Cada jugador disputa su propio Mundial. La campaña actual
            puede cambiar; la gloria conquistada queda para siempre.
          </p>
        </div>
  
  
<div className="mundial-diego">
  <img
    src="/images/maradona-silueta.png"
    alt="Silueta de Diego Maradona"
    className="mundial-diego-imagen"
  />
  <div className="mundial-diego-texto">
    <span className="mundial-diego-etiqueta">
      EL SUEÑO DE TODO ENRIKO
    </span>
    <p>
      Siete partidos. Una consagración. La gloria eterna.
    </p>
  </div>
</div>

        <div className="mundial-grid">
          {jugadoresOrdenados.map((jugador) => (
            <article
              className={`mundial-card ${jugador.es_campeon ? 'mundial-campeon' : ''}`}
              key={jugador.jugador_id}
            >
              <div className="mundial-card-cabecera">
                <span className="mundial-avatar">
                  {(jugador.nombre || '?').trim().charAt(0).toUpperCase()}
                </span>
  
                <div className="mundial-identidad">
                  <h3>{jugador.nombre}</h3>
                  <span>
                    {jugador.partidos_oficiales} partidos oficiales
                  </span>
                </div>
  
                {jugador.es_campeon && (
                  <span className="mundial-corona" title="Campeón histórico">
                    🏆
                  </span>
                )}
              </div>
  
              <div className="mundial-dato">
                <span className="mini-etiqueta">ESTADO ACTUAL</span>
                <strong>{jugador.estado_actual}</strong>
              </div>
  
              <div className="mundial-dato mundial-historico">
                <span className="mini-etiqueta">
                  {jugador.es_campeon ? 'GLORIA ETERNA' : 'MEJOR HISTÓRICO'}
                </span>
                
              

                <strong>
  {jugador.es_campeon
    ? '🏆 Campeón del mundo'
    : (!jugador.mejor_historico ||
        jugador.mejor_historico === 'Sin clasificar')
      ? 'Fase de grupos'
      : jugador.mejor_historico}
</strong>



              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }
  
  function renderNosotros() {
    if (errores.jugadores) return renderError('jugadores')

    if (cargando) {
      return <SinDatos>Cargando integrantes…</SinDatos>
    }

    if (!jugadores.length) {
      return <SinDatos>No hay integrantes registrados todavía.</SinDatos>
    }
      console.log('Árbol de integrantes:', arbolJugadores)
      console.log('Insignias recibidas:', insignias)
    return (
      <>
        <div className="comunidad-cabecera">
          <div>
            <p className="etiqueta">TODOS LOS ENRIKO</p>
            <h2>La banda detrás de la pelota.</h2>
          </div>

          <div className="contador-integrantes">
            <strong>{jugadores.length}</strong>
            <span>integrantes registrados</span>
          </div>
        </div>

        
<div className="integrantes-grid">
  {jugadores.map((jugador) => {
    const ingreso = arbolJugadores.find(
      (item) => item.jugador === jugador.nombre
    )

    const esFundador = ['Enrico', 'Hugo'].includes(jugador.nombre)

    const insigniasJugador = insignias.filter(
      (item) => String(item.jugador_id) === String(jugador.id)
    )

    const conteoInvitados = arbolJugadores.reduce((conteo, item) => {
      const padrino = item.introducido_por

      if (padrino && !['Fundador', 'Sin información'].includes(padrino)) {
        conteo[padrino] = (conteo[padrino] || 0) + 1
      }

      return conteo
    }, {})

    const maxInvitados = Math.max(0, ...Object.values(conteoInvitados))

    const esPrincipalConstructor =
      !esFundador &&
      maxInvitados > 0 &&
      (conteoInvitados[jugador.nombre] || 0) === maxInvitados

    const campania = mundial.find(
      (item) => String(item.jugador_id) === String(jugador.id)
    )

    const emblemas = {
      '10Y_CAMPEON': {
        icono: '🏆',
        nombre: 'Campeón aniversario',
        color: 'campeon',
      },
      '10Y_PARTICIPANTE': {
        icono: '🏅',
        nombre: 'Participante aniversario',
        color: 'participante',
      },
      SALVADOR_FULBITO: {
        icono: '🆘',
        nombre: 'Salvador del fulbito',
        color: 'salvador',
      },
    }

    return (
      <article className="integrante-card" key={jugador.id}>
        <div className="integrante-iniciales" aria-hidden="true">
          {(jugador.nombre || '?').trim().charAt(0).toUpperCase()}
        </div>

        <h3>{jugador.nombre}</h3>

        {esFundador ? (
          <span className="integrante-logro">★ Fundador</span>
        ) : (
          <p className="integrante-ingreso">
            Invitado por: {ingreso?.introducido_por || 'Sin información'}
          </p>
        )}

        {esPrincipalConstructor && (
          <span className="integrante-logro integrante-constructor">
            🏗️ Principal constructor
          </span>
        )}

<div className="integrante-mundial">
  <p className="integrante-mundial-titulo">
    🌎 Mundial Personal
  </p>

  <span
    className={`integrante-mundial-estado ${
      campania?.es_campeon ? 'es-campeon' : ''
    }`}
  >
    {!campania
      ? 'Fase de grupos'
      : campania.es_campeon
        ? '🏆 Campeón del mundo'
        : campania.mejor_historico}
  </span>
</div>

        {insigniasJugador.length > 0 && (
          <div className="integrante-insignias">
            {insigniasJugador.map((insignia) => {
              const emblema = emblemas[insignia.codigo] || {
                icono: '🎖️',
                nombre: insignia.codigo,
                color: 'especial',
              }

              return (
                <span
                  className={`integrante-insignia insignia-${emblema.color}`}
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
      </article>
    )
  })}
</div>
      </>
    )
  }

  function renderContenido() {
    switch (seccion) {
      case 'Mundial Personal 🌎':
  return (
    <section className="pagina interior">
      <p className="etiqueta">LA GLORIA PERSONAL</p>
      <h1>Mundial Personal<span>🌎</span></h1>
      <p className="bajada">
        Una copa para dominarlos a todos (?)
      </p>

      {renderMundialPersonal()}
    </section>
  )
  
  case 'Historial':
        return (
          <section className="pagina interior">
            <p className="etiqueta">PARTIDOS Y EVENTOS ENRIKENSES</p>
            <h1>Historial<span></span></h1>
            <p className="bajada">
              Momentos que no volverán... Pero quedaron registrados para siempre
            </p>

            {renderCalendario()}
          </section>
        )

      case 'Estadísticas':
        return (
          <section className="pagina interior">
<p className="etiqueta">LOS NÚMEROS TAMBIÉN CUENTAN HISTORIAS</p>
<h1>Estadísticas<span></span></h1>
<p className="bajada">
El registro de los partidos oficiales, los rendimientos
individuales y la química entre compañeros
</p>

<div className="seccion-estadisticas">
  <div className="titulo-tabla">
    <div>
      <span className="mini-etiqueta">PUNTAJE ACUMULADO</span>
      <h2>Tabla general de puntos</h2>
    </div>
    <span className="sello-tabla">OFICIAL</span>
  </div>

  {renderTablaPuntos()}
</div>

<div className="seccion-estadisticas">
<div className="titulo-tabla">
<div>
<span className="mini-etiqueta">RENDIMIENTO INDIVIDUAL</span>
<h2>Ranking de jugadores</h2>
</div>
<span className="sello-tabla">OFICIAL</span>
</div>

{renderRankingIndividual()}
</div>

<div className="seccion-estadisticas">
<div className="titulo-tabla">
<div>
<span className="mini-etiqueta">JUNTOS EN LA CANCHA</span>
<h2>Ranking de duplas</h2>
</div>
<span className="sello-tabla">QUÍMICA</span>
</div>

{renderRankingDuplas()}
</div>
</section>
        )
        
      
        case 'El Muro Enriko':
          return (
            <section className="pagina interior muro-pagina">
              <p className="etiqueta">LA PARED ES DE TODOS</p>
              <h1>El Muro Enriko<span> ✍️</span></h1>
              <p className="bajada">
                Declaraciones, recuerdos, cargadas y manifiestos.
                Lo que pasa en la cancha...
              </p>
  
              <div className="muro-contenido">
                <div className="muro-presentacion">
                  <span className="muro-sello">MURO OFICIAL ENRIKENSE</span>
                  <h2>Dejá tu huella</h2>
                  <p>
                    Una pared, infinitas historias. Escribí algo que
                    merezca quedar en la memoria enrikense
                  </p>
                </div>
  
                <form className="muro-formulario" onSubmit={publicarMensajeMuro}>
                  <h2>Tu pintada</h2>
  
                  <label htmlFor="nombre-muro">Nombre o apodo</label>
                  <input
                    id="nombre-muro"
                    type="text"
                    value={nombreMuro}
                    onChange={(evento) => setNombreMuro(evento.target.value)}
                    placeholder="¿Quién deja su marca?"
                    maxLength={40}
                    required
                  />
  
                  <label htmlFor="categoria-muro">Tipo de pintada</label>
                  <select
                    id="categoria-muro"
                    value={categoriaMuro}
                    onChange={(evento) => setCategoriaMuro(evento.target.value)}
                  >
                    <option value="Libre">Libre</option>
                    <option value="Cancha">Cancha</option>
                    <option value="Humor">Humor</option>
                    <option value="Recuerdos">Recuerdos</option>
                    <option value="Declaraciones">Declaraciones</option>
                    <option value="Feedback">Feedback</option>
                  </select>
  
                  <label htmlFor="mensaje-muro">Tu mensaje</label>
                  <textarea
                    id="mensaje-muro"
                    value={textoMuro}
                    onChange={(evento) => setTextoMuro(evento.target.value)}
                    placeholder="La historia te está esperando..."
                    maxLength={500}
                    rows={5}
                    required
                  />
  
                  <div className="muro-formulario-pie">
                    <span>{textoMuro.length}/500</span>
                    <button
                      type="submit"
                      className="boton-principal"
                      disabled={publicandoMuro}
                    >
                      {publicandoMuro ? 'Pintando…' : 'Dejar mi marca ✍️'}
                    </button>
                  </div>
  
                  {avisoMuro && (
                    <p role="status" className="muro-aviso">
                      {avisoMuro}
                    </p>
                  )}
                </form>
  
                <div className="muro-listado">
                  <div className="muro-listado-cabecera">
                    <span className="mini-etiqueta">LAS VOCES DEL CLUB</span>
                    <h2>Lo que quedó escrito</h2>
                  </div>
  
                  {cargandoMuro ? (
                    <p className="muro-vacio">Leyendo la pared…</p>
                  ) : errorMuro ? (
                    <p className="muro-vacio">
                      No pudimos cargar los mensajes: {errorMuro}
                    </p>
                  ) : mensajesMuro.length === 0 ? (
                    <p className="muro-vacio">
                      La pared todavía está en blanco. ¿Quién se anima a
                      inaugurarla?
                    </p>
                  ) : (
                    <div className="muro-mensajes">
                      {mensajesMuro.map((mensaje) => (
                        <article className="muro-mensaje" key={mensaje.id}>
                          <div className="muro-mensaje-cabecera">
                            <strong>{mensaje.nombre}</strong>
                            <span>{mensaje.categoria}</span>
                          </div>
                          <p>{mensaje.mensaje}</p>
                          <time dateTime={mensaje.created_at}>
                            {new Date(mensaje.created_at).toLocaleString('es-AR', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </time>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
  
        case 'Próximo sábado':
          return (
            <section className="pagina interior">
              <p className="etiqueta">ESPACIO SEGURO PARA LOS ANTI-CIENCIA</p>
              <h1>Pronosticador<span></span></h1>
              <p className="bajada">
                Armá los equipos, compará sus ratings y consultá
                lo que vaticina el Oráculo Enrikista.
              </p>
        
              <TeamSelector />
            </section>
          )
      case 'Nosotros':
        return (
          <section className="pagina interior">
            <p className="etiqueta">ENRIKO SOMOS TODOS</p>
            <h1>Nosotros<span></span></h1>
            <p className="bajada">
              Los nombres, las historias y las personas que construyen
              Somos Enriko
            </p>

            {renderNosotros()}
          </section>
        )

      case '¿Quiénes somos?':
      default:
        return (
          
<>
  <section className="portada">
    <div className="portada-contenido">
      <div className="portada-marca">
        <img
          src="/escudo-somos-enriko.jpg"
          alt="Escudo del Club Social y Deportivo Somos Enriko"
          className="escudo-portada"
        />

        <div className="portada-textos">
          <p className="etiqueta">
            CLUB SOCIAL, CULTURAL Y DEPORTIVO
          </p>

          <h1>
            SOMOS
            <br />
            <span>ENRIKO</span>
          </h1>

          <p className="portada-descripcion">
            Para un Enriko no hay nada mejor que otro Enriko
          </p>
        </div>
      </div>

      <div className="portada-pie">
        <span>
          DE LA CANCHA A LA PLACITA, DE LA PLACITA AL MUNDO,
          AHORA EN LA WEB
        </span>

        <div className="portada-acciones">
          <button
            className="boton-principal"
            onClick={irAExplorar}
          >
            Explorá <span>↓</span>
          </button>

          <button
            className="boton-secundario"
            onClick={irAEstadisticas}
          >
            Ver ranking de puntos <span>↗</span>
          </button>
        </div>
      </div>
    </div>
  </section>

  <section className="bloque comunidad-intro">
    <div className="introduccion-club">
      <p className="etiqueta">MÁS QUE UN EQUIPO</p>
      <h2>¿Quiénes somos?</h2>

      <p>
        Somos Enriko. Nos encontramos alrededor del fútbol
        y construimos, sábado a sábado, una historia compartida.
      </p>

      <p>
        Esta web es nuestro lugar para registrar lo que jugamos,
        recuperar lo que vivimos y compartir lo que hacemos
        dentro y fuera de la cancha.
      </p>
    </div>

    <img
      src="/escudo-somos-enriko.jpg"
      alt=""
      className="escudo-intro"
    />
  </section>

  <section className="bloque" id="explorar">
    <div className="encabezado-bloque">
      <div>
        <p className="etiqueta">RECORRÉ EL GRUPO</p>
        <h2>Explorá.</h2>
        <p>
          Los partidos, los números y las historias de Somos Enriko
        </p>
      </div>
    </div>

    <div className="accesos-grid">
      <TarjetaSeccion
        numero="01"
        titulo="Historial"
        descripcion="Fechas, partidos y resultados"
        onClick={irACalendario}
      />

      <TarjetaSeccion
        numero="02"
        titulo="Estadísticas"
        descripcion="Puntos totales, jugadores y duplas"
        onClick={irAEstadisticas}
      />

      <TarjetaSeccion
        numero="03"
        titulo="Mundial Personal 🌎"
        descripcion="El camino individual hacia la gloria"
        onClick={() => navegar('Mundial Personal 🌎')}
      />

      <TarjetaSeccion
        numero="04"
        titulo="Nosotros"
        descripcion="Los Enrikos, sus historias e insignias"
        onClick={() => navegar('Nosotros')}
      />

      <TarjetaSeccion
        numero="05"
        titulo="Próximo sábado"
        descripcion="Armá los equipos y consultá el Oráculo"
        onClick={() => navegar('Próximo sábado')}
      />

      <TarjetaSeccion
        numero="06"
        titulo="El Muro Enriko"
        descripcion="Declaraciones, recuerdos y pintadas"
        onClick={() => navegar('El Muro Enriko')}
      />
    </div>
  </section>

  <section className="bloque portada-ranking" id="ranking-puntos">
    <div className="encabezado-bloque">
      <div>
        <p className="etiqueta">EL PUNTAJE ACUMULADO</p>
        <h2>Líderes</h2>
        <p>¿Quién lidera la tabla general?</p>
      </div>

      <button className="enlace" onClick={irAEstadisticas}>
        Ver tabla completa ↗
      </button>
    </div>

    {errores.puntosJugadores ? (
      <ErrorDatos mensaje={errores.puntosJugadores} />
    ) : cargando ? (
      <SinDatos>Cargando la tabla de puntos…</SinDatos>
    ) : puntosJugadores.length === 0 ? (
      <SinDatos>
        Todavía no hay puntos para mostrar.
      </SinDatos>
    ) : (
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>PJ</th>
              <th>Puntos</th>
            </tr>
          </thead>

          <tbody>
            {puntosJugadores.slice(0, 5).map((jugador, indice) => (
              <tr key={jugador.nombre}>
                <td className="puesto">{indice + 1}</td>
                <td className="celda-nombre">{jugador.nombre}</td>
                <td>{numero(jugador.pj)}</td>
                <td className="dato-destacado">
                  {numero(jugador.puntos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
</>

        )
    }
  }

  return (
    <div className="sitio">
      <header className="cabecera">
        <button
          className="marca"
          onClick={() => navegar('¿Quiénes somos?')}
          aria-label="Volver a la portada de Somos Enriko"
        >
          <img
            src="/escudo-somos-enriko.jpg"
            alt=""
            className="escudo-cabecera"
          />

          <span className="marca-textos">
            <strong>SOMOS ENRIKO</strong>
            <small>CLUB SOCIAL Y DEPORTIVO</small>
          </span>
        </button>

        <nav className="navegacion" aria-label="Navegación principal">
          {SECCIONES.map((nombre) => (
            <button
              key={nombre}
              className={seccion === nombre ? 'nav-activo' : ''}
              onClick={() => navegar(nombre)}
              aria-current={seccion === nombre ? 'page' : undefined}
            >
              {nombre}
            </button>
          ))}
        </nav>
      </header>

      <main>
  {partidoParaVotar ? (
    <Votacion partidoId={partidoParaVotar} />
  ) : (
    renderContenido()
  )}
</main>

      <footer className="pie">
        <div className="pie-marca">
          <img src="/escudo-somos-enriko.jpg" alt="" />
          <div>
            <strong>SOMOS ENRIKO</strong>
            <span>Club Social y Deportivo</span>
          </div>
        </div>

        <span>Fútbol, terceros tiempos imposibles y festejar el encuentro</span>
      </footer>
    </div>
  )
}

export default App