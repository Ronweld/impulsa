import { environment } from '../../../environments/environment';
import { Component, EventEmitter, ChangeDetectionStrategy, Output, Input, ChangeDetectorRef  } from '@angular/core';
import { FormsModule } from '@angular/forms'; // ✅ Importa FormsModule en el standalone
import { CommonModule } from '@angular/common'; // 🔥 Importa CommonModule
import { MarkdownModule  } from 'ngx-markdown';
import jsPDF from 'jspdf';
import { marked } from 'marked';
import { AuthService } from '../services/auth.service';
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 
import { FileService } from '../services/file.service'; // 🔥 Importamos el servicio HTTP

@Component({
  standalone: true,
  selector: 'app-oportunidadesfortalezas',
  templateUrl: './oportunidadesfortalezas.component.html',
  styleUrls: ['./oportunidadesfortalezas.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // 🔥 Optimización
  imports: [CommonModule, MarkdownModule, FormsModule ] // 🔥 Agregar CommonModule para habilitar el pipe `async`
})
export class OportunidadesFortalezas {
  //NOMBRE_ARCHIVO = '_oportunidadesfortalezas.pdf';
  NOMBRE_ARCHIVO = environment.ARCHIVO_OPORTUNIDADES_FORTALEZAS;
  mostrarFormulario: boolean = false;
  isLoggedIn: boolean = false;
  idiomaSeleccionado: string = '';
  
  cv = {
    tipo_data: 'FORTALEZAS',
    usuario:'',
    actividades: '',
    adjuntarOF: false
  };
  @Output() historialActualizadoof = new EventEmitter<{ id: number; solicitud: string; respuesta: string, eseditable: boolean }[]>(); // 🔥 Emite el historial
  @Input() historial: { id: number; solicitud: string; respuesta: string, eseditable: boolean }[] = [];

  errores: string[] = [];

  constructor(
    private cv_Service: CV_Service,
    private fileService: FileService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef // 🔥 Necesario para OnPush
  ) {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }
  
  ngOnInit(): void {
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente
    this.cargarDatosExistentes(); // 🔥 Intentar precargar datos
  }

  /**
   * Consulta la API para ver si el usuario ya tiene un CV registrado
   */
  private cargarDatosExistentes(): void {
    document.body.style.cursor = "wait";
    const nombreUsuario = this.usuario();
    
    // Asumimos que añadiste 'obtenerPrimerCV' a tu cv_Service
    this.cv_Service.consultarFortalezasHabilidades(nombreUsuario).subscribe({
      next: (data) => {
        if (data) {
          // Mapeamos los datos recibidos al objeto local
          // Usamos spread para mantener 'tipo_data'
          this.cv = { ...this.cv, ...data };
          
          // Importante: Django envía nulls, Angular prefiere strings vacíos para el formulario
          // Extraemos las llaves asegurando que pertenecen al tipo de 'cv'
          (Object.keys(this.cv) as (keyof typeof this.cv)[]).forEach(key => {
            if (this.cv[key] === null) {
              // Usamos 'any' aquí solo para la asignación si TS sigue protestando
              (this.cv as any)[key] = '';
            }
          });

          this.cdr.markForCheck(); // 🔥 Avisar a OnPush que hay nuevos datos
          console.log("Datos precargados con éxito");
          document.body.style.cursor = "auto";
        }
      },
      error: (err) => {
        console.log("No se encontraron datos previos o error en servidor", err);
        document.body.style.cursor = "auto";
      }
    });
    
  }
  
  private usuario(): string{
    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    return this.cv_Service.getIdentifier(USR_NAME);

  }

  generateoportunidadesfortalezas(): void {
    // 🔥 Cambiar cursor a "espera" antes de la petición
    document.body.style.cursor = "wait";
    console.log(`[${this.constructor.name}]`,'generateoportunidadesfortalezas inicio');
    if (this.validarOportunidadesFortalezas()) {
      const txtare_oportunidades_fortalezas = document.getElementById('txtare_oportunidades_fortalezas') as HTMLTextAreaElement;
      //let oportunidades_fortalezas = 'Op'+`${txtare_oportunidades_fortalezas}`
      let id = this.cv_Service.agregarMensaje("Generar Oportunidades y Fortalezas ", "⌛ Cargando respuesta...", txtare_oportunidades_fortalezas.value, false);
      this.historial = this.cv_Service.obtenerHistorial();

    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
    
    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    const identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);

      this.fileService.generate_oportunidades_fortalezas(txtare_oportunidades_fortalezas.value, 
                                                      identificador_usuario,
                                                      this.idiomaSeleccionado).subscribe(
        response => {
          const respuesta = response.oportunidades_fortalezas

          this.cv_Service.agregarMensaje("Generar Oportunidades y Fortalezas ", respuesta, txtare_oportunidades_fortalezas.value, false, id);
          this.historial = this.cv_Service.obtenerHistorial();
          // 🔥 Desplazar automáticamente al último mensaje agregado
          setTimeout(() => {
            // 🔥 Emitimos el historial actualizado hacia `AppComponent`
            this.historialActualizadoof.emit(this.historial);
            const historialDiv = document.querySelector('.historial');
            if (historialDiv) {
              historialDiv.scrollTop = historialDiv.scrollHeight;
            }

            (document.querySelector('#promptChat') as HTMLTextAreaElement).value = ''; // 🔥 Borra el campo
            (document.querySelector('#convocatoriaInput') as HTMLTextAreaElement).value = ''; // 🔥 Borra el campo

            if (this.cv.adjuntarOF){
              this.imprimirPDF(respuesta);
            }

            // 🔥 Restaurar el cursor a "auto" después de recibir la respuesta
            document.body.style.cursor = "auto";
            console.log(`[${this.constructor.name}]`,'generateoportunidadesfortalezas fin');
            }, 100);
          },
          error => {console.error('❌ Error al generar oportunidades y fortalezas:', error);

          // 🔥 Restaurar el cursor a "auto" en caso de error
          document.body.style.cursor = "auto";
          }
        );
        //this.closeOportunidadesFortalezas();
      } else {
        console.error("Errores en la generación de oportunidades y fortalezas.");
      }
  }

  //@ViewChildren('markdownContainer') markdownContainer!: QueryList<ElementRef>;

  //imprimirPDF(indice: number): void {
async imprimirPDF(markdownTexto: string): Promise<void> {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const margin = 40;

    const pageWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
    const pageHeight = pdf.internal.pageSize.getHeight() - 2 * margin;
    let currentY = margin;
    const lineHeightBase = 12 * 1.25; // Línea base

    //const container = this.markdownContainer.toArray()[indice];
    //const element: HTMLElement = container.nativeElement;
    const htmlConvertido = await marked.parse(markdownTexto);
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlConvertido, 'text/html');
    const content = doc.body;
    const element: HTMLElement = content;
      
    const margenIzquierdoAdicional = 20; // Define el margen izquierdo adicional

    function drawText(text: string, x: number, y: number, style: string = 'normal') {
      pdf.setFont('helvetica', style);
      const splitText = pdf.splitTextToSize(text, pageWidth - x);
      splitText.forEach((line: string) => {
        if (currentY + lineHeightBase > pageHeight) {
          pdf.addPage('a4', 'p');
          currentY = margin;
        }
        pdf.text(line, x, currentY);
        currentY += lineHeightBase;
      });
    }

    function processNode(node: Element | ChildNode, currentX: number = margin+ margenIzquierdoAdicional) {
      if (node.nodeType === Node.TEXT_NODE) {
        drawText(node.textContent || '', currentX, currentY);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const style = window.getComputedStyle(el);
        const fontWeight = style.fontWeight;
        const fontStyle = style.fontStyle;

        if (tag.startsWith('h')) {
          const level = parseInt(tag.substring(1), 10);
          pdf.setFontSize(16 - (level * 2));
          drawText(el.textContent || '', currentX, currentY, 'bold');
          pdf.setFontSize(12); // Resetear tamaño de fuente
          currentY += lineHeightBase * 0.4;
        } else if (tag === 'strong' || fontWeight === 'bold') {
          drawText(el.textContent || '', currentX, currentY, 'bold');
        } else if (tag === 'em' || tag === 'i' || fontStyle === 'italic') {
          drawText(el.textContent || '', currentX, currentY, 'italic');
        } else if (tag === 'ul' || tag === 'ol') {
          const listItems = Array.from(el.children).filter(child => child.tagName.toLowerCase() === 'li');
          listItems.forEach(listItem => {
            const marker = tag === 'ul' ? '• ' : (listItems.indexOf(listItem) + 1) + '. '; // Añadido espacio
            drawText(marker + (listItem.textContent || ''), currentX + 10, currentY);
          });
          currentY += lineHeightBase * 0.1;
        } else if (tag === 'li') {
          // Los elementos li se procesan dentro de ul/ol, sus hijos aquí
          el.childNodes.forEach(itemChild => processNode(itemChild, currentX + 10));
        }
        else if (tag === 'p') {
          drawText(el.textContent || '', currentX, currentY);
          currentY += lineHeightBase * 0.2;
        } else {
          // Procesar nodos hijo recursivamente
          el.childNodes.forEach(child => processNode(child, currentX));
        }
      }
    }

    // Iniciar el procesamiento desde el contenedor principal PASANDO EL MARGEN INICIAL
    element.childNodes.forEach((child: ChildNode) => processNode(child, margin + margenIzquierdoAdicional));

    //pdf.save('_oportunidadesfortalezas.pdf');

    const pdfBlob = pdf.output('blob');
    let pdfFile: File | null= new File([pdfBlob], this.NOMBRE_ARCHIVO, { type: "application/pdf" });
    const datosCV = this.cv;
    datosCV.usuario = this.usuario();
    //this.cv_Service.pdfMiPrimerCVSource(pdfFile);
    this.cv_Service.pdfMiPrimerCVSource(pdfFile, datosCV);

    pdfFile = null;

  }

  closeOportunidadesFortalezas() {
    this.cv_Service.closeOportunidadesFortalezas(); // ✅ Cierra la pantalla
    this.mostrarFormulario = false; // 🔥 Oculta el formulario y el overlay
    document.body.style.cursor = "auto";
  }

  validarOportunidadesFortalezas(): boolean {
    this.errores = []; // 🔥 Reiniciar errores antes de validar

    const oport_forta_Texto = (document.getElementById("txtare_oportunidades_fortalezas") as HTMLTextAreaElement)?.value.trim();

    // 📌 Verificar que no esté vacío
    if (!oport_forta_Texto) {
      this.errores.push("No se ha ingresado algunas actividades, el campo está vacío.");
    }

    // 📌 Verificar longitud mínima razonable (Ejemplo: 30 caracteres)
    if (oport_forta_Texto.length < 30) {
      this.errores.push("El texto ingresado es muy corto. Debe tener al menos 30 caracteres.");
    }

    return this.errores.length === 0; // ✅ Retorna `true` si no hay errores

  }

  validarEntradaNumerica(event: KeyboardEvent): void {
    const teclaPresionada = event.key;
    
    // 📌 Si la tecla no es un número, evita la entrada
    if (!/^\d$/.test(teclaPresionada)) {
      event.preventDefault();
    }
  }

}
