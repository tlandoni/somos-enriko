
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const POSICIONES = [
  'Arquero',
  'Defensor central',
  'Lateral derecho',
  'Lateral izquierdo',
  'Volante central',
  'Volante derecho',
  'Volante izquierdo',
  'Enganche',
  'Extremo',
  'Delantero centro',
]

const FORMULARIO_VACIO = {
  perfil_tactico: '',
  zona_preferida: '',
  posiciones_habituales: [],
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(fecha))
}

function perfilCompleto(jugador) {
  return Boolean(
    jugador.perfil_tactico &&
    jugador.zona_preferida &&
    jugador.posiciones_habituales?.length
  )
}

function Admin() {
  const [sesion, setSesion] = useState(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [partidos, setPartidos] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [jugadorSeleccionadoId, setJugadorSeleccionadoId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (_evento, nuevaSesion) => setSesion(nuevaSesion)
    )

    return () => suscripcion.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function verificar() {
      if (!sesion) {
        setEsAdmin(false)
        return
      }

      const { data, error } = await supabase.rpc('es_admin')
      setEsAdmin(!error && data === true)
    }

    verificar()
  }, [sesion])

  async function cargarPartidos() {
    const { data, error } = await supabase
      .from('partidos')
      .select('id, fecha, goles_claros, goles_oscuros, tipo_partido')
      .order('fecha', { ascending: false })

    if (error) {
      setAviso(`Error al cargar partidos: ${error.message}`)
      return
    }

    setPartidos(data || [])
  }

  async function cargarPerfiles() {
    const { data, error } = await supabase.rpc(
      'obtener_perfiles_jugadores_admin'
    )

    if (error) {
      setAviso(`Error al cargar perfiles: ${error.message}`)
      return
    }

    setPerfiles(data || [])
  }

  useEffect(() => {
    if (esAdmin) {
      cargarPartidos()
      cargarPerfiles()
    }
  }, [esAdmin])

  useEffect(() => {
    const jugador = perfiles.find(
      (item) => String(item.jugador_id) === jugadorSeleccionadoId
    )

    if (!jugador) {
      setFormulario(FORMULARIO_VACIO)
      return
    }

    setFormulario({
      perfil_tactico: jugador.perfil_tactico || '',
      zona_preferida: jugador.zona_preferida || '',
      posiciones_habituales: jugador.posiciones_habituales || [],
    })
  }, [jugadorSeleccionadoId, perfiles])

  async function entrar() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}?seccion=${encodeURIComponent('Administración')}`,
      },
    })
  }

  async function salir() {
    await supabase.auth.signOut()
  }

  async function eliminar(partido) {
    const confirmado = window.confirm(
      `¿Eliminar el partido del ${formatearFecha(partido.fecha)} ` +
      `(${partido.goles_claros} - ${partido.goles_oscuros})? ` +
      'Se borran también sus equipos y votos. No se puede deshacer.'
    )

    if (!confirmado) return

    setAviso('')

    const { error } = await supabase.rpc('eliminar_partido', {
      p_partido_id: partido.id,
    })

    if (error) {
      setAviso(`No se pudo eliminar: ${error.message}`)
      return
    }

    setAviso('Partido eliminado.')
    cargarPartidos()
  }

  function cambiarPosicion(posicion, seleccionada) {
    setFormulario((actual) => ({
      ...actual,
      posiciones_habituales: seleccionada
        ? [...actual.posiciones_habituales, posicion]
        : actual.posiciones_habituales.filter(
            (item) => item !== posicion
          ),
    }))
  }

  async function guardarPerfil(evento) {
    evento.preventDefault()

    if (!jugadorSeleccionadoId) {
      setAviso('Seleccioná un integrante.')
      return
    }

    if (
      !formulario.perfil_tactico ||
      !formulario.zona_preferida ||
      formulario.posiciones_habituales.length === 0
    ) {
      setAviso('Completá el perfil táctico, la zona y al menos una posición.')
      return
    }

    setGuardandoPerfil(true)
    setAviso('')

    const { error } = await supabase.rpc('actualizar_perfil_jugador', {
      p_jugador_id: Number(jugadorSeleccionadoId),
      p_perfil_tactico: formulario.perfil_tactico,
      p_zona_preferida: formulario.zona_preferida,
      p_posiciones_habituales: formulario.posiciones_habituales,
    })

    setGuardandoPerfil(false)

    if (error) {
      setAviso(`No se pudo guardar el perfil: ${error.message}`)
      return
    }

    setAviso('Perfil actualizado correctamente.')
    await cargarPerfiles()
  }

  const jugadorSeleccionado = perfiles.find(
    (item) => String(item.jugador_id) === jugadorSeleccionadoId
  )

  const perfilesFiltrados = perfiles.filter((jugador) =>
    jugador.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  )

  if (cargando) {
    return <p className="muro-vacio">Verificando sesión…</p>
  }

  if (!sesion) {
    return (
      <div className="muro-presentacion">
        <span className="muro-sello">ZONA DE ADMINISTRACIÓN</span>
        <h2>Ingresá con tu cuenta de Google</h2>
        <p>Solo las cuentas autorizadas pueden administrar el sitio.</p>
        <button type="button" className="boton-principal" onClick={entrar}>
          Continuar con Google
        </button>
      </div>
    )
  }

  if (!esAdmin) {
    return (
      <div className="muro-presentacion">
        <span className="muro-sello">SIN PERMISOS</span>
        <h2>Esta cuenta no es administradora</h2>
        <p>Iniciaste sesión como {sesion.user.email}.</p>
        <button type="button" className="boton-secundario" onClick={salir}>
          Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <div className="muro-contenido">
      <div className="muro-presentacion">
        <span className="muro-sello">{sesion.user.email}</span>
        <h2>Administración</h2>
        <button type="button" className="boton-secundario" onClick={salir}>
          Cerrar sesión
        </button>
      </div>

      {aviso && (
        <p role="status" className="muro-aviso">
          {aviso}
        </p>
      )}

      <section className="admin-seccion">
        <h3>Gestión de perfiles</h3>
        <p>
          Buscá a cualquier integrante para cargar o editar su perfil.
          No necesita tener una cuenta vinculada.
        </p>

        <div className="admin-perfiles">
          <div className="admin-integrantes">
            <label className="admin-campo">
              Buscar integrante
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Escribí un nombre..."
              />
            </label>

            <div className="admin-integrantes-lista">
              {perfilesFiltrados.map((jugador) => (
                <button
                  type="button"
                  key={jugador.jugador_id}
                  className={
                    String(jugador.jugador_id) === jugadorSeleccionadoId
                      ? 'admin-integrante admin-integrante-activo'
                      : 'admin-integrante'
                  }
                  onClick={() => {
                    setJugadorSeleccionadoId(String(jugador.jugador_id))
                    setAviso('')
                  }}
                >
                  <span>{jugador.nombre}</span>
                  <small>
                    {perfilCompleto(jugador) ? 'Perfil completo' : 'Perfil incompleto'}
                  </small>
                </button>
              ))}

              {perfilesFiltrados.length === 0 && (
                <p className="muro-vacio">
                  No se encontraron integrantes.
                </p>
              )}
            </div>
          </div>

          <div className="admin-editor">
            {jugadorSeleccionado ? (
              <form onSubmit={guardarPerfil}>
                <h4>{jugadorSeleccionado.nombre}</h4>

                <p className="admin-editor-ayuda">
                  {perfilCompleto(jugadorSeleccionado)
                    ? 'Este integrante ya tiene un perfil cargado.'
                    : 'Este integrante todavía no tiene un perfil completo.'}
                </p>

                <label className="admin-campo">
                  Perfil táctico
                  <select
                    value={formulario.perfil_tactico}
                    onChange={(evento) =>
                      setFormulario({
                        ...formulario,
                        perfil_tactico: evento.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar perfil</option>
                    <option value="ofensivo">Ofensivo</option>
                    <option value="defensivo">Defensivo</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </label>

                <label className="admin-campo">
                  Zona preferida
                  <select
                    value={formulario.zona_preferida}
                    onChange={(evento) =>
                      setFormulario({
                        ...formulario,
                        zona_preferida: evento.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar zona</option>
                    <option value="central">Central</option>
                    <option value="lateral">Lateral</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </label>

                <fieldset className="admin-posiciones">
                  <legend>Posiciones habituales</legend>
                  <p>Podés seleccionar varias.</p>

                  <div className="admin-posiciones-grid">
                    {POSICIONES.map((posicion) => (
                      <label key={posicion} className="admin-posicion">
                        <input
                          type="checkbox"
                          checked={formulario.posiciones_habituales.includes(posicion)}
                          onChange={(evento) =>
                            cambiarPosicion(posicion, evento.target.checked)
                          }
                        />
                        <span>{posicion}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {jugadorSeleccionado.perfil_actualizado_en && (
                  <p className="admin-editor-ayuda">
                    Última actualización:{' '}
                    {formatearFecha(jugadorSeleccionado.perfil_actualizado_en)}
                  </p>
                )}

                <button
                  type="submit"
                  className="boton-principal"
                  disabled={guardandoPerfil}
                >
                  {guardandoPerfil ? 'Guardando…' : 'Guardar perfil'}
                </button>
              </form>
            ) : (
              <p className="muro-vacio">
                Seleccioná un integrante para ver o editar su perfil.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="admin-seccion">
        <h3>Partidos cargados</h3>

        <div className="admin-lista">
          {partidos.map((partido) => (
            <div className="admin-fila" key={partido.id}>
              <div>
                <strong>{formatearFecha(partido.fecha)}</strong>
                <span>
                  Claros {partido.goles_claros} — {partido.goles_oscuros}
                  {' · '}
                  {partido.tipo_partido}
                </span>
              </div>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => eliminar(partido)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Admin
