from fastapi import APIRouter, Request
from ..modules import utils
import os

router = APIRouter()

@router.get('/', tags=['Utils'], status_code=200)
async def read_root(request: Request):
    return {'message': 'Welcome to the Utils API'}

@router.get('/extract_file/{file_name}', tags=['Utils'], status_code=200)
async def extract_files(request: Request, file_name: str):
    log_path = os.path.join(os.getcwd(), 'static', 'temp', 'logs', 'raw_file_data.json')
    file_name = utils.decode_url_params(file_name)

    if not os.path.exists(log_path):
        raw_file_data = utils.extract_raw_file_data(file_name)
        utils.save_json(raw_file_data, log_path)
        return {'folder_files': raw_file_data}
    else:
        raw_file_data = utils.verify_files_raw_data_log(file_name, log_path)
        if raw_file_data:
            return {'folder_files': raw_file_data}
        else:
            raw_file_data = utils.extract_raw_file_data(file_name)
            utils.save_json(raw_file_data, log_path)
            return {'folder_files': raw_file_data}
        
            