import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { supabase } from './lib/supabaseClient'
import './TeamSelector.css'
import { Cancha, FichaVisual, ZonaSinAsignar } from './armador/Cancha.jsx'
import SelectorJugadores from './armador/SelectorJugadores.jsx'
import {
  CLAVE_SELECCION,
  ESQUEMAS,
  FORMATOS,
  FORMATO_INICIAL,
  NIVELES,
  NOMBRE_EQUIPO,
  equilibrar,
  esquemaPorDefecto,
  etiquetaSlot,
  generarSlots,
  llenarEquipo,
  moverJugador,
  promedioRatings,
  reubicar,
  restaurar,
  simularResultado,
  textosOraculo,
} from './armador/logica.js'

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
  const [formato, setFormato] = useState(FORMATO_INICIAL)
  const [esquema, setEsquema] = useState(esquemaPorDefecto(FORMATO_INICIAL))
  const [convocados, setConvocados] = useState([])
  const [lugares, setLugares] = useState({})

  const [nombreInvitado, setNombreInvitado] = useState('')
  const [nivelInvitado, setNivelInvitado] = useState('promedio')

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [pronostico, setPronostico] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [arrastrando, setArrastrando] = useState(null)

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  )

  /* Carga de datos y restauración */

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
        .filter((j) => j.nombre && Number.isFinite(j.rating))

      setJugadores(lista)

      const estado = restaurar(
        leerGuardado(),
        lista.map((j) => j.nombre)
      )
      setFormato(estado.formato)
      setEsquema(estado.esquema)
      setConvocados(estado.convocados)
      setLugares(estado.lugares)
      setInvitados(estado.invitados)
      setCargando(false)
    }

    cargarJugadores()
  }, [])

  useEffect(() => {
    if (cargando) return

    try {
      sessionStorage.setItem(
        CLAVE_SELECCION,
        JSON.stringify({
          version: 2,
          formato,
          esquema,
          convocados,
          lugares,
          invitados,
        })
      )
    } catch {
      // Si el navegador bloquea el almacenamiento, el armador sigue funcionando.
    }
  }, [formato, esquema, convocados, lugares, invitados, cargando])

  /* Datos derivados */

  const total = formato * 2
  const slots = useMemo(() => generarSlots(esquema), [esquema])

  const todos = useMemo(() => [...jugadores, ...invitados], [jugadores, invitados])
  const porNombre = useMemo(
    () => new Map(todos.map((j) => [j.nombre, j])),
    [todos]
  )

  const equipos = useMemo(() => {
    const de = (equipo) =>
      slots
        .filter((s) => s.equipo === equipo)
        .map((s) => lugares[s.id])
        .filter(Boolean)

    const claros = de('claros')
    const oscuros = de('oscuros')
    const ubicados = new Set([...claros, ...oscuros])

    return {
      claros,
      oscuros,
      sinAsignar: convocados.filter((n) => !ubicados.has(n)),
    }
  }, [slots, lugares, convocados])

  const { claros, oscuros, sinAsignar } = equipos

  const ratingDe = (nombres) =>
    promedioRatings(nombres.map((n) => porNombre.get(n)?.rating))

  const promedioClaros = ratingDe(claros)
  const promedioOscuros = ratingDe(oscuros)
  const diferencia =
    promedioClaros !== null && promedioOscuros !== null
      ? promedioClaros - promedioOscuros
      : null

  const equiposCompletos =
    claros.length === formato &&
    oscuros.length === formato &&
    new Set([...claros, ...oscuros]).size === total

  const equipoDe = (nombre) =>
    claros.includes(nombre) ? 'claros' : oscuros.includes(nombre) ? 'oscuros' : null

  const ratingPromedioGeneral = useMemo(
    () => promedioRatings(jugadores.map((j) => j.rating)) ?? 0,
    [jugadores]
  )

  const desviacionEstandar = useMemo(() => {
    if (!jugadores.length) return 0
    const varianza =
      jugadores.reduce(
        (suma, j) => suma + Math.pow(j.rating - ratingPromedioGeneral, 2),
        0
      ) / jugadores.length
    return Math.sqrt(varianza)
  }, [jugadores, ratingPromedioGeneral])

  /* Acciones */

  function avisar(texto) {
    setMensaje(texto)
  }

  function cambiosEnEquipos() {
    setPronostico(null)
    setSeleccion(null)
  }

  function colocar(nombre, destino) {
    setLugares((actuales) => moverJugador(actuales, nombre, destino))
    cambiosEnEquipos()
    setMensaje('')
  }

  function cambiarDisposicion(nuevoFormato, nuevoEsquema) {
    const { lugares: conservados, perdidos } = reubicar(
      lugares,
      generarSlots(nuevoEsquema)
    )

    setFormato(nuevoFormato)
    setEsquema(nuevoEsquema)
    setLugares(conservados)
    cambiosEnEquipos()

    const avisos = []
    if (perdidos.length) {
      avisos.push(
        `${perdidos.length} jugador${perdidos.length > 1 ? 'es quedaron' : ' quedó'} sin asignar porque su posición ya no existe: ${perdidos.join(', ')}.`
      )
    }
    if (convocados.length > nuevoFormato * 2) {
      avisos.push(
        `Hay ${convocados.length} convocados y el formato admite ${nuevoFormato * 2}: quitá a ${convocados.length - nuevoFormato * 2}.`
      )
    }
    setMensaje(avisos.join(' '))
  }

  function cambiarFormato(valor) {
    const nuevo = Number(valor)
    if (!FORMATOS.includes(nuevo)) return
    cambiarDisposicion(nuevo, esquemaPorDefecto(nuevo))
  }

  function agregarConvocado(nombre) {
    if (convocados.includes(nombre) || !porNombre.has(nombre)) return
    if (convocados.length >= total) {
      avisar(`Ya están los ${total} convocados.`)
      return
    }
    setConvocados((actuales) => [...actuales, nombre])
    setPronostico(null)
  }

  function quitarConvocado(nombre) {
    setConvocados((actuales) => actuales.filter((n) => n !== nombre))
    setLugares((actuales) => moverJugador(actuales, nombre, 'sin'))
    cambiosEnEquipos()
  }

  function agregarInvitado(e) {
    e.preventDefault()

    const nombre = nombreInvitado.trim()

    if (!nombre) {
      avisar('Escribí el nombre del invitado.')
      return
    }

    if (porNombre.has(nombre)) {
      avisar('Ya existe un jugador con ese nombre.')
      return
    }

    const nivel = NIVELES.find((n) => n.valor === nivelInvitado)
    const ratingEstimado = Math.max(
      0,
      ratingPromedioGeneral + nivel.factor * desviacionEstandar
    )

    setInvitados((actuales) => [
      ...actuales,
      {
        nombre,
        rating: Number(ratingEstimado.toFixed(2)),
        pj: 0,
        invitado: true,
        nivel: nivel.etiqueta,
      },
    ])

    if (convocados.length < total) {
      setConvocados((actuales) => [...actuales, nombre])
      avisar(`${nombre} fue agregado a los convocados.`)
    } else {
      avisar(`${nombre} fue creado, pero ya están los ${total} convocados.`)
    }

    setNombreInvitado('')
    setNivelInvitado('promedio')
    setPronostico(null)
  }

  function quitarInvitado(nombre) {
    setInvitados((actuales) => actuales.filter((j) => j.nombre !== nombre))
    quitarConvocado(nombre)
    avisar(`Se quitó a ${nombre} de la convocatoria.`)
  }

  function generarEquiposParejos() {
    if (convocados.length !== total) {
      avisar(`Necesitás exactamente ${total} convocados. Ahora hay ${convocados.length}.`)
      return
    }

    const lista = convocados.map((nombre) => ({
      nombre,
      rating: porNombre.get(nombre)?.rating,
    }))

    if (lista.some((j) => !Number.isFinite(j.rating))) {
      avisar('No se pudieron calcular los ratings de todos los jugadores.')
      return
    }

    const resultado = equilibrar(lista, formato)

    // Los equipos son simétricos: se sortea cuál es Claros.
    const invertir = Math.random() < 0.5
    const paraClaros = invertir ? resultado.equipoB : resultado.equipoA
    const paraOscuros = invertir ? resultado.equipoA : resultado.equipoB

    const ordenar = (nombres) => [...nombres].sort((a, b) => a.localeCompare(b, 'es'))

    let nuevos = llenarEquipo({}, slots, 'claros', ordenar(paraClaros))
    nuevos = llenarEquipo(nuevos, slots, 'oscuros', ordenar(paraOscuros))

    setLugares(nuevos)
    cambiosEnEquipos()
    avisar(
      `¡Equipos optimizados! Diferencia mínima de rating: ${resultado.diferencia.toFixed(2)}. Las posiciones son solo un orden visual.`
    )
  }

  function simularPartido() {
    if (!equiposCompletos) {
      avisar('Completá los dos equipos antes de simular.')
      return
    }

    const resultado = simularResultado(promedioClaros, promedioOscuros, formato)

    setPronostico({
      ...resultado,
      ...textosOraculo(resultado.golesClaros > resultado.golesOscuros),
    })
    setMensaje('')
  }

  function limpiarCancha() {
    setLugares({})
    cambiosEnEquipos()
    avisar('Cancha vacía. Los convocados siguen en la lista.')
  }

  function vaciarConvocados() {
    setLugares({})
    setConvocados([])
    cambiosEnEquipos()
    avisar('Se quitaron todos los convocados.')
  }

  /* Interacción: tocar una ficha y elegir su destino */

  function slotDe(nombre) {
    return Object.keys(lugares).find((id) => lugares[id] === nombre) || null
  }

  function tocarFicha(nombre, slotId) {
    if (seleccion && seleccion !== nombre && slotId) {
      colocar(seleccion, slotId) // intercambia con la ficha tocada
      return
    }
    setSeleccion((actual) => (actual === nombre ? null : nombre))
  }

  function tocarPosicionVacia(slotId) {
    if (seleccion) colocar(seleccion, slotId)
    else avisar('Tocá o arrastrá una ficha para ubicarla en esta posición.')
  }

  function tocarZonaSinAsignar() {
    if (seleccion) colocar(seleccion, 'sin')
  }

  /* Arrastre */

  function alEmpezarArrastre(evento) {
    setArrastrando(String(evento.active.id).slice(2))
  }

  function alTerminarArrastre(evento) {
    setArrastrando(null)
    const { active, over } = evento
    if (!over) return
    colocar(String(active.id).slice(2), String(over.id).slice(2))
  }

  /* Render */

  if (cargando) return <p>Cargando jugadores...</p>
  if (error) return <p className="ts-error">{error}</p>
  if (!jugadores.length) {
    return <p>No hay jugadores con rating disponible en el ranking.</p>
  }

  const jugadorSeleccionado = seleccion ? porNombre.get(seleccion) : null
  const faltan = total - convocados.length

  return (
    <section className="team-selector">
      <div className="ts-encabezado">
        <span className="ts-etiqueta">PRÓXIMO PARTIDO</span>
        <h2>Pizarrón táctico</h2>
        <p>
          Convocá a los jugadores, ubicalos en la cancha, equilibrá los equipos
          y consultá el oráculo.
        </p>
      </div>

      <div className="ts-controles">
        <div>
          <label htmlFor="ts-formato">Formato (por equipo)</label>
          <select
            id="ts-formato"
            value={formato}
            onChange={(e) => cambiarFormato(e.target.value)}
          >
            {FORMATOS.map((f) => (
              <option key={f} value={f}>Fútbol {f}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ts-esquema">Esquema (sin arquero)</label>
          <select
            id="ts-esquema"
            value={esquema}
            onChange={(e) => cambiarDisposicion(formato, e.target.value)}
          >
            {ESQUEMAS[formato].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <p className="ts-contador-formato">
          {formato} vs {formato} · <strong>{total}</strong> jugadores
        </p>
      </div>

      {mensaje && <p className="ts-mensaje" role="status">{mensaje}</p>}

      <DndContext
        sensors={sensores}
        onDragStart={alEmpezarArrastre}
        onDragEnd={alTerminarArrastre}
        onDragCancel={() => setArrastrando(null)}
      >
        <div className="ts-layout">
          <div className="ts-columna-cancha">
            {jugadorSeleccionado && (
              <div className="ts-barra-seleccion" role="region" aria-label="Ficha seleccionada">
                <span>
                  Moviendo a <strong>{jugadorSeleccionado.nombre}</strong>
                </span>

                <select
                  value=""
                  onChange={(e) => e.target.value && colocar(seleccion, e.target.value)}
                  aria-label={`Elegir posición para ${jugadorSeleccionado.nombre}`}
                >
                  <option value="">Elegir posición…</option>
                  <option value="sin">Sin asignar</option>
                  {slots.map((s) => {
                    const ocupante = lugares[s.id]
                    return (
                      <option key={s.id} value={s.id}>
                        {etiquetaSlot(s)}
                        {ocupante && ocupante !== seleccion ? ` (cambia con ${ocupante})` : ''}
                        {ocupante === seleccion ? ' (actual)' : ''}
                      </option>
                    )
                  })}
                </select>

                <button type="button" className="ts-reiniciar ts-boton-secundario" onClick={() => setSeleccion(null)}>
                  Cancelar
                </button>
              </div>
            )}

            <Cancha
              slots={slots}
              lugares={lugares}
              porNombre={porNombre}
              seleccion={seleccion}
              onFicha={tocarFicha}
              onVacio={tocarPosicionVacia}
            />

            <ZonaSinAsignar
              nombres={sinAsignar}
              porNombre={porNombre}
              seleccion={seleccion}
              onFicha={tocarFicha}
              onZona={tocarZonaSinAsignar}
            />
          </div>

          <aside className="ts-panel">
            <SelectorJugadores
              todos={todos}
              seleccionados={convocados}
              max={total}
              equipoDe={equipoDe}
              onAgregar={agregarConvocado}
              onQuitar={quitarConvocado}
            />

            <form className="ts-form-invitado" onSubmit={agregarInvitado}>
              <div>
                <label htmlFor="ts-nombre-invitado">Sumar invitado</label>
                <input
                  id="ts-nombre-invitado"
                  type="text"
                  value={nombreInvitado}
                  onChange={(e) => setNombreInvitado(e.target.value)}
                  placeholder="Nombre del invitado"
                  maxLength={40}
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
                    <option key={nivel.valor} value={nivel.valor}>{nivel.etiqueta}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="ts-reiniciar">+ Agregar</button>
            </form>

            <p className="ts-ayuda-invitado">
              El rating del invitado se estima a partir del promedio y la
              desviación estándar de los ratings actuales. No se guarda en la base.
            </p>

            {invitados.length > 0 && (
              <ul className="ts-invitados">
                {invitados.map((inv) => (
                  <li key={inv.nombre}>
                    <span>
                      {inv.nombre} · {inv.nivel} · {inv.rating.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarInvitado(inv.nombre)}
                      aria-label={`Eliminar invitado ${inv.nombre}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="ts-resumen">
              <h3>Balance del partido</h3>

              <dl className="ts-balance">
                <div><dt>Claros</dt><dd>{claros.length} de {formato}</dd></div>
                <div><dt>Oscuros</dt><dd>{oscuros.length} de {formato}</dd></div>
                <div>
                  <dt>Rating Claros</dt>
                  <dd>{promedioClaros === null ? '—' : promedioClaros.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Rating Oscuros</dt>
                  <dd>{promedioOscuros === null ? '—' : promedioOscuros.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Diferencia</dt>
                  <dd>{diferencia === null ? '—' : Math.abs(diferencia).toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Convocados</dt>
                  <dd>{convocados.length} de {total}</dd>
                </div>
              </dl>

              {diferencia === null ? (
                <p className="ts-nota">Ubicá jugadores en ambos equipos para comparar los ratings.</p>
              ) : (
                <p className="ts-veredicto">
                  {Math.abs(diferencia) < 0.01
                    ? '¡Paridad absoluta según el rating!'
                    : `Ventaja de rating para ${diferencia > 0 ? NOMBRE_EQUIPO.claros : NOMBRE_EQUIPO.oscuros}.`}
                </p>
              )}

              {faltan > 0 && (
                <p className="ts-nota">Faltan {faltan} convocados para completar el partido.</p>
              )}

              <div className="ts-acciones">
                <button
                  type="button"
                  className="ts-reiniciar"
                  onClick={generarEquiposParejos}
                  disabled={convocados.length !== total}
                >
                  ⚖️ Generar equipos parejos
                </button>

                <button
                  type="button"
                  className="ts-reiniciar"
                  onClick={simularPartido}
                  disabled={!equiposCompletos}
                >
                  ⚽ Simular partido
                </button>

                <button type="button" className="ts-reiniciar ts-boton-secundario" onClick={limpiarCancha}>
                  Limpiar cancha
                </button>

                <button type="button" className="ts-reiniciar ts-boton-secundario" onClick={vaciarConvocados}>
                  Vaciar convocados
                </button>
              </div>

              {pronostico && (
                <div className="ts-pronostico">
                  <span>{pronostico.intro}</span>
                  <h2>
                    Claros {pronostico.golesClaros} – {pronostico.golesOscuros} Oscuros
                  </h2>
                  <p>{pronostico.cierre}</p>
                  <small>{pronostico.aviso}</small>
                </div>
              )}
            </div>
          </aside>
        </div>

        <DragOverlay dropAnimation={null}>
          {arrastrando && porNombre.get(arrastrando) ? (
            <div className="ts-overlay">
              <FichaVisual
                jugador={porNombre.get(arrastrando)}
                equipo={equipoDe(arrastrando)}
                variante={slotDe(arrastrando) ? 'campo' : 'chip'}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}

