from fastapi import FastAPI
from .modules.utils import load_env
from .routers import s3, mongodb
from .routers.data_providers import mega
import os

load_env()


app = FastAPI()
app.title = 'Hefesto'
app.description = 'dataload'
app.version = '0.1.0'
app.docs_url = '/docs'

app.include_router(s3.router, prefix='/s3', tags=['S3'])
app.include_router(mongodb.router, prefix='/mongodb', tags=['MongoDB'])
app.include_router(mega.router, prefix='/mega', tags=['Mega'])

@app.get('/', tags=['Root'])
def read_root():
    return {'message': 'Welcome to Hefesto'}

@app.get('/creds', tags=['Root'])
def get_creds():
    return {'message': os.getenv('MINIO_ROOT_USER')}
