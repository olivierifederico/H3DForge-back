from .config import FileHandlerConfig
import os, shutil
import zipfile, rarfile, py7zr
import trimesh
import json


# continuar con la lectura y revision del log
class FileHandlerService(FileHandlerConfig):
    def __init__(self):
        super().__init__()


    # verificar que el log funcione correctamente al bajar un archivo dsitrinto del del log.
    def prepare_raw_file(self, file_name):
        self.raw_file = file_name
        self.raw_extension = self.get_file_extension(file_name)
        if self.verify_extract_log():
            ready_info = self.load_json(os.path.join(self.logs_path, 'extract_log.json'))
        else:
            if self.raw_extension in ['.zip', '.rar', '.7z']:
                self.remove_prepared_files()
                self.create_files_path()
                self.full_extract()
                ready_info = {}
                ready_info['files'] = self.get_ready_info()
                ready_info['raw_file'] = self.raw_file
                self.create_extract_log(ready_info)
        return ready_info
        

    def full_extract(self):
        file_to_extract = [self.raw_file]
        while True:
            for file in file_to_extract:
                self.extract(file)
                if file != self.raw_file:
                    os.remove(os.path.join(self.compressed_path, file))
            file_to_extract = self.get_path_content(self.compressed_path)['']
            if not file_to_extract:
                break

    def extract(self, file_name):
        ready_file_path = os.path.join(self.ready_path, file_name.split('.')[0])
        if file_name == self.raw_file:
            file_path = os.path.join(self.raw_file_path, file_name)
        else:
            file_path = os.path.join(self.compressed_path, file_name)
        os.makedirs(ready_file_path, exist_ok=True)

        if self.get_file_extension(file_name) == '.zip':
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(ready_file_path)
        elif self.get_file_extension(file_name) == '.7z':
            with py7zr.SevenZipFile(file_path, mode='r') as z:
                z.extractall(ready_file_path)
        elif self.get_file_extension(file_name) == '.rar':
            with rarfile.RarFile(file_path, 'r') as rar_ref:
                rar_ref.extractall(ready_file_path)

        self.prepare_extracted_files(ready_file_path)

    def prepare_extracted_files(self, ready_path):
        self.extracted_files = self.get_path_content(ready_path)
        for path in self.extracted_files.keys():
            if path == '__MACOSX':
                shutil.rmtree(os.path.join(ready_path, path), ignore_errors=True)
                continue
            for file in self.extracted_files[path]:
                renamed = file.lower().replace(' ', '_')
                original_file_path = os.path.join(ready_path, path, file)
                renamed_file_path = os.path.join(ready_path, path, renamed)
                os.rename(original_file_path, renamed_file_path)
                file = renamed
                if self.get_file_extension(file) in ['.zip', '.rar', '.7z']:
                    shutil.move(os.path.join(ready_path, path, file), os.path.join(self.compressed_path, file))
                if self.get_file_extension(file).lower() == '.obj':
                    self.convert_obj_to_stl(os.path.join(ready_path, path, file))

    def get_ready_info(self):
        ready_info = {}

        for entry in os.scandir(self.ready_path):
            if entry.is_dir():
                folder_name = entry.name
                folder_path = os.path.join(self.ready_path, folder_name)
                ready_info[folder_name] = {}

                for sub_root, sub_dirs, sub_files in os.walk(folder_path):
                    relative_sub_folder_path = os.path.relpath(sub_root, folder_path)
                    
                    if relative_sub_folder_path == ".":
                        relative_sub_folder_path = "no_sub_path"
                    
                    if sub_files:
                        ready_info[folder_name][relative_sub_folder_path] = []

                        for file in sub_files:
                            if not file.lower().endswith('.jpg'):
                                relative_file_path = os.path.relpath(os.path.join(sub_root, file), self.ready_path)
                                ready_info[folder_name][relative_sub_folder_path].append(relative_file_path)
        empty_sub_raw = []
        for sub_raw in ready_info.keys():
            if ready_info[sub_raw] == {}:
                empty_sub_raw.append(sub_raw)
            if ready_info[sub_raw] == {'no_sub_path': []}:
                empty_sub_raw.append(sub_raw)
        for empty in empty_sub_raw:
            del ready_info[empty]
        return ready_info
            
    def get_file_extension(self, file_name):
        return os.path.splitext(file_name)[1]

    def get_path_content(self, path) -> dict:
        content_dict = {}
        for root, dirs, files in os.walk(path):
            relative_path = os.path.relpath(root, path)
            if relative_path == '.':
                relative_path = ''
            content_dict[relative_path] = files

        return content_dict
    
    def create_files_path(self):
        for path in self.paths:
            os.makedirs(path, exist_ok=True)

    def remove_prepared_files(self):
        for path in self.paths:
            if path == self.temp_path or path == self.files_path or path == self.raw_file_path or path == self.logs_path:
                continue
            shutil.rmtree(path, ignore_errors=True)

    def remove_temp_file(self, file_name):
        file_path = os.path.join(self.temp_path, file_name)
        os.remove(file_path)    

    def reset_temp_path(self):
        shutil.rmtree(self.temp_path, ignore_errors=True)
    
    def convert_obj_to_stl(self, obj_path):
        mesh = trimesh.load(obj_path)
        mesh.export(obj_path.lower().replace('.obj', '.stl'))
        os.remove(obj_path)

    def create_extract_log(self, ready_info):
        log_path = os.path.join(self.logs_path, 'extract_log.json')
        self.save_json(ready_info, log_path)

    def verify_extract_log(self):
        log_path = os.path.join(self.logs_path, 'extract_log.json')
        print('wesa')
        if os.path.exists(log_path):
            print('naaambre')
            log_info = self.load_json(log_path)
            print(log_info['raw_file'], self.raw_file)
            if log_info['raw_file'] != self.raw_file:
                return False
            log_info = log_info['files']
            for key in log_info.keys():
                for sub_key in log_info[key].keys():
                    for file in log_info[key][sub_key]:
                        file_path = os.path.join(self.ready_path, file)
                        if not os.path.exists(file_path):
                            return False

            return True
        else:
            return False
    
    def remove_log_file(self, file_name):
        log_path = os.path.join(self.logs_path, file_name)
        os.remove(log_path)

    def save_json(self, data: dict, path: str):
        with open(path, 'w') as f:
            json.dump(data, f)
        return True

    def load_json(self, path: str):
        with open(path, 'r') as f:
            data = json.load(f)
        return data