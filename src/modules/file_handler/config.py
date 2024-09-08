import os
from ..utils import load_env

load_env()

class FileHandlerConfig:
    def __init__(self):
        self.temp_path = r'.\static\temp'
        self.logs_path = os.path.join(self.temp_path, 'logs')
        self.files_path = os.path.join(self.temp_path, 'files')
        self.raw_file_path = os.path.join(self.files_path, 'raw_file')
        self.compressed_path = os.path.join(self.files_path, 'compressed')
        self.ready_path = os.path.join(self.files_path, 'ready')
        self.paths = [self.temp_path, self.logs_path, self.files_path, self.raw_file_path, self.compressed_path, self.ready_path]