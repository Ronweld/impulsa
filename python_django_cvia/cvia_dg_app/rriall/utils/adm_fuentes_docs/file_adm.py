import os
import shutil
#import boto3  # AWS S3 (requiere `pip install boto3`)
from abc import ABC, abstractmethod
import logging

class StorageProvider(ABC):
    """Interfaz abstracta para almacenamiento de archivos"""

    @abstractmethod
    def save_file(self, file_path: str, file_data) -> None:
        """Guarda o reemplaza un archivo en el almacenamiento"""
        pass

    @abstractmethod
    def delete_file(self, file_name: str) -> None:
        """Elimina un archivo del almacenamiento"""
        pass

    @abstractmethod
    def manage_directory(self, directory_path: str, action: str) -> None:
        """Crea, reemplaza o elimina un directorio"""
        pass
        
class LocalStorage(StorageProvider):
    """Implementación de almacenamiento en servidor local"""

    def __init__(self, base_directory: str = "uploads/"):
        self.logger = logging.getLogger(__name__)
        self.base_directory = base_directory
        os.makedirs(self.base_directory, exist_ok=True)  # Crea la carpeta si no existe
        
        # Crear subcarpeta "pkl" dentro del directorio base
        self.abc_directory = os.path.join(self.base_directory, "pkl")
        os.makedirs(self.abc_directory, exist_ok=True)  # Crea "abc" si no existe

    def save_file(self, file_path: str, file_data) -> None:
        """Guarda un archivo en almacenamiento local con el mismo nombre, reemplazándolo si ya existe"""
        #file_name = os.path.basename(file_path)  # Extrae el nombre del archivo
        #destination = os.path.join(self.base_directory, file_name)
        self.logger.info("save_file: inicio")
        destination = file_path

        try:
            #with open(file_path, "rb") as src_file:
            with open(destination, "wb") as dest_file:
                #dest_file.write(src_file.read())  # Escribir archivo en destino
                dest_file.write(file_data.read())

            #print(f"Archivo guardado en: {destination}")
            self.logger.info(f"Archivo guardado en: {destination}")
            self.logger.info("save_file: fin")

        except FileNotFoundError:
            #print(f"El archivo {file_path} no existe. No se puede guardar.")
            self.logger.info(f"El archivo {file_path} no existe. No se puede guardar.")

    def delete_file(self, file_name: str) -> None:
        """Elimina un archivo del almacenamiento local"""
        self.logger.info("delete_file: inicio")
        file_path = os.path.join(self.base_directory, file_name)
        if os.path.exists(file_path):
            os.remove(file_path)
            ##print(f"Archivo eliminado: {file_path}")
            self.logger.info(f"Archivo eliminado: {file_path}")
        else:
            #print(f"Archivo no encontrado: {file_path}")
            self.logger.info(f"Archivo no encontrado: {file_path}")

        self.logger.info("delete_file: fin")
            
    def manage_directory(self, directory_path: str, action: str) -> None:
        """Crea, reemplaza o elimina un directorio en una ruta personalizada"""
        if action == "create":
            if os.path.exists(self.base_directory+"/"+directory_path):
                shutil.rmtree(self.base_directory+"/"+directory_path)  # Elimina el directorio si ya existe
                print(f"Directorio existente eliminado: {directory_path}")
            os.makedirs(self.base_directory+"/"+directory_path)
            print(f"Directorio creado en: {self.base_directory}/{directory_path}")

        elif action == "delete":
            if os.path.exists(self.base_directory+"/"+directory_path):
                shutil.rmtree(self.base_directory+"/"+directory_path)
                print(f"Directorio eliminado: {self.base_directory}/{directory_path}")
            else:
                print(f"El directorio {self.base_directory}/{directory_path} no existe.")

        else:
            print("Acción no válida. Usa 'create' para crear/reemplazar o 'delete' para eliminar.")


#class S3Storage(StorageProvider):
#    """Implementación de almacenamiento en AWS S3"""
#
#    def __init__(self, bucket_name: str):
#        self.s3_client = boto3.client("s3")
#        self.bucket_name = bucket_name
#
#    def save_file(self, file_path: str) -> None:
#        """Guarda el archivo en AWS S3 con el mismo nombre, reemplazándolo si ya existe"""
#        file_name = os.path.basename(file_path)  # Extrae el nombre del archivo
#
#        try:
#            with open(file_path, "rb") as file:
#                self.s3_client.put_object(Bucket=self.bucket_name, Key=file_name, Body=file)
#
#            print(f"Archivo guardado en S3: {file_name}")
#
#        except FileNotFoundError:
#            print(f"El archivo {file_path} no existe. No se puede guardar.")
#
#    def delete_file(self, file_name: str) -> None:
#        """Elimina un archivo de AWS S3"""
#        self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_name)
#        print(f"Archivo eliminado de S3: {file_name}")


class FileManager:
    """Clase principal para administrar archivos"""

    def __init__(self, storage_provider: StorageProvider):
        self.storage_provider = storage_provider

    def save_file(self, file_path: str, file_data) -> None:
        """Guarda un archivo en el almacenamiento definido"""
        self.storage_provider.save_file(file_path, file_data)

    def delete_file(self, file_name: str) -> None:
        """Elimina un archivo del almacenamiento"""
        self.storage_provider.delete_file(file_name)
        
    def manage_directory(self, directory_path: str, action: str) -> None:
        """Administra la creación y eliminación de directorios"""
        self.storage_provider.manage_directory(directory_path, action)
