from file_reader_factory import FileReaderFactory

def main():
    file_path = "example.pdf"  # Cambia el nombre del archivo
    file_type = "pdf"  # Tipo de archivo
    
    try:
        reader = FileReaderFactory.get_reader(file_path, file_type)
        print(reader.read())
    except ValueError as e:
        print(e)

if __name__ == "__main__":
    main()
