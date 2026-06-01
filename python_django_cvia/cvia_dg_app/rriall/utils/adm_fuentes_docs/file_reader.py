from abc import ABC, abstractmethod
from PIL import Image
import PyPDF2
import docx

import os
from paddleocr import PaddleOCR
import re
from docx2pdf import convert  # Conversión Word a PDF
import yaml
import logging
import warnings

# Silenciar los logs de PaddleOCR
logging.getLogger("ppocr").setLevel(logging.ERROR)  # Solo mostrará errores críticos

#warnings.filterwarnings("ignore", message="No ccache found")
#warnings.filterwarnings("ignore")
warnings.filterwarnings("ignore", module="paddle")

class FileReader(ABC):
    """Clase base abstracta para leer archivos."""
    def __init__(self, file_path):
        self.file_path = file_path

    def eliminar_caracteres_extranos(self, texto):
        return re.sub(r'[^a-zA-Z0-9.,!¡¿?ñáéíóúÑÁÉÍÓÚ,":;_*/&@$#%()=] ', '', texto)
    
    def normalizar_espacios(self, texto):
        return " ".join(texto.split())
    
    def limpiar_texto(self, texto):
        # Elimina espacios en blanco al inicio y final
        texto = texto.strip()
    
        # Reemplaza múltiples saltos de línea por uno solo
        texto = re.sub(r'\n+', '\n', texto)
    
        # Reemplaza múltiples espacios con un solo espacio
        texto = re.sub(r'\s+', ' ', texto)
        texto = self.normalizar_espacios(self.eliminar_caracteres_extranos(texto))
        return texto

    @abstractmethod
    def leer(self):
        """Método abstracto para leer archivos"""
        pass

class JPGReader(FileReader):
    def leer(self):
        """Lee archivos JPG"""
        img = Image.open(self.file_path)
        img.show()
        return "Imagen JPG mostrada"

class PNGReader(FileReader):
    def leer(self):
        """Lee archivos PNG"""
        img = Image.open(self.file_path)
        img.show()
        return "Imagen PNG mostrada"

class PDFReader(FileReader):
    def leer(self):
        """Lee archivos PDF y extrae texto"""
        with open(self.file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        return text if text else "No se pudo extraer texto del PDF"


class WordReader(FileReader):
    def leer(self):
        """Lee archivos Word y extrae texto"""
        doc = docx.Document(self.file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text if text else "No se pudo extraer texto del documento"


class OCRReader(FileReader):
    def __init__(self, file_path, idioma="es", uso_gpu=False):
        # idioma: `lang` as `es`=Español, `ch`=Chinese, `en`=English, `fr`=French, `german`, `korean`, `japan`
        # uso_gpu: para situaciones cuando queremos hacer uso del procesamiento por GPU
        super().__init__(file_path)
        self.idioma = idioma
        self.uso_gpu = uso_gpu

    def leer(self):
        resultados_salida = []
        ocr = PaddleOCR(use_angle_cls=True, lang=self.idioma, use_gpu=self.uso_gpu) 
        imagenes = ocr.ocr(self.file_path, cls=True)
        for idx in range(len(imagenes)):
            resultado = {}
            res = imagenes[idx]
            if res == None: 
                print(f"[DEBUG] De detectó página vacia {idx+1}, se omite esto.")
                continue

            resultados_lista = [elemento[1][0] for elemento in res]
            # Concatenar elementos con un espacio
            texto_extraido = " ".join(resultados_lista)
            resultado[f"Página {idx+1}"] = self.limpiar_texto(texto_extraido)
            resultados_salida.append(resultado)
            
        return resultados_salida


class Word_OCRReader(OCRReader):
    def __init__(self, file_path, idioma="es", uso_gpu=False):
        # idioma: `lang` as `es`=Español, `ch`=Chinese, `en`=English, `fr`=French, `german`, `korean`, `japan`
        # uso_gpu: para situaciones cuando queremos hacer uso del procesamiento por GPU
        self.ruta_doc = file_path
        self.ruta_pdf = f'{self.ruta_doc.split(".")[0]}.pdf' 
        super().__init__(self.ruta_pdf, idioma=idioma, uso_gpu=uso_gpu)
        self.docx_file = file_path

    def leer(self):
        try:
            # Convierte el archivo docx en pdf
            convert(self.docx_file, self.ruta_pdf)
            # Lee el archivo pdf como un OCR
            doc = super().read()
            # Elimina el archivo pdf convertido
            os.remove(self.ruta_pdf)
            return doc
        except Exception as e:
            print("Error", f"Conversión fallida: {e}")
            return ""

class YAMLReader(FileReader):
    # Cargando prompt
    def leer(self):
        # Define file paths for YAML configurations
        files_prompt = {
            'prompt': self.file_path
        }
        
        # Load configurations from YAML files
        configs = {}
        for config_type, file_path in files_prompt.items():
            with open(file_path, 'r', encoding='utf-8') as file:
                configs[config_type] = yaml.safe_load(file)
        
        # Assign loaded configurations to specific variables
        #prompt_config = configs['prompt']
        return configs['prompt']
