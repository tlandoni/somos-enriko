
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
  const [estadisticasJugadores, setEstadisticasJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState({})
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCargando(true)

      const [r, p, f, estadisticas] = await Promise.all([
        supabase.from('ranking_duplas_v2').select('*'),
        supabase.from('paternidades_v2').select('*'),
        supabase.from('duplas_frecuencia_v2').select('*'),
        supabase.from('ranking_completo').select('nombre,pj'),
      ])

      if (!activo) return

      setRanking(r.data || [])
      setPaternidades(p.data || [])
      setFrecuencia(f.data || [])
      setEstadisticasJugadores(estadisticas.data || [])
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
  const paternidadesOrdenadas = useMemo(() => {
    return paternidades
      .map(d => {
        const jugador1Gana = Number(d.puntos_1) > Number(d.puntos_2)
  
        const padre = jugador1Gana ? d.jugador_1 : d.jugador_2
        const hijo = jugador1Gana ? d.jugador_2 : d.jugador_1
  
        const puntosPadre = jugador1Gana
          ? Number(d.puntos_1)
          : Number(d.puntos_2)
  
        const puntosHijo = jugador1Gana
          ? Number(d.puntos_2)
          : Number(d.puntos_1)
  
        return {
          ...d,
          padre,
          hijo,
          puntosPadre,
          puntosHijo,
          diferencial: puntosPadre - puntosHijo,
          victoriasPadre: jugador1Gana
            ? Number(d.victorias_1)
            : Number(d.victorias_2),
          victoriasHijo: jugador1Gana
            ? Number(d.victorias_2)
            : Number(d.victorias_1),
          porcentajePadre: jugador1Gana
            ? Number(d.porcentaje_puntos_1)
            : Number(d.porcentaje_puntos_2),
        }
      })
      .filter(d => d.diferencial > 0 && Number(d.enfrentamientos) >= 3)
  }, [paternidades])

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
  {
    clave: 'padre',
    titulo: 'Paternidad',
    formato: d => `${d.padre} es papá de ${d.hijo}`,
    clase: 'celda-nombre',
    descripcion: 'Jugador con más puntos frente al otro.',
  },
  {
    clave: 'enfrentamientos',
    titulo: 'PJ',
    descripcion: 'Cantidad de enfrentamientos oficiales.',
  },
  {
    clave: 'victoriasPadre',
    titulo: 'Historial',
    formato: d => `${d.victoriasPadre} V - ${d.empates} E - ${d.victoriasHijo} D`,
    descripcion: 'Victorias, empates y derrotas desde la perspectiva del padre.',
  },
  {
    clave: 'puntosPadre',
    titulo: 'Puntos padre',
  },
  {
    clave: 'puntosHijo',
    titulo: 'Puntos hijo',
  },
  {
    clave: 'porcentajePadre',
    titulo: '% puntos',
    formato: d => `${numero(d.porcentajePadre, 1)}%`,
    descripcion: 'Porcentaje de los puntos posibles obtenido por el padre.',
  },
  {
    clave: 'diferencial',
    titulo: 'Diferencial',
    clase: 'dato-destacado',
    descripcion: 'Diferencia de puntos a favor del padre.',
  },
]

const columnasFrecuencia = [
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
    {
      clave: 'pj_juntos',
      titulo: 'PJ juntos',
      descripcion: 'Cantidad de partidos oficiales compartidos.',
    },
    {
      clave: 'porcentaje_1',
      titulo: '% Jugador 1',
      formato: d => `${numero(d.porcentaje_1, 1)}%`,
      descripcion: 'Porcentaje de los partidos oficiales del Jugador 1 que compartió con esta dupla.',
    },
    {
      clave: 'porcentaje_2',
      titulo: '% Jugador 2',
      formato: d => `${numero(d.porcentaje_2, 1)}%`,
      descripcion: 'Porcentaje de los partidos oficiales del Jugador 2 que compartió con esta dupla.',
    },
  ]
  const frecuenciaConPorcentajes = useMemo(() => {
    return frecuencia
      .map(d => {
        const jugador1 = estadisticasJugadores.find(
          j => j.nombre === d.jugador_1
        )
        const jugador2 = estadisticasJugadores.find(
          j => j.nombre === d.jugador_2
        )
  
        const pj1 = Number(jugador1?.pj || 0)
        const pj2 = Number(jugador2?.pj || 0)
        const pjJuntos = Number(d.pj_juntos || 0)
  
        const porcentaje1 = pj1 > 0 ? (pjJuntos / pj1) * 100 : 0
        const porcentaje2 = pj2 > 0 ? (pjJuntos / pj2) * 100 : 0
  
        return {
          ...d,
          porcentaje_1: porcentaje1,
          porcentaje_2: porcentaje2,
          promedio_porcentajes: (porcentaje1 + porcentaje2) / 2,
        }
      })
      .sort((a, b) => b.promedio_porcentajes - a.promedio_porcentajes)
  }, [frecuencia, estadisticasJugadores])
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
  vacio={paternidadesOrdenadas.length === 0
    ? 'Todavía no hay enfrentamientos suficientes.'
    : null}
>
    <Tabla
    columnas={columnasPaternidades}
    filas={paternidadesOrdenadas}
    claveFila={d => `${d.jugador_1_id}-${d.jugador_2_id}`}
    ordenInicial="diferencial"
    direccionInicial="desc"
    limite={10}
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
  filas={frecuenciaConPorcentajes}
  claveFila={d => `${d.jugador_1_id}-${d.jugador_2_id}`}
  ordenInicial="pj_juntos"
  direccionInicial="desc"
  limite={10}
/>
</Estado>      </div>
    </section>
  )
}
