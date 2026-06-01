export const environment = {
  production: false,

  // 🔹 Host base
  //HOST: 'localhost',
  HOST: '138.219.41.6',
  
  // 🔹 Puertos
  API_PORT: '8000',
  API_PORT_PREPARA_ENTREVISTA: '8001',
  APP_PORT_PREPARA_ENTREVISTA: '8081',//'4201',
  APP_PORT_CVIA: '8080',//'4200',

  // 🔹 Getters dinámicos para concatenar
  get API_URL() {
    return `http://${this.HOST}:${this.API_PORT}`;
  },
  get API_URL_PREPARA_ENTREVISTA() {
    return `http://${this.HOST}:${this.API_PORT_PREPARA_ENTREVISTA}`;
  },
  get APP_URL_PREPARA_ENTREVISTA() {
    return `http://${this.HOST}:${this.APP_PORT_PREPARA_ENTREVISTA}`;
  },
  get APP_URL_CVIA() {
    return `http://${this.HOST}:${this.APP_PORT_CVIA}`;
  },

  // 🔹 Configuración adicional
  DEBUG_MODE: true,
  LOG_LEVEL: 'verbose',
  TAMAÑO_PERMITIDO: 20, // MB por archivo
  CNT_ARC_PERMITIDO_LIB: 7, // Archivos permitidos sin autenticar
  CNT_ARC_PERMITIDO_USR: 50, // Archivos permitidos autenticado
  USR_NAME: "username",
  USR_NAME_UK: "userunknow",
  ARCHIVO_DATOS_PERSONALES: '_mis_datospersonales.pdf',
  ARCHIVO_OPORTUNIDADES_FORTALEZAS: '_oportunidadesfortalezas.pdf',
  RUTA_ASSETS: 'assets/data/',
  NOMBRE_TEMPLATE_PROMPT_AYUDA: 'template_prompt_ayuda.yaml',
  NOMBRE_TEMPLATE_DATOS_CONFIGURACION: 'template_datos_configuracion.yaml',
  REQUERIMIENTO_LABORAL: 'requerimiento_laboral',
  NUMERO_DIAS_CACHE: 2,
  TIEMPO_EXPIRA_CACHE: 24 * 60 * 60 * 1000,
  NOMBRE_APP: 'cvia_dg_app'
};
