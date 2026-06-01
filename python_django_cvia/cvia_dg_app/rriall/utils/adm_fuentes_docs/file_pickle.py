import pickle
import os
import logging

class PickleManager:
    """Gestor de archivos Pickle para almacenar datos en formato JSON."""

    def __init__(self, archivo_pkl="documentos.pkl"):
        """Inicializa el gestor con el nombre del archivo pickle."""
        # Definimos el logger para el módulo
        self.logger = logging.getLogger(__name__)
        self.archivo_pkl = archivo_pkl

    def cargar_datos(self):
        # Verificamos si el archivo existe antes de intentar abrirlo
        self.logger.info(f"cargar_datos: {self.archivo_pkl} inicio ")
        if not os.path.exists(self.archivo_pkl):
            self.logger.error(f"Advertencia: El archivo {self.archivo_pkl} no existe. Retornando vacío.")
            return {} # Retornamos un dict vacío para que 'if not datos' funcione
            
        try:
            with open(self.archivo_pkl, 'rb') as f:
                self.logger.info(f"cargar_datos: {self.archivo_pkl} fin ")
                return pickle.load(f)
        except (EOFError, pickle.UnpicklingError):
            # El archivo existe pero está corrupto o vacío
            self.logger.error(f"Advertencia: El archivo {self.archivo_pkl} existe pero probablemente está corrupto o vacío.")
            return {}

    def guardar_datos(self, datos):
        """Guarda los datos en el archivo pickle."""
        self.logger.info(f"guardar_datos: {self.archivo_pkl} inicio ")
        with open(self.archivo_pkl, "wb") as archivo:
            pickle.dump(datos, archivo)
        
        self.logger.info(f"guardar_datos: {self.archivo_pkl} fin ")

    def agregar_dato(self, clave, valor):
        """Añade un nuevo dato al archivo pickle."""
        self.logger.info("agregar_dato: inicio ")
        datos = self.cargar_datos()
        datos[clave] = valor  # Se adiciona el nuevo dato
        self.guardar_datos(datos)
        self.logger.info("agregar_dato: fin ")

    def eliminar_dato(self, fuente_a_eliminar, tipo):
        """Elimina un dato del archivo pickle si existe."""
        self.logger.info("eliminar_dato: inicio ")
        datos = self.cargar_datos()
        if len(datos)==0:
            self.logger.info(f"eliminar_dato: No existen datos para eliminar {fuente_a_eliminar} ")
        else:
            if tipo=="doc":
                self.logger.info(f"fuente_a_eliminar {datos}")
                if fuente_a_eliminar in datos:
                    del datos[fuente_a_eliminar]
                    self.guardar_datos(datos)
                    #print(f"✅ Dato '{fuente_a_eliminar}' eliminado correctamente.")
                    self.logger.info(f"✅ Dato '{fuente_a_eliminar}' eliminado correctamente.")
                else:
                    #print(f"⚠️ Dato '{fuente_a_eliminar}' no encontrado.")
                    self.logger.info(f"⚠️ Dato '{fuente_a_eliminar}' no encontrado.")
            else:
                #print(f"Buscando metadata '{fuente_a_eliminar}'")
                self.logger.info(f"Buscando metadata '{fuente_a_eliminar}'")
                for i, doc in enumerate(datos["metadata"]):
                    print("EXTRAYENDO LA FUENTE:::: ",doc)
                    if doc.metadata.get("source") == fuente_a_eliminar:
                        del datos["metadata"][i]
                        self.guardar_datos(datos)
                        #print(f"✅ Metadata '{fuente_a_eliminar}' eliminado correctamente.")
                        self.logger.info(f"✅ Metadata '{fuente_a_eliminar}' eliminado correctamente.")
                        break

        self.logger.info("eliminar_dato: fin ")

    def seleccionar_dato(self, clave):
        """Elimina un dato del archivo pickle si existe."""
        datos = self.cargar_datos()
        if clave in datos:
            return datos[clave]
        else:
            print(f"⚠️ Dato '{clave}' no encontrado.")
            
        return ""

    def mostrar_datos(self):
        """Muestra los datos actuales en el archivo pickle."""
        datos = self.cargar_datos()
        print("📌 Datos guardados:", datos)

