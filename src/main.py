from fastapi import FastAPI
from fastapi.responses import JSONResponse, HTMLResponse
from dotenv import load_dotenv
import os
from .s3 import S3Router
from .s3.services import S3Service

# cambiar working directory a la carpeta src

if os.path.exists('.env'):
    print('Script corriendo en docker')
    load_dotenv('.env')
    
else:
    print('Script corriendo en local')
    os.chdir('src')
    load_dotenv('.env')


app = FastAPI()
app.title = 'Hefesto'
app.description = 'dataload'
app.version = '0.1.0'
app.docs_url = '/docs'

@app.get('/', tags=['Root'])
def read_root():
    return {'message': 'Welcome to Hefesto'}

@app.post('/s3/create/{bucket_name}', tags=['S3'], status_code=201)
def create_bucket(bucket_name: str) -> JSONResponse:
    s3 = S3Service()
    s3.create_bucket(bucket_name)
    return JSONResponse(status_code=201, content={'message': f'Bucket {bucket_name} created'})

@app.get('/s3/buckets', tags=['S3'], response_model=list[str], status_code=200)
def list_buckets() -> JSONResponse:
    s3 = S3Service()
    buckets = s3.list_buckets()
    if not buckets:
        return JSONResponse(status_code=404, content={'message': 'No buckets found'})
    return JSONResponse(status_code=200, content=buckets)

# upload file to bucket
@app.post('/s3/upload/{bucket_name}/{file_name}', tags=['S3'], status_code=201)
def upload_file(bucket_name: str, file_name: str) -> JSONResponse:
    s3 = S3Router()
    s3.save_file_s3(bucket_name, 'miniature', file_name, 'cuantoseraverda.png')
    return JSONResponse(status_code=201, content={'message': f'File {file_name} uploaded to bucket {bucket_name}'})