import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common'; // 🔹 Asegura que esté importado
import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { FileService } from '../services/file.service'; // 🔥 Importamos el servicio HTTP
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-right-sub-panel',
  templateUrl: './right-extra-panel.component.html',
  styleUrls: ['./right-extra-panel.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})

export class RightExtraPanelComponent {
  mostrarFormulario: boolean = false;

  formularioCurriculum!: FormGroup;

  isLoggedIn: boolean = false;
  
  identificador_usuario: string = "";
  
  isLoading = false;

  readonly opc_tipo_cv: Record<string, string> = {
    'Curriculum cronológico':'Cronológico', 
    'Curriculum funcional':'Funcional', 
    'Curriculum mixto o combinado':'Mixto o combinado'
  };

  objectKeys = Object.keys;

  constructor(private fileService: FileService, 
      private cv_Service: CV_Service,
      private authService: AuthService,
      private fb: FormBuilder,
  ) {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  } 

  ngOnInit(): void {
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente
    //localStorage.removeItem("elemento.style.display");
    this.inicializaOpciones('idcontenido');
    if (typeof window !== "undefined" && window.localStorage) {
      const USR_NAME = this.isLoggedIn ? environment.USR_NAME : environment.USR_NAME_UK;
      this.identificador_usuario = this.cv_Service.getIdentifier(USR_NAME);
    }

    let TipoCurriculum = localStorage.getItem("TipoCurriculum")!;
    if (TipoCurriculum===null||TipoCurriculum==='none') {
      TipoCurriculum='';
    }

    this.formularioCurriculum = this.fb.group({
      tipo: [TipoCurriculum] // valor por defecto
    });
  }

  alternarSeleccion(opcion: string) {
      const control = this.formularioCurriculum.get('tipo');
      if (control?.value === opcion) {
        control.setValue(''); // desmarca
      } else {
        control?.setValue(opcion);
      }
      this.cv_Service.setTipoCurriculum(control?.value);

      localStorage.setItem("TipoCurriculum", control?.value);
    }
  
  toggleLista(id: string) {
    /*const elemento = document.getElementById(id);
    if (elemento) {
      let display = localStorage.getItem("elemento.style.display")!;
      if (display===null||display==='none') {
        elemento.style.display = elemento.style.display === "none" ? "block" : "none";
        localStorage.setItem("elemento.style.display", elemento.style.display);
      }else{
        elemento.style.display = display;
      }
    }*/

    const elemento = document.getElementById(id);
    if (elemento) {
      //elemento.style.display = elemento.style.display === "none" ? "block" : "none";
      elemento.style.display = 
        elemento.style.display === "none" || elemento.style.display === "" 
          ? "block" 
          : "none";
      localStorage.setItem("elemento.style.display", elemento.style.display);
    }
  }

  inicializaOpciones(id: string) {
    const elemento = document.getElementById(id);
    if (elemento) {
      let display = localStorage.getItem("elemento.style.display")!;
      if (display==='block') {
        //elemento.style.display = elemento.style.display === "none" ? "block" : "none";
        //localStorage.setItem("elemento.style.display", elemento.style.display);
        elemento.style.display = display;
      }
    }
  }

}