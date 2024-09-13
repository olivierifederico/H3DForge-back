from fastapi import APIRouter, Request
from ..modules import utils
from ..modules.file_handler.services import FileHandlerService
import os

router = APIRouter()
file_handler = FileHandlerService()

@router.get('/', tags=['Utils'], status_code=200)
async def read_root(request: Request):
    return {'message': 'Welcome to the Utils API'}

@router.get('/extract_file/{file_name}', tags=['Utils'], status_code=200)
async def extract_files(request: Request, file_name: str):
    file_name = utils.decode_url_params(file_name)
    print('file_name', file_name)
    final_data = {'folder_files' :file_handler.prepare_raw_file(file_name)}
    return final_data
            