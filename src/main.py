from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .modules.utils import load_env
from .routers import s3, mongodb, core
from .routers.data_providers import mega
import os

load_env()


app = FastAPI()
app.title = 'Hefesto'
app.description = 'dataload'
app.version = '0.1.0'
app.docs_url = '/docs'

app.mount("/static", StaticFiles(directory='static'), name="static")
templates_main = Jinja2Templates(directory='templates')

app.include_router(s3.router, prefix='/s3', tags=['S3'])
app.include_router(mongodb.router, prefix='/mongodb', tags=['MongoDB'])
app.include_router(mega.router, prefix='/mega', tags=['Mega'])
app.include_router(core.router, tags=['Core'])




