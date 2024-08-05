import os
from ...utils import load_env
import subprocess

load_env()

class MegaConfig:
    def __init__(self):
        self.container = os.getenv('MEGA_CONTAINER')

    def get_creds(self, source: str):
        source = source.upper()
        return os.getenv(f'MEGA_{source}_EMAIL'), os.getenv(f'MEGA_{source}_PASSWORD'), os.getenv(f'MEGA_{source}_PATH')
    
    def container_cmd(self, cmd):
        result = subprocess.run(
            ['docker', 'exec', self.container, 'sh', '-c', cmd],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.stdout