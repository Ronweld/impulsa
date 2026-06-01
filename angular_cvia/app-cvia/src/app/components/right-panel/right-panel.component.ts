import { environment } from '../../../environments/environment';
import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef, ChangeDetectionStrategy  } from '@angular/core';
import { FormsModule } from '@angular/forms'; // ✅ Importa FormsModule en el standalone
import { ElementRef, ViewChild,QueryList, ViewChildren } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FileModel } from '../models/file.model';
import { AuthService } from '../services/auth.service';
import { FileService } from '../services/file.service'; // 🔥 Importamos el servicio HTTP
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 
import { OpcionDatosConfiguracion } from '../interfaces/configuraciones.interfaz';
import { CommonModule } from '@angular/common'; // 🔥 Importa CommonModule
import { MarkdownModule  } from 'ngx-markdown';
import jsPDF from 'jspdf';
import { Subject, takeUntil } from 'rxjs';

declare var bootstrap: any; // 👈 declarar bootstrap global

@Component({
  standalone: true,
  selector: 'app-right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // 🔥 Optimización
  imports: [CommonModule, MarkdownModule, FormsModule ] // 🔥 Agregar CommonModule para habilitar el pipe `async`
})
export class RightPanelComponent implements OnInit  {
  @Input() file: any = null;
  @Output() close = new EventEmitter<void>();
  prompt: string = '';
  @Input() previewFile: FileModel | null = null;

  //@Input() fileList: FileModel | null = null;
  @Input() fileList : FileModel[] = [];

  isLoggedIn: boolean = false;

  environment = environment; // ✅ lo expones al template

  isVisible: boolean = false;
  popupVisible: boolean = false;
  popupPosition = {};
  mostrarFormulario: boolean = false;
  errores: string[] = [];

  @Output() cerrarPopup = new EventEmitter<void>(); // 🔹 Envía evento a AppComponent

  //@Input() mostrarAyudaPopup: boolean = false; // 🔹 Recibe el estado desde `AppComponent`
  @Output() ocultarAyudaPopup = new EventEmitter<void>(); // 🔹 Envía evento a AppComponent
  
  @Output() nuevoMensaje = new EventEmitter<string>();

  @Output() historialActualizado = new EventEmitter<{ id: number; solicitud: string; respuesta: string, eseditable: boolean }[]>(); // 🔥 Emite el historial

  @Input() historial: { id: number; solicitud: string; respuesta: string, eseditable: boolean }[] = [];

  @Output() pdfMiPrimerCV = new EventEmitter<File>();
  @ViewChild('btnConvocatoria') btnConvocatoria!: ElementRef;
  @ViewChild('preparaEntrevistaIFrame') iframeRef!: ElementRef<HTMLIFrameElement>;

  private destroy$ = new Subject<void>();

  convocatoriaInput: string = '';
  idiomaSeleccionado: string = 'Español';
  opciones: OpcionDatosConfiguracion[] = [];

  mostrarPreparaEntrevista = false;
  
  safeIframeUrl: SafeResourceUrl | null = null;

  constructor(
    private sanitizer: DomSanitizer, 
    private fileService: FileService, 
    private cv_Service: CV_Service, 
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    ) {}
  
  ngOnInit(): void {
      if (this.historial.length > 0) {
        setTimeout(() => { 
          this.cdr.detectChanges(); // 🔥 Fuerza la actualización de la vista sin bloqueos en el ciclo de cambios
        }, 50); // 🔥 Pequeño retraso para que Angular procese los cambios correctamente
      }

      this.cargarOpciones('idioma_respuesta');
      // Verificamos si el usuario esta logueado o no
      this.authService.isLoggedIn$.subscribe(status => {
          this.isLoggedIn = status;
      });

  }

  get isLoggedIn$() {
    return this.authService.isLoggedIn$
  }

  private cargarOpciones(clave: string): void {
    console.log(`[${this.constructor.name}]`,'cargarOpciones inicio');
    const url = `${environment.RUTA_ASSETS}${environment.NOMBRE_TEMPLATE_DATOS_CONFIGURACION}`;
    
    this.cv_Service.getOpcionesYaml(url,clave)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.opciones = data;
          this.cdr.markForCheck();
          console.log(`[${this.constructor.name}]`,'cargarOpciones fin');
        },
        error: (err) => console.error('Error cargando opciones de idioma:', err)
      });
  }

  abrirConvocatoria() {
    console.log(`[${this.constructor.name}]`,'abrirConvocatoria inicio');
    this.mostrarFormulario = true;
    this.bloqueaRightPanel();
    this.popupVisible = true;
    this.errores = [];
    this.cerrarPopup.emit(); // 🔹 Envía señal de cierre a AppComponent
    this.ocultarAyudaPopup.emit(); // 🔹 Envía señal de cierre a AppComponent
    this.convocatoriaInput = this.cv_Service.getItemCV(environment.REQUERIMIENTO_LABORAL);
    console.log(`[${this.constructor.name}]`,'abrirConvocatoria fin');
  }

  preparaEntrevista() {
    this.mostrarPreparaEntrevista = true;

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.error("No hay refresh token, redirigiendo a login");
      //window.location.href = '/login';
      return;
    }
    
    this.authService.isLoggedIn$.subscribe(status => {
      const USR_NAME = status ? environment.USR_NAME : environment.USR_NAME_UK;
      const identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);
      this.authService.refreshToken(refreshToken).subscribe({
        next: (tokens) => {
          
          //iframe.src = 'http://localhost:4201/jd';
          
          //iframe.src = `${environment.APP_URL_PREPARA_ENTREVISTA}/jd`;
          // ✅ Sanitizar la URL antes de asignarla
          const safeUrl: SafeResourceUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(`${environment.APP_URL_PREPARA_ENTREVISTA}/jd`);
          
          // En lugar de asignar directamente el string, usa binding en el template
          this.safeIframeUrl = safeUrl;

          // Forzar render antes de acceder a iframeRef
          this.cdr.detectChanges();

          // Esperar al siguiente ciclo de render
          setTimeout(() => {
            if (this.iframeRef) {
              //const iframe = document.getElementById('preparaEntrevistaIFrame') as HTMLIFrameElement;
              const iframe = this.iframeRef.nativeElement;
              //const origin = new URL(environment.APP_URL_PREPARA_ENTREVISTA).origin;
              iframe.onload = () => {
                const origin = new URL(iframe.src).origin;
                iframe.contentWindow?.postMessage({
                  token: tokens.access,               // ✅ token nuevo
                  refresh: tokens.refresh ?? refreshToken,
                  username: identificador_usuario,
                  origen_app: environment.NOMBRE_APP,
                  idioma_respuesta: this.idiomaSeleccionado
                }, origin )
            };
            }
          },100);
        },
        error: (err) => {
          console.error("Error al refrescar token:", err);
          //window.location.href = '/login';
        }
      });
    });
  }

  verConvocatorias() {
    this.mostrarFormulario = true;
    this.bloqueaRightPanel();
    this.popupVisible = true;
    this.errores = [];
    this.cerrarPopup.emit(); // 🔹 Envía señal de cierre a AppComponent
    this.ocultarAyudaPopup.emit(); // 🔹 Envía señal de cierre a AppComponent
  }

  minimizarPopup() {
    this.mostrarFormulario = false;
    this.bloqueaRightPanel();
    this.popupVisible = false;
    this.cerrarPopup.emit(); // 🔹 Envía señal de cierre a AppComponent
    this.ocultarAyudaPopup.emit(); // 🔹 Envía señal de cierre a AppComponent
    // 🔥 Forzar la detección de cambios en la vista
    this.cdr.detectChanges();  
  }

  onChangeIdioma(event: any) {
      console.log('Idioma cambiado a:', this.idiomaSeleccionado);
      this.cv_Service.setIdioma(this.idiomaSeleccionado);
    }

  bloqueaRightPanel(){
    const rightPanel = document.querySelector(".right-panel") as HTMLElement;
    const chatContainer = document.querySelector(".chat-container") as HTMLElement;
    const areaInput = document.querySelector(".area-input") as HTMLElement;
    const inputContainer = document.querySelector(".input-container") as HTMLElement;
    const textareaPrompt = document.querySelector(".textarea-prompt") as HTMLElement;
    const btnGeneraSolicitudCV = document.querySelector(".btnGeneraSolicitudCV") as HTMLElement;
    
    if (this.mostrarFormulario) {
      rightPanel.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 🔥 Fondo oscuro solo dentro del panel
      /*rightPanel.style.position = "relative";*/ // 📌 Mantiene el fondo dentro del panel
      rightPanel.style.zIndex = "90"; // 📌 Asegura que quede sobre otros elementos
      rightPanel.style.pointerEvents = "none"; // 🔥 Bloquea interacciones

      chatContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 🔥 Fondo oscuro solo dentro del panel
      /*chatContainer.style.position = "relative";*/ // 📌 Mantiene el fondo dentro del panel
      /*chatContainer.style.zIndex = "100";*/ // 📌 Asegura que quede sobre otros elementos
      chatContainer.style.pointerEvents = "none"; // 🔥 Bloquea interacciones

      areaInput.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 🔥 Fondo oscuro s
      inputContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 🔥 Fondo oscuro s
      textareaPrompt.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 🔥 Fondo oscuro s
      btnGeneraSolicitudCV.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 🔥 Fondo oscuro s
    } else {
      rightPanel.style.backgroundColor = ""; // 🔥 Restaura color
      rightPanel.style.pointerEvents = "auto"; // 🔥 Habilita interacciones

      chatContainer.style.backgroundColor = ""; // 🔥 Restaura color
      chatContainer.style.pointerEvents = "auto"; // 🔥 Habilita interacciones

      areaInput.style.backgroundColor = ""; // 🔥 Fondo oscuro s
      inputContainer.style.backgroundColor = ""; // 🔥 Fondo oscuro s
      textareaPrompt.style.backgroundColor = ""; // 🔥 Fondo oscuro s
      btnGeneraSolicitudCV.style.backgroundColor = ""; // 🔥 Fondo oscuro s
    }
  }

  getSafeUrl(): SafeResourceUrl {
    return this.previewFile ? this.sanitizer.bypassSecurityTrustResourceUrl(this.previewFile.url) : '';
  }

  ngOnChanges(): void {
    if (this.previewFile) {
      this.isVisible = true; // ✅ Siempre muestra la vista previa si hay un archivo seleccionado
    }

  }

  closePreview() {
    this.isVisible = !this.isVisible;
    this.previewFile = null; // 🔥 Limpia la vista previa para permitir recarga del mismo archivo
  }

  updatePrompt(event: Event): void {
    const textarea  = event.target as HTMLTextAreaElement;
    const container = document.querySelector('.input-container') as HTMLElement;
    
    this.prompt = textarea.value;
    textarea.style.height = 'auto'; // 🔥 Restablecemos la altura antes de calcular
    textarea.style.height = textarea.scrollHeight + 'px'; // 🔥 Ajustamos la altura según el contenido

    if (textarea.value.length===0) {
      container.style.height = 'auto';
      container.classList.remove('expanded'); // 🔥 Removemos si vuelve a ser pequeño
      textarea.style.height = '50px'; // 🔥 Volver a la altura original
      textarea.classList.remove('expanded'); // 🔥 Removemos si vuelve a ser pequeño
    }else{
        // 🔥 Activamos la superposición si el contenido supera cierta altura
        if (textarea.offsetHeight  > 262) {
          container.classList.add('expanded'); // 🔥 Agregamos la clase para la superposición
        } else {
          container.style.height = 'auto';
          container.classList.remove('expanded'); // 🔥 Removemos si vuelve a ser pequeño
        }
    }
  }

generate_solicitud_cv(): void {
    console.log(`[${this.constructor.name}]`,'generate_solicitud_cv inicio');
    if (this.prompt.trim()) {
        // 1. CAPTURAR VALORES Y CAMBIAR CURSOR DE INMEDIATO
        document.body.style.cursor = "wait";
        
        const textarea = document.getElementById('promptChat') as HTMLTextAreaElement;
        const txtconvocatoriaInput = document.getElementById('convocatoriaInput') as HTMLTextAreaElement;
        const container = document.querySelector('.input-container') as HTMLElement;

        if (!textarea) {
            console.error("❌ No se encontró el textarea en el DOM.");
            document.body.style.cursor = "auto";
            return;
        }

        // 2. GUARDAR LOS VALORES EN VARIABLES ANTES DE LIMPIAR
        const valorPrompt = textarea.value;
        const valorConvocatoria = txtconvocatoriaInput ? txtconvocatoriaInput.value : '';

        // 3. LIMPIAR EL TEXTAREA Y EL CAMBIO DE TEXTO DE INMEDIATO
        this.prompt = ''; 
        textarea.value = ''; 
        if (txtconvocatoriaInput) txtconvocatoriaInput.value = '';

        // 4. TU LÓGICA ORIGINAL DE MENSAJES E IDENTIFICADORES
        let id = this.cv_Service.agregarMensaje(valorPrompt, "⌛ Cargando respuesta...", valorConvocatoria, true);
        this.historial = this.cv_Service.obtenerHistorial();
        
        this.authService.isLoggedIn$.subscribe(status => {
            this.isLoggedIn = status;
        });

        const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
        const identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);
        let excluye_archivos = this.cv_Service.getExcluyeArchivos();
        
        let tipo_curriculum: string = '';
        this.cv_Service.getTipoCurriculum().subscribe(tipo => {
            tipo_curriculum = tipo;

              container.classList.remove('expanded'); // 🔥 Volver a su estado normal
              textarea.style.height = '50px'; // 🔥 Volver a la altura original

            // 5. LLAMADA AL SERVICIO (Dentro del subscribe para asegurar que tipo_curriculum tenga valor)
            this.fileService.generate_solicitud_cv(valorPrompt, identificador_usuario, excluye_archivos, tipo_curriculum, this.idiomaSeleccionado).subscribe(
                response => {
                    const respuesta = response.cv_solicitud;
                    
                    // Actualizar mensaje con la respuesta real
                    this.cv_Service.agregarMensaje(valorPrompt, respuesta, valorConvocatoria, true, id);
                    this.historial = this.cv_Service.obtenerHistorial();

                    // 6. RESET DE UI Y CURSOR (Solo cuando llega la respuesta)
                    setTimeout(() => {
                        this.minimizarPopup();
                        //if (container) {
                        //    container.style.height = 'auto';
                        //    container.classList.remove('expanded');
                        //}
                        //textarea.style.height = '50px';
                        //textarea.classList.remove('expanded');
                        console.log(`[${this.constructor.name}]`,'generate_solicitud_cv fin');
                        
                        // RESTAURAR CURSOR AQUÍ
                        document.body.style.cursor = "auto";
                    }, 100);
                },
                error => {
                    // Manejo básico de error para no dejar el cursor en "wait"
                    document.body.style.cursor = "auto";
                    console.error("Error en la generación", error);
                }
            );
        });
    }
}


generate_cv_requerimiento(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
  document.body.style.cursor = "wait";
  console.log(`[${this.constructor.name}]`,'generate_cv_requerimiento inicio');
  const txtconvocatoriaInput = document.getElementById("convocatoriaInput") as HTMLTextAreaElement;
  if (this.validarConvocatoria((txtconvocatoriaInput)?.value.trim())) {
    let id = this.cv_Service.agregarMensaje("Generar CV alineado a requerimiento laboral ", "⌛ Cargando respuesta...", txtconvocatoriaInput.value, true);
    this.historial = this.cv_Service.obtenerHistorial();

    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });

    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    const identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

    let excluye_archivos = this.cv_Service.getExcluyeArchivos();
    let tipo_curriculum: string = ''//this.cv_Service.getTipoCurriculum();
    this.cv_Service.getTipoCurriculum().subscribe(tipo => {
      tipo_curriculum = tipo;
      // Usar tipoActual como se necesite
    });


    this.fileService.generate_cv_requerimiento('\nConvocatoria: '+`${txtconvocatoriaInput.value}`, 
                                              identificador_usuario, excluye_archivos, 
                                              tipo_curriculum, this.idiomaSeleccionado).subscribe(
      response => {
        console.log('✅ Resumen generado:', response.cv_requerimiento);
        const respuesta = response.cv_requerimiento

        this.cv_Service.agregarMensaje("Generar CV alineado a requerimiento laboral ", respuesta, txtconvocatoriaInput.value, true, id);
        this.historial = this.cv_Service.obtenerHistorial();
        // 🔥 Desplazar automáticamente al último mensaje agregado
        setTimeout(() => {
          // 🔥 Emitimos el historial actualizado hacia `AppComponent`
          this.historialActualizado.emit(this.historial);
          const historialDiv = document.querySelector('.historial');
          if (historialDiv) {
            historialDiv.scrollTop = historialDiv.scrollHeight;
          }

          //Almacenamos el requerimiento en caché para futuros usos
          //localStorage.setItem(environment.REQUERIMIENTO_LABORAL, (txtconvocatoriaInput)?.value.trim()); 
          this.cv_Service.setItemCV(environment.REQUERIMIENTO_LABORAL, (txtconvocatoriaInput)?.value.trim());
          
          (document.getElementById('promptChat') as HTMLTextAreaElement).value = ''; // 🔥 Borra el campo
          (document.getElementById('convocatoriaInput') as HTMLTextAreaElement).value = ''; // 🔥 Borra el campo
          // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
          document.body.style.cursor = "auto";
          console.log(`[${this.constructor.name}]`,'generate_cv_requerimiento fin');

          }, 100);
        },
        error => {console.error('❌ Error al generar CV por requerimiento:', error);

        // 🔥 Restaurar el cursor a "auto" en caso de error
        document.body.style.cursor = "auto";
        }
      );
      this.minimizarPopup();
    } else {
      console.error("Errores en la convocatoria.");
    }
  }

  editarSolicitud(id: number, esditable: boolean, nuevaSolicitud: string) {
    if (esditable) {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";

      const txtconvocatoriaInput = document.getElementById('convocatoriaInput') as HTMLTextAreaElement;

      if (nuevaSolicitud) {
        this.cv_Service.agregarMensaje(nuevaSolicitud, "⌛ Cargando respuesta...", txtconvocatoriaInput.value, esditable,id);
        this.historial = this.cv_Service.obtenerHistorial();
        this.authService.isLoggedIn$.subscribe(status => {
          this.isLoggedIn = status;
        });

        const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
        const identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

        let excluye_archivos = this.cv_Service.getExcluyeArchivos();
        let tipo_curriculum: string = ''//this.cv_Service.getTipoCurriculum();
        this.cv_Service.getTipoCurriculum().subscribe(tipo => {
          tipo_curriculum = tipo;
          // Usar tipoActual como se necesite
        });

        this.fileService.generate_solicitud_cv(nuevaSolicitud, identificador_usuario, excluye_archivos, tipo_curriculum, this.idiomaSeleccionado).subscribe(
          response => {
            const respuesta = response.cv_solicitud;
            this.cv_Service.agregarMensaje(nuevaSolicitud, respuesta, txtconvocatoriaInput.value, esditable, id);
            this.historial = this.cv_Service.obtenerHistorial();

            setTimeout(() => {
              (document.getElementById('promptChat') as HTMLTextAreaElement).value = ''; // 🔥 Borra el campo
              (document.getElementById('convocatoriaInput') as HTMLTextAreaElement).value = ''; // 🔥 Borra el campo
              this.minimizarPopup()
              }, 100);

            document.body.style.cursor = "auto";
          }
        )
      }
    }
  }

  enEdicion: boolean = false;
  activarEdicion(esedicion: boolean) {
    if (esedicion) {
      this.enEdicion = true;
    }
  }

  guardarEdicion(id: number, esditable: boolean, nuevaSolicitud: string) {
    this.enEdicion = false;
    this.editarSolicitud(id, esditable, nuevaSolicitud)
  }

  cancelarEdicion() {
    this.enEdicion = false;
  }
 
  @ViewChildren('markdownContainer') markdownContainer!: QueryList<ElementRef>;

  imprimirPDF(indice: number): void {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const marginX = 20;
    const margin = 40;

    const pageWidth = pdf.internal.pageSize.getWidth() - 2 * marginX;
    const pageHeight = pdf.internal.pageSize.getHeight() - 2 * margin;
    let currentY = margin + 40;
    const lineHeightBase = 10*1.50;
    const defaultFontSize = 10;
    pdf.setFontSize(defaultFontSize);
    pdf.setTextColor(0, 0, 0);

    const container = this.markdownContainer.toArray()[indice];
    const element: HTMLElement = container.nativeElement;

    const margenIzquierdoAdicional = 20;

    // Función auxiliar para obtener el estilo de fuente correcto (no se usa directamente en drawText, sino para procesar inline)
    const getFontStyle = (node: ChildNode | Element): { fontStyle: 'normal' | 'italic', fontWeight: 'normal' | 'bold' } => {
      let fontStyle: 'normal' | 'italic' = 'normal';
      let fontWeight: 'normal' | 'bold' = 'normal';

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const computedStyle = window.getComputedStyle(el);

        if (computedStyle.fontStyle === 'italic' || el.tagName.toLowerCase() === 'em' || el.tagName.toLowerCase() === 'i') {
          fontStyle = 'italic';
        }
        if (computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight, 10) >= 700 || el.tagName.toLowerCase() === 'strong' || el.tagName.toLowerCase() === 'b') {
          fontWeight = 'bold';
        }
      }
      return { fontStyle, fontWeight };
    };

    // Función para dibujar texto de una sola línea (usada por processInlineContent)
    const drawText = (text: string, x: number, y: number, style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', fontSize: number = defaultFontSize): void => {
      pdf.setFont('helvetica', style);
      pdf.setFontSize(fontSize);
      pdf.text(text, x, y);
    };

    // Ahora recibe el estilo explícitamente y lo aplica antes de dibujar.
    const drawTextAndAdvance = (text: string, x: number, y: number, style: 'normal' | 'bold' | 'italic' | 'bolditalic', fontSize: number): number => {
      pdf.setFont('helvetica', style); // <--- Asegurarse de aplicar el estilo aquí
      pdf.setFontSize(fontSize);

      const splitText = pdf.splitTextToSize(text, pageWidth - x);
      splitText.forEach((line: string) => {
        if (currentY + lineHeightBase > pageHeight) {
          pdf.addPage();
          currentY = margin;
          // Si hay un salto de página, asegúrate de que el texto comience en la posición X correcta
          // para el nuevo margen de la página.
          pdf.setFont('helvetica', style); // Volver a aplicar el estilo si hay cambio de página
          pdf.setFontSize(fontSize); // Volver a aplicar el tamaño de fuente si hay cambio de página
        }
        pdf.text(line, x, currentY);
        currentY += lineHeightBase;
      });
      return currentY;
    };

    // Función recursiva para procesar los nodos del DOM
    const processNode = (node: Element | ChildNode, currentX: number = margin + margenIzquierdoAdicional, currentLevel: number = 0): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = (node.textContent || '').trim();
        // Nodos de texto directamente bajo el body o div principal deben ser tratados como párrafos si tienen contenido
        if (textContent.length > 0 && node.parentNode && !['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'strong', 'em', 'b', 'i'].includes((node.parentNode as HTMLElement).tagName.toLowerCase())) {
          //currentY += lineHeightBase * 0.5;
          //currentY += lineHeightBase;
          processInlineContent(node.parentNode as HTMLElement, currentX);
          //currentY += lineHeightBase * 0.2;
          //currentY += lineHeightBase;
        } else if (textContent.length > 0 && node.parentNode && ['strong', 'em', 'b', 'i'].includes((node.parentNode as HTMLElement).tagName.toLowerCase())) {
          // Estos nodos de texto son manejados por processInlineContent cuando se procesa su padre.
          // No necesitamos procesarlos aquí de forma independiente.
        }
        // Si el nodo de texto es hijo de un P, LI, etc., processInlineContent lo manejará.
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        switch (tag) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            const level = parseInt(tag.substring(1), 10);
            const headingFontSize = 18 - (level * 2);
            //currentY += lineHeightBase * 0.8; // Espacio antes del encabezado
            //currentY += lineHeightBase; // Espacio antes del encabezado
            // Usar drawTextAndAdvance para que el estilo 'bold' se aplique correctamente
            currentY = drawTextAndAdvance(el.textContent || '', currentX, currentY, 'bold', headingFontSize);
            //currentY += lineHeightBase * 0.5; // Espacio después del encabezado
            //currentY += lineHeightBase; // Espacio después del encabezado
            break;

          case 'p':
            if (el.textContent && el.textContent.trim().length > 0) {
              //currentY += lineHeightBase * 0.5; // Espacio antes del párrafo
              //currentY += lineHeightBase; // Espacio antes del párrafo
              processInlineContent(el, currentX); // Procesa el contenido del párrafo (maneja estilos inline)
              //currentY += lineHeightBase * 0.2; // Espacio después del párrafo
              //currentY += lineHeightBase; // Espacio después del párrafo
            }
            break;

          case 'ul':
          case 'ol':
            //currentY += lineHeightBase * 0.5; // Espacio antes de la lista
            //currentY += lineHeightBase; // Espacio antes de la lista
            const liElements = Array.from(el.children).filter(child => child.tagName.toLowerCase() === 'li');

            liElements.forEach((listItemNode: Element, index: number) => {
              if (listItemNode.tagName.toLowerCase() === 'li') {
                //const marker = tag === 'ul' ? '• ' : `${(currentLevel === 0 ? index + 1 : index + 1)}. `; // `index + 1` para numeración correcta
                let marker : string;
                //marker = tag === 'ul' ? '- ' : `${(currentLevel === 0 ? index + 1 : index + 1)}. `; // `index + 1` para numeración correcta

                if (tag === 'ul') { // Si es una lista desordenada (ul)
                  if (currentLevel === 0) {
                    marker = '• '; // Primer nivel: guion
                  } else if (currentLevel === 1) {
                    marker = '• '; // Segundo nivel: círculo vacío
                  } else {
                    marker = '- '; // Tercer nivel y subsiguientes: círculo relleno
                  }
                } else { // Si es una lista ordenada (ol)
                  marker = `${(currentLevel === 0 ? index + 1 : index + 1)}. `; // Numeración normal (1., 2., etc.)
                }

                const markerWidth = pdf.getTextWidth(marker);

                // Asegurar que haya espacio para el marcador y el contenido
                if (currentY + lineHeightBase > pageHeight) {
                  pdf.addPage();
                  currentY = margin;
                  pdf.setFontSize(defaultFontSize); // Resetear fuente si hay salto de página
                  pdf.setFont('helvetica', 'normal');
                }

                // Dibujar el marcador
                //drawText(marker, currentX + (currentLevel * 10) + 10, currentY, 'normal', defaultFontSize);
                drawText(marker, currentX + (currentLevel * 10), currentY, 'normal', defaultFontSize);

                // Procesar el contenido del <li>, que puede contener texto normal, strong, em, o incluso otra ul/ol
                //const initialXForContent = currentX + (currentLevel * 10) + 10 + markerWidth;
                const initialXForContent = currentX + (currentLevel * 10) + markerWidth;
                processInlineContent(listItemNode, initialXForContent, currentLevel + 1);

                // currentY es avanzado por processInlineContent, no es necesario aquí.
                // Si processInlineContent no agregó nada, forzamos el avance de línea
                if (currentY + lineHeightBase > pageHeight) { // check if content fits or needs a new page
                    // This case is already handled inside processInlineContent and drawText
                } else {
                    // Si el li solo tiene un elemento de texto corto, y processInlineContent no movió currentY,
                    // Aseguramos que la siguiente lista comience en una nueva línea
                    // Esta lógica es compleja y se maneja mejor en flushLine para asegurar el avance.
                    // Para evitar doble avance, no agregaremos un avance extra aquí.
                }
              }
            });
            //currentY += lineHeightBase * 0.5; // Espacio después de la lista
            //currentY += lineHeightBase; // Espacio después de la lista
            break;

          default:
            // Para otros elementos que puedan contener texto o más elementos,
            // procesar sus hijos recursivamente.
            // Si el elemento contiene texto directo que debe ser tratado como un párrafo.
            if (el.textContent && el.textContent.trim().length > 0 && !['strong', 'em', 'b', 'i'].includes(tag)) {
              // Esto intenta procesar el texto dentro de un span o div sin una etiqueta p.
              // Para el markdown dado, es probable que no sea necesario,
              // ya que la mayoría del texto está en p, li o h.
              processInlineContent(el, currentX, currentLevel);
            } else {
              el.childNodes.forEach(child => processNode(child, currentX, currentLevel));
            }
            break;
        }
      }
    };

    // Se ajustó el manejo de currentY para asegurar el avance después de cada "línea lógica" dibujada.
    const processInlineContent = (parentNode: Element | ChildNode, startX: number, currentLevel: number = 0): void => {
      let currentLineSegments: { text: string, style: 'normal' | 'bold' | 'italic' | 'bolditalic' }[] = [];
      let currentLineX = startX;
      let lineWasActuallyDrawn = false; // Flag para saber si se dibujó algo en la línea actual

      const flushLine = () => {
        if (currentLineSegments.length === 0) return;

        lineWasActuallyDrawn = false;
        // Componer la línea con los estilos aplicados
        for (const segment of currentLineSegments) {
          pdf.setFont('helvetica', segment.style); // Aplicar estilo para el segmento
          pdf.setFontSize(defaultFontSize);

          // Calcular el ancho real del texto del segmento con el estilo actual
          const textWidth = pdf.getTextWidth(segment.text);
          const remainingWidth = pageWidth - currentLineX;

          if (textWidth > remainingWidth) {
            // El segmento es demasiado largo para el resto de la línea
            const splitSegment = pdf.splitTextToSize(segment.text, remainingWidth);

            if (splitSegment.length > 0 && splitSegment[0].length > 0) {
              drawText(splitSegment[0], currentLineX, currentY, segment.style, defaultFontSize);
              lineWasActuallyDrawn = true;
            }

            let remainingText = segment.text.substring(splitSegment[0].length);

            // Mover a la siguiente línea para el resto del segmento o los siguientes segmentos
            currentY += lineHeightBase; // Avanzar Y para la nueva línea
            currentLineX = startX; // Resetear X para la nueva línea

            // Si el resto del segmento todavía es demasiado largo, dividirlo y dibujar en las siguientes líneas
            if (remainingText.length > 0) {
              const moreSplits = pdf.splitTextToSize(remainingText, pageWidth - startX);
              for (const linePart of moreSplits) {
                if (currentY + lineHeightBase > pageHeight) {
                  pdf.addPage();
                  currentY = margin;
                  pdf.setFont('helvetica', segment.style); // Volver a aplicar estilo en nueva página
                  pdf.setFontSize(defaultFontSize);
                }
                drawText(linePart, startX, currentY, segment.style, defaultFontSize);
                currentY += lineHeightBase;
                lineWasActuallyDrawn = true;
              }
            }
          } else {
            // El segmento cabe completamente en la línea actual
            drawText(segment.text, currentLineX, currentY, segment.style, defaultFontSize);
            currentLineX += textWidth;
            lineWasActuallyDrawn = true;
          }
        }
        currentLineSegments = []; // Limpiar para la siguiente línea

        // Solo avanzamos currentY si realmente se dibujó algo en la línea actual.
        // Esto previene dobles saltos de línea cuando no hay contenido significativo.
        if (lineWasActuallyDrawn && currentLineX === startX) { // Si se terminó de dibujar una línea que inició en startX
            // Esto es complicado. Si un segmento ya avanzó currentY al desbordarse, no queremos doble avance.
            // Si currentY ya fue avanzado por un desbordamiento, no lo volvemos a avanzar aquí.
            // La lógica de avance de línea es más segura dentro del bucle de segmentos.
            // currentY ya se avanzó por los segmentos.
        } else if (lineWasActuallyDrawn) { // Si hubo contenido pero no desbordó a la siguiente línea, forzamos avance
             currentY += lineHeightBase;
        }

        currentLineX = startX; // Reset X para la nueva línea
      };

      // Si el parentNode es un nodo de texto directamente (ej., texto plano sin etiquetas), lo agregamos al buffer
      const nodesToProcess = parentNode.nodeType === Node.TEXT_NODE ? [parentNode] : Array.from(parentNode.childNodes);

      nodesToProcess.forEach((child: ChildNode) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const textContent = (child.textContent || '');
          currentLineSegments.push({ text: textContent, style: 'normal' });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const childTextContent = (el.textContent || '');

          if (tag === 'strong' || tag === 'b') {
            currentLineSegments.push({ text: childTextContent, style: 'bold' });
          } else if (tag === 'em' || tag === 'i') {
            currentLineSegments.push({ text: childTextContent, style: 'italic' });
          } else if (tag === 'br') {
            flushLine(); // Dibujar lo que hay en el buffer antes del salto de línea
            currentLineX = startX; // Reset X para la nueva línea (esto ya lo hace flushLine si avanza Y)
          } else if (tag === 'ul' || tag === 'ol') {
            flushLine(); // Dibujar el contenido previo antes de la lista anidada
            //processNode(el, startX + 10, currentLevel + 1); // Procesar la lista anidada con mayor indentación
            processNode(el, startX, currentLevel + 1); // Procesar la lista anidada con mayor indentación
            currentLineX = startX; // Reset X después de la lista anidada
          } else {
            // Para cualquier otro elemento que no sea inline y que pueda tener texto,
            // flushear lo que se tiene y luego procesar el elemento como un bloque o sus hijos.
            flushLine();
            processNode(el, startX, currentLevel);
            currentLineX = startX; // Reset X después de procesar el bloque
          }
        }
      });
      flushLine(); // Asegurarse de dibujar cualquier contenido restante en el buffer al final del parentNode
    };

    // Iniciar el procesamiento desde el contenedor principal
    element.childNodes.forEach((child: ChildNode) => processNode(child, margin + margenIzquierdoAdicional));

    pdf.save('documento.pdf');
  }





  async copiarTextoProcesado(indice: number): Promise<void> {
    document.body.style.cursor = 'wait';

    try {
      if (this.markdownContainer && this.markdownContainer.length > indice) {
        const container = this.markdownContainer.toArray()[indice];
        const element: HTMLElement = container.nativeElement;

        // Clonar el elemento para evitar modificar el original
        const clonedElement = element.cloneNode(true) as HTMLElement;

        // Convertir HTML a texto plano
        const htmlToPlainText = (html: HTMLElement): string => {
          let text = '';
          html.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent?.trim() + ' ';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              switch (el.tagName.toLowerCase()) {
                case 'br':
                  text += '\n';
                  break;
                case 'p':
                  text += el.textContent?.trim() + '\n\n';
                  break;
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                  const hLevel = parseInt(el.tagName.slice(1));
                  text += '#'.repeat(hLevel) + ' ' + el.textContent?.trim() + '\n\n';
                  break;
                case 'strong':
                case 'b':
                  text += `*${el.textContent?.trim()}* `;
                  break;
                case 'em':
                case 'i':
                  text += `_${el.textContent?.trim()}_ `;
                  break;
                case 'ul':
                case 'ol':
                  const prefix = el.tagName.toLowerCase() === 'ul' ? '* ' : '1. ';
                  el.querySelectorAll('li').forEach(li => {
                    text += prefix + li.textContent?.trim() + '\n';
                  });
                  text += '\n';
                  break;
                case 'div':
                  text += el.textContent?.trim() + '\n\n';
                  break;
                default:
                  text += el.textContent?.trim() + ' ';
              }
            }
          });
          return text.trim();
        };

        const textoProcesado = htmlToPlainText(clonedElement);

        // Verificar si la API está disponible
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(textoProcesado);
          console.log('Texto copiado con Clipboard API.');
        } else {
          // Alternativa con textarea (compatibilidad antigua)
          const tempInput = document.createElement('textarea');
          tempInput.value = textoProcesado;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          console.log('Texto copiado con método alternativo.');
        }
      } else {
        console.warn('No se encontró el contenedor de Markdown en el índice proporcionado.');
      }
    } catch (err) {
      console.error('Error al copiar el texto:', err);
    } finally {
      document.body.style.cursor = 'auto';
    }
  }

  validarConvocatoria(convocatoriaTexto: string): boolean {
    this.errores = []; // 🔥 Reiniciar errores antes de validar

    //const convocatoriaTexto = (document.getElementById("convocatoriaInput") as HTMLTextAreaElement)?.value.trim();

    // 📌 Verificar que no esté vacío
    if (!convocatoriaTexto) {
      this.errores.push("La convocatoria no puede estar vacía.");
    }

    // 📌 Verificar longitud mínima razonable (Ejemplo: 30 caracteres)
    if (convocatoriaTexto.length < 30) {
      this.errores.push("El texto de la convocatoria es muy corto. Debe tener al menos 30 caracteres.");
    }

    // 📌 Verificar que el texto incluya palabras clave relacionadas con empleo
    //const palabrasClave = ["puesto", "experiencia", "requisitos", "habilidades", "perfil", "vacante"];
    const palabrasClave = [
      "puesto", "cargo", "experiencia", "requisitos", "habilidades", "perfil", "vacante", "contratación", "postulación", "empleo",
      "trabajo", "responsabilidades", "funciones", "cualificaciones", "competencias", "capacidades", "remuneración", "beneficios",
      "horario", "turno", "jornada", "empresa", "ubicación", "teletrabajo", "presencial", "reclutamiento", "selección",
      "entrevista", "evaluación", "oportunidad", "aspirante", "candidato", "plazo", "documentación", "formación",
      
      // Equivalentes en inglés
      "position", "role", "experience", "requirements", "skills", "profile", "vacancy", "hiring", "application", "job",
      "work", "responsibilities", "duties", "qualifications", "competencies", "abilities", "salary", "benefits",
      "schedule", "shift", "workday", "company", "location", "remote", "onsite", "recruitment", "selection",
      "interview", "assessment", "opportunity", "applicant", "candidate", "deadline", "documents", "training"
    ];

    const tienePalabraClave = palabrasClave.some(palabra => convocatoriaTexto.toLowerCase().includes(palabra));
    
    if (!tienePalabraClave) {
      this.errores.push("El texto debe mencionar términos clave relacionados con el empleo (ejemplo: 'puesto', 'requisitos').");
    }

    return this.errores.length === 0; // ✅ Retorna `true` si no hay errores
  }

}

