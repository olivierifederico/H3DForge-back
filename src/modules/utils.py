from dotenv import load_dotenv
import docker
import asyncio
import os

def load_env():
    if os.path.exists('.env'):
        load_dotenv('.env')
    else:
        os.chdir('src')
        load_dotenv('.env')



class DockerManager:
    def __init__(self):
        self.client = docker.from_env()
        self.container_name = 'megacmd'

    async def interact_with_console(self):
        try:
            # Conectar con Docker y obtener el contenedor
            container = self.client.containers.get(self.container_name)
            if container.status != 'running':
                container.start()

            # Ejecutar comando interactivo en el contenedor
            exec_command = await container.attach(
                stdin=True,
                stdout=True,
                stderr=True,
                tty=True,
                stream=True,
                detach=False
            )

            # Procesar la entrada y salida de la consola interactiva
            async def read_input():
                while True:
                    try:
                        data = await asyncio.get_event_loop().run_in_executor(None, exec_command.recv)
                        if data:
                            print(data.decode('utf-8'), end='')
                        else:
                            break
                    except docker.errors.APIError as e:
                        print(f"Error de API Docker: {e}")
                        break

            async def write_output():
                try:
                    while True:
                        input_data = await asyncio.get_event_loop().run_in_executor(None, input)
                        exec_command.send(input_data.encode('utf-8') + b'\n')
                except KeyboardInterrupt:
                    exec_command.close()

            # Iniciar procesos de entrada y salida de manera asincrónica
            await asyncio.gather(
                read_input(),
                write_output()
            )

        except docker.errors.APIError as e:
            print(f"Error de API Docker: {e}")
        except Exception as e:
            print(f"Error: {e}")

    