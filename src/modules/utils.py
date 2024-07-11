from dotenv import load_dotenv
import os

def load_env():
    if os.path.exists('.env'):
        load_dotenv('.env')
    else:
        os.chdir('src')
        load_dotenv('.env')