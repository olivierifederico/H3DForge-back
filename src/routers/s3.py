from ..modules.s3 import S3Service
from ..modules.s3.schemas import S3Object
from ..modules.s3.dependencies import get_s3test_model
from fastapi import APIRouter, Path, File, UploadFile, Depends, HTTPException
from fastapi.responses import JSONResponse
from ..modules import utils
import os

s3 = S3Service()

router = APIRouter()

@router.get('/download_from_path/{path}/{ext}', tags=['S3'], status_code=200)
async def download_from_path(path: str = Path(..., title='Path to download'), ext: str = Path(..., title='Extension')) -> JSONResponse:
    try:
        url = utils.decode_url_params(path)
        extension = utils.decode_url_params(ext)
        if extension in ['.zip', '.rar', '.7z']:
            temp_path = 'static/temp/files/compressed/'
        else:
            temp_path = 'static/temp/files/ready/'
        os.makedirs(temp_path, exist_ok=True)
        temp_path = s3.download_from_path('raw-files', url, temp_path=temp_path)
        if temp_path:
            files = utils.get_files_from_path(temp_path)
            return JSONResponse(content={'files': files})
        else:
            return JSONResponse(content={'message': 'File not found'})
        
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=str(e))
    
# remove local files
@router.delete('/remove_local_files', tags=['S3'], status_code=200)
async def remove_local_files() -> JSONResponse:
    try:
        utils.remove_local_files()
        return JSONResponse(content={'message': 'Local files removed'})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))