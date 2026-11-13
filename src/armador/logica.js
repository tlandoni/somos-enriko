// Lógica pura del armador táctico (sin React ni Supabase).

export const CLAVE_SELECCION = 'enriko-proximo-partido'

export const FORMATOS = [5, 6, 7, 8, 9, 11]
export const FORMATO_INICIAL = 8

// Esquemas = jugadores de campo. El arquero se suma aparte.
export const ESQUEMAS = {
  5: ['1-2-1', '2-1-1'],
  6: ['2-2-1', '1-3-1'],
  7: ['2-3-1', '3-2-1', '2-2-2'],
  8: ['3-3-1', '2-3-2', '3-2-2'],
  9: ['3-3-2', '3-2-3', '4-3-1'],
  11: ['4-3-3', '4-4-2', '3-5-2'],
}

export const NIVELES = [
  { valor: 'bajo', etiqueta: 'Bajo', factor: -1.5 },
  { valor: 'medio-bajo', etiqueta: 'Medio-bajo', factor: -0.75 },
  { valor: 'promedio', etiqueta: 'Promedio', factor: 0 },
  { valor: 'medio-alto', etiqueta: 'Medio-alto', factor: 0.75 },
  { valor: 'alto', etiqueta: 'Alto', factor: 1.5 },
]

const LINEAS = [
  { rol: 'Defensa', abrev: 'DEF' },
  { rol: 'Mediocampo', abrev: 'MED' },
  { rol: 'Ataque', abrev: 'DEL' },
]

export const NOMBRE_EQUIPO = { claros: 'Claros', oscuros: 'Oscuros' }

export function esquemaPorDefecto(formato) {
  return ESQUEMAS[formato][0]
}

export function esquemaSuma(formato, esquema) {
  const partes = esquema.split('-').map(Number)
  return (
    partes.length === 3 &&
    partes.every(Number.isInteger) &&
    partes.reduce((a, b) => a + b, 0) === formato - 1
  )
}

// Posiciones de ambos equipos. Cancha vertical: Claros arriba, Oscuros abajo.
export function generarSlots(esquema) {
  const lineas = esquema.split('-').map(Number)
  const slots = []

  for (const equipo of ['claros', 'oscuros']) {
    const y = (valor) => (equipo === 'claros' ? valor : 100 - valor)

    slots.push({
      id: `${equipo}-gk`,
      equipo,
      rol: 'Arquero',
      abrev: 'ARQ',
      n: 1,
      i: 0,
      x: 50,
      y: y(8),
    })

    lineas.forEach((cantidad, l) => {
      const yLinea = 8 + (l + 1) * (38 / (lineas.length + 1))
      for (let i = 0; i < cantidad; i++) {
        slots.push({
          id: `${equipo}-${l}-${i}`,
          equipo,
          rol: LINEAS[l].rol,
          abrev: LINEAS[l].abrev,
          n: cantidad,
          i,
          x: ((i + 1) * 100) / (cantidad + 1),
          y: y(yLinea),
        })
      }
    })
  }

  return slots
}

export function etiquetaSlot(slot) {
  return `${NOMBRE_EQUIPO[slot.equipo]} · ${slot.rol}${
    slot.n > 1 ? ` ${slot.i + 1}` : ''
  }`
}

// Conserva las asignaciones cuyo lugar sigue existiendo.
export function reubicar(lugares, slots) {
  const ids = new Set(slots.map((s) => s.id))
  const nuevos = {}
  const perdidos = []

  for (const [id, nombre] of Object.entries(lugares)) {
    if (ids.has(id)) nuevos[id] = nombre
    else perdidos.push(nombre)
  }

  return { lugares: nuevos, perdidos }
}

// destino: id de posición o 'sin' (sin asignar).
export function moverJugador(lugares, nombre, destino) {
  const nuevos = { ...lugares }
  const origen = Object.keys(nuevos).find((id) => nuevos[id] === nombre)

  if (destino === 'sin') {
    if (origen) delete nuevos[origen]
    return nuevos
  }

  if (origen === destino) return nuevos

  const ocupante = nuevos[destino]
  nuevos[destino] = nombre

  if (origen) {
    if (ocupante) nuevos[origen] = ocupante // intercambio
    else delete nuevos[origen]
  }
  // Si venía de "sin asignar", el ocupante vuelve a "sin asignar".

  return nuevos
}

export function llenarEquipo(lugares, slots, equipo, nombres) {
  const nuevos = { ...lugares }
  const libres = slots.filter((s) => s.equipo === equipo)
  libres.forEach((s) => delete nuevos[s.id])
  nombres.forEach((nombre, i) => {
    if (libres[i]) nuevos[libres[i].id] = nombre
  })
  return nuevos
}

const EPS = 0.000001

// Búsqueda exhaustiva: un jugador fijo en el equipo A y se eligen n-1 del resto.
// Entre combinaciones igual de buenas se elige una al azar (muestreo uniforme).
export function equilibrar(lista, n, azar = Math.random) {
  const total = lista.length
  if (total !== n * 2) throw new Error('Cantidad de jugadores incorrecta')

  const ratings = lista.map((j) => j.rating)
  const suma = ratings.reduce((a, b) => a + b, 0)
  const elegidos = new Array(n).fill(0)

  let mejor = Infinity
  let empates = 0
  let mejorSet = null

  function buscar(inicio, cantidad, sumaA) {
    if (cantidad === n) {
      const dif = Math.abs(2 * sumaA - suma) / n
      if (dif < mejor - EPS) {
        mejor = dif
        empates = 1
        mejorSet = elegidos.slice()
      } else if (Math.abs(dif - mejor) <= EPS) {
        empates++
        if (azar() * empates < 1) mejorSet = elegidos.slice()
      }
      return
    }

    const faltan = n - cantidad
    for (let i = inicio; i <= total - faltan; i++) {
      elegidos[cantidad] = i
      buscar(i + 1, cantidad + 1, sumaA + ratings[i])
    }
  }

  elegidos[0] = 0
  buscar(1, 1, ratings[0])

  const enA = new Set(mejorSet)
  return {
    equipoA: lista.filter((_, i) => enA.has(i)).map((j) => j.nombre),
    equipoB: lista.filter((_, i) => !enA.has(i)).map((j) => j.nombre),
    diferencia: mejor,
  }
}

export function promedioRatings(ratings) {
  const validos = ratings.filter((r) => Number.isFinite(r))
  if (!validos.length) return null
  return validos.reduce((a, b) => a + b, 0) / validos.length
}

function poisson(lambda, azar = Math.random) {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1

  do {
    k++
    p *= azar()
  } while (p > L)

  return k - 1
}
export function simularResultado(ratingA, ratingB, n, azar = Math.random) {
  const diferenciaRating = ratingA - ratingB

  const lambdaBase = {
    5: 18,
    6: 14,
    7: 11,
    8: 8,
    9: 5,
    11: 1.8,
  }[n] ?? 6

  // Ajuste de calidad de equipos.
  const ajuste = diferenciaRating / 25

  const lambdaClaros = Math.max(0.5, lambdaBase + ajuste)
  const lambdaOscuros = Math.max(0.5, lambdaBase - ajuste)

  const golesClaros = poisson(lambdaClaros, azar)
  const golesOscuros = poisson(lambdaOscuros, azar)

  return {
    golesClaros,
    golesOscuros,
    diferenciaRating,
  }
}

/* Textos del Oráculo */

const INTROS = [
  'Suena un cascabel. Una voz rasposa canta "¡Falta envido y truco! Por mi botella que este partido va a salir..."',
  'Se corre el humo del asado y un viejo baraja el mazo con manos temblorosas: "Esto ya lo vi en las cartas, muchachos... sale..."',
  'Alguien golpea la mesa con los nudillos y grita "¡Quiero retruco!". El Oráculo mira su mano, sonríe de costado y sentencia...',
  'Un mate cebado a las apuradas, un as de espadas escondido en la manga y la voz del Oráculo: "Anoten, que esto sale..."',
  'Del fondo del bar llega un "¡Flor!" seguido de un silencio incómodo. El Oráculo se acomoda el sombrero y dicta...',
]

const CIERRES_CLAROS = [
  'Andate Fernando, que los Claros se lo llevan como yo a esta mano',
  'Con el siete de espadas en la mano no hay Oscuro que se atreva: ¡vale cuatro para los Claros!',
  '¡Quiero vale cuatro! Los Claros ya cantaron y los Oscuros se van al mazo.',
  'Mandá todo al mazo, Oscuros: los Claros traen el ancho de espadas y cara de piedra.',
]

const CIERRES_OSCUROS = [
  'Por el ancho que tengo en la mano juro que a los Oscuros no se les escapa',
  'Los Oscuros juegan con el as de bastos y cara de póker: el truco ya está cantado y no se discute.',
  '¡Retruco, Claros! Los Oscuros tienen el siete de oro bien guardado y no piensan largarlo.',
  'Se van al mazo los Claros: a los Oscuros les salió la flor y el partido.',
]

const AVISOS = [
  'Jugar compulsivamente es perjudicial para la salud (y la sociedad)',
  'El Oráculo no se hace responsable de apuestas, asados perdidos ni amistades rotas.',
  'Pronóstico sin valor legal, científico ni espiritual. Apostar, como mucho, un mate cocido.',
]

function elegir(lista, azar) {
  return lista[Math.floor(azar() * lista.length)]
}

export function textosOraculo(gananClaros, azar = Math.random) {
  return {
    intro: elegir(INTROS, azar),
    cierre: elegir(gananClaros ? CIERRES_CLAROS : CIERRES_OSCUROS, azar),
    aviso: elegir(AVISOS, azar),
  }
}

/* Persistencia: validación del estado guardado */

export function restaurar(guardado, nombresRegistrados) {
  const vacio = {
    formato: FORMATO_INICIAL,
    esquema: esquemaPorDefecto(FORMATO_INICIAL),
    convocados: [],
    lugares: {},
    invitados: [],
  }

  if (!guardado || typeof guardado !== 'object') return vacio

  const vistos = new Set(nombresRegistrados)
  const invitados = []

  for (const inv of Array.isArray(guardado.invitados) ? guardado.invitados : []) {
    const nombre = typeof inv?.nombre === 'string' ? inv.nombre.trim() : ''
    const rating = Number(inv?.rating)
    if (!nombre || !Number.isFinite(rating) || vistos.has(nombre)) continue
    vistos.add(nombre)
    invitados.push({
      nombre,
      rating,
      pj: 0,
      invitado: true,
      nivel: typeof inv.nivel === 'string' ? inv.nivel : 'Promedio',
    })
  }

  const unicos = (lista) =>
    [...new Set(Array.isArray(lista) ? lista : [])].filter(
      (nombre) => typeof nombre === 'string' && vistos.has(nombre)
    )

  if (guardado.version === 2) {
    const formato = FORMATOS.includes(guardado.formato)
      ? guardado.formato
      : FORMATO_INICIAL
    const esquema = ESQUEMAS[formato].includes(guardado.esquema)
      ? guardado.esquema
      : esquemaPorDefecto(formato)

    const convocados = unicos(guardado.convocados)
    const convocadosSet = new Set(convocados)
    const slotIds = new Set(generarSlots(esquema).map((s) => s.id))
    const usados = new Set()
    const lugares = {}

    for (const [id, nombre] of Object.entries(guardado.lugares || {})) {
      if (slotIds.has(id) && convocadosSet.has(nombre) && !usados.has(nombre)) {
        lugares[id] = nombre
        usados.add(nombre)
      }
    }

    return { formato, esquema, convocados, lugares, invitados }
  }

  // Formato anterior: { disponibles, claros, oscuros, invitados }
  const claros = unicos(guardado.claros)
  const oscuros = unicos(guardado.oscuros).filter((n) => !claros.includes(n))
  const esquema = esquemaPorDefecto(FORMATO_INICIAL)
  const slots = generarSlots(esquema)

  let lugares = llenarEquipo({}, slots, 'claros', claros)
  lugares = llenarEquipo(lugares, slots, 'oscuros', oscuros)

  return {
    formato: FORMATO_INICIAL,
    esquema,
    convocados: [...claros, ...oscuros],
    lugares,
    invitados,
  }
}
