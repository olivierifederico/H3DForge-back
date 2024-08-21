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
    for root, dirs, files in os.walk(r'.\static\temp\files'):
        for file in files:
            os.remove(os.path.join(root, file))


def extract_file(file:str, root: bool = True):
    if root:
        base_path = r'.\static\temp\files'
        path_to_extract = r'.\static\temp\files\extracted'
    else:
        base_path = r'.\static\temp\files\extracted'
        path_to_extract = os.path.join(os.path.join(base_path, 'folders'), file)
    file_path = os.path.join(base_path, file)
    if not os.path.exists(base_path):
        os.makedirs(base_path)
    if not os.path.exists(path_to_extract):
        os.makedirs(path_to_extract)
    if file.endswith('.zip'):
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(path_to_extract)
    elif file.endswith('.rar'):
        with rarfile.RarFile(file_path, 'r') as rar_ref:
            rar_ref.extractall(path_to_extract)
    elif file.endswith('.7z'):
        with py7zr.SevenZipFile(file_path, 'r') as sevenz_ref:
            sevenz_ref.extractall(path_to_extract)
    else:
        return []
    return get_files_from_path(path_to_extract)

def save_json(data: dict, path: str):
    with open(path, 'w') as f:
        json.dump(data, f)
    return True

def load_json(path: str):
    with open(path, 'r') as f:
        data = json.load(f)
    return data

def extract_raw_file_data(file_name:str):
        raw_file_data = {}
        raw_file_data['original_file'] = file_name
        raw_file_data['file_data'] = {}
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

def verify_files_raw_data_log(filename, log_path):
    if not os.path.exists(log_path):
        return False
    else:
        raw_file_data = load_json(log_path)
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
                