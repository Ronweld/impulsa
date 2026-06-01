import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root' // 🔥 Hace que el servicio esté disponible globalmente
})
export class FileService {
  private apiUrl = `${environment.API_URL}/api/candidates/`; 

  constructor(private http: HttpClient) {
  } // 🔥 HttpClient inyectado correctamente

  // 🔥 Manteniendo el método con la estructura original
  guarda_archivo_local(nombreDirectorio: string, data: { file: File, datosCV: any }): Observable<any> {
    const formData = new FormData();
    formData.append('nombre_directorio', nombreDirectorio); // 🔥 Se envía la ruta destino
    formData.append('archivo', data.file); // 🔥 Se envía el archivo binario
    formData.append('datos_cv', JSON.stringify(data.datosCV));// 🔥 Convertimos el objeto JSON a string para que viaje por FormData

    return this.http.post<any>(`${this.apiUrl}guarda_archivo_local/`, formData).pipe(
      catchError(error => {
        console.error('❌ Error al enviar archivo:', error);
        return throwError(() => new Error('Error al enviar archivo'));
      })
    );
  }

  // 🔥 Método para eliminar un archivo del almacenamiento en Django
  elimina_archivo_local(nombreDirectorio: string, nombreArchivo: string, tipo_data: string): Observable<any> {
    const data = { "nombre_directorio": nombreDirectorio, "nombre_archivo": nombreArchivo, "tipo_data": tipo_data };

    return this.http.delete<any>(`${this.apiUrl}elimina_archivo_local/`, { body: data }).pipe(
      catchError(error => {
        console.error('❌ Error al eliminar archivo:', error);
        return throwError(() => new Error('Error al eliminar archivo'));
      })
    );
  }

  // 🔥 Método para obtener el resumen ejecutivo desde Django
  generate_resumen_ejecutivo(directorio: string, excluye_archivos: string[] = [], idioma_respuesta: string): Observable<any> {

    let params = new HttpParams()
        .set('directorio', directorio)
        .set('idioma_respuesta', idioma_respuesta);
    excluye_archivos.forEach(nombreArchivo => {
      params = params.append('excluye_archivos', nombreArchivo);
    });

    return this.http.get<any>(`${this.apiUrl}generate_resumen_ejecutivo/`,  { params } ).pipe(
      catchError(error => {
        console.error('❌ Error al generar resumen:', error);
        return throwError(() => new Error('Error al generar resumen'));
      })
    );
  }

  // 🔥 Método para obtener el cv desde Django
  generate_cv_defecto(directorio: string, excluye_archivos: string[] = [], tipo_curriculum: string, idioma_respuesta: string): Observable<any> {
    //const params = new HttpParams().set('directorio', directorio);
    let params = new HttpParams()
    .set('directorio', directorio)
    .set('idioma_respuesta', idioma_respuesta);
    excluye_archivos.forEach(nombreArchivo => {
      params = params.append('excluye_archivos', nombreArchivo);
    });
    params = params.append('tipo_curriculum', tipo_curriculum);

    return this.http.get<any>(`${this.apiUrl}generate_cv_defecto/`,  { params }).pipe(
      catchError(error => {
        console.error('❌ Error al generar el CV por defecto:', error);
        return throwError(() => new Error('Error al generar CV por defecto'));
      })
    );
    }  

  // 🔥 Método para obtener el CV desde Django con requerimiento laboral
  generate_cv_requerimiento(req_laboral: string, directorio: string, 
                            excluye_archivos: string[] = [],
                            tipo_curriculum: string,
                            idioma_respuesta: string ): Observable<any> {
    const params = { req_laboral, directorio, excluye_archivos, tipo_curriculum, idioma_respuesta };
    return this.http.post<any>(`${this.apiUrl}generate_cv_requerimiento/`, params ,
                {headers: { 'Content-Type': 'application/json' }  // ← asegurado aquí
                }).pipe(
      catchError(error => {
        console.error('❌ Error al generar el CV por requerimiento:', error);
        return throwError(() => new Error('Error al generar CV por requerimiento'));
      })
    );
  }  

  // 🔥 Método para obtener el CV desde Django solicitado por el usuario
  generate_solicitud_cv(solicitud_usuario: string, directorio: string, 
                        excluye_archivos: string[] = [],
                        tipo_curriculum: string,
                        idioma_respuesta: string): Observable<any> {

    const params = { solicitud_usuario: solicitud_usuario, directorio: directorio,
                        "excluye_archivos":excluye_archivos,
                        "tipo_curriculum": tipo_curriculum, 
                        "idioma_respuesta": idioma_respuesta};
    
    return this.http.post<any>(`${this.apiUrl}generate_solicitud_cv/`, params,
                {headers: { 'Content-Type': 'application/json' }  // ← asegurado aquí
                } ).pipe(
      catchError(error => {
        console.error('❌ Error al generar el CV solicitado por el usuario:', error);
        return throwError(() => new Error('Error al generar CV solicitado por el usuario'));
      })
    );
  }
    
  // 🔥 Método para generar las oportundidades, habilidades y fortalezas el candidato
  generate_oportunidades_fortalezas(solicitud_oportundiades_fortalezas: string, 
                                    directorio: string,
                                    idioma_respuesta: string): Observable<any> {
    const params = { 'solicitud_oportundiades_fortalezas': solicitud_oportundiades_fortalezas,
                   'directorio': directorio,'idioma_respuesta': idioma_respuesta };

    return this.http.post<any>(`${this.apiUrl}generate_oportunidades_fortalezas/`, params).pipe(
      catchError(error => {
        console.error('❌ Error al generar oportunidades y fortalezas:', error);
        return throwError(() => new Error('Error al generar oportunidades y fortalezas'));
      })
    );
  }

  generate_carta_presentacion(directorio: string, datosParaCarta: 
                            { tipo_presentacion: string, nombre_empresa: string, nombre_persona: string, convocatoriaInput: string }, 
                            excluye_archivos: string[] = [],
                            idioma_respuesta: string): Observable<any> {
    // Creamos un único objeto que contiene todo
    const body = {
      "directorio": directorio,
      "datosParaCarta": datosParaCarta,
      "excluye_archivos": excluye_archivos,
      "idioma_respuesta": idioma_respuesta
    };

    const headers = { 'Content-Type': 'application/json' };

    return this.http.post<any>(`${this.apiUrl}generate_carta_presentacion/`,  body, 
      { headers } ).pipe(
      catchError(error => {
        console.error('❌ Error al generar carta de presentación:', error);
        return throwError(() => new Error('Error al generar carta de presentación'));
      })
    );
  }
  
  // 🔥 Método para obtener ayuda desde el servidor remoto Django
  prompt_ayuda(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}prompt_ayuda/`).pipe(
      catchError(error => {
        console.error('❌ Error al recuperar ayuda de prompt:', error);
        return throwError(() => new Error('Error al recuperar ayuda de prompt'));
      })
    );
  }  

  /**
   * Realiza la petición para obtener archivos de un directorio.
   * La respuesta es un stream binario.
   * @param directorio La ruta del directorio en el servidor Django.
   * @returns Un Observable de Blob (la respuesta binaria completa).
   */
  obtener_archivos(directorio: string): Observable<Blob> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.apiUrl}obtener_archivos/`, { directorio }, {
      headers: headers,
      responseType: 'blob' // Es crucial para recibir el stream binario
    });
  }
}
