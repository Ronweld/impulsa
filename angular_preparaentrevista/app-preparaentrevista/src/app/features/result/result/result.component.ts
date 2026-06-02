import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MarkdownModule, MarkdownService  } from 'ngx-markdown';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule, MarkdownModule],   // 🔑 para *ngIf
  providers: [MarkdownService], // 👈 Agrega el servicio explícitamente si el error persiste
  templateUrl: './result.component.html'
})
export class ResultComponent implements OnInit {

  result: any;
  resultMarkdown = '';

  sessionId!: number;
  tipo_evaluacion!: string|null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.tipo_evaluacion = localStorage.getItem('tipo_evaluacion');
    this.sessionId = Number(localStorage.getItem('session_id'));
    
    if (this.tipo_evaluacion==="final"){
      this.api.get(`/sessions/${this.sessionId}/result/`)
        .subscribe((res:any) => {
          this.result = res;
          this.resultMarkdown = res.report;
      });
    }else{
      this.api.get(`/sessions/${this.sessionId}/answer_evaluation/`)
        .subscribe((res:any) => {
          this.result = res;
          this.resultMarkdown = this.jsonToMarkdown(res.answer_evaluation);
      });
    }
  }

  // Función que convierte el JSON a Markdown
  jsonToMarkdown(data: any): string {

    let resultado = "" ;
      
      let arrayStr = data[0];
      
      try {
         const reportArray = data;
        
        if (!Array.isArray(reportArray)) return '⚠️ El reporte no es un array válido';

        let md = '# Reporte de la Entrevista\n\n';
        reportArray.forEach((item, index) => {
          const numero = index + 1;
          if (item.answer===''){
            md += `## **Tipo:** ${item.type}\n\n`;
          }else{
            md += `### Pregunta N° : ${numero}: \n${item.question}\n\n`;
            md += `**Respuesta:**\n${item.answer}\n\n`;
            md += `**Evaluación:**\n${item.evaluation.evaluation}\n\n`;
            md += `**Calificación porcentual:**\n\n`;
            md += `- **Técnica:** ${item.evaluation.technical.toFixed(2)}\n\n`;
            md += `- **Comunicación:** ${item.evaluation.communication.toFixed(2)}\n\n`;
            md += `- **Global(promedio):** ${item.evaluation.overall.toFixed(2)}\n\n`;

          }
          md += `---\n\n`;
        });
        
        return md;
      } catch (e) {
        console.error("Error al parsear el array:", e);
        resultado = "⚠️ No se pudo convertir el reporte a JSON válido.";
      }

    return resultado;
  }

  goBackToChat_ant() {
    this.router.navigate(['/chat']);
  }

}