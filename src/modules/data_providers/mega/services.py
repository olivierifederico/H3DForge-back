from .config import MegaConfig
from ... import utils
import time

class MegaService(MegaConfig):
    def __init__(self):
        super().__init__()
        self.__email, self.__pwd, self.__path = self.get_creds('geek')

    def verify_login(self):
        output = self.container_cmd(f'mega-whoami')
        if 'Not logged in' in output:
            return False
        return output
    
    def login(self):
        if not self.verify_login():
            output = self.container_cmd(f'mega-login {self.__email} {self.__pwd}')
            if 'Login successful' in output:
                return True
        else:
                return True
                
    def change_path(self, path: str = None, root: bool = False):
        if root:
            self.container_cmd(f'mega-cd /')
        if path:
           self.container_cmd(f'mega-cd {path}')
           time.sleep(1)

    def get_current_path(self):
        return self.container_cmd('mega-pwd')
    
    def download_file(self, file:str, sub_folder:str = None):
        shared_path = '/root/MEGA' if not sub_folder else f'"/root/MEGA/{sub_folder}"'
        return self.container_cmd(f'mega-get {file} {shared_path}')
    
    def set_path(self, path: str = None):
        self.change_path(self.__path, root=True)
        if path:
            self.change_path(path, root=False)
    
    def get_folders(self):
        return self.container_cmd('mega-ls').split('\n')
    
    def find(self, url: str = None, full: bool = False):
        if url:
            command = f'mega-find "{url}" -l' if full else f'mega-find "{url}"'
            return self.container_cmd(command).split('\n')[0]
        return self.container_cmd('mega-find').split('\n')

    def get_content(self, folder: str, remove_root: bool = False):
        prev_path = self.get_current_path()
        content = self.find()
        if remove_root:
            if content and content[-1] == '':
                content.pop()
                if content[-1] =='.':
                    content.pop()
        self.container_cmd('mega-cd ..')
        while prev_path == self.get_current_path():
            time.sleep(0.1)
            print('Post')
            print(prev_path, self.get_current_path())
        return utils.filter_folder_content(folder, content)
    