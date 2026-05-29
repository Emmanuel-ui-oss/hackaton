;(function(){
const $=id=>document.getElementById(id)
const qs=(s,p=document)=>p.querySelector(s)
const qsa=(s,p=document)=>[...p.querySelectorAll(s)]
const el=(tag,attrs={},...kids)=>{
  const e=document.createElement(tag)
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='className')e.className=v
    else if(k.startsWith('on'))e.addEventListener(k.slice(2).toLowerCase(),v)
    else e.setAttribute(k,v)
  })
  kids.forEach(k=>{if(k!=null&&k!==false)e.append(typeof k==='string'?document.createTextNode(k):k)})
  return e
}
const flash=(msg,type='info')=>{
  const d=el('div',{className:'flash flash-'+type},msg)
  document.body.append(d)
  setTimeout(()=>d.remove(),3500)
}

const navLinks=[
  ['#dashboard','Dashboard'],
  ['#mapa','Mapa'],
  ['#zonas','Zonas de Riesgo'],
  ['#reportes','Reportes'],
  ['#lineas','Transporte'],
  ['#alertas','Alertas'],
  ['#favoritos','Favoritos'],
  ['#contactos','Emergencia'],
  ['#historial','Historial'],
]

function renderNav(){
  const nav=document.getElementById('nav');const user=api.getUser()
  nav.innerHTML=''
  if(!user)return
  navLinks.forEach(([h,t])=>{
    const a=el('a',{href:h},t)
    a.addEventListener('click',e=>{e.preventDefault();location.hash=h})
    nav.append(a)
  })
}

function renderUser(){
  const ui=document.getElementById('user-info');const user=api.getUser()
  if(user){
    ui.innerHTML=''
    ui.append(document.createTextNode(user.username+' '))
    const btn=el('button',{className:'btn btn-sm btn-outline',onClick:()=>{
      api.clearToken();location.hash='#login';renderNav();renderUser();renderPage()
    }},'Salir')
    btn.style.borderColor='rgba(255,255,255,.6)';btn.style.color='#fff'
    ui.append(btn)
  }else{
    ui.innerHTML='<a href="#login" style="color:#fff">Iniciar sesión</a>'
  }
}

async function renderPage(){
  const main=document.getElementById('main')
  const hash=location.hash||'#login'
  const user=api.getUser()
  if(!user&&hash!=='#login'&&hash!=='#register'){location.hash='#login';return}
  renderNav();renderUser()

  const pages={
    '#login':loginPage,
    '#register':registerPage,
    '#dashboard':dashboardPage,
    '#mapa':mapaPage,
    '#zonas':zonasPage,
    '#reportes':reportesPage,
    '#lineas':lineasPage,
    '#alertas':alertasPage,
    '#favoritos':favoritosPage,
    '#contactos':contactosPage,
    '#historial':historialPage,
  }
  const fn=pages[hash]||dashboardPage
  main.innerHTML='<div class="card"><p>Cargando...</p></div>'
  try{await fn(main)}catch(e){flash(e.message,'error')}
}

// ── LOGIN / REGISTER ──
async function loginPage(main){
  main.innerHTML=`
  <div style="max-width:400px;margin:3rem auto">
    <div class="card">
      <h2>Iniciar sesión</h2>
      <form id="form-login">
        <label>Usuario</label><input id="login-user" required>
        <label>Contraseña</label><input id="login-pass" type="password" required>
        <button class="btn btn-primary" style="width:100%">Ingresar</button>
        <p style="margin-top:1rem;font-size:.85rem;text-align:center">
          ¿No tienes cuenta? <a href="#register">Regístrate</a>
        </p>
      </form>
    </div>
  </div>`
  qs('#form-login').addEventListener('submit',async e=>{
    e.preventDefault()
    try{
      const r=await api.login($('login-user').value,$('login-pass').value)
      api.setToken(r.access_token)
      const me=await api.me()
      api.setUser(me)
      flash('Bienvenido '+me.username,'success')
      location.hash='#dashboard'
    }catch(e){flash(e.message,'error')}
  })
}

async function registerPage(main){
  main.innerHTML=`
  <div style="max-width:400px;margin:3rem auto">
    <div class="card">
      <h2>Registro</h2>
      <form id="form-register">
        <label>Usuario</label><input id="reg-user" required>
        <label>Email</label><input id="reg-email" type="email" required>
        <label>Contraseña</label><input id="reg-pass" type="password" required>
        <label>Nombre</label><input id="reg-name">
        <button class="btn btn-primary" style="width:100%">Registrarse</button>
        <p style="margin-top:1rem;font-size:.85rem;text-align:center">
          ¿Ya tienes cuenta? <a href="#login">Inicia sesión</a>
        </p>
      </form>
    </div>
  </div>`
  qs('#form-register').addEventListener('submit',async e=>{
    e.preventDefault()
    try{
      const r=await api.register({
        username:$('reg-user').value,email:$('reg-email').value,
        password:$('reg-pass').value,first_name:$('reg-name').value
      })
      api.setToken(r.access_token)
      const me=await api.me()
      api.setUser(me)
      flash('Registro exitoso','success')
      location.hash='#dashboard'
    }catch(e){flash(e.message,'error')}
  })
}

// ── MAPA INTERACTIVO ──
async function mapaPage(main){
  main.innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
    <h2 style="margin:0">Mapa de Riesgo y Transporte</h2>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="btn btn-sm btn-primary" id="mapa-ubicar">📍 Mi ubicación</button>
      <button class="btn btn-sm btn-secondary" id="mapa-centrar">🎯 Centrar</button>
    </div>
  </div>
  <div id="mapa-principal" class="map-container" style="height:65vh;border-radius:var(--radius);margin-bottom:1rem"></div>
  <div class="card">
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
      <strong style="font-size:.85rem">Mostrar:</strong>
      <label style="font-size:.8rem;display:flex;align-items:center;gap:4px"><input type="checkbox" id="f-zonas" checked> Zonas</label>
      <label style="font-size:.8rem;display:flex;align-items:center;gap:4px"><input type="checkbox" id="f-reportes" checked> Reportes</label>
      <label style="font-size:.8rem;display:flex;align-items:center;gap:4px"><input type="checkbox" id="f-lineas" checked> Transporte</label>
      <label style="font-size:.8rem;display:flex;align-items:center;gap:4px"><input type="checkbox" id="f-favoritos" checked> Favoritos</label>
      <label style="font-size:.8rem;display:flex;align-items:center;gap:4px"><input type="checkbox" id="f-alertas" checked> Alertas</label>
    </div>
  </div>`

  const map = Mapa.createMap('mapa-principal')
  Mapa.addLegend(map)

  const [zonas,reportes,lineas,favoritos,alertas] = await Promise.all([
    api.getZonas(), api.getReportes(), api.getLineas(), api.getFavoritos(), api.getAlertas()
  ])

  const capas = {}
  capas.zonas = Mapa.addZonas(map, zonas)
  capas.reportes = Mapa.addReportes(map, reportes)
  capas.alertas = Mapa.addAlertas(map, alertas)
  capas.favoritos = Mapa.addFavoritos(map, favoritos)

  const lineaLayers = []
  for (const l of lineas) {
    const paradas = await api.getParadas(l.id)
    if (paradas.length) {
      const layer = Mapa.addLinea(map, l, paradas)
      lineaLayers.push(layer)
    }
  }

  $('mapa-ubicar').addEventListener('click', () => Mapa.locateUser(map))
  $('mapa-centrar').addEventListener('click', () => map.setView(Mapa.CENTRO, Mapa.ZOOM))

  function toggleCapa(key, checked) {
    if (key === 'lineas') {
      lineaLayers.forEach(l => checked ? map.addLayer(l) : map.removeLayer(l))
      return
    }
    if (capas[key]) {
      checked ? map.addLayer(capas[key]) : map.removeLayer(capas[key])
    }
  }

  qsa('#f-zonas, #f-reportes, #f-lineas, #f-favoritos, #f-alertas').forEach(cb => {
    cb.addEventListener('change', function () {
      toggleCapa(this.id.replace('f-', ''), this.checked)
    })
  })
}

// ── DASHBOARD ──
async function dashboardPage(main){
  const [stats,info]=await Promise.all([api.getStats(),api.get('/api/info')])
  const online=navigator.onLine
  main.innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
    <h2 style="margin:0">Dashboard</h2>
    <div style="display:flex;gap:.5rem;align-items:center">
      <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:12px;font-size:.8rem;font-weight:600;
        background:${online?'rgba(0,166,80,.15)':'rgba(227,6,19,.15)'};color:${online?'#00a650':'#e30613'}">
        <span style="width:8px;height:8px;border-radius:50%;background:${online?'#00a650':'#e30613'}"></span>
        ${online?'Internet conectado':'Sin internet - Red local'}
      </span>
    </div>
  </div>
  <div class="grid">
    <div class="card stat-card"><div class="num">${stats.zonas_riesgo}</div><div class="label">Zonas de Riesgo</div></div>
    <div class="card stat-card"><div class="num">${stats.reportes_activos}</div><div class="label">Reportes Activos</div></div>
    <div class="card stat-card"><div class="num">${stats.lineas_transporte}</div><div class="label">Líneas Transporte</div></div>
    <div class="card stat-card"><div class="num">${stats.paradas}</div><div class="label">Paradas</div></div>
    <div class="card stat-card"><div class="num">${stats.alertas_enviadas}</div><div class="label">Alertas Enviadas</div></div>
    <div class="card stat-card"><div class="num">${stats.eventos_sos}</div><div class="label">Eventos SOS</div></div>
    <div class="card stat-card"><div class="num">${stats.rutas}</div><div class="label">Rutas</div></div>
    <div class="card stat-card"><div class="num">${stats.favoritos}</div><div class="label">Favoritos</div></div>
  </div>
  <div class="card">
    <h3>Conexion al servidor</h3>
    <p style="font-size:.85rem">
      Accede desde otros dispositivos con alguna de estas direcciones:<br>
      ${info.network.ips.map(ip=>`<a href="http://${ip}:${info.network.port}" target="_blank" style="display:inline-block;margin:4px 8px 4px 0;padding:4px 12px;background:var(--secondary);color:#fff;border-radius:4px;text-decoration:none;font-family:monospace">http://${ip}:${info.network.port}</a>`).join('')}
    </p>
  </div>
  <div class="card">
    <h3>Zonas por nivel de riesgo</h3>
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:.5rem">
      ${Object.entries(stats.zonas_por_nivel||{}).map(([k,v])=>
        `<div><span class="badge badge-${k}">${k}</span> ${v} zona${v!==1?'s':''}</div>`
      ).join('')}
    </div>
  </div>
  <div class="card">
    <h3>Buscar</h3>
    <div style="display:flex;gap:.5rem">
      <input id="search-q" placeholder="Ej: San Javier, accidente, Comuna 13...">
      <button class="btn btn-primary" id="search-btn">Buscar</button>
    </div>
    <div id="search-results"></div>
  </div>`
  qs('#search-btn').addEventListener('click',async()=>{
    const q=$('search-q').value;if(!q)return
    const r=await api.search(q)
    const div=$('search-results')
    let html='<h4 style="margin-top:1rem">Resultados</h4>'
    html+=`<p>Zonas: ${r.zonas_riesgo.length} | Reportes: ${r.reportes.length} | Rutas: ${r.rutas.length}</p>`
    if(r.zonas_riesgo.length)html+=`<ul>${r.zonas_riesgo.map(z=>`<li>${z.nombre} (${z.nivel}) - ${z.comuna}</li>`).join('')}</ul>`
    if(r.reportes.length)html+=`<ul>${r.reportes.map(z=>`<li>${z.tipo}: ${z.descripcion.substring(0,60)}</li>`).join('')}</ul>`
    div.innerHTML=html
  })
}

// ── ZONAS DE RIESGO ──
async function zonasPage(main){
  const zonas=await api.getZonas()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Zonas de Riesgo</h2>
  <div id="zonas-mapa" class="map-container" style="height:300px;margin-bottom:1rem"></div>
  <div class="card">
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
      <input id="zona-filtro" placeholder="Filtrar por comuna..." style="width:200px">
      <select id="zona-nivel" style="width:150px">
        <option value="">Todos los niveles</option>
        <option value="BAJO">Bajo</option>
        <option value="MEDIO">Medio</option>
        <option value="ALTO">Alto</option>
        <option value="CRITICO">Crítico</option>
      </select>
    </div>
    <div id="zonas-grid" class="grid"></div>
  </div>`
  const mapZonas = Mapa.createMap('zonas-mapa', Mapa.CENTRO[0], Mapa.CENTRO[1], 11)
  Mapa.addZonas(mapZonas, zonas)

  function renderZonas(){
    const filtro=$('zona-filtro').value.toLowerCase()
    const nivel=$('zona-nivel').value
    const g=$('zonas-grid')
    g.innerHTML=zonas.filter(z=>{
      if(nivel&&z.nivel!==nivel)return false
      if(filtro&&!z.comuna.toLowerCase().includes(filtro)&&!z.nombre.toLowerCase().includes(filtro))return false
      return true
    }).map(z=>`<div class="card">
      <h3>${z.nombre}</h3>
      <p><span class="badge badge-${z.nivel}">${z.nivel}</span>
         <span class="badge badge-${z.tipo_riesgo}">${z.tipo_riesgo}</span></p>
      <p style="font-size:.85rem;color:var(--text-light)">${z.comuna}</p>
      <p style="font-size:.8rem">${z.descripcion.substring(0,120)}</p>
      <p style="font-size:.8rem;color:var(--text-light)">Radio: ${z.radio_metros}m</p>
    </div>`).join('')
    if(!g.innerHTML)g.innerHTML='<div class="empty">Sin resultados</div>'
  }
  $('zona-filtro').addEventListener('input',renderZonas)
  $('zona-nivel').addEventListener('change',renderZonas)
  renderZonas()
}

// ── REPORTES COMUNITARIOS ──
async function reportesPage(main){
  const reportes=await api.getReportes()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Reportes Comunitarios</h2>
  <div class="tabs">
    <div class="tab active" data-tab="listar">Listar</div>
    <div class="tab" data-tab="crear">Reportar</div>
  </div>
  <div id="tab-listar" class="tab-content active">
    <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Usuario</th><th>Votos</th><th>Estado</th><th></th></tr></thead>
    <tbody id="reportes-tbody"></tbody></table>
  </div>
  <div id="tab-crear" class="tab-content">
    <form id="form-reporte" style="max-width:500px">
      <label>Tipo</label>
      <select id="rep-tipo">
        <option value="ACCIDENTE">Accidente</option><option value="BLOQUEO">Bloqueo</option>
        <option value="ZONA_PELIGROSA">Zona peligrosa</option><option value="ROBO">Robo</option>
        <option value="INUNDACION">Inundación</option><option value="DESLIZAMIENTO">Deslizamiento</option>
        <option value="MANIFESTACION">Manifestación</option><option value="OTRO">Otro</option>
      </select>
      <label>Descripción</label><textarea id="rep-desc" rows="3" required></textarea>
      <label>Ubicación</label><input id="rep-ubi" placeholder="Ej: Av. Regional, Medellín">
      <div class="form-row">
        <div><label>Latitud</label><input id="rep-lat" value="6.2200"></div>
        <div><label>Longitud</label><input id="rep-lng" value="-75.5700"></div>
      </div>
      <button class="btn btn-primary">Enviar reporte</button>
    </form>
  </div>`

  const tbody=$('reportes-tbody')
  function renderReportes(){
    tbody.innerHTML=reportes.map(r=>`<tr>
      <td><span class="badge badge-${r.tipo}">${r.tipo.replace('_',' ')}</span></td>
      <td>${r.descripcion.substring(0,60)}</td>
      <td>${r.usuario_username}</td>
      <td>👍${r.votos_positivos} 👎${r.votos_negativos}</td>
      <td>${r.activo?'<span style="color:green">Activo</span>':'<span style="color:red">Oculto</span>'}</td>
      <td>
        <button class="btn btn-sm btn-success" data-voto="true" data-id="${r.id}">👍</button>
        <button class="btn btn-sm btn-danger" data-voto="false" data-id="${r.id}">👎</button>
      </td>
    </tr>`).join('')
    qsa('[data-voto]').forEach(b=>b.addEventListener('click',async()=>{
      try{
        const r=await api.votarReporte(b.dataset.id,b.dataset.voto==='true')
        flash('Voto registrado','success');Object.assign(reportes.find(x=>x.id===r.id),r);renderReportes()
      }catch(e){flash(e.message,'error')}
    }))
  }
  renderReportes()
  qsa('.tab').forEach(t=>t.addEventListener('click',function(){
    qsa('.tab').forEach(x=>x.classList.remove('active'));this.classList.add('active')
    qsa('.tab-content').forEach(x=>x.classList.remove('active'))
    $('tab-'+this.dataset.tab).classList.add('active')
  }))
  qs('#form-reporte').addEventListener('submit',async e=>{
    e.preventDefault()
    try{
      const r=await api.crearReporte({
        tipo:$('rep-tipo').value,descripcion:$('rep-desc').value,
        ubicacion_texto:$('rep-ubi').value,latitud:parseFloat($('rep-lat').value),
        longitud:parseFloat($('rep-lng').value)
      })
      reportes.unshift(r);flash('Reporte creado','success');renderReportes()
      $('rep-desc').value=''
    }catch(e){flash(e.message,'error')}
  })
}

// ── LÍNEAS DE TRANSPORTE ──
async function lineasPage(main){
  const lineas=await api.getLineas()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Transporte Público</h2>
  <div id="lineas-mapa" class="map-container" style="height:300px;margin-bottom:1rem"></div>
  <div class="grid" id="lineas-grid"></div>`
  const mapLineas = Mapa.createMap('lineas-mapa', Mapa.CENTRO[0], Mapa.CENTRO[1], 11)
  const promises = lineas.map(async l => {
    const paradas = await api.getParadas(l.id)
    if (paradas.length) Mapa.addLinea(mapLineas, l, paradas)
    return { linea: l, paradas }
  })
  const results = await Promise.all(promises)
  const grid=$('lineas-grid')
  results.forEach(({linea: l, paradas}) => {
    const card=el('div',{className:'card'})
    const header=el('div',{style:'display:flex;justify-content:space-between;align-items:center'})
    header.append(el('h3',{style:'margin:0'},l.codigo+' - '+l.nombre))
    header.append(el('span',{className:'badge',style:`background:${l.color||'#666'}`},l.tipo))
    card.append(header)
    const info=el('p',{style:'font-size:.85rem;color:var(--text-light)'},l.descripcion)
    card.append(info)
    const plist=el('div',{style:'margin-top:.5rem'})
    plist.append(el('strong',{style:'font-size:.85rem'},`Paradas (${paradas.length}): `))
    const plast=paradas.map(p=>p.nombre).join(' → ')
    plist.append(el('span',{style:'font-size:.8rem'},plast))
    card.append(plist)
    grid.append(card)
  })
}

// ── ALERTAS ──
async function alertasPage(main){
  const alertas=await api.getAlertas()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Alertas de Riesgo</h2>
  <div class="card">
    <div style="display:flex;gap:.5rem;margin-bottom:1rem">
      <button class="btn btn-sm btn-primary" id="alertas-todas">Todas</button>
      <button class="btn btn-sm btn-outline" id="alertas-no-leidas">No leídas</button>
    </div>
    <div id="alertas-list"></div>
  </div>`
  function renderAlertas(lista){
    const div=$('alertas-list')
    if(!lista.length){div.innerHTML='<div class="empty">No hay alertas</div>';return}
    div.innerHTML=lista.map(a=>`<div class="card" style="margin-bottom:.5rem;${a.leida?'opacity:.6':''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="badge badge-${a.nivel}">${a.nivel}</span>
        <span style="font-size:.8rem;color:var(--text-light)">${new Date(a.creado).toLocaleDateString()}</span>
      </div>
      <p style="margin:.5rem 0">${a.mensaje}</p>
      ${!a.leida?`<button class="btn btn-sm btn-secondary" data-id="${a.id}">Marcar leída</button>`:''}
      ${a.zona_riesgo?`<p style="font-size:.8rem;color:var(--text-light)">Zona: ${a.zona_riesgo.nombre}</p>`:''}
    </div>`).join('')
    qsa('[data-id]').forEach(b=>b.addEventListener('click',async()=>{
      await api.leerAlerta(b.dataset.id);flash('Alerta marcada','info')
      renderAlertas(await api.getAlertas())
    }))
  }
  renderAlertas(alertas)
  $('alertas-todas').addEventListener('click',async()=>renderAlertas(await api.getAlertas()))
  $('alertas-no-leidas').addEventListener('click',async()=>renderAlertas(await api.getAlertas(true)))
}

// ── FAVORITOS ──
async function favoritosPage(main){
  const favs=await api.getFavoritos()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Destinos Frecuentes</h2>
  <div class="grid" id="favs-grid"></div>
  <div class="card">
    <h3>Agregar favorito</h3>
    <form id="form-fav" style="max-width:500px">
      <label>Nombre</label><input id="fav-nombre" required>
      <label>Dirección</label><input id="fav-dir" required>
      <div class="form-row">
        <div><label>Latitud</label><input id="fav-lat" value="6.2150"></div>
        <div><label>Longitud</label><input id="fav-lng" value="-75.5600"></div>
      </div>
      <button class="btn btn-primary">Guardar</button>
    </form>
  </div>`
  function renderFavs(){
    const g=$('favs-grid')
    g.innerHTML=favs.map(f=>`<div class="card">
      <h3>${f.nombre}</h3>
      <p style="font-size:.85rem">${f.direccion}</p>
      <p style="font-size:.8rem;color:var(--text-light)">${f.latitud}, ${f.longitud}</p>
      <button class="btn btn-sm btn-danger" data-id="${f.id}" style="margin-top:.5rem">Eliminar</button>
    </div>`).join('')
    qsa('[data-id]').forEach(b=>b.addEventListener('click',async()=>{
      await api.delFavorito(b.dataset.id);favs.splice(favs.findIndex(x=>x.id==b.dataset.id),1);renderFavs()
      flash('Favorito eliminado','info')
    }))
  }
  renderFavs()
  qs('#form-fav').addEventListener('submit',async e=>{
    e.preventDefault()
    try{
      const f=await api.crearFavorito({
        nombre:$('fav-nombre').value,direccion:$('fav-dir').value,
        latitud:parseFloat($('fav-lat').value),longitud:parseFloat($('fav-lng').value)
      })
      favs.push(f);flash('Favorito guardado','success');renderFavs()
      $('fav-nombre').value='';$('fav-dir').value=''
    }catch(e){flash(e.message,'error')}
  })
}

// ── CONTACTOS EMERGENCIA ──
async function contactosPage(main){
  const contactos=await api.getContactos()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Contactos de Emergencia</h2>
  <div class="grid" id="contactos-grid"></div>
  <div class="card">
    <h3>Agregar contacto</h3>
    <form id="form-contacto" style="max-width:500px">
      <label>Nombre</label><input id="con-nombre" required>
      <label>Teléfono</label><input id="con-tel" required>
      <label>Email</label><input id="con-email" type="email">
      <button class="btn btn-primary">Guardar</button>
    </form>
  </div>
  <div class="card" style="text-align:center">
    <button class="sos-btn" id="sos-btn" style="position:static">SOS</button>
    <p style="font-size:.8rem;color:var(--text-light);margin-top:.5rem">Presiona para emergencia</p>
    <div id="sos-info"></div>
  </div>`
  function renderContactos(){
    const g=$('contactos-grid')
    g.innerHTML=contactos.map(c=>`<div class="card">
      <h3>${c.nombre}</h3>
      <p>📞 ${c.telefono}</p>
      ${c.email?`<p>✉️ ${c.email}</p>`:''}
      <button class="btn btn-sm btn-danger" data-id="${c.id}">Eliminar</button>
    </div>`).join('')
    qsa('[data-id]').forEach(b=>b.addEventListener('click',async()=>{
      await api.delContacto(b.dataset.id)
      contactos.splice(contactos.findIndex(x=>x.id==b.dataset.id),1)
      renderContactos();flash('Contacto eliminado','info')
    }))
  }
  renderContactos()
  qs('#form-contacto').addEventListener('submit',async e=>{
    e.preventDefault()
    try{
      const c=await api.crearContacto({
        nombre:$('con-nombre').value,telefono:$('con-tel').value,email:$('con-email').value
      })
      contactos.push(c);flash('Contacto guardado','success');renderContactos()
      $('con-nombre').value='';$('con-tel').value='';$('con-email').value=''
    }catch(e){flash(e.message,'error')}
  })
  $('sos-btn').addEventListener('click',async()=>{
    try{
      const r=await api.activarSOS(6.215,-75.560)
      $('sos-info').innerHTML=`<p style="color:var(--danger);font-weight:700;margin-top:.5rem">
        SOS ACTIVADO - Contactos notificados: ${r.contactos_notificados.length}
        <button class="btn btn-sm btn-secondary" id="cerrar-sos">Cerrar SOS</button></p>`
      $('cerrar-sos').addEventListener('click',async()=>{
        await api.cerrarSOS(r.id);$('sos-info').innerHTML='<p style="color:green">SOS desactivado</p>'
      })
    }catch(e){flash(e.message,'error')}
  })
}

// ── HISTORIAL ──
async function historialPage(main){
  const h=await api.getHistorial()
  main.innerHTML=`
  <h2 style="margin-bottom:1rem">Historial de Viajes</h2>
  <div class="card">
    <table><thead><tr><th>Origen</th><th>Destino</th><th>Distancia</th><th>Tiempo</th><th>Costo</th><th>Fecha</th></tr></thead>
    <tbody>${h.map(v=>`<tr>
      <td>${v.origen_nombre}</td><td>${v.destino_nombre}</td>
      <td>${v.distancia_km?v.distancia_km+' km':'-'}</td>
      <td>${v.tiempo_min?v.tiempo_min+' min':'-'}</td>
      <td>${v.costo_estimado?'$'+v.costo_estimado.toLocaleString():'-'}</td>
      <td>${new Date(v.creado).toLocaleDateString()}</td>
    </tr>`).join('')}</tbody></table>
  </div>`
}

// ── INICIO ──
window.addEventListener('hashchange',renderPage)
window.addEventListener('load',()=>{
  const user=api.getUser()
  if(user)renderPage()
  else{location.hash='#login';renderPage()}
})
})()
