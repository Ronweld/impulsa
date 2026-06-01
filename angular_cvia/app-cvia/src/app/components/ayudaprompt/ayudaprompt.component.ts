import { Component, Input } from '@angular/core';
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 

@Component({
  selector: 'app-ayudaprompt',
  templateUrl: './ayudaprompt.component.html',
  styleUrls: ['./ayudaprompt.component.css']
})
export class AyudaPrompt {
  @Input() vis_prompt_ayuda: any;
  mostrarFormulario: boolean = false;

  constructor(
    private cv_Service: CV_Service) {}
  
  ngOnInit(): void {
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente
  }
  
  cerrarAyudaPopup(): void {
    this.cv_Service.closeAyudaPrompt() ; // ✅ Cierra la pantalla
    this.mostrarFormulario = false; // 🔥 Oculta el formulario y el overlay
  }
  
  toggleLista(id: string) {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.style.display = elemento.style.display === "none" ? "block" : "none";
    }
  }

  insertarPrompt(id: string) {
    
    const elemento = document.getElementById(id);
    const textarea = document.getElementById("promptChat") as HTMLTextAreaElement;

    //if (elemento && textarea) {
    if (elemento) {
      const textoAyuda = elemento.querySelector("p")?.textContent || "";
      textarea.value = textoAyuda; // ✅ Extraer texto dinámicamente

      // 🔥 Ajustar el tamaño del textarea dinámicamente
      textarea.style.height = "auto"; // Restablece el tamaño antes de calcular
      textarea.style.height = textarea.scrollHeight + "px"; // Ajusta la altura al contenido

      // 🔥 Activar el scroll si el contenido es muy largo
      textarea.style.overflowY = "auto";
      textarea.scrollTop = textarea.scrollHeight;  
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      this.cv_Service.closeAyudaPrompt();
    }
  }


}
