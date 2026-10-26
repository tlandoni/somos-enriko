import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './App.css'
import TeamSelector from './TeamSelector'


const SECCIONES = [
  '¿Quiénes Somos Enriko?',
  'Calendario',
  'Estadísticas',
  'Pronosticador',
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

  const [ranking, setRanking] = useState([])
  const [duplas, setDuplas] = useState([])
  const [partidos, setPartidos] = useState([])
  const [jugadores, setJugadores] = useState([])

  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState({})
  
  useEffect(() => {
    let activo = true

    async function cargarDatos() {
      setCargando(true)

      const resultados = await Promise.all([
        supabase
          .from('ranking_completo')
          .select('*')
          .order('porcentaje_victorias', {
            ascending: false,
            nullsFirst: false,
          }),

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
          .select('*')
          .order('fecha', { ascending: false }),

        supabase
          .from('jugadores')
          .select('*')
          .order('nombre', { ascending: true }),
      ])

      if (!activo) return

      const nombres = [
        'ranking',
        'duplas',
        'partidos',
        'jugadores',
      ]

      const nuevosErrores = {}

      resultados.forEach((resultado, indice) => {
        if (resultado.error) {
          nuevosErrores[nombres[indice]] = resultado.error.message
        }
      })

      setRanking(resultados[0].data || [])
      setDuplas(resultados[1].data || [])
      setPartidos(resultados[2].data || [])
      setJugadores(resultados[3].data || [])
      setErrores(nuevosErrores)
      setCargando(false)
    }

    cargarDatos()

    return () => {
      activo = false
    }
  }, [])

  function navegar(destino) {
    setSeccion(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function irAEstadisticas() {
    navegar('Estadísticas')
  }

  function irACalendario() {
    navegar('Calendario')
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
      return <SinDatos>Cargando estadísticas del club…</SinDatos>
    }

    if (!ranking.length) {
      return (
        <SinDatos>
          Todavía no hay jugadores con estadísticas disponibles en el ranking.
        </SinDatos>
      )
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
              <th>% victorias</th>
              <th>Dif. de gol</th>
              <th>Dif. promedio</th>
            </tr>
          </thead>

          <tbody>
            {ranking.slice(0, limite).map((jugador, indice) => (
              <tr key={jugador.jugador_id ?? jugador.id ?? jugador.nombre}>
                <td className="puesto">{indice + 1}</td>
                <td className="celda-nombre">
                  {jugador.nombre ?? 'Jugador'}
                </td>
                <td>{numero(jugador.pj)}</td>
                <td>{numero(jugador.pg)}</td>
                <td>{numero(jugador.pe)}</td>
                <td>{numero(jugador.pp)}</td>
                <td className="dato-destacado">
                  {numero(jugador.porcentaje_victorias, 1)}%
                </td>
                <td>{numero(jugador.diferencia_gol)}</td>
                <td>{numero(jugador.diferencia_gol_promedio, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
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
                    {numero(dupla.indice_quimica, 1)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderCalendario() {
    if (errores.partidos) return renderError('partidos')

    if (cargando) {
      return <SinDatos>Cargando partidos…</SinDatos>
    }

    if (!partidos.length) {
      return (
        <SinDatos>
          Todavía no hay partidos registrados en el calendario.
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
                <h3>Claros <span>vs.</span> Oscuros</h3>
                {partido.observaciones && (
                  <p>{partido.observaciones}</p>
                )}
              </div>

              <div className="partido-resultado">
                {tieneResultado ? (
                  <>
                    <strong>{claros} <span>–</span> {oscuros}</strong>
                    <small>Resultado final</small>
                  </>
                ) : (
                  <span className="sin-resultado">Sin resultado</span>
                )}
              </div>
            </article>
          )
        })}
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
          {jugadores.map((jugador) => (
            <article className="integrante-card" key={jugador.id}>
              <div className="integrante-iniciales" aria-hidden="true">
                {(jugador.nombre || '?').trim().charAt(0).toUpperCase()}
              </div>

              <h3>{jugador.nombre}</h3>
              <span>Integrante del club</span>
            </article>
          ))}
        </div>
      </>
    )
  }

  function renderContenido() {
    switch (seccion) {
      case 'Calendario':
        return (
          <section className="pagina interior">
            <p className="etiqueta">PARTIDOS Y EVENTOS ENRIKENSES</p>
            <h1>Calendario<span></span></h1>
            <p className="bajada">
              Carpe diem
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
        case 'Pronosticador':
          return (
            <section className="pagina interior">
              <p className="etiqueta">LA CIENCIA NO LLEGA HASTA ACÁ</p>
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
                    <p className="etiqueta">CLUB SOCIAL, CULTURAL Y DEPORTIVO</p>
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
                  <span>DE LA CANCHA A LA PLACITA, DE LA PLACITA AL MUNDO, AHORA EN LA WEB</span>
                  <button
                    className="boton-principal"
                    onClick={irAEstadisticas}
                  >
                    Explorar estadísticas <span>↗</span>
                  </button>
                </div>
              </div>
            </section>

            <section className="bloque comunidad-intro">
              <div className="introduccion-club">
                <p className="etiqueta">MÁS QUE UN EQUIPO</p>
                <h2>¿Quiénes somos?</h2>
                <p>
                  Somos Enriko es un club social, cultural y deportivo.
                  Nos encontramos alrededor del fútbol y construimos,
                  partido a partido, una historia compartida.
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

            <section className="bloque">
              <div className="encabezado-bloque">
                <div>
                  <p className="etiqueta">RECORRÉ EL CLUB</p>
                  <h2>Todo lo que somos.</h2>
                </div>
              </div>

              <div className="accesos-grid">
                <TarjetaSeccion
                  numero="01"
                  titulo="Calendario"
                  descripcion="Fechas, partidos y resultados."
                  onClick={irACalendario}
                />

                <TarjetaSeccion
                  numero="02"
                  titulo="Estadísticas"
                  descripcion="Jugadores, duplas y rendimiento."
                  onClick={irAEstadisticas}
                />
              <TarjetaSeccion
  numero="03"
  titulo="Pronosticador"
  descripcion="Armá los equipos y dejá que hable el Oráculo."
  onClick={() => navegar('Pronosticador')}
/>
                <TarjetaSeccion
                  numero="04"
                  titulo="Nosotros"
                  descripcion="Las personas que forman el club."
                  onClick={() => navegar('Nosotros')}
                />
              </div>
            </section>

            <section className="bloque">
              <div className="encabezado-bloque">
                <div>
                  <p className="etiqueta">LOS NÚMEROS</p>
                  <h2>La historia también se cuenta.</h2>
                </div>

                <button className="enlace" onClick={irAEstadisticas}>
                  Ver estadísticas ↗
                </button>
              </div>

              {errores.ranking ? (
                renderError('ranking')
              ) : cargando ? (
                <SinDatos>Cargando el ranking…</SinDatos>
              ) : ranking.length === 0 ? (
                <SinDatos>
                  Todavía no hay estadísticas individuales disponibles.
                </SinDatos>
              ) : (
                renderRankingIndividual(5)
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
        {renderContenido()}
      </main>

      <footer className="pie">
        <div className="pie-marca">
          <img src="/escudo-somos-enriko.jpg" alt="" />
          <div>
            <strong>SOMOS ENRIKO</strong>
            <span>Club Social y Deportivo</span>
          </div>
        </div>

        <span>Una historia que se sigue jugando.</span>
      </footer>
    </div>
  )
}

export default App