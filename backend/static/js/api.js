const API = '';

const api = {
  getToken(){return localStorage.getItem('token')},
  setToken(t){localStorage.setItem('token',t)},
  clearToken(){localStorage.removeItem('token')},
  getUser(){const u=localStorage.getItem('user');return u?JSON.parse(u):null},
  setUser(u){localStorage.setItem('user',JSON.stringify(u))},

  _lastMeta: null,
  getMeta(){return this._lastMeta},

  async request(method,path,body){
    const opts={method,headers:{}}
    const token=this.getToken()
    if(token) opts.headers['Authorization']='Bearer '+token
    if(body){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}
    const res=await fetch(API+path,opts)
    if(res.status===204) return null
    if(res.status===401){this.clearToken();location.hash='#login';return null}
    const data=await res.json()
    if(!res.ok) throw new Error(data.detail||'Error del servidor')
    return data
  },

  async get(path){
    const data=await this.request('GET',path)
    if(data&&data.meta){this._lastMeta=data.meta;return data.data}
    return data
  },
  post(path,body){return this.request('POST',path,body)},
  put(path,body){return this.request('PUT',path,body)},
  del(path){return this.request('DELETE',path)},

  login(u,p){return this.post('/api/auth/login',{username:u,password:p})},
  register(d){return this.post('/api/auth/register',d)},
  me(){return this.get('/api/auth/me')},

  getItems(){return this.get('/api/v1/items')},
  createItem(d){return this.post('/api/v1/items',d)},

  getZonas(filtros=''){return this.get('/api/v1/zonas-riesgo'+filtros)},
  getReportes(filtros=''){return this.get('/api/v1/reportes'+filtros)},
  crearReporte(d){return this.post('/api/v1/reportes',d)},
  votarReporte(id,pos){return this.post('/api/v1/reportes/'+id+'/votar',{positivo:pos})},

  getFavoritos(){return this.get('/api/v1/favoritos')},
  crearFavorito(d){return this.post('/api/v1/favoritos',d)},
  delFavorito(id){return this.del('/api/v1/favoritos/'+id)},

  getContactos(){return this.get('/api/v1/contactos-emergencia')},
  crearContacto(d){return this.post('/api/v1/contactos-emergencia',d)},
  delContacto(id){return this.del('/api/v1/contactos-emergencia/'+id)},

  activarSOS(lat,lng){return this.post('/api/v1/sos/activar?lat='+lat+'&lng='+lng)},
  cerrarSOS(id){return this.post('/api/v1/sos/'+id+'/cerrar')},

  getLineas(tipo=''){return this.get('/api/v1/lineas-transporte'+(tipo?'?tipo='+tipo:''))},
  getParadas(id){return this.get('/api/v1/lineas-transporte/'+id+'/paradas')},
  getHorarios(id,dia=''){return this.get('/api/v1/lineas-transporte/'+id+'/horarios'+(dia?'?dia='+dia:''))},

  getAlertas(noLeidas=false){return this.get('/api/v1/alertas'+(noLeidas?'?no_leidas=true':''))},
  leerAlerta(id){return this.post('/api/v1/alertas/'+id+'/leer')},

  getHistorial(){return this.get('/api/v1/historial-viajes')},
  getStats(){return this.get('/api/v1/stats')},
  search(q){return this.get('/api/v1/search?q='+encodeURIComponent(q))},
}
