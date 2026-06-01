import { environment } from '../../../environments/environment';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core'; // 1. Importar Output y EventEmitter
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { Subject, takeUntil } from 'rxjs';
import { CV_Service } from '../services/cv.service';
import { AuthService } from '../services/auth.service';
import { OpcionDatosConfiguracion } from '../interfaces/configuraciones.interfaz';

@Component({
  standalone: true,
  selector: 'app-cartapresentacion',
  templateUrl: './cartapresentacion.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MarkdownModule, FormsModule]
})
export class CartaPresentacion implements OnInit, OnDestroy {
  // 2. Definir el Output para emitir el evento al LeftPanel
  @Output() cartaPresentacion = new EventEmitter<{ tipo_presentacion: string, nombre_empresa: string, nombre_persona: string, convocatoriaInput: string }>();

  // Estado de la UI
  mostrarFormulario = false;
  isLoggedIn = false;
  errores: string[] = [];
  
  // Datos del Formulario
  opciones: OpcionDatosConfiguracion[] = [];
  private _seleccionCodigo: string = '';
  tipo_presentacion = ''; // Código del YAML
  convocatoriaInput: string = '';
  nombre_empresa: string = '';
  nombre_persona: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private cv_Service: CV_Service,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarOpciones();
    this.abrirFormulario();
    this.isLogin();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get seleccionCodigo(): string {
    return this._seleccionCodigo;
  }

  set seleccionCodigo(value: string) {
    console.log(`[${this.constructor.name}]`,'seleccionCodigo inicio');
    this._seleccionCodigo = value;
    if (value === 'CON_OFERTA') {
      this.convocatoriaInput = this.cv_Service.getItemCV(environment.REQUERIMIENTO_LABORAL);
    }
    console.log(`[${this.constructor.name}]`,'seleccionCodigo fin');
  }

  private isLogin(): void{
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  } 

  private cargarOpciones(): void {
    console.log(`[${this.constructor.name}]`,'cargarOpciones inicio');
    const url = `${environment.RUTA_ASSETS}${environment.NOMBRE_TEMPLATE_DATOS_CONFIGURACION}`;
    
    this.cv_Service.getOpcionesYaml(url,'opciones_carta')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.opciones = data;
          this.cdr.markForCheck();
          console.log(`[${this.constructor.name}]`,'cargarOpciones fin');
        },
        error: (err) => console.error('Error cargando opciones de carta:', err)
      });
  }

  abrirFormulario(): void {
    this.mostrarFormulario = true;
    this.cdr.markForCheck();
  }

  closeCartaPresentacion(): void {
    this.cv_Service.closeCartaPresentacion();
    this.mostrarFormulario = false;
    this.cdr.markForCheck();
  }

  /**
   * Método actualizado para emitir los datos hacia LeftPanel
   */
  generateCartaPresentacion(): void {
    console.log(`[${this.constructor.name}]`,'generateCartaPresentacion: inicio');

    this.tipo_presentacion = this.seleccionCodigo;
    if (!this.validarCartaPresentacion()) return;

    // Emitimos el objeto con los datos necesarios hacia el componente padre (LeftPanel)
    this.cartaPresentacion.emit({
      tipo_presentacion: this.tipo_presentacion,
      nombre_empresa: this.nombre_empresa,
      nombre_persona: this.nombre_persona,
      convocatoriaInput: this.convocatoriaInput
    });

    console.log('Datos enviados a LeftPanel para:', this.getIdentificador());
    
    // Simulación de respuesta o cierre tras envío exitoso
    setTimeout(() => {
      this.closeCartaPresentacion();     
      if (this._seleccionCodigo === 'CON_OFERTA') {
        this.cv_Service.setItemCV(environment.REQUERIMIENTO_LABORAL, this.convocatoriaInput);
      }
        console.log(`[${this.constructor.name}]`,'generateCartaPresentacion: fin');
      }, 100);
  }

  private getIdentificador(): string {
    const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
    return this.cv_Service.getIdentifier(USR_NAME);
  }

  validarCartaPresentacion(): boolean {
    console.log(`[${this.constructor.name}]`,'validarCartaPresentacion inicio');
    this.errores = [];

    if (!this.getIdentificador()) {
      this.errores.push("No existe ningún usuario registrado.");
    }

    if (!this.tipo_presentacion) {
      this.errores.push("No se ha seleccionado el tipo de presentación.");
    }

    // 1. Validar que se haya seleccionado un tipo
    if (!this.seleccionCodigo) {
      this.errores.push("Debe seleccionar un tipo de presentación.");
      this.cdr.markForCheck();
      return false;
    }

    // 2. Validación condicional por tipo
    if (this.seleccionCodigo === 'PRIMER_EMPLEO' || this.seleccionCodigo === 'SIN_OFERTA') {
      // Validar Nombre de Empresa (Obligatorio)
      if (!this.nombre_empresa?.trim()) {
        this.errores.push("El nombre de la empresa es obligatorio para este tipo de carta.");
      }
      // Nota: nombre_persona es opcional, no se valida presencia
    } 
    
    else if (this.seleccionCodigo === 'CON_OFERTA') {
      // Validar Convocatoria (Obligatorio)
      const textoConvocatoria = this.convocatoriaInput?.trim() || '';
      if (!textoConvocatoria) {
        this.errores.push("El texto de la convocatoria es obligatorio.");
      } else if (textoConvocatoria.length < 30) {
        this.errores.push("La convocatoria debe tener al menos 30 caracteres para un mejor resultado.");
      }
    }

    this.cdr.markForCheck();
    console.log(`[${this.constructor.name}]`,'validarCartaPresentacion fin');
    return this.errores.length === 0;
  }
}