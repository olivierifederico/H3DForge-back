import os
from ...utils import load_env

load_env()

class MegaConfig:
    def __init__(self):
        self.container = os.getenv('MEGA_CONTAINER')

    def get_creds(self, source: str):
        source = source.upper()
        creds = {
            'email': os.getenv(f'MEGA_{source}_EMAIL'),
            'password': os.getenv(f'MEGA_{source}_PASSWORD'),
            'path': os.getenv(f'MEGA_{source}_PATH')
        }
        return creds