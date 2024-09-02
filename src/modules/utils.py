from dotenv import load_dotenv
import os
import mimetypes
import re
from datetime import datetime
import urllib.parse
import zipfile
import rarfile
import py7zr
import json
import shutil

now = datetime.now()

# Mimetype
mimetypes.add_type('application/sla', '.stl')
mimetypes.add_type('image/webp', '.webp')

valid_ext = ['.stl','.obj','.zip','.rar','.7z','.7z.part','.rar.part','.gzip','.part']

def decode_url_params(url:str):
    return url.replace('_espacio_', ' ').replace('_coma_', ',').replace('_punto_', '.').replace('_guion_', '-').replace('_barra_', '/')

def get_files_from_path(path:str):
    return [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]

def convert_id_str(d, key):
    if '.' in key:
        sub_doc, keyx = key.split('.')
        d[sub_doc][keyx] = str(d[sub_doc][keyx])
    else:
        d[key] = str(d[key])
    return d
        
def get_current_time():
    return now.strftime('%Y-%m-%d %H:%M:%S')

def check_url(url):
    mime_type = mimetypes.guess_type(url)[0]
    if re.match(r'.*\.7z.\d+$', url):
        mime_type = 'application/x-7z-compressed'
    elif re.search(r'\.\d{3}$', url):
        mime_type = 'application/octet-stream'

    if not mime_type:
        return None
    return mime_type

def validate_extension(extension:str):
    if extension.startswith('.0'):
        extension = '.7z.part'
    valid_ext = ['.stl','.obj','.zip','.rar','.7z','.7z.part','.rar.part','.gzip','.part']
    if extension in valid_ext:
        return True
    return False

def get_extension(url):
    if url.endswith('.rar') and '.part' in url:
        return '.rar.part'

    match = re.search(r'\.\d{3}$', url)
    if match:
        print('Match:', match.group(0))
        return '.part'
    
    return os.path.splitext(url)[1].lower()

def format_url(url:str):
    if "'" in url:
        url = f'"{url}"'
    else:
        url = f"'{url}'"
    return url

def load_env():
    if os.path.exists('app/src/.env'):
        __env = load_dotenv()
        os.environ['docker'] = 'true'
    else:
        if os.path.exists(f'./src'):
            os.chdir('./src')

        __env = load_dotenv('.env')
        os.environ['docker'] = 'false'
    if __env:
        pass
    else:
        print('Environment variables were not loaded.')

def folder_data(folders:list, prefix_sku:str):
    folder_list = []
    for folder in folders:
        data = {
            'name': folder,
            'prefix_sku': prefix_sku,
        }
        folder_list.append(data)
    return folder_list

def get_folders_from_list(urls:list, get_root:bool = False):
    folder_list = []
    for url in urls:
        if check_url(url) is None:
            if get_root and (url == '.' or url == ''):
                continue
            else:
                folder_list.append(url)
    return folder_list

def filter_folder_content(folders:list, content:list):
    f_content = {'data': {'sub_folders':{'root': []},'types':[]}, 'totals': {'sub_folders':0,'files':0,'others':0,'types':{}}}
    for url in content:
        if not check_url(url):
            continue
        else:
            extension = get_extension(url)
            if validate_extension(extension):
                f_content['totals']['files'] += 1
                f_content['totals']['types'][extension] = f_content['totals']['types'].get(extension, 0) + 1
                if extension not in f_content['data']['types']:
                    f_content['data']['types'].append(extension)
                if folders:
                    for folder in folders:
                        if url.startswith(folder):
                            file = url.replace(folder + '/', '')
                            f_content['data']['sub_folders'][folder] = f_content['data']['sub_folders'].get(folder, []) + [file]
                        else:
                            if url in f_content['data']['sub_folders']['root']:
                                continue
                            else:
                                f_content['data']['sub_folders']['root'] = f_content['data']['sub_folders'].get('root', []) + [url]
                    for folder in f_content['data']['sub_folders'].keys():
                        if folder == 'root':
                            continue
                        else:    
                            f_content['data']['sub_folders']['root'] = [url for url in f_content['data']['sub_folders']['root'] if not url.startswith(folder)]
                else:
                    f_content['data']['sub_folders']['root'] = f_content['data']['sub_folders'].get('root', []) + [url]
            else:
                f_content['totals']['others'] += 1

    f_content['totals']['sub_folders'] = len(f_content['data']['sub_folders']) - 1 if f_content['data']['sub_folders']['root'] else len(f_content['data']['sub_folders'])
    return f_content

def file_data(path: str, sub_folder:str , name:str, sub_folder_sku:str):
    full_path = f"{path}{name}" if sub_folder == 'root' else f"{path}{sub_folder}/{name}"

    data = {
        'name': name,
        'prefix_sku': sub_folder_sku,
        'sku': None,
        'url': full_path,
        'status':{
            'db': False,
            's3': False, 
        },

        'inserted_at': now.strftime('%Y-%m-%d %H:%M:%S')
    }
    return data

def remove_local_files():
    for root, dirs, files in os.walk(r'.\static\temp\files', topdown=False):
        # Eliminar todos los archivos en el directorio actual
        for file in files:
            os.remove(os.path.join(root, file))
        # Eliminar todos los directorios vacíos en el directorio actual
        for dir in dirs:
            dir_path = os.path.join(root, dir)
            if not os.listdir(dir_path):
                os.rmdir(dir_path)
    if os.path.exists(r'.\static\temp\logs\raw_files_log.json'):
        os.remove(r'.\static\temp\logs\raw_files_log.json')

def get_content_from_path(path: str):
    content_dict = {}

    # Recorre el directorio de forma recursiva
    for root, dirs, files in os.walk(path):
        # Obtiene el nombre de la carpeta relativa al path inicial
        relative_path = os.path.relpath(root, path)
        
        # Si relative_path es '.', significa que estamos en el directorio raíz
        # Cambiamos el nombre a '' para evitar tener una clave con '.'
        if relative_path == '.':
            relative_path = ''
        
        # Almacena archivos en la clave correspondiente
        content_dict[relative_path] = files

    return content_dict

def extract_raw_file_data(file_name:str):
        raw_file_data = {}
        raw_file_data['original_file'] = file_name
        raw_file_data['file_data'] = {}
        base_path = r'.\static\temp\files\compressed'
        files_to_extract = [file_name]
        final_content = {}

        while True:
            print(files_to_extract)
            for file in files_to_extract:
                final_content[file] = {}
                file_path = os.path.join(base_path, file)
                file_content = get_content(file_path=file_path)
                compressed_list, ready_list = extract_file_content(file_content, file, root=True)
                final_content[file]['ready'] = ready_list
                os.remove(file_path)
                    
            # print(compressed_list)
            if not compressed_list:
                
                break
            else:
                files_to_extract = compressed_list
            # break
        print(final_content)
        # for i, content in enumerate(contents):
        #     if content.startswith('__MACOSX'):
        #         contents.pop(i)
        # print(content)
        return
        files = extract_file(file_name, root=True)
        if len(files) > 1:
            for file in files:
                if file.endswith('.zip') or file.endswith('.rar') or file.endswith('.7z'):
                    raw_file_data['file_data'][file] = {}
                    raw_file_data['file_data'][file]['content'] = extract_file(file, root=False)
                    raw_file_data['file_data'][file]['status'] = 'extracted'
        else:
            raw_file_data['original_file'] = file_name
            raw_file_data['file_data'][file_name] = {}
            raw_file_data['file_data'][file_name]['content'] = files 
            raw_file_data['file_data'][file_name]['status'] = 'extracted'

        return raw_file_data

def copy_files_to_root(content_dict, compressed_path):
    # Crear el directorio 'compressed' si no existe
    os.makedirs(compressed_path, exist_ok=True)
    
    # Recorrer las carpetas del diccionario
    for folder, files in content_dict.items():
        if folder:  # Si la carpeta no es la raíz (no es '')
            # Construir la ruta completa de la carpeta
            folder_path = os.path.join(compressed_path, folder)
            
            # Recorrer y copiar cada archivo en la carpeta
            for file in files:
                src_file_path = os.path.join(folder_path, file)
                dest_file_path = os.path.join(compressed_path, file)
                
                # Copiar archivo al directorio 'compressed'
                shutil.copy2(src_file_path, dest_file_path)
                shutil.rmtree(folder_path)


def extract_file_content(file_content, file_name:str = None, root:bool = True):
    ready_path = r'.\static\temp\files\ready'
    compressed_path = r'.\static\temp\files\compressed'
    os.makedirs(ready_path, exist_ok=True)
    os.makedirs(compressed_path, exist_ok=True)
    for folder in file_content.keys():
        for file in file_content[folder]['compressed']:
            path_to_extract = compressed_path
            compressed_file = os.path.join(compressed_path, file_name)
            extract_file(compressed_file, file, path_to_extract)
        for file in file_content[folder]['files_ready']:
            path_to_extract = os.path.join(ready_path, file_name)
            compressed_file = os.path.join(compressed_path, file_name)
            extract_file(compressed_file, file, path_to_extract)
        copy_files_to_root(get_content_from_path(path_to_extract), path_to_extract)
        
    copy_files_to_root(get_content_from_path(compressed_path), compressed_path)
    compressed_list = get_content_from_path(compressed_path)['']
    ready_list = get_content_from_path(path_to_extract)
    for file in compressed_list:
        if file == file_name:
            compressed_list.remove(file)

    return compressed_list, ready_list
            
    
    
def extract_file(compressed_file:str ,file:str, path:str):
    if compressed_file.endswith('.zip'):
        with zipfile.ZipFile(compressed_file, 'r') as zip_ref:
            zip_ref.extract(file, path)
    elif compressed_file.endswith('.rar'):
        with rarfile.RarFile(compressed_file, 'r') as rar_ref:
            rar_ref.extract(file, path)
    elif compressed_file.endswith('.7z'):
        with py7zr.SevenZipFile(compressed_file, 'r') as sevenz_ref:
            sevenz_ref.extract(file, path)
    else:
        return False
    return True


def get_content(file_path: str):
    # Diccionario para almacenar archivos por carpeta
    folder_files = {}

    # Obtener la lista de contenidos del archivo según su tipo
    if file_path.endswith('.zip'):
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            contents = zip_ref.namelist()
    elif file_path.endswith('.rar'):
        with rarfile.RarFile(file_path, 'r') as rar_ref:
            contents = rar_ref.namelist()
    elif file_path.endswith('.7z'):
        with py7zr.SevenZipFile(file_path, 'r') as sevenz_ref:
            contents = sevenz_ref.getnames()
    else:
        print("Tipo de archivo no soportado")
        return folder_files  # Retorna diccionario vacío si el tipo de archivo no es soportado

    # Procesar los contenidos del archivo
    for content in contents:
        # Ignorar archivos y carpetas que comienzan con '__MACOSX'
        if content.startswith('__MACOSX'):
            continue

        # Verificar si es un archivo
        if not content.endswith('/'):
            # Obtener la ruta de la carpeta del archivo, o asignar '.' si está en la raíz
            folder_path = os.path.dirname(content) + '/'
            if folder_path == '/':  # Archivo en la raíz del archivo comprimido
                folder_path = '.'

            # Inicializar la estructura de la carpeta si no existe
            if folder_path not in folder_files:
                folder_files[folder_path] = {'compressed': [], 'files_ready': []}

            # Verificar si el archivo es comprimido y añadirlo a la lista correspondiente
            if content.endswith(('.zip', '.rar', '.7z')):
                folder_files[folder_path]['compressed'].append(content)
            else:
                folder_files[folder_path]['files_ready'].append(content)

    return folder_files

def save_json(data: dict, path: str):
    with open(path, 'w') as f:
        json.dump(data, f)
    return True

def load_json(path: str):
    with open(path, 'r') as f:
        data = json.load(f)
    return data



def verify_files_raw_data_log(filename, log_path):
    if not os.path.exists(log_path):
        return False
    else:
        raw_file_data = load_json(log_path)
        if not raw_file_data:
            return False
        if filename != raw_file_data['original_file']:
            return False
        else:
            if len(raw_file_data['file_data']) > 1:
                extracted_path = os.path.join(os.getcwd(), 'static', 'temp', 'files', 'extracted', 'folders')
                for file in raw_file_data['file_data'].keys():
                    folder_path = os.path.join(extracted_path, file)
                    if not os.path.exists(folder_path):
                        return False
                    else:
                        for f in raw_file_data['file_data'][file]['content']:
                            if not os.path.exists(os.path.join(folder_path, f)):
                                return False
            else:
                folder_path = os.path.join(os.getcwd(), 'static', 'temp', 'files', 'extracted')
                for f in raw_file_data['file_data'][filename]['content']:
                    if not os.path.exists(os.path.join(folder_path, f)):
                        return False
            return raw_file_data
                