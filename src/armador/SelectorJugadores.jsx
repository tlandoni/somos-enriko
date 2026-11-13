import { useEffect, useId, useRef, useState } from 'react'

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function SelectorJugadores({
  todos,
  seleccionados,
  max,
  equipoDe,
  onAgregar,
  onQuitar,
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const contenedor = useRef(null)
  const idLista = useId()

  const elegidos = new Set(seleccionados)
  const lleno = seleccionados.length >= max
  const buscado = normalizar(texto)

  const resultados = todos.filter(
    (j) => !elegidos.has(j.nombre) && normalizar(j.nombre).includes(buscado)
  )

  useEffect(() => {
    function cerrarAlTocarAfuera(evento) {
      if (contenedor.current && !contenedor.current.contains(evento.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('pointerdown', cerrarAlTocarAfuera)
    return () => document.removeEventListener('pointerdown', cerrarAlTocarAfuera)
  }, [])

  function elegir(jugador) {
    if (!jugador || lleno) return
    onAgregar(jugador.nombre)
    setTexto('')
    setActivo(0)
  }

  function teclado(evento) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setAbierto(true)
      setActivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      if (abierto) elegir(resultados[activo])
    } else if (evento.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div className="ts-selector" ref={contenedor}>
      <label htmlFor={`${idLista}-input`} className="ts-selector-etiqueta">
        Convocados <strong>{seleccionados.length} de {max}</strong>
      </label>

      <div className="ts-selector-caja">
        {seleccionados.map((nombre) => {
          const equipo = equipoDe(nombre)
          return (
            <span key={nombre} className={`ts-tag ts-tag-${equipo || 'libre'}`}>
              {nombre}
              <button
                type="button"
                onClick={() => onQuitar(nombre)}
                aria-label={`Quitar a ${nombre} de los convocados`}
              >
                ×
              </button>
            </span>
          )
        })}

        <input
          id={`${idLista}-input`}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={
            abierto && resultados[activo] ? `${idLista}-${activo}` : undefined
          }
          autoComplete="off"
          value={texto}
          placeholder={seleccionados.length ? 'Buscar más…' : 'Buscar jugador por nombre…'}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
            setActivo(0)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={teclado}
        />
      </div>

      {abierto && (
        <ul id={idLista} role="listbox" className="ts-selector-lista">
          {lleno ? (
            <li className="ts-selector-aviso">
              Ya están los {max} convocados. Quitá a alguien para sumar otro.
            </li>
          ) : resultados.length === 0 ? (
            <li className="ts-selector-aviso">No hay coincidencias.</li>
          ) : (
            resultados.map((j, i) => (
              <li
                key={j.nombre}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={false}
                className={i === activo ? 'ts-activo' : ''}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => elegir(j)}
                onMouseEnter={() => setActivo(i)}
              >
                <span>
                  {j.nombre}
                  {j.invitado && <em> · invitado</em>}
                </span>
                <small>{j.rating.toFixed(2)}</small>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
