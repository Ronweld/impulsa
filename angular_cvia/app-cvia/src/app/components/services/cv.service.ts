import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import yaml from 'js-yaml'; // Importamos la librería
import { FileModel } from '../models/file.model';
import { DatosCV, Fortalezas } from '../models/cv.model'; // Ajusta la ruta
//import { OpcionDatosConfiguracion } from '../interfaces/configuraciones.interfaz';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})

export class CV_Service {
  private readonly apiUrl = `${environment.API_URL}/api/candidates/`; 
  // Variable para almacenar las opciones del YAML
  opcionesYaml: any[] = [];

  private archivosExcluidos$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);  // o cualquier tipo

  private showPrimerCVSubject = new BehaviorSubject<boolean>(false); // ✅ Estado inicial: oculto
  showPrimerCV$ = this.showPrimerCVSubject.asObservable(); // ✅ Observable para suscribirse

  //private pdfMiPrimerCVSubject = new BehaviorSubject<File | null>(null);
  private pdfMiPrimerCVSubject = new Subject<{ file: File, datosCV: any }>();
  pdfMiPrimerCV$ = this.pdfMiPrimerCVSubject.asObservable();

  private showAyudaPromptSubject = new BehaviorSubject<boolean>(false);
  showAyudaPrompt$ = this.showAyudaPromptSubject.asObservable();

  private historial: { id: number; solicitud: string; respuesta: string, eseditable:boolean }[] = [];
  private vis_prompt_ayuda: { tema: string; ayuda: string, eseditable:boolean }[] = [];

  private obtenerFuentes = new Subject<string>(); // 🔥 Fuente de eventos
  obtenerFuentes$ = this.obtenerFuentes.asObservable(); // 📌 Observable accesible desde otros componentes

  private showOportunidadesFortalezasSubject = new BehaviorSubject<boolean>(false); // ✅ Estado inicial: oculto
  showOportunidadesFortalezas$ = this.showOportunidadesFortalezasSubject.asObservable(); // ✅ Observable para suscribirse

  private showCartaPresentacionSubject = new BehaviorSubject<boolean>(false); // ✅ Estado inicial: oculto
  showCartaPresentacion$ = this.showCartaPresentacionSubject.asObservable(); // ✅ Observable para suscribirse

  private idiomaSubject = new BehaviorSubject<string>('Español'); // valor por defecto Español
  idioma$ = this.idiomaSubject.asObservable();

  private cartaCompletadaSubject = new Subject<void>();

  private tipoCurriculum$: BehaviorSubject<string> = new BehaviorSubject<string>('');  // o cualquier tipo

  constructor(private http: HttpClient) {}

  obtenerHistorial(): { id: number; solicitud: string; respuesta: string, eseditable: boolean }[] {
    return this.historial; // 🔥 Retorna el historial actual
  }

  obtenerPromptAyuda(): any {
    return this.vis_prompt_ayuda; // 🔥 Retorna los prompt ayuda
  }

  obtenerArchivos(username: string){
    this.obtenerFuentes.next(username); // 🚀 Notifica a los suscriptores (Componente A)
  }

  agregarMensaje(solicitud: string, respuesta: string, convocatoriaInput: string, eseditable?: boolean,id?: number): number {
    console.log("agregarMensaje: inicio");
    const convocatoria = `${convocatoriaInput}`;
    if (convocatoria){
      //solicitud = solicitud + "\n\nConvocatoria: "+ convocatoria;
      solicitud = solicitud + "\n\n" + convocatoria;
    }
    let id_salida: number;
    let nuevoMensaje: any=null;
      if (id !== undefined) {
        const index = this.historial.findIndex(m => m.id === id);
        if (index !== -1) {
          this.historial[index].respuesta = `${respuesta}`;
        }
        id_salida = id;
      }else{
        nuevoMensaje = {
          id: Date.now(),
          solicitud: `${solicitud}`,
          respuesta: `${respuesta}`, // 🔥 Simulación de IA
          eseditable: Boolean(eseditable),
        };
        this.historial.push(nuevoMensaje);
        id_salida = nuevoMensaje.id;
      }

    // 🔥 Desplazar automáticamente al último mensaje agregado
    setTimeout(() => {
        const historialDiv = document.querySelector('.historial');
        if (historialDiv) {
          historialDiv.scrollTop = historialDiv.scrollHeight;
        }
    }, 100);
    console.log("agregarMensaje: fin");
    return id_salida;
  }

  agregarPromptAyuda(response: any): void {
    this.vis_prompt_ayuda = response;
  }

  // Método para cargar y convertir YAML a JSON con numeración correlativa
  cargarYaml(ruta: string) {
    return this.http.get(ruta, { responseType: 'text' }).toPromise()
      .then((data) => {
        if (!data) {
          console.error("Error: El archivo YAML está vacío o inválido.");
          return [];
        }

        let jsonData = yaml.load(data) as Record<string, any>; // 🔹 Definimos el tipo del objeto

        const respuesta = Object.values(jsonData).map((item, index) => ({
        correlativo: index + 1, // 🔥 Generamos un número de orden dinámicamente
        ...(typeof item === 'object' ? item : { valor: item }) // 🔥 Solo aplicamos spread si es un objeto
            }));
        
      return respuesta;
      })
      .catch((error) => {
        console.error('Error al cargar YAML:', error);
        return null;
      });
  }
  
  getOpcionesYaml(ruta: string, clave: string): Observable<any[]> {
    return this.http.get(ruta, { responseType: 'text' }).pipe(
      map((yamlString: string) => {
        const data = yaml.load(yamlString) as any;
        // Devuelve directamente los elementos de la clave solicitada
        return (data[clave] || []) as any[];
      })
    );
  }


  // Obtener o generar un identificador único
  getIdentifier(storageKey: string): string {
      console.log("Buscando clave en localStorage:", storageKey);
    let identifier = localStorage.getItem(storageKey);

    if (storageKey===environment.USR_NAME_UK){
      if (!identifier) {
        identifier = this.generateUUID(); // Generar un nuevo UUID
        localStorage.setItem(storageKey, identifier);
      }
    }
    return identifier?? '';
  }

  // Método para generar un UUID único
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  getItemCV(storageKey: string): string | '' {
    const item = localStorage.getItem(storageKey);
    if (!item) return '';

    const data = JSON.parse(item);
    const now = Date.now();
    const twoDays = environment.NUMERO_DIAS_CACHE*environment.TIEMPO_EXPIRA_CACHE; // milisegundos en 2 días

    if (now - data.timestamp > twoDays) {
      // Ya expiró: eliminar y devolver null
      localStorage.removeItem(storageKey);
      return '';
    }

    return data.value;
  }

  setItemCV(key: string, storageKey: string): void {
    const data = {
      value: storageKey,
      timestamp: Date.now() // milisegundos desde 1970
    };

    localStorage.setItem(key, JSON.stringify(data));
  }

  setExcluyeArchivos(fileList: FileModel[]): void{
    // Filtramos los archivos excluidos
    let archivos_exluidos = fileList
                .filter(archivo => archivo.disabled)
                .map(archivo => archivo.name);
    this.archivosExcluidos$.next(archivos_exluidos);
  }

  getExcluyeArchivos(): string [] {
    return this.archivosExcluidos$.getValue();
  }

  openPrimerCV() {
    console.log("🔹 Se activó show primer cv en service"); // ✅ Verificar que se ejecuta
    this.showPrimerCVSubject.next(true); // ✅ Muestra el LoginComponent
  }

  closePrimerCV() {
    console.log("🔹 Se cerró Login"); // ✅ Verificar que se ejecuta  
    this.showPrimerCVSubject.next(false); // ✅ Oculta el LoginComponent
  }

  openOportunidadesFortalezas() {
    console.log("🔹 Se activó show oportundiades y fortalezas"); // ✅ Verificar que se ejecuta
    this.showOportunidadesFortalezasSubject.next(true); // ✅ Muestra el LoginComponent
  }

  closeOportunidadesFortalezas() {
    console.log("🔹 Se cerró Oportundiades y Fortalezas"); // ✅ Verificar que se ejecuta  
    this.showOportunidadesFortalezasSubject.next(false); // ✅ Oculta el LoginComponent
  }

  openCartaPresentacion(): Observable<void> {
    console.log("🔹 Se activó show carta de presentacion"); // ✅ Verificar que se ejecuta
    this.showCartaPresentacionSubject.next(true); // ✅ Muestra el LoginComponent
    return this.cartaCompletadaSubject.asObservable();
  }
  
  closeCartaPresentacion() {
    console.log("🔹 Se cerró carta de presentación"); // ✅ Verificar que se ejecuta  
    this.showCartaPresentacionSubject.next(false); // ✅ Oculta el LoginComponent
    this.cartaCompletadaSubject.next();
  }

  setTipoCurriculum(tipo: string): void {
    console.log("🔹 Se activó set tipo  curriculum"); // ✅ Verificar que se ejecuta
    this.tipoCurriculum$.next(tipo); // ✅ Muestra el LoginComponent
  }

  getTipoCurriculum(): Observable<string> {
    console.log("🔹 Se cerró get tipo  curriculum"); // ✅ Verificar que se ejecuta  
    return this.tipoCurriculum$.asObservable(); // ✅ Oculta el LoginComponent
  }

  setIdioma(valor: string): void {
    this.idiomaSubject.next(valor);
  }

  pdfMiPrimerCVSource(file: File, datosCV: any) {
    this.pdfMiPrimerCVSubject.next({ file, datosCV });
  }

  openAyudaPrompt() {
    console.log("🔹 Se activó show ayuda prompt service"); // ✅ Verificar que se ejecuta
    this.showAyudaPromptSubject.next(true); // ✅ Muestra el LoginComponent
  }

  closeAyudaPrompt() {
    console.log("🔹 Se cerró ayuda prompt service"); // ✅ Verificar que se ejecuta  
    this.showAyudaPromptSubject.next(false); // ✅ Oculta el LoginComponent
  }

  /**
   * Consulta los datos del Primer CV
   * GET /api/candidates/consultar-primer-cv/?usuario=xxx
   */
  consultarPrimerCV(nombreUsuario: string): Observable<DatosCV> {
    const params = new HttpParams().set('usuario', nombreUsuario);
    return this.http.get<DatosCV>(`${this.apiUrl}consultar-primer-cv/`, { params });
  }

  /**
   * Consulta las Fortalezas y Habilidades
   * GET /api/candidates/consultar-fortalezas-habilidades/?usuario=xxx
   */
  consultarFortalezasHabilidades(nombreUsuario: string): Observable<Fortalezas> {
    const params = new HttpParams().set('usuario', nombreUsuario);
    return this.http.get<Fortalezas>(`${this.apiUrl}consultar-fortalezas-habilidades/`, { params });
  }


}
