import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${fecha.slice(0, 10)}T12:00:00`))
}

function Admin() {
  const [sesion, setSesion] = useState(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [partidos, setPartidos] = useState([])
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
      setAviso(error.message)
      return
    }
    setPartidos(data || [])
  }

  useEffect(() => {
    if (esAdmin) cargarPartidos()
  }, [esAdmin])

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

  if (cargando) {
    return <p className="muro-vacio">Verificando sesión…</p>
  }

  if (!sesion) {
    return (
      <div className="muro-presentacion">
        <span className="muro-sello">ZONA DE ADMINISTRACIÓN</span>
        <h2>Ingresá con tu cuenta de Google</h2>
        <p>Solo las cuentas autorizadas pueden corregir o eliminar partidos.</p>
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
        <h2>Partidos cargados</h2>
        <button type="button" className="boton-secundario" onClick={salir}>
          Cerrar sesión
        </button>
      </div>

      {aviso && <p role="status" className="muro-aviso">{aviso}</p>}

      <div className="admin-lista">
        {partidos.map((partido) => (
          <div className="admin-fila" key={partido.id}>
            <div>
              <strong>{formatearFecha(partido.fecha)}</strong>
              <span>
                Claros {partido.goles_claros} — {partido.goles_oscuros} Oscuros
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
    </div>
  )
}

export default Admin