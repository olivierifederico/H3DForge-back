from fastapi import FastAPI
from fastapi.responses import JSONResponse, HTMLResponse
from .modules.utils import load_env
from .routers import s3

# cambiar working directory a la carpeta src

load_env()


app = FastAPI()
app.title = 'Hefesto'
app.description = 'dataload'
app.version = '0.1.0'
app.docs_url = '/docs'

app.include_router(s3.router, prefix='/s3', tags=['S3'])

@app.get('/', tags=['Root'])
def read_root():
    return {'message': 'Welcome to Hefesto'}
