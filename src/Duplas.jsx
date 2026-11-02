
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './Duplas.css'

function numero(valor, decimales = 0) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}


function Tabla({
    columnas,
    filas,
    claveFila,
    ordenInicial = columnas[0].clave,
    direccionInicial = 'desc',
    limite =null,
  }) {
    const [orden, setOrden] = useState({
      columna: ordenInicial,
      direccion: direccionInicial,
    })
  
    const ordenadas = useMemo(() => {
      const resultado = [...filas].sort((a, b) => {
        const x = a[orden.columna]
        const y = b[orden.columna]
  
        let comparacion
  
        if (typeof x === 'string' && typeof y === 'string') {
          comparacion = x.localeCompare(y, 'es')
        } else {
          comparacion = Number(x ?? 0) - Number(y ?? 0)
        }
  
        return orden.direccion === 'asc' ? comparacion : -comparacion
      })
  
      return limite ? resultado.slice(0, limite) : resultado
    }, [filas, orden, limite])
  
    function cambiarOrden(columna) {
      setOrden(actual => ({
        columna,
        direccion:
          actual.columna === columna && actual.direccion === 'desc'
            ? 'asc'
            : 'desc',
      }))
    }
  
    return (
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {columnas.map(col => (
                <th key={col.clave}>
                  <button
                    type="button"
                    className="boton-orden-tabla"
                    onClick={() => cambiarOrden(col.clave)}
                    title={col.descripcion || `Ordenar por ${col.titulo}`}
                  >
                    {col.titulo}
                    {orden.columna === col.clave
                      ? orden.direccion === 'desc' ? ' ↓' : ' ↑'
                      : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((fila, indice) => (
              <tr key={claveFila(fila)}>
                <td className="puesto">{indice + 1}</td>
                {columnas.map(col => (
                  <td
                    key={col.clave}
                    className={col.clase || ''}
                  >
                    {col.formato
                      ? col.formato(fila)
                      : fila[col.clave] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }  

function Estado({ cargando, error, vacio, children }) {
  if (cargando) return <p className="duplas-estado">Cargando…</p>
  if (error) return <p className="duplas-error">Error: {error}</p>
  if (vacio) return <p className="duplas-estado">{vacio}</p>
  return children
}

export default function Duplas() {
  const [ranking, setRanking] = useState([])
  const [paternidades, setPaternidades] = useState([])
  const [frecuencia, setFrecuencia] = useState([])

  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState({})
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)

      const [r, p, f] = await Promise.all([
        supabase.from('ranking_duplas_v2').select('*'),
        supabase.from('paternidades_v2').select('*'),
        supabase.from('duplas_frecuencia_v2').select('*'),
      ])
      console.log('DIAGNÓSTICO DUPLAS', {
        ranking: {
          cantidad: r.data?.length,
          error: r.error,
          muestra: r.data?.slice(0, 2),
        },
        paternidades: {
          cantidad: p.data?.length,
          error: p.error,
          muestra: p.data?.slice(0, 2),
        },
        frecuencia: {
          cantidad: f.data?.length,
          error: f.error,
          muestra: f.data?.slice(0, 2),
        },
      })
      if (!activo) return

      setRanking(r.data || [])
      setPaternidades(p.data || [])
      setFrecuencia(f.data || [])

      setErrores({
        ranking: r.error?.message || null,
        paternidades: p.error?.message || null,
        frecuencia: f.error?.message || null,
      })

      setCargando(false)
    }

    cargar()

    return () => {
      activo = false
    }
  }, [])

  const duplasFiltradas = useMemo(() => {
    const busqueda = filtro.trim().toLocaleLowerCase('es')

    return ranking
      .filter(d => Number(d.pj_juntos) >= 2)
      .filter(d => {
        if (!busqueda) return true

        return (
          d.jugador_1?.toLocaleLowerCase('es').includes(busqueda) ||
          d.jugador_2?.toLocaleLowerCase('es').includes(busqueda)
        )
      })
  }, [ranking, filtro])

  const columnasDuplas = [
    {
      clave: 'jugador_1',
      titulo: 'Jugador 1',
      clase: 'celda-nombre',
    },
    {
      clave: 'jugador_2',
      titulo: 'Jugador 2',
      clase: 'celda-nombre',
    },
    { clave: 'pj_juntos', titulo: 'PJ juntos' },

      
{
    clave: 'rendimiento_conjunto',
    titulo: 'Rendimiento conjunto',
    descripcion: 'Puntos por partido compartido: victoria = 3, empate = 1, derrota = 0',
    formato: d => numero(d.rendimiento_conjunto, 2),
    clase: 'dato-destacado',
  },
  {
    clave: 'bonus_quimica',
    titulo: 'Bonus Química',
    descripcion: 'Cuánto mejora, en promedio, el rendimiento individual de ambos jugadores al compartir equipo',
    formato: d => numero(d.bonus_quimica, 2),
  },
  {
    clave: 'bonus_sinergia',
    titulo: 'Bonus Sinergia',
    descripcion: 'Diferencia entre la diferencia de gol real de la dupla y la esperada según sus rendimientos individuales',
    formato: d => numero(d.bonus_sinergia, 2),
    clase: 'dato-destacado',
  },
  ]

  const columnasPaternidades = [
    { clave: 'jugador_1', titulo: 'Jugador 1', clase: 'celda-nombre' },
    { clave: 'jugador_2', titulo: 'Jugador 2', clase: 'celda-nombre' },
    { clave: 'enfrentamientos', titulo: 'PJ' },
    { clave: 'victorias_1', titulo: 'Victorias 1' },
    { clave: 'empates', titulo: 'Empates' },
    { clave: 'victorias_2', titulo: 'Victorias 2' },
    { clave: 'puntos_1', titulo: 'Puntos 1' },
    { clave: 'puntos_2', titulo: 'Puntos 2' },
    {
      clave: 'porcentaje_puntos_1',
      titulo: '% puntos 1',
      formato: d => `${numero(d.porcentaje_puntos_1, 1)}%`,
    },
    {
      clave: 'porcentaje_puntos_2',
      titulo: '% puntos 2',
      formato: d => `${numero(d.porcentaje_puntos_2, 1)}%`,
    },
  ]

  const columnasFrecuencia = [
    { clave: 'jugador_1', titulo: 'Jugador 1', clase: 'celda-nombre' },
    { clave: 'jugador_2', titulo: 'Jugador 2', clase: 'celda-nombre' },
    { clave: 'pj_juntos', titulo: 'Partidos juntos' },
  ]

  return (
    <section className="pagina interior duplas-pagina">
      <p className="etiqueta">JUNTOS EN LA CANCHA</p>
      <h1>Duplas<span> ⚗️ </span></h1>
      <p className="bajada">
        Algunas sociedades funcionan mejor que otras.
        Los números también cuentan esas historias.
      </p>

      <div className="seccion-estadisticas duplas-bloque">
        <div className="titulo-tabla">
          <div>
            <span className="mini-etiqueta">QUÍMICA Y SINERGIA</span>
            <h2>Tabla de duplas</h2>
          </div>
          <span className="sello-tabla">OFICIAL</span>
        </div>

        <p className="duplas-descripcion">
          Parejas con al menos dos partidos oficiales compartidos.
          Podés ordenar por cualquier indicador o buscar a cualquiera
          de sus integrantes.
        </p>

        <input
          className="duplas-busqueda"
          type="search"
          placeholder="Buscar jugador o dupla…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />

        <Estado
          cargando={cargando}
          error={errores.ranking}
          vacio={duplasFiltradas.length === 0
            ? 'No hay duplas que coincidan con la búsqueda.'
            : null}
        >
          <Tabla
        columnas={columnasDuplas}
        filas={duplasFiltradas}
        claveFila={d => `${d.jugador_1_id}-${d.jugador_2_id}`}
        ordenInicial="bonus_sinergia"
        direccionInicial="desc"
        limite={10}
/>
        </Estado>

        <div className="criterios-tabla duplas-criterios">
          <p>
            <strong>Rendimiento conjunto:</strong> puntos por partido
            compartido (victoria: 3, empate: 1, derrota: 0).
          </p>
          <p>
            <strong>Bonus Química:</strong> cuánto mejora, en promedio,
            el rendimiento individual de ambos al jugar juntos.
          </p>
          <p>
            <strong>Bonus Sinergia:</strong> diferencia entre la diferencia
            de gol real de la dupla y la esperada según sus rendimientos
            individuales. Un valor positivo indica que superan lo esperado.
          </p>
        </div>
      </div>

      <div className="seccion-estadisticas duplas-bloque">
        <div className="titulo-tabla">
          <div>
            <span className="mini-etiqueta">CARA A CARA</span>
            <h2>Paternidades</h2>
          </div>
          <span className="sello-tabla">OFICIAL</span>
        </div>

        <p className="duplas-descripcion">
          Enfrentamientos en equipos opuestos. Victoria: 3 puntos;
          empate: 1 punto para cada jugador. Se muestran cruces
          con al menos tres enfrentamientos.
        </p>

        <Estado
  cargando={cargando}
  error={errores.paternidades}
  vacio={paternidades.length === 0
    ? 'Todavía no hay enfrentamientos suficientes.'
    : null}
>
  <Tabla
    columnas={columnasPaternidades}
    filas={paternidades}
    claveFila={d => `${d.jugador_1_id}-${d.jugador_2_id}`}
  />
</Estado>
      </div>

      <div className="seccion-estadisticas duplas-bloque">
        <div className="titulo-tabla">
          <div>
            <span className="mini-etiqueta">SOCIEDADES FRECUENTES</span>
            <h2>Más veces jugadas juntos</h2>
          </div>
          <span className="sello-tabla">OFICIAL</span>
        </div>

        <p className="duplas-descripcion">
          Las parejas que más veces compartieron equipo.
        </p>

        <Estado
  cargando={cargando}
  error={errores.frecuencia}
  vacio={frecuencia.length === 0
    ? 'Todavía no hay parejas registradas.'
    : null}
>
  <Tabla
    columnas={columnasFrecuencia}
    filas={frecuencia}
    claveFila={d => `${d.jugador_1_id}-${d.jugador_2_id}`}
  />
</Estado>      </div>
    </section>
  )
}
