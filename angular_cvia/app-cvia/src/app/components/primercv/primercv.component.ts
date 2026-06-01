import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms'; // ✅ Importa FormsModule en el standalone
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common'; // 🔥 Importa CommonModule
import { MarkdownModule  } from 'ngx-markdown';
import jsPDF from 'jspdf';

@Component({
  standalone: true,
  selector: 'app-primercv',
  templateUrl: './primercv.component.html',
  styleUrls: ['./primercv.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // 🔥 Optimización
  imports: [CommonModule, MarkdownModule, FormsModule ] // 🔥 Agregar CommonModule para habilitar el pipe `async`
})
export class PrimerCV {
  //NOMBRE_ARCHIVO = '_mis_datospersonales.pdf';
  NOMBRE_ARCHIVO = environment.ARCHIVO_DATOS_PERSONALES;
  mostrarFormulario: boolean = false;
  isLoggedIn: boolean = false;
  
  cv = {
    tipo_data: 'PRIMERCV',
    usuario: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombres: '',
    email: '',
    celular: '',
    fecha_nacimiento: '',
    objetivo: '',
    profesion: '',
    experiencia: '',
    cursos: '',
    habilidades: ''
  };

  errores: string[] = [];

  constructor(
    private cv_Service: CV_Service,
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
    this.cv_Service.consultarPrimerCV(nombreUsuario).subscribe({
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

  guardarCV(): void {
    this.errores = []; // 🔥 Reiniciar errores antes de validar
    if (this.validarFormulario()) {
      console.log("Guardando CV con datos:", this.cv);
      this.imprimir();
      // Aquí puedes llamar a la lógica para enviar los datos o generar el PDF
    } else {
      console.error("Formulario inválido. Revisa los campos.");
      alert("Por favor, completa correctamente todos los campos obligatorios.");
    }
  }

  imprimir(): void {
    const datosCV = this.cv;
    
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Mis datos personales", 60, 20);

    let yOffset = 40; // 📌 Posición inicial
    const maxWidth = 160; // 📌 Ancho máximo del texto dentro del PDF
    const pageHeight = doc.internal.pageSize.height; // 📌 Altura de la página

    Object.entries(datosCV).forEach(([key, value]) => {
      doc.setFontSize(12);

      // 📌 Espaciado controlado: Etiqueta y valor en líneas separadas
      doc.text(`${key.replace("_", " ")}:`, 20, yOffset);
      yOffset += 4; // 📌 Espacio entre etiqueta y contenido

      // 📌 Ajustamos contenido de los campos textarea para que no se superpongan
      const textLines = doc.splitTextToSize(value, maxWidth);
      
      // 📌 Comprobar si el texto excede la página y agregar una nueva si es necesario
      if (yOffset + textLines.length * 5 > pageHeight - 20) {
        doc.addPage(); // 🔥 Añadir una nueva página antes de seguir imprimiendo
        yOffset = 30; // 📌 Resetear posición en la nueva hoja
      }

      doc.text(textLines, 30, yOffset);
      yOffset += 6 + (textLines.length * 5); // 📌 Más espacio si hay varias líneas
    });

    const pdfBlob = doc.output('blob');
    let pdfFile: File | null= new File([pdfBlob], this.NOMBRE_ARCHIVO, { type: "application/pdf" });
    datosCV.usuario = this.usuario();
    this.cv_Service.pdfMiPrimerCVSource(pdfFile, datosCV);
    pdfFile = null;
    this.closePrimerCV();
  }

  closePrimerCV() {
    this.cv_Service.closePrimerCV(); // ✅ Cierra la pantalla
    this.mostrarFormulario = false; // 🔥 Oculta el formulario y el overlay
  }

  validarFormulario(): boolean {
    const { apellido_paterno, apellido_materno, nombres, email, celular, fecha_nacimiento, profesion, objetivo, habilidades, experiencia, cursos } = this.cv;

    const validarLongitud = (valor: string) => valor.trim().length >= 2;

    if (!validarLongitud(apellido_paterno)) this.errores.push("El apellido paterno es errado.");
    if (apellido_materno.trim().length > 0 && !validarLongitud(apellido_materno)) this.errores.push("El apellido materno es errado.");

    if (!validarLongitud(nombres)) this.errores.push("El nombre es errado");

    // 📌 Validación de email (NO permite '..' y sigue el formato estándar)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(?!.*\.\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) this.errores.push("El correo electrónico no es válido.");

    // 📌 Validación de celular (mínimo 9 dígitos)
    const celularRegex = /^[0-9]{9,}$/;
    if (!celularRegex.test(celular)) this.errores.push("El celular debe contener solo números y tener al menos 9 dígitos.");

    const fechaNacimiento = new Date(fecha_nacimiento);
    const edadMinima = 14;
    const edadMaxima = 70;
    const hoy = new Date();
    const edadUsuario = hoy.getFullYear() - fechaNacimiento.getFullYear();
    if (edadUsuario < edadMinima) this.errores.push(`La edad debe de ser mayor de ${edadMinima} años.`);
    if (edadUsuario > edadMaxima) this.errores.push(`La edad debe de ser menor de ${edadMaxima} años.`);

    if (!validarLongitud(profesion)) this.errores.push("La profesión u oficio errada.");
    if (!validarLongitud(objetivo)) this.errores.push("El objetivo laboral errada.");
    if (!validarLongitud(habilidades)) this.errores.push("Las habilidades errada.");
    
    if (experiencia.trim().length > 0 && !validarLongitud(experiencia)) this.errores.push("La experiencia laboral errada.");
    if (cursos.trim().length > 0 && !validarLongitud(cursos)) this.errores.push("Los estudios o cursos errada.");

    return this.errores.length === 0; // ✅ Retorna true si no hay errores
  }

  validarEntradaNumerica(event: KeyboardEvent): void {
    const teclaPresionada = event.key;
    
    // 📌 Si la tecla no es un número, evita la entrada
    if (!/^\d$/.test(teclaPresionada)) {
      event.preventDefault();
    }
  }

}
