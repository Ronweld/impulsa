export interface DatosCV {
  id?: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  celular: string;
  fecha_nacimiento: string;
  profesion: string;
  objetivo: string;
  experiencia?: string;
  cursos?: string;
  habilidades: string;
  archivo_pdf?: string; // URL del archivo
}

export interface Fortalezas {
  id?: number;
  actividades: string;
  adjuntarOF: boolean;
  fecha_actualizacion?: string;
}