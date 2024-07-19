from dotenv import load_dotenv
import os

def load_env():
    print(os.getcwd())
    if os.path.exists('app/src/.env'):
        __env = load_dotenv()
        os.environ['docker'] = 'true'
    else:
        if os.path.exists(f'./src'):
            os.chdir('./src')

        __env = load_dotenv('.env')
        os.environ['docker'] = 'false'
    if __env:
        print('Environment variables loaded successfully.')
    else:
        print('Environment variables were not loaded.')