import { useDraggable, useDroppable } from '@dnd-kit/core'
import { etiquetaSlot } from './logica.js'

export function FichaVisual({ jugador, equipo, variante }) {
  const rating = jugador.rating.toFixed(1)

  if (variante === 'chip') {
    return (
      <span className={`ts-ficha-chip ts-eq-${equipo || 'libre'}`}>
        <span className="ts-ficha-chip-nombre">{jugador.nombre}</span>
        <small>{jugador.invitado ? 'inv · ' : ''}{rating}</small>
      </span>
    )
  }

  return (
    <span className={`ts-ficha-campo ts-eq-${equipo || 'libre'}`}>
      <span className="ts-ficha-circulo">{rating}</span>
      <span className="ts-ficha-nombre">
        {jugador.nombre}
        {jugador.invitado ? ' *' : ''}
      </span>
    </span>
  )
}

export function Ficha({ jugador, equipo, variante, seleccionada, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `j:${jugador.nombre}`,
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`ts-ficha ${seleccionada ? 'ts-seleccionada' : ''} ${
        isDragging ? 'ts-arrastrando' : ''
      }`}
      onClick={onClick}
      aria-pressed={seleccionada}
      aria-label={`${jugador.nombre}, rating ${jugador.rating.toFixed(2)}. Tocá para seleccionar y elegir una posición.`}
    >
      <FichaVisual jugador={jugador} equipo={equipo} variante={variante} />
    </button>
  )
}

function Posicion({ slot, jugador, seleccion, onFicha, onVacio }) {
  const { setNodeRef, isOver } = useDroppable({ id: `s:${slot.id}` })

  return (
    <div
      ref={setNodeRef}
      className={`ts-pos ${isOver ? 'ts-over' : ''}`}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      {jugador ? (
        <Ficha
          jugador={jugador}
          equipo={slot.equipo}
          variante="campo"
          seleccionada={seleccion === jugador.nombre}
          onClick={() => onFicha(jugador.nombre, slot.id)}
        />
      ) : (
        <button
          type="button"
          className={`ts-pos-vacia ts-eq-${slot.equipo}`}
          onClick={() => onVacio(slot.id)}
          aria-label={`Posición libre: ${etiquetaSlot(slot)}`}
        >
          {slot.abrev}
        </button>
      )}
    </div>
  )
}

function Lineas() {
  return (
    <svg className="ts-lineas" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.35">
        <rect x="1" y="1" width="66" height="103" />
        <line x1="1" y1="52.5" x2="67" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <rect x="13.85" y="1" width="40.3" height="16.5" />
        <rect x="24.85" y="1" width="18.3" height="5.5" />
        <rect x="13.85" y="87.5" width="40.3" height="16.5" />
        <rect x="24.85" y="98.5" width="18.3" height="5.5" />
        <path d="M 26.7 17.5 A 9.15 9.15 0 0 0 41.3 17.5" />
        <path d="M 26.7 87.5 A 9.15 9.15 0 0 1 41.3 87.5" />
      </g>
      <g fill="rgba(255,255,255,0.75)">
        <circle cx="34" cy="52.5" r="0.5" />
        <circle cx="34" cy="12" r="0.45" />
        <circle cx="34" cy="93" r="0.45" />
      </g>
    </svg>
  )
}

export function Cancha({ slots, lugares, porNombre, seleccion, onFicha, onVacio }) {
  return (
    <div className="ts-cancha" role="group" aria-label="Cancha. Claros arriba, Oscuros abajo.">
      <Lineas />
      <span className="ts-cancha-rotulo ts-rotulo-claros">◇ CLAROS</span>
      <span className="ts-cancha-rotulo ts-rotulo-oscuros">⚫ OSCUROS</span>

      {slots.map((slot) => (
        <Posicion
          key={slot.id}
          slot={slot}
          jugador={porNombre.get(lugares[slot.id]) || null}
          seleccion={seleccion}
          onFicha={onFicha}
          onVacio={onVacio}
        />
      ))}
    </div>
  )
}

export function ZonaSinAsignar({ nombres, porNombre, seleccion, onFicha, onZona }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'z:sin' })

  return (
    <div
      ref={setNodeRef}
      className={`ts-sin-asignar ${isOver ? 'ts-over' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onZona()
      }}
    >
      <div className="ts-sin-titulo">
        <h3>Sin asignar</h3>
        <span>{nombres.length}</span>
      </div>

      {nombres.length === 0 ? (
        <p className="ts-vacio">
          Los convocados sin posición aparecen acá. Arrastrá una ficha hasta
          acá para sacarla de la cancha.
        </p>
      ) : (
        <div className="ts-chips">
          {nombres.map((nombre) => {
            const jugador = porNombre.get(nombre)
            if (!jugador) return null
            return (
              <Ficha
                key={nombre}
                jugador={jugador}
                variante="chip"
                seleccionada={seleccion === nombre}
                onClick={() => onFicha(nombre, null)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
