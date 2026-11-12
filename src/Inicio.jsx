const ACCESOS = [
    { destino: 'Historial', icono: '📅', titulo: 'Historial', texto: 'Cada sábado, con sus equipos y premios' },
    { destino: 'Estadísticas', icono: '📊', titulo: 'Estadísticas', texto: 'Puntos, ranking y rendimiento' },
    { destino: 'Duplas ⚗️ ', icono: '⚗️', titulo: 'Duplas', texto: 'Qué compañeros se potencian' },
    { destino: 'Mundial Personal 🌎', icono: '🌎', titulo: 'Mundial Personal', texto: 'El camino de cada uno a la gloria' },
    { destino: 'Próximo sábado', icono: '🔮', titulo: 'Próximo sábado', texto: 'Armá los equipos y consultá el Oráculo' },
    { destino: 'Nosotros', icono: '👥', titulo: 'Nosotros', texto: 'Quiénes son los Enriko' },
    { destino: 'El Muro Enriko', icono: '✍️', titulo: 'El Muro', texto: 'Cargadas, recuerdos y pintadas' },
  ]
  
  function Inicio({
    partidos,
    detallesVotacion,
    puntosJugadores,
    cargando,
    errores,
    formatearFecha,
    numero,
    navegar,
  }) {
    const ultimo = partidos[0]
    const abierta = partidos.find(
      (p) => detallesVotacion?.[p.id]?.estado === 'abierta'
    )
  
    function votar() {
      window.location.href = `${window.location.pathname}?votar=${abierta.id}`
    }
  
    let marcador = null
  
    if (ultimo) {
      const claros = ultimo.goles_claros
      const oscuros = ultimo.goles_oscuros
      const hayResultado = claros != null && oscuros != null
      const gana = !hayResultado || claros === oscuros
        ? 'empate'
        : claros > oscuros ? 'claros' : 'oscuros'
  
      marcador = (
        <article className="ini-tarjeta ini-ultimo">
          <p className="etiqueta">EL ÚLTIMO SÁBADO</p>
          <p className="ini-fecha">
            {formatearFecha(ultimo.fecha)}
            {ultimo.tipo_partido ? ` · ${ultimo.tipo_partido}` : ''}
          </p>
  
          {hayResultado ? (
            <div className="ini-resultado">
              <div className={`ini-equipo ${gana === 'claros' ? 'ini-gano' : ''}`}>
                <span>◇ Claros</span>
                <strong>{claros}</strong>
              </div>
              <span className="ini-guion" aria-hidden="true">—</span>
              <div className={`ini-equipo ${gana === 'oscuros' ? 'ini-gano' : ''}`}>
                <span>⚫ Oscuros</span>
                <strong>{oscuros}</strong>
              </div>
            </div>
          ) : (
            <p className="ini-fecha">Resultado sin cargar</p>
          )}
  
          <button type="button" className="enlace" onClick={() => navegar('Historial')}>
            Ver el historial ↗
          </button>
        </article>
      )
    }
  
    return (
      <>
        <section className="ini-hero">
          <img
            src="/escudo-somos-enriko.jpg"
            alt="Escudo del Club Social y Deportivo Somos Enriko"
            className="ini-escudo"
          />
          <div>
            <p className="etiqueta">CLUB SOCIAL, CULTURAL Y DEPORTIVO</p>
            <h1>Somos <span>Enriko</span></h1>
            <p className="ini-lema">
              Para un Enriko no hay nada mejor que otro Enriko.
              Fútbol los sábados, y todo lo que pasa alrededor.
            </p>
            <div className="portada-acciones">
              {abierta ? (
                <button type="button" className="boton-principal" onClick={votar}>
                  Votar el último partido 🏆
                </button>
              ) : (
                <button type="button" className="boton-principal" onClick={() => navegar('Historial')}>
                  Ver el último partido
                </button>
              )}
              <button type="button" className="boton-secundario" onClick={() => navegar('Estadísticas')}>
                Ver estadísticas
              </button>
            </div>
          </div>
        </section>
  
        {(marcador || abierta) && !cargando && (
          <section className="ini-seccion ini-ahora" aria-label="Lo último del grupo">
            {marcador}
            {abierta && (
              <article className="ini-tarjeta ini-voto">
                <p className="etiqueta">VOTACIÓN ABIERTA</p>
                <h2>¿Quién fue el Toño? ¿Cuál el mejor gol?</h2>
                <p>
                  Partido del {formatearFecha(abierta.fecha)}. Se cierra
                  cuando se carga el próximo.
                </p>
                <button type="button" className="boton-principal" onClick={votar}>
                  Ir a votar 🏆
                </button>
              </article>
            )}
          </section>
        )}
  
        <section className="ini-seccion">
          <h2 className="ini-titulo">Explorá</h2>
          <div className="ini-accesos">
            {ACCESOS.map((a) => (
              <button
                key={a.destino}
                type="button"
                className="ini-acceso"
                onClick={() => navegar(a.destino)}
              >
                <span className="ini-icono" aria-hidden="true">{a.icono}</span>
                <span className="ini-acceso-texto">
                  <strong>{a.titulo}</strong>
                  <small>{a.texto}</small>
                </span>
                <span className="ini-flecha" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
  
        <section className="ini-seccion">
          <div className="ini-titulo-fila">
            <h2 className="ini-titulo">Quién lidera</h2>
            <button type="button" className="enlace" onClick={() => navegar('Estadísticas')}>
              Tabla completa ↗
            </button>
          </div>
  
          {errores?.puntosJugadores ? (
            <p className="muro-vacio">No pudimos cargar la tabla.</p>
          ) : cargando ? (
            <p className="muro-vacio">Cargando…</p>
          ) : (
            <ol className="ini-lideres">
              {puntosJugadores.slice(0, 5).map((j, i) => (
                <li key={j.nombre}>
                  <span className="ini-puesto">{i + 1}</span>
                  <span className="ini-nombre">{j.nombre}</span>
                  <span className="ini-puntos">{numero(j.puntos)} pts</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </>
    )
  }
  
  export default Inicio
  