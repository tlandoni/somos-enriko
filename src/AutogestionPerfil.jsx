import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './AutogestionPerfil.css'

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
  pie_habil: '',
  posiciones_habituales: [],
}

export default function AutogestionPerfil({ onPerfilGuardado }) {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [jugador, setJugador] = useState(null)
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState([])
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState('')
  const [solicitud, setSolicitud] = useState(null)
  const [nombreSolicitud, setNombreSolicitud] = useState('')
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(({ data }) => {
      if (activo) {
        setSesion(data.session)
        setCargando(false)
      }
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (_evento, nuevaSesion) => setSesion(nuevaSesion)
    )

    return () => {
      activo = false
      suscripcion.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sesion) {
      setJugador(null)
      setJugadoresDisponibles([])
      setSolicitud(null)
      return
    }

    let activo = true

    async function cargarDatos() {
      setCargandoDatos(true)
      setAviso('')

      const { data: vinculacion, error: errorVinculacion } =
        await supabase
          .from('vinculaciones_jugadores')
          .select('jugador_id')
          .maybeSingle()

      if (!activo) return

      if (errorVinculacion) {
        setAviso(`No se pudo consultar tu vinculación: ${errorVinculacion.message}`)
        setCargandoDatos(false)
        return
      }

      const { data: solicitudes, error: errorSolicitudes } =
        await supabase
          .from('solicitudes_alta_jugadores')
          .select('id, nombre_solicitado, estado, observaciones_revision')
          .order('creado_en', { ascending: false })
          .limit(1)

      if (!activo) return

      if (!errorSolicitudes && solicitudes?.length) {
        setSolicitud(solicitudes[0])
      } else {
        setSolicitud(null)
      }

      if (vinculacion) {
        const { data, error } = await supabase
          .from('jugadores')
          .select(
            'id, nombre, perfil_tactico, zona_preferida, pie_habil, posiciones_habituales'
          )
          .eq('id', vinculacion.jugador_id)
          .single()

        if (!activo) return

        if (error) {
          setAviso(`No se pudo cargar tu perfil: ${error.message}`)
        } else {
          setJugador(data)
          setFormulario({
            perfil_tactico: data.perfil_tactico || '',
            zona_preferida: data.zona_preferida || '',
            pie_habil: data.pie_habil || '',
            posiciones_habituales: data.posiciones_habituales || [],
          })
        }
      } else {
        setJugador(null)

        const { data, error } = await supabase
          .from('jugadores')
          .select('id, nombre')
          .order('nombre', { ascending: true })

        if (!activo) return

        if (error) {
          setAviso(`No se pudo cargar la lista de integrantes: ${error.message}`)
        } else {
          setJugadoresDisponibles(data || [])
        }
      }

      if (activo) setCargandoDatos(false)
    }

    cargarDatos()

    return () => {
      activo = false
    }
  }, [sesion])

  function actualizarCampo(campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function cambiarPosicion(posicion) {
    setFormulario((actual) => {
      const seleccionadas = actual.posiciones_habituales
      const nuevas = seleccionadas.includes(posicion)
        ? seleccionadas.filter((item) => item !== posicion)
        : [...seleccionadas, posicion]

      return {
        ...actual,
        posiciones_habituales: nuevas,
      }
    })
  }

  async function entrar() {
    setAviso('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/nosotros`,
      },
    })

    if (error) setAviso(error.message)
  }

  async function salir() {
    await supabase.auth.signOut()
    setAviso('')
  }

  async function vincularJugador() {
    if (!jugadorSeleccionado) {
      setAviso('Elegí tu nombre de la lista.')
      return
    }

    setAviso('')

    const { error } = await supabase.rpc('vincular_jugador', {
      p_jugador_id: Number(jugadorSeleccionado),
    })

    if (error) {
      const mensaje = error.message.toLowerCase()

      if (mensaje.includes('vinculación') || mensaje.includes('duplicate')) {
        setAviso(
          'Ese jugador ya tiene una cuenta vinculada. Elegí otro nombre o consultá con Administración.'
        )
      } else {
        setAviso(error.message)
      }
      return
    }

    const elegido = jugadoresDisponibles.find(
      (item) => String(item.id) === jugadorSeleccionado
    )

    setJugador({
      ...elegido,
      perfil_tactico: null,
      zona_preferida: null,
      pie_habil: null,
      posiciones_habituales: [],
    })
    setFormulario(FORMULARIO_VACIO)
    setAviso('¡Tu cuenta quedó vinculada! Ahora podés completar tu perfil.')
  }

  async function solicitarAlta() {
    const nombre = nombreSolicitud.trim()

    if (nombre.length < 2) {
      setAviso('Escribí tu nombre para solicitar el alta.')
      return
    }

    setAviso('')

    const { error } = await supabase.rpc('solicitar_alta_jugador', {
      p_nombre: nombre,
    })

    if (error) {
      setAviso(error.message)
      return
    }

    setSolicitud({
      nombre_solicitado: nombre,
      estado: 'pendiente',
    })
    setAviso('Solicitud enviada. Administración la revisará.')
    setNombreSolicitud('')
  }

  async function guardarPerfil(evento) {
    evento.preventDefault()

    if (
      !formulario.perfil_tactico ||
      !formulario.zona_preferida ||
      !formulario.pie_habil ||
      formulario.posiciones_habituales.length < 1
    ) {
      setAviso('Completá el perfil, la zona, el pie hábil y al menos una posición.')
      return
    }

    setGuardando(true)
    setAviso('')

    const { data, error } = await supabase.rpc('guardar_mi_perfil', {
      p_perfil_tactico: formulario.perfil_tactico,
      p_zona_preferida: formulario.zona_preferida,
      p_pie_habil: formulario.pie_habil,
      p_posiciones_habituales: formulario.posiciones_habituales,
    })

    setGuardando(false)

    if (error) {
      setAviso(error.message)
      return
    }

    const jugadorActualizado = {
      ...jugador,
      ...formulario,
    }

    setJugador(jugadorActualizado)
    onPerfilGuardado?.(data, formulario)
    setAviso('¡Perfil actualizado!')
  }

  if (cargando) {
    return <div className="autogestion-perfil">Comprobando sesión…</div>
  }

  return (
    <section className="autogestion-perfil">
      <div className="autogestion-cabecera">
        <div>
          <p className="etiqueta">TU LUGAR EN EL EQUIPO</p>
          <h3>Mi perfil futbolístico</h3>
          <p>
            Completá tus características de juego para que la banda te conozca
            un poco más dentro de la cancha.
          </p>
        </div>

        {sesion && (
          <button
            type="button"
            className="autogestion-salir"
            onClick={salir}
          >
            Cerrar sesión
          </button>
        )}
      </div>

      {!sesion ? (
        <div className="autogestion-acceso">
          <p>Iniciá sesión con Google para vincular tu nombre y editar tu perfil.</p>
          <button type="button" onClick={entrar}>
            Continuar con Google
          </button>
        </div>
      ) : cargandoDatos ? (
        <p>Buscando tu vinculación…</p>
      ) : jugador ? (
        <form className="autogestion-formulario" onSubmit={guardarPerfil}>
          <p className="autogestion-identidad">
            Editando el perfil de <strong>{jugador.nombre}</strong>
          </p>

          <label>
            ¿Cómo describís tu estilo de juego?
            <select
              value={formulario.perfil_tactico}
              onChange={(e) =>
                actualizarCampo('perfil_tactico', e.target.value)
              }
            >
              <option value="">Elegir perfil</option>
              <option value="ofensivo">Ofensivo</option>
              <option value="defensivo">Defensivo</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </label>

          <label>
            ¿En qué zona te sentís más cómodo?
            <select
              value={formulario.zona_preferida}
              onChange={(e) =>
                actualizarCampo('zona_preferida', e.target.value)
              }
            >
              <option value="">Elegir zona</option>
              <option value="central">Central</option>
              <option value="lateral">Lateral</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>

          <label>
            ¿Con qué pie jugás?
            <select
              value={formulario.pie_habil}
              onChange={(e) => actualizarCampo('pie_habil', e.target.value)}
            >
              <option value="">Elegir pie hábil</option>
              <option value="derecho">Derecho</option>
              <option value="izquierdo">Zurdo (izquierdo)</option>
              <option value="ambidiestro">Ambidiestro</option>
            </select>
          </label>

          <fieldset>
            <legend>¿En qué posiciones solés jugar?</legend>
            <div className="autogestion-posiciones">
              {POSICIONES.map((posicion) => (
                <label key={posicion}>
                  <input
                    type="checkbox"
                    checked={formulario.posiciones_habituales.includes(posicion)}
                    onChange={() => cambiarPosicion(posicion)}
                  />
                  <span>{posicion}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar mi perfil'}
          </button>
        </form>
      ) : (
        <div className="autogestion-vinculacion">
          <p>
            Para editar tu perfil, primero necesitamos saber quién sos en la
            lista de integrantes.
          </p>

          <label>
            Buscá y elegí tu nombre
            <select
              value={jugadorSeleccionado}
              onChange={(e) => setJugadorSeleccionado(e.target.value)}
            >
              <option value="">Seleccionar integrante</option>
              {jugadoresDisponibles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={vincularJugador}
            disabled={!jugadorSeleccionado}
          >
            Vincular mi cuenta
          </button>

          <div className="autogestion-separador">
            <span>¿Todavía no figurás en la lista?</span>
          </div>

          <label>
            Tu nombre
            <input
              type="text"
              value={nombreSolicitud}
              onChange={(e) => setNombreSolicitud(e.target.value)}
              placeholder="¿Cómo te conocemos en la cancha?"
              maxLength={60}
            />
          </label>

          <button
            type="button"
            className="autogestion-secundario"
            onClick={solicitarAlta}
          >
            Solicitar que me agreguen
          </button>

          {solicitud?.estado === 'pendiente' && (
            <p className="autogestion-pendiente">
              Tenés una solicitud pendiente para «{solicitud.nombre_solicitado}».
            </p>
          )}
        </div>
      )}

      {aviso && <p className="autogestion-aviso" role="status">{aviso}</p>}
    </section>
  )
}