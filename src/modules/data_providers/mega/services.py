from .config import MegaConfig
import docker


class MegaService(MegaConfig):
    def __init__(self):
        super().__init__()
        self.creds = self.get_creds('geek')
        self.client = None
        self.mega_container = None

    def docker_connect(self):
        self.client = docker.from_env()
    
    def docker_close(self):
        self.client.close()

    def container_connect(self):
        try:
            if self.client is None:
                self.docker_connect()

            self.mega_container = self.client.containers.get(self.container)
            print(f"Información del contenedor: {self.mega_container}")
            if self.mega_container.status != 'running':
                self.mega_container.start()
                print("Contenedor iniciado.")
            else:
                print("Contenedor ya está en ejecución.")
            
        except docker.errors.APIError as e:
            print(f"Error de API al ejecutar comando en el contenedor: {e}")
        except docker.errors.ContainerError as e:
            print(f"Error de contenedor al ejecutar comando: {e}")
        except docker.errors.ImageNotFound as e:
            print(f"Imagen no encontrada: {e}")
        except Exception as e:
            print(f"Error desconocido: {e}")

    
    def container_cmd(self, cmd: str):
        try:
            if self.mega_container is None:
                self.container_connect()
            print(f'Ejecutando comando en el contenedor... {cmd}')
            exec_command = self.mega_container.exec_run(cmd, stdout=True, stderr=True, privileged=True)

            if exec_command.exit_code == 0:
                output = exec_command.output.decode('utf-8').strip()
                print(f"Salida del comando: {output}")
                return output
            else:
                error = exec_command.stderr.decode('utf-8').strip()
                return error
        
        except docker.errors.APIError as e:
            return f"Error de API al ejecutar comando en el contenedor: {e}"
        except docker.errors.ContainerError as e:
            return f"Error de contenedor al ejecutar comando: {e}"
        except docker.errors.ImageNotFound as e:
            return f"Imagen no encontrada: {e}"
