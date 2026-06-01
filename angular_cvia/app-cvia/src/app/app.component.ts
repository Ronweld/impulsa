import { Component, HostListener, ChangeDetectorRef  } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { LeftPanelComponent } from './components/left-panel/left-panel.component';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { RightExtraPanelComponent } from './components/right-extra-panel/right-extra-panel.component';
import { LoginComponent } from './components/login/login.component';
import { PrimerCV } from './components/primercv/primercv.component';
import { OportunidadesFortalezas } from './components/oportunidadesfortalezas/oportunidadesfortalezas.component';
import { AyudaPrompt } from './components/ayudaprompt/ayudaprompt.component';
import { CartaPresentacion } from './components/cartapresentacion/cartapresentacion.component';
import { FileModel } from './components/models/file.model';
import { AuthService } from './components/services/auth.service';
import { MarkdownModule } from 'ngx-markdown'; // 🔥 Importamos `MarkdownModule`
import { UsuariosComponent } from './components/usuarios/usuario.component';
import { PasswordComponent } from './components/password/password.component';
import { UsuariosBajaComponent } from './components/usuariosbaja/usuariosbaja.component';
import { UsuarioService } from './components/services/usuario.service';
import { CV_Service } from './components/services/cv.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [  LoginComponent, HeaderComponent, LeftPanelComponent, 
          RightPanelComponent, RightExtraPanelComponent, MarkdownModule, UsuariosComponent, 
          PrimerCV, AyudaPrompt, CartaPresentacion, OportunidadesFortalezas, 
          PasswordComponent, UsuariosBajaComponent], 
})

export class AppComponent {
  previewFile: FileModel | null = null;
  historial: { id: number; solicitud: string; respuesta: string, eseditable:boolean }[] = [];
  cartaPresentacion: { tipo_presentacion: string; nombre_empresa: string; nombre_persona: string; convocatoriaInput: string; } | null = null;
  mostrarAyudaPopup: boolean = false; 
  vis_prompt_ayuda: any = null;
  
  selectedFile: any = null;
  title = 'Startup Web';
  isResizing = false;
  lastX: number = 0;
  isLoggedIn: boolean = false; // Indica si el usuario está autenticado
  showLoginComponent = false; 
  showUsuarioAgregarComponent = false; 
  showUsuarioSeleccionarComponent = false; 
  showCambioPasswordComponent = false; 
  showDarBajaComponent = false; 
  showPrimerCVComponent = false; 
  showAyudaPromptComponent: boolean = false; // 🔹 Recibe el estado desde `AppComponent`
  showOportunidadesFortalezasComponent = false; // ✅ Agregar la propiedad
  showCartaPresentacionComponent: boolean = false;
  mostrarFormulario: boolean = false; 

  pdfMiPrimerCV!: File;

  showLeftPanel: boolean = true; // Por defecto, muestra el panel izquierdo
  showRightPanel: boolean = true; // Por defecto, oculta el panel derecho
  isMobile: boolean = false; // Para detectar si estamos en móvil

  showRightSubPanel: boolean = false;

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private cv_Service: CV_Service) {
        
    this.authService.showLogin$.subscribe((visible: any) => {
      this.showLoginComponent = visible;
    });

    this.usuarioService.showUsuario$.subscribe((visible: any) => {
      this.showUsuarioAgregarComponent = visible;
    });
    this.usuarioService.usuarioSeleccionado$.subscribe((visible: any) => {
      this.showUsuarioSeleccionarComponent = visible;
    });

    this.usuarioService.cambioPassword$.subscribe((visible: any) => {
      this.showCambioPasswordComponent = visible;
    });
    
    this.usuarioService.darBajaSeleccionado$.subscribe((visible: any) => {
      this.showDarBajaComponent = visible;
    });

    this.cv_Service.showPrimerCV$.subscribe((visible: any) => {
      this.showPrimerCVComponent = visible;
    });

    this.cv_Service.showAyudaPrompt$.subscribe((visible: any) => {
      this.showAyudaPromptComponent = visible;
    });

    this.cv_Service.showOportunidadesFortalezas$.subscribe((visible: any) => {
      this.showOportunidadesFortalezasComponent = visible;
    });

    this.cv_Service.showCartaPresentacion$.subscribe((visible: any) => {
      this.showCartaPresentacionComponent = visible;
    });

  }

  ngOnInit() {
    this.checkScreenSize(); // Verifica el tamaño de la pantalla al iniciar
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize(); // Vuelve a verificar al cambiar el tamaño de la ventana
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768; // Define tu breakpoint de móvil
    if (!this.isMobile) {
      // Si no es móvil, ambos paneles siempre son visibles
      this.showLeftPanel = true;
      this.showRightPanel = true;
      this.showRightSubPanel = false;
    } else {
      // En móvil, asegura que solo uno esté visible al inicio
      if (!this.showLeftPanel && !this.showRightPanel && !this.showRightSubPanel) {
         this.showLeftPanel = true; // Por defecto, muestra el izquierdo si ambos están ocultos
      }
    }
  }

  togglePanels(panel: 'left' | 'right'|'right-extra') {
    if (this.isMobile) {
      if (panel === 'left') {
        this.showLeftPanel = true;
        this.showRightPanel = false;
        this.showRightSubPanel = false;
      } else {
        if (panel === 'right') {
          this.showLeftPanel = false;
          this.showRightPanel = true;
          this.showRightSubPanel = false;
        } else {
          this.showLeftPanel = false;
          this.showRightPanel = false;
          this.showRightSubPanel = true;
        }
      }
    }
  }

  // Métodos para alternar la visibilidad de los paneles
  showLeft() {
    this.togglePanels('left');
  }

  showRight() {
    this.togglePanels('right');
  }

  showSubRight() {
    this.togglePanels('right-extra');
  }

  // Actualiza el estado de autenticación
  handleLoginSuccess() {
    this.isLoggedIn = true;
    console.log('Inicio de sesión exitoso, el estado de la aplicación ha cambiado.');
  }
  
  updatePreview(file: FileModel): void {
    console.log("Actualizando vista previa con:", file);
    this.previewFile = null; // 🔥 Forzamos la actualización
    setTimeout(() => {
      this.previewFile = file;
      }, 10); // 🔥 Pequeño retraso para permitir el reinicio
  }  

  // Detecta movimiento del mouse
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isResizing) {
      const leftPanel = document.querySelector('.left') as HTMLElement;
      const rightPanel = document.querySelector('.right') as HTMLElement;
      const container = document.querySelector('.left-panel-container') as HTMLElement; // 🔥 Definir correctamente

      if (!leftPanel || !rightPanel || !container) return;

      // Calcula el nuevo ancho del panel izquierdo
      const deltaX = event.clientX - this.lastX;
      const newLeftWidth = leftPanel.offsetWidth + deltaX;

      // Define los límites mínimo y máximo
      const minLeftWidth = 100; // Mínimo ancho del panel izquierdo
      const maxLeftWidth = container.offsetWidth - 200; 

      if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
        leftPanel.style.width = `${newLeftWidth}px`;
        rightPanel.style.width = `${container.offsetWidth - newLeftWidth}px`; // 🔥 Ajustar dinámicamente
      }

      this.lastX = event.clientX;
    }
  }

  // Finaliza el redimensionamiento
  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.isResizing = false;
  }

  // Inicia el redimensionamiento
  initResize(event: MouseEvent): void {
    this.isResizing = true;
    this.lastX = event.clientX;
    event.preventDefault();
  }

  closePreview() {
    this.selectedFile = null;
  }
  
  actualizarHistorial(nuevoHistorial: { id: number; solicitud: string; respuesta: string, eseditable:boolean }[]): void {
    if (nuevoHistorial.length > 0) {
      this.historial = [...nuevoHistorial]; // 🔥 Crear una nueva referencia para forzar la actualización
    }
  }

  actualizarHistorialof(nuevoHistorial: { id: number; solicitud: string; respuesta: string, eseditable:boolean }[]): void {
    this.actualizarHistorial(nuevoHistorial);
    this.closeOportunidadesFortalezas();
  }

  handleAbrirCV(): void {
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
  }

  abrirAyudaPopup(): void {
    this.mostrarAyudaPopup = true;
  }

  cerrarAyudaPopup(): void {
    this.mostrarAyudaPopup = false;
  }

  actualizarPromptAyuda(nuevoPromptAyuda: any): void {
    if (nuevoPromptAyuda.length > 0) {
      this.vis_prompt_ayuda = [...nuevoPromptAyuda]; // 🔥 Crear una nueva referencia para forzar la actualización
    }
  }

  closeLogin() {
    this.authService.closeLogin();
  }

  closeOportunidadesFortalezas(){
    this.cv_Service.closeOportunidadesFortalezas();
  }

  closeCartaPresentacion(){
    this.cv_Service.closeCartaPresentacion();
  }

  toggleRightSubPanel(): void {
    this.showRightSubPanel = !this.showRightSubPanel;
  }

  manejarNuevaCarta(cartaPresentacion: { tipo_presentacion: string; nombre_empresa: string; nombre_persona:string; convocatoriaInput: string } ) {
    console.log('Datos recibidos desde el hijo:', cartaPresentacion.tipo_presentacion);

    // Validamos que el objeto tenga datos (no es un array, así que verificamos propiedades)
    if (cartaPresentacion && cartaPresentacion.tipo_presentacion) {
      // 🔥 Creamos una nueva referencia de objeto para forzar la detección de cambios en OnPush
      this.cartaPresentacion = { ...cartaPresentacion }; 
    }

    // Cerramos el componente hijo
    this.closeCartaPresentacion();
  }

}
