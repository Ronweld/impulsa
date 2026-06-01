import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common'; // 🔹 Asegura que esté importado
import { Component, EventEmitter, Output, Input, HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../services/auth.service';
import { FileModel } from '../models/file.model';
import { FileService } from '../services/file.service'; // 🔥 Importamos el servicio HTTP
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 
import { Observable, of, forkJoin  } from 'rxjs';
import { retry, catchError, take } from 'rxjs/operators';
//import { from, of } from 'rxjs';
//import { concatMap, finalize, take } from 'rxjs/operators';
//import { from, of, timer } from 'rxjs';
//import { concatMap, retry, delayWhen, finalize, take, catchError } from 'rxjs/operators';


@Component({
  selector: 'app-left-panel',
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.css'],
  imports: [CommonModule]
})
export class LeftPanelComponent {
  cv = {
    tipo_data: ''
  };

  TAMAÑO_PERMITIDO: number=0; 
  isLoggedIn: boolean = false;

  @Output() nuevoMensaje = new EventEmitter<string>(); // 🔥 Ahora `nuevoMensaje` está declarado

  fileList : FileModel[] = [];
  
  previewFile: FileModel | null = null;
  identificador_usuario: string = "";
  titulo: String = "Haz doble clic sobre el nombre iluminado para visualizar el documento en pantalla";

  @Output() fileSelected = new EventEmitter<FileModel>();

  @Output() historialActualizado = new EventEmitter<{ id: number; solicitud: string; respuesta: string, eseditable:boolean }[]>(); // 🔥 Emite el historial
  historial: { id: number; solicitud: string; respuesta: string, eseditable:boolean }[] = [];

  @Output() vis_prompt_ayuda= new EventEmitter<any>();

  @Input() pdfMiPrimerCV!: File;
  @Input() datosParaCarta: { tipo_presentacion: string, nombre_empresa: string, nombre_persona: string, convocatoriaInput: string } | null = null;

  datosYaml: any; // Variable para almacenar los datos
  isLoading = false;
  errorMessage : string = "";
  activeMenu: any = null;
  idiomaSeleccionado: string = '';

  constructor(private fileService: FileService, 
      private cv_Service: CV_Service,
      private authService: AuthService,
      private sanitizer: DomSanitizer,
  ) {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  } // 🔥 Inyectamos el servicio

  ngOnChanges() {
    if (this.pdfMiPrimerCV) {
        //let archivosProcesados = { count: 0 }; // 🔥 Usamos un objeto mutable
        const data = { 
              file: this.pdfMiPrimerCV, 
              datosCV: this.cv
            };
        //this.envia_archivo_local(data, 1, archivosProcesados, 1)
        this.envia_archivo_local(data, 1)
    }
  }

  ngOnInit(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
      this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);
      this.fileList = [];
      this.obtener_archivos(this.identificador_usuario);
    }

    this.cv_Service.pdfMiPrimerCV$.subscribe((data: { file: File, datosCV: any }) => {
      const archivo = data.file;      // Aquí tienes tu PDF

      if (archivo) { // ✅ Verificamos que no sea null
        //let archivosProcesados = { count: 0 }; // 🔥 Usamos un objeto mutable
        //this.envia_archivo_local(data, 1, archivosProcesados, 1);
        this.envia_archivo_local(data, 1);
      } else {
        console.warn('No se recibió un archivo válido'); // 📌 Mensaje de advertencia
      }
    });

    this.cv_Service.obtenerFuentes$.subscribe((usrname: string) => {
      this.fileList = [];
      this.obtener_archivos(usrname); // 🔥 Se ejecuta cuando el servicio recibe el evento
    });

    this.cv_Service.idioma$.subscribe(valor => {
      this.idiomaSeleccionado = valor;
    });
  }

  async obtener_archivos(directorio: string): Promise<void> {
    document.body.style.cursor = "progress"; // 🔥 Cambiar cursor a reloj de espera
    if (!directorio) {
      this.errorMessage = 'Por favor, introduce un directorio.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = "";

    this.fileService.obtener_archivos(directorio).subscribe({
      next: (blob: Blob) => {
        this.isLoading = false;
        this.processFileStream(blob);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al obtener archivos:', error);
        this.errorMessage = 'Error al obtener archivos. Por favor, verifica la consola para más detalles.';
      }
    });
    
    setTimeout(() => {
      document.body.style.cursor = "auto"; // 🔥 Cambiar cursor a reloj de espera
    }, 2000);
  }

  // --- Lógica para procesar el stream binario ---
  private async processFileStream(blob: Blob): Promise<void> {
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const arrayBuffer = e.target.result as ArrayBuffer;
      const decoder = new TextDecoder('utf-8');
      const uint8Array = new Uint8Array(arrayBuffer);

      const fileStartDelimiter = '--FILE_START--'.split('').map(char => char.charCodeAt(0));
      const fileEndDelimiter = '--FILE_END--'.split('').map(char => char.charCodeAt(0));
      //const newlineCode = '\n'.charCodeAt(0);

      let currentIndex = 0;

      while (currentIndex < uint8Array.length) {
        // Buscar el inicio del archivo
        let startDelimiterIndex = -1;
        for (let i = currentIndex; i < uint8Array.length - fileStartDelimiter.length; i++) {
          let match = true;
          for (let j = 0; j < fileStartDelimiter.length; j++) {
            if (uint8Array[i + j] !== fileStartDelimiter[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            startDelimiterIndex = i;
            break;
          }
        }

        if (startDelimiterIndex === -1) {
          // No se encontró más delimitadores de inicio
          break;
        }

        currentIndex = startDelimiterIndex + fileStartDelimiter.length;

        // Extraer el nombre del archivo
        let filenameEndIndex = -1;
        for (let i = currentIndex; i < uint8Array.length - 2; i++) { // -2 para asegurar espacio para '--'
          if (uint8Array[i] === '-'.charCodeAt(0) && uint8Array[i + 1] === '-'.charCodeAt(0) && uint8Array[i + 2] === '\n'.charCodeAt(0)) {
            filenameEndIndex = i;
            break;
          }
        }

        if (filenameEndIndex === -1) {
          console.warn('Advertencia: No se encontró el final del nombre del archivo.');
          break;
        }

        const filenameBytes = uint8Array.slice(currentIndex, filenameEndIndex);
        const filename = decoder.decode(filenameBytes).trim();
        currentIndex = filenameEndIndex + 3; // +3 para saltar '--\n'

        // Buscar el fin del archivo
        let endDelimiterIndex = -1;
        for (let i = currentIndex; i < uint8Array.length - fileEndDelimiter.length; i++) {
          let match = true;
          for (let j = 0; j < fileEndDelimiter.length; j++) {
            if (uint8Array[i + j] !== fileEndDelimiter[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            endDelimiterIndex = i;
            break;
          }
        }

        if (endDelimiterIndex === -1) {
          console.warn(`Advertencia: No se encontró el delimitador de fin para el archivo: ${filename}`);
          break;
        }

        const fileContentBytes = uint8Array.slice(currentIndex, endDelimiterIndex - 1); // -1 para no incluir el '\n' antes de --FILE_END--

        // Inferir el tipo de archivo (mime type)
        const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
        let fileType = this.getMimeType(fileExtension);

        const fileBlob = new Blob([fileContentBytes], { type: fileType });
        const fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(fileBlob));

        const fileData = new FileModel(filename.split(/[/\\]/).pop() ?? 'archivo_desconocido', fileBlob.size, fileType, URL.createObjectURL(fileBlob));
        this.fileList.push(fileData)

        currentIndex = endDelimiterIndex + fileEndDelimiter.length; // Mover el índice después del delimitador de fin
      }
    };
    reader.readAsArrayBuffer(blob);
  }

  private getMimeType(extension: string): string {
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc': return 'application/msword';
      case 'txt': return 'text/plain';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      // Agrega más tipos de archivo según sea necesario
      default: return 'application/octet-stream'; // Tipo genérico para binarios desconocidos
    }
  }

  //envia_archivo_local(file: File, i: number, archivosProcesados: { count: number }, totalArchivos: number) {
  envia_archivo_local_ant(data: { file: File, datosCV: any }, i: number, archivosProcesados: { count: number }, totalArchivos: number) {
    console.log(`[${this.constructor.name}]`,'envia_archivo_local inicio');
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    })

    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    this.TAMAÑO_PERMITIDO = environment.TAMAÑO_PERMITIDO;
    this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);
    
    if (data.file.size <= 1024*1024*this.TAMAÑO_PERMITIDO){

      const fileType = data.file.type || this.getFileType(data.file.name);
      const fileData = new FileModel(data.file.name, data.file.size, fileType, URL.createObjectURL(data.file));
      
      const exists = this.fileList.some(f => f.name === data.file.name);
      if (!exists) {
        this.reintentarEnvioArchivo_ant(data, i, 3, archivosProcesados, totalArchivos);
        this.fileList.push(fileData);
        console.log(`[${this.constructor.name}]`,'envia_archivo_local fin');
      } else {
        alert(`El archivo "${data.file.name}" ya ha sido agregado.`);
        archivosProcesados.count++; // 🔥 Ahora sí aumenta correctamente
        this.verificarFinalizacion_ant(archivosProcesados.count, totalArchivos);
      }
    } else {
        alert(`El archivo "${data.file.name}" supera el tamaño permitido de ${this.TAMAÑO_PERMITIDO}MB.`);
        archivosProcesados.count++; // 🔥 Ahora sí aumenta correctamente
        this.verificarFinalizacion_ant(archivosProcesados.count, totalArchivos);
    }
  }

  addFile_ant(event: any) {
    console.log(`[${this.constructor.name}]`,'addFile inicio');
    document.body.style.cursor = "progress"; // 🔥 Cambiar cursor a reloj de espera
    // Verificamos si esta logeando el usuario
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    })
    const files = event.target.files;
    
    let archivosProcesados = { count: 0 }; // 🔥 Usamos un objeto mutable
    const cantidadArchivos = this.fileList.length + files.length;

    const CNT_ARC_PERMITIDO = this.isLoggedIn ? environment.CNT_ARC_PERMITIDO_USR : environment.CNT_ARC_PERMITIDO_LIB;
    
    if (cantidadArchivos<=CNT_ARC_PERMITIDO){
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = { 
          file: file, 
          datosCV: this.cv 
        };
        this.envia_archivo_local_ant(data, i, archivosProcesados, files.length)
        this.excluyeArchivos();
        console.log(`[${this.constructor.name}]`,'addFile fin');
      }
    }else{
      alert(`Ha superado la cantidad de arhivos permitido "${CNT_ARC_PERMITIDO}"`);
      document.body.style.cursor = "auto"; // 🔥 Restaurar cursor cuando se complete la carga
    }
  }

  // 🔥 Ajustamos la función para actualizar correctamente `archivosProcesados`
  //reintentarEnvioArchivo(file: File, index: number, intentosRestantes: number, archivosProcesados: { count: number }, totalArchivos: number) {
  reintentarEnvioArchivo_ant(data: { file: File, datosCV: any }, index: number, intentosRestantes: number, archivosProcesados: { count: number }, totalArchivos: number) {
    console.log(`[${this.constructor.name}]`,'reintentarEnvioArchivo inicio');
    this.fileService.guarda_archivo_local(this.identificador_usuario, data).subscribe(
      response => {
        console.log('✅ Archivo guardado correctamente:', response);
        archivosProcesados.count++; // 🔥 Ahora sí se actualiza correctamente
        this.verificarFinalizacion_ant(archivosProcesados.count, totalArchivos);
      },
      error => {
        console.error(`❌ Error al enviar archivo "${data.file.name}". Intentos restantes: ${intentosRestantes - 1}`);
        
        if (intentosRestantes > 1) {
          setTimeout(() => {
            this.reintentarEnvioArchivo_ant(data, index, intentosRestantes - 1, archivosProcesados, totalArchivos); // 🔥 Reintentar con variable actualizada
            console.log(`[${this.constructor.name}]`,'reintentarEnvioArchivo fin');
          }, 2000);
        } else {
          console.error(`❌ Fallo definitivo al enviar archivo "${data.file.name}". Eliminándolo...`);
          this.deleteFile(index);
          archivosProcesados.count++; // 🔥 También se actualiza si el archivo falla
          this.verificarFinalizacion_ant(archivosProcesados.count, totalArchivos);
        }
      }
    );
  }
  
  // 🔥 Función que verifica si todos los archivos han sido procesados
  verificarFinalizacion_ant(procesados: number, total: number) {
    console.log(`[${this.constructor.name}]`,'verificarFinalizacion inicio');
    if (procesados === total) {
      setTimeout(() => {
        document.body.style.cursor = "auto"; // 🔥 Restaurar cursor cuando se complete la carga
        console.log(`[${this.constructor.name}]`,'verificarFinalizacion fin');
      }, 500); // 🔥 Pequeño retraso para una mejor UX
    }
  }

  addFile(event: any) {
    console.log(`[${this.constructor.name}]`, 'addFile inicio');
    document.body.style.cursor = "progress";

    const files: FileList = event.target.files;
    const cantidadArchivos = this.fileList.length + files.length;

    this.authService.isLoggedIn$.pipe(take(1)).subscribe(status => {
      this.isLoggedIn = status;
      const CNT_ARC_PERMITIDO = this.isLoggedIn
        ? environment.CNT_ARC_PERMITIDO_USR
        : environment.CNT_ARC_PERMITIDO_LIB;

      if (cantidadArchivos <= CNT_ARC_PERMITIDO) {
        const procesos$ = Array.from(files).map((file, i) =>
          this.envia_archivo_local({ file, datosCV: this.cv }, i).pipe(
            retry(3), // 🔥 reintenta hasta 3 veces si falla
            catchError(err => {
              console.error(`❌ Fallo definitivo al enviar archivo "${file.name}"`, err);
              return of(null); // evita que se rompa el forkJoin
            })
          )
        );

        forkJoin(procesos$).subscribe({
          next: () => {
            console.log(`[${this.constructor.name}]`, 'Todos los archivos procesados');
            document.body.style.cursor = "auto";
          },
          error: (err) => {
            console.error('❌ Error en envío masivo:', err);
            document.body.style.cursor = "auto";
          }
        });
      } else {
        alert(`Ha superado la cantidad de archivos permitido "${CNT_ARC_PERMITIDO}"`);
        document.body.style.cursor = "auto";
      }
    });
  }

  envia_archivo_local(data: { file: File, datosCV: any }, i: number): Observable<any> {
    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    this.TAMAÑO_PERMITIDO = environment.TAMAÑO_PERMITIDO;
    this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

    if (data.file.size > 1024 * 1024 * this.TAMAÑO_PERMITIDO) {
      alert(`El archivo "${data.file.name}" supera el tamaño permitido de ${this.TAMAÑO_PERMITIDO}MB.`);
      return of(null);
    }

    const fileType = data.file.type || this.getFileType(data.file.name);
    const fileData = new FileModel(data.file.name, data.file.size, fileType, URL.createObjectURL(data.file));

    const exists = this.fileList.some(f => f.name === data.file.name);
    if (exists) {
      alert(`El archivo "${data.file.name}" ya ha sido agregado.`);
      return of(null);
    }

    this.fileList.push(fileData);
    return this.fileService.guarda_archivo_local(this.identificador_usuario, data);
  }



  deleteFile(index: number, intentosRestantes: number = 3) {
    console.log("deleteFile: inicio");
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";
    this.activeMenu = null; // Cierra el submenú automáticamente

    const file = this.fileList[index]; // 🔥 Obtiene el archivo a eliminar
    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);
    let tipo_data: string = '';
    // Usamos switch para evaluar el nombre del archivo
    switch (file.name) {
      case environment.ARCHIVO_DATOS_PERSONALES:
        tipo_data = 'PRIMERCV';
        break;
      case environment.ARCHIVO_OPORTUNIDADES_FORTALEZAS:
        tipo_data = 'FORTALEZAS';
        break;
      default:
        tipo_data = 'OTROS';
        break;
    }

    this.fileService.elimina_archivo_local(this.identificador_usuario, file.name, tipo_data).subscribe(
      response => {
        console.log('✅ Archivo eliminado correctamente:', response);
        this.fileList.splice(index, 1); // 🔥 Eliminamos de la lista de archivos
            // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
        this.excluyeArchivos();
        console.log("deleteFile: fin");
        document.body.style.cursor = "auto";
      },
      error => {
        console.error(`❌ Error al eliminar archivo "${file.name}". Intentos restantes: ${intentosRestantes - 1}`);
  
        if (intentosRestantes > 1) {
          setTimeout(() => {
            this.deleteFile(index, intentosRestantes - 1); // 🔥 Reintentar después de un pequeño retraso
          }, 2000);
        } else {
          console.error(`❌ Fallo definitivo al eliminar archivo "${file.name}". No se pudo eliminar después de 3 intentos.`);
          this.activeMenu = null; // Cierra el submenú automáticamente
          // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
          document.body.style.cursor = "auto";
        }
      }
    );
  }

  excluyeArchivos(){
    this.cv_Service.setExcluyeArchivos(this.fileList);
    return this.cv_Service.getExcluyeArchivos();
  }

  generateSummary(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";
    let id = this.cv_Service.agregarMensaje("Generar resumen ejecutivo ", "⌛ Cargando respuesta...","", false);
    this.historial = this.cv_Service.obtenerHistorial();

    // 🔥 Desplazar automáticamente al último mensaje agregado
    setTimeout(() => {
      // 🔥 Emitimos el historial actualizado hacia `AppComponent`
      this.historialActualizado.emit(this.historial);
      const historialDiv = document.querySelector('.historial');
      if (historialDiv) {
        historialDiv.scrollTop = historialDiv.scrollHeight;
      } 
      }, 100);

    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });

    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

    this.fileService.generate_resumen_ejecutivo(this.identificador_usuario, this.excluyeArchivos(), this.idiomaSeleccionado).subscribe(
      response => {

        const respuesta = response.resumen_ejecutivo

        this.cv_Service.agregarMensaje("Generar resumen ejecutivo ", respuesta, "",false, id);
        this.historial = this.cv_Service.obtenerHistorial();

        // 🔥 Desplazar automáticamente al último mensaje agregado
        setTimeout(() => {
          // 🔥 Emitimos el historial actualizado hacia `AppComponent`
          this.historialActualizado.emit(this.historial);
          const historialDiv = document.querySelector('.historial');
          if (historialDiv) {
            historialDiv.scrollTop = historialDiv.scrollHeight;
          }
      
          // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
          document.body.style.cursor = "auto";

          }, 100);
        },
        error => {console.error('❌ Error al generar resumen:', error);

        // 🔥 Restaurar el cursor a "auto" en caso de error
        document.body.style.cursor = "auto";
        }
      );
  }

  previewSelectedFile(file: FileModel): void {
    this.previewFile = null; // 🔥 Forzamos la actualización
    setTimeout(() => {
      this.previewFile = file;
      this.fileSelected.emit(file);
    }, 10); // 🔥 Pequeño retraso para permitir el reinicio
  }

  getFileType(fileName: string): string {
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return 'application/msword';
    } else if (fileName.endsWith('.txt')) {
      return 'text/plain';
    }
    return 'unknown';
  }

  toggleDisable(index: number) {
    this.fileList[index].disabled = !this.fileList[index].disabled;
    this.activeMenu = null; // Cierra el submenú automáticamente
    this.excluyeArchivos();
  }
    
  generarCV_Defecto(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";
    let id = this.cv_Service.agregarMensaje("Generar CV ", "⌛ Cargando respuesta...", "", false);
    this.historial = this.cv_Service.obtenerHistorial();
    // 🔥 Desplazar automáticamente al último mensaje agregado
    setTimeout(() => {
      // 🔥 Emitimos el historial actualizado hacia `AppComponent`
      this.historialActualizado.emit(this.historial);
      const historialDiv = document.querySelector('.historial');
      if (historialDiv) {
        historialDiv.scrollTop = historialDiv.scrollHeight;
      }
    }, 100);

    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
    
    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

    let tipo_curriculum: string = ''
    this.cv_Service.getTipoCurriculum().subscribe(tipo => {
      tipo_curriculum = tipo;
      // Usar tipoActual como se necesite
    });

    this.fileService.generate_cv_defecto(this.identificador_usuario, this.excluyeArchivos(), tipo_curriculum, this.idiomaSeleccionado).subscribe(
      response => {
        const respuesta = response.cv
        this.cv_Service.agregarMensaje("Generar CV ", respuesta, "",false,id);
        this.historial = this.cv_Service.obtenerHistorial();

        // 🔥 Desplazar automáticamente al último mensaje agregado
        setTimeout(() => {
          // 🔥 Emitimos el historial actualizado hacia `AppComponent`
          this.historialActualizado.emit(this.historial);
          const historialDiv = document.querySelector('.historial');
          if (historialDiv) {
            historialDiv.scrollTop = historialDiv.scrollHeight;
          }
      
          // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
          document.body.style.cursor = "auto";

          }, 100);
        },
        error => {console.error('❌ Error al generar CV por defecto:', error);

        // 🔥 Restaurar el cursor a "auto" en caso de error
        document.body.style.cursor = "auto";
        }
      );
  }

  pruebaPrompts() {
    this.prompt_ayuda_local();
    //this.abrirPromptPopup.emit(); // 🔹 Envia señal al RightPanelComponent
    this.cv_Service.openAyudaPrompt();
  }

  prompt_ayuda(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";

    this.fileService.prompt_ayuda().subscribe(
      response => {
          const respuesta = Object.values(response.prompt_ayuda).map((item, index) => ({
          correlativo: index + 1, // 🔥 Generamos un número de orden dinámicamente
          ...(typeof item === 'object' ? item : { valor: item }) // 🔥 Solo aplicamos spread si es un objeto
      }));
          
          this.cv_Service.agregarPromptAyuda(respuesta);
          this.vis_prompt_ayuda.emit(this.cv_Service.obtenerPromptAyuda());
          document.body.style.cursor = "auto";
        },
        error => {console.error('❌ Error al obtener los prompt de ayuda:', error);

        // 🔥 Restaurar el cursor a "auto" en caso de error
        document.body.style.cursor = "auto";
        }
      );
  }

  prompt_ayuda_local(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";
    this.cv_Service.cargarYaml(`${environment.RUTA_ASSETS}${environment.NOMBRE_TEMPLATE_PROMPT_AYUDA}`).then((datos) => {
      if (datos) {
        this.datosYaml = datos; // Guardamos los datos YAML convertidos con IDs
      }
      this.cv_Service.agregarPromptAyuda(this.datosYaml);
      this.vis_prompt_ayuda.emit(this.cv_Service.obtenerPromptAyuda());
      document.body.style.cursor = "auto";
    });
  }

  toggleMenu(file: any, event: Event) {
    event.stopPropagation(); // Evita que el clic cierre el menú automáticamente
    this.activeMenu = this.activeMenu === file ? null : file;
  }


  isMenuOpen(file: any): boolean {
    return this.activeMenu === file;
  }

  @HostListener('document:click', ['$event'])
  closeMenuOnClickOutside(event: Event) {
    // Si se hace clic fuera del menú, se cierra
    this.activeMenu = null;
  }

  @HostListener('document:keydown', ['$event'])
  closeMenuOnKeyPress(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Escape') {
      this.activeMenu = null;
    }
  }

  showPrimerCV() {
    this.cv_Service.openPrimerCV(); 
  }

  fortalezasOportunidades(){
    this.cv_Service.openOportunidadesFortalezas(); 
  }

  cartaPresentacion() {
    //document.body.style.cursor = "wait";
    // Nos suscribimos al evento de cierre/finalización de la ventana
    this.cv_Service.openCartaPresentacion().subscribe(() => {
      if (this.datosParaCarta) {
        if (!this.idiomaSeleccionado) {
            this.cv_Service.idioma$.subscribe(valor => {
              this.idiomaSeleccionado = valor;
            });
        }
        this.generateCartaPresentacion();
        this.datosParaCarta = null;
        //document.body.style.cursor = "auto";
      }
    });
  }

  generateCartaPresentacion(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";
    let id = this.cv_Service.agregarMensaje("Generar carta de presentacion ", "⌛ Cargando respuesta...","", false);
    this.historial = this.cv_Service.obtenerHistorial();

    // 🔥 Desplazar automáticamente al último mensaje agregado
    setTimeout(() => {
        // 🔥 Emitimos el historial actualizado hacia `AppComponent`
        this.historialActualizado.emit(this.historial);
        const historialDiv = document.querySelector('.historial');
        if (historialDiv) {
          historialDiv.scrollTop = historialDiv.scrollHeight;
        } 
        }, 100);

    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });

    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

    // 1. Verificamos que no sea nulo antes de llamar al servicio
    if (!this.datosParaCarta) {
      console.warn("No hay datos disponibles para generar la carta.");
      return;
    }

    this.fileService.generate_carta_presentacion(
      this.identificador_usuario, 
      this.datosParaCarta, 
      this.excluyeArchivos(),
      this.idiomaSeleccionado
    ).subscribe(
      response => {
        const respuesta = response.carta_presentacion
        this.cv_Service.agregarMensaje("Generar carta de presentación ", respuesta, "",false, id);
        this.historial = this.cv_Service.obtenerHistorial();

        // 🔥 Desplazar automáticamente al último mensaje agregado
        setTimeout(() => {
            // 🔥 Emitimos el historial actualizado hacia `AppComponent`
            this.historialActualizado.emit(this.historial);
            const historialDiv = document.querySelector('.historial');
            if (historialDiv) {
              historialDiv.scrollTop = historialDiv.scrollHeight;
            }
        
            // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
            document.body.style.cursor = "auto";

            }, 100);
        },
        error => {console.error('❌ Error al generar carta:', error);

        // 🔥 Restaurar el cursor a "auto" en caso de error
        document.body.style.cursor = "auto";
        }
      );
  }

}