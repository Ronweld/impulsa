import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { CommonModule } from '@angular/common';   // 🔑 para *ngFor y *ngIf
import { FormsModule } from '@angular/forms';     // 🔑 para [(ngModel)]
import { ResultComponent } from '../../result/result/result.component';   // 👈 importa tu componente
import { SessionService } from '../../../core/services/session.service';
import { MarkdownModule } from 'ngx-markdown';
import { AutosizeModule } from 'ngx-autosize';

interface Message {
  role: string;
  content: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,   // 🔑 standalone
  imports: [CommonModule, FormsModule, ResultComponent, MarkdownModule, AutosizeModule ],   // 🔑 importa módulos necesarios
  templateUrl: './chat.component.html'
})
export class ChatComponent implements OnInit {
  @ViewChild('chatWindow') chatWindow!: ElementRef;

  private shouldScroll = false;

  sessionId!: number|null;
  messages: Message[] = [];
  currentQuestion = '';
  answer = '';
  puedeVerResultado = false;  // inicialmente deshabilitado
  //puedeVerResultado = true;  // inicialmente habilitado
  activaModalResultados = false;  

  mostrarHistorial: boolean = false;
  sesiones: any;
  selectedSessionId: number | null = null;
  bloqueado = false;

  constructor(private api: ApiService, private sessionService: SessionService) {}

  ngOnInit() {
    this.startInterview()
    this.sessionService.getSessions().subscribe((res: any) => {
      this.sesiones = res;
    });
  }


  toggleHistorial() {
    this.mostrarHistorial = !this.mostrarHistorial;
  }

  // 🔹 Método para cargar una sesión al hacer doble clic
  cargarSesion(sesion: any) {
    document.body.style.cursor = "wait";
    console.log('Cargar sesión:', sesion);
    
    this.sessionId = sesion.id|0;
    localStorage.setItem('session_id', String(this.sessionId));

    this.puedeVerResultado = sesion.is_close ? true: false;

    this.sessionService.getSessionById(this.sessionId).subscribe((sessionRes: any) => {
      const sessionIsActive = sessionRes.is_active;
      this.selectedSessionId = this.sessionId;   // marcar la sesión seleccionada

      this.api.get(`/sessions/${this.sessionId}/chats/`).subscribe((chatRes: any) => {
        this.messages = [];

        if (chatRes.error) {
          this.loadQuestion();
          document.body.style.cursor = "auto";
          return;
        }

        let ultimoOrder = 0;
        let ultimoReplyTo: any = null;

        (chatRes.chat || []).forEach((item: any) => {
          ultimoOrder = item.order;
          ultimoReplyTo = item.reply_to;

          if (item.role === 'system') {
            const roleLabel = item.order === 0 ? '' : 'Pregunta';
            const content = item.order === 0 ? `##### ${item.content}` : item.content;
            this.messages.push({ role: roleLabel, content });
          } else {
            this.messages.push({ role: 'Respuesta', content: item.content });
          }

          // 👇 Forzar scroll inmediatamente después de agregar la pregunta
          setTimeout(() => this.scrollToBottom(), 0);
        });
        
        // 🔹 Lógica de carga de nueva pregunta
        if (sessionIsActive || ultimoOrder === 0 || ultimoReplyTo != null) {
          !sesion.is_close && this.loadQuestion();
        }
        document.body.style.cursor = "auto";
      });
    });
  }


  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  loadQuestion() {
    console.log("loadQuestion: inicio");
    this.api.get(`/sessions/${this.sessionId}/next_question/`)
      .subscribe((res: any) => {
        if (res.result.question!=null){
          if (res.result.show_header){
            this.currentQuestion = `##### ${res.result.question}`;
            this.messages.push({ role: '', content: this.currentQuestion });
          }else{
            this.currentQuestion = res.result.question;
            this.messages.push({ role: 'Pregunta', content: this.currentQuestion });
          }
        }
        // 👇 Forzar scroll inmediatamente después de agregar la pregunta
        setTimeout(() => this.scrollToBottom(), 0);
      });
  }

  loadHistory() {
    this.api.get(`/chatmessages/?session_id=${this.sessionId}`)
      .subscribe((data: any) => {
        this.messages = data;
      });
  }

  sendAnswer(event?: Event) {
    if (!this.answer.trim()) return;

    // Evita que el Enter agregue un salto de línea
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }

    // Bloquear textarea mientras se espera respuesta
    this.bloqueado = true;

    // 1. Mostrar inmediatamente en el histórico
    this.messages.push({ role: 'Respuesta', content: this.answer });

    // 2. Forzar scroll al fondo
    setTimeout(() => this.scrollToBottom(), 0);

    // 3. Limpiar el textarea de inmediato
    this.answer = '';
    const textarea = document.querySelector('textarea.form-control') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = '80px'; // vuelve al alto inicial
      textarea.style.overflowY = 'hidden';
    }

    // 4. Enviar al backend
    document.body.style.cursor = "wait";
    this.api.post(`/sessions/${this.sessionId}/answer/`, {
      answer: this.messages[this.messages.length - 1].content // 👈 usa el último mensaje enviado
    }).subscribe((res: any) => {
      if (res.result.finished) {
        console.log("Se ha finalizado con la evaluación");
        this.puedeVerResultado = true;
        this.mostrarToast();
      } else {
        const content = res.result.show_header
          ? `##### ${res.result.question}`
          : res.result.question;
        this.messages.push({ role: res.result.show_header ? '' : 'Pregunta', content });
        setTimeout(() => this.scrollToBottom(), 0);

        if (res.result.show_header){
          this.loadQuestion();
        }
      }
      // 🔹 Desbloquear textarea al recibir respuesta
      this.bloqueado = false;
      document.body.style.cursor = "auto";
    }, () => {
        // 🔹 En caso de error también desbloquear
        this.bloqueado = false;
        document.body.style.cursor = "auto";
    });
  }

  newInterview() {
    document.body.style.cursor = "wait";
    console.log("Empezando nueva entrevistas (newInterview): inicio .....");
    
    const jd_id = localStorage.getItem('jd_id');
    
    this.sessionService.createSession({jd: jd_id }).subscribe({
      next: (res: any) => {
        this.messages = [];
        console.log('Nueva sesión creada:', res);
        localStorage.setItem('session_id', String(res.session_id));
        this.startInterview();
        this.sessionService.getSessions().subscribe((res: any) => {
          this.sesiones = res;
          document.body.style.cursor = "auto";
        });
      },
      error: (err) => {
        console.error('Error al crear la nueva sesión:', err);
        alert('Ocurrió un error al crear la nueva sesión. Intenta nuevamente.');
        document.body.style.cursor = "auto";
      }
    });
  }

  startInterview() {
    document.body.style.cursor = "wait";
    console.log("Empezando entrevistas (startInterview): inicio .....");
    this.sessionId = Number(localStorage.getItem('session_id'));
    
    if (this.sessionId!=-1){
      this.loadQuestion();
      this.loadQuestion();
    }else{
      console.log("No se pudieron generar preguntas para la sesión");  
    }
    console.log("Empezando entrevistas (startInterview): fin");
    document.body.style.cursor = "auto";
  }

  loadJobDescription() {
    // Invocar al template de job description
    window.location.href = '/jd';
  }

  loadResult(){
    window.location.href = '/result';
  }

  private scrollToBottom() {
    try {
      this.chatWindow.nativeElement.scrollTop = this.chatWindow.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  openTipoEvaluacion(tipo_evaluacion: string) {
    this.activaModalResultados = true;
    console.log("tipo_evaluacion :::: ",tipo_evaluacion);
    localStorage.setItem('tipo_evaluacion', tipo_evaluacion);
  }

  mostrarToastx() {
    const toastEl = document.getElementById('alertToast');
    const toast = new (window as any).bootstrap.Toast(toastEl!);
    toast.show();
  }

  mostrarToast() {
    const toastEl = document.getElementById('alertToast');
    const toast = new (window as any).bootstrap.Toast(toastEl!, {
      delay: 3000,   // ⏱ tiempo en ms (3 segundos)
      autohide: true // 👈 se oculta automáticamente
    });
    toast.show();
  }

}