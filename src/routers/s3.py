from ..modules.s3 import S3Service
from ..modules.s3.schemas import S3Object
from ..modules.s3.dependencies import get_s3test_model
from fastapi import APIRouter, Path, File, UploadFile, Depends, HTTPException
from fastapi.responses import JSONResponse
from ..modules import utils

s3 = S3Service()

router = APIRouter()

@router.get('/download_from_path/{path}', tags=['S3'], status_code=200)
async def download_from_path(path: str = Path(..., title='Path to download')) -> JSONResponse:
    try:
        url = utils.decode_url_params(path)
        temp_path = s3.download_from_path('raw-files', url)
        if temp_path:
            files = utils.get_files_from_path(temp_path)
            return JSONResponse(content={'files': files})
        else:
            return JSONResponse(content={'message': 'File not found'})
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))