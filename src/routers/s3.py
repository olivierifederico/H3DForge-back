from ..modules.s3 import S3Service
from ..modules.s3.schemas import S3Object
from ..modules.s3.dependencies import get_s3test_model
from fastapi import APIRouter, Path, File, UploadFile, Depends
from fastapi.responses import JSONResponse

s3 = S3Service()

router = APIRouter()

@router.post('/create/{bucket_name}', tags=['S3'], status_code=201) 
def create_bucket(bucket_name: str = Path(..., title='S3 Bucket name', min_length=3, max_length=64)) -> JSONResponse:
    s3.create_bucket(bucket_name) 
    return JSONResponse(status_code=201, content={'message': f'Bucket {bucket_name} created'})

@router.delete('/delete/{bucket_name}', tags=['S3'], status_code=204)
def delete_bucket(bucket_name: str = Path(..., title='S3 Bucket name', min_length=3, max_length=64)) -> JSONResponse:
    s3.delete_bucket(bucket_name)
    return JSONResponse(status_code=204, content={'message': f'Bucket {bucket_name} deleted'})

@router.get('/list_buckets', tags=['S3'], status_code=200)
def list_buckets() -> JSONResponse:
    buckets = s3.list_buckets()
    return JSONResponse(status_code=200, content={'buckets': buckets})

@router.delete('/delete_object', tags=['S3'], status_code=204)
def delete_file(object_to_delete_s3: S3Object) -> JSONResponse:
    try:
        s3.remove_file(object_to_delete_s3.bucket_name, object_to_delete_s3.file_name, object_to_delete_s3.s3_path)
    except Exception as e:
        return JSONResponse(status_code=500, content={'message': f'An error occurred while deleting the file:{e}'})
    
    return JSONResponse(status_code=204, content=None)

@router.post('/save_object', tags=['S3'], status_code=200)
async def save_test(object_info:S3Object = Depends(get_s3test_model), file: UploadFile = File(...)) -> JSONResponse:
    try:
        file_content = await file.read()
        with open(f'./{object_info.file_name}', 'wb') as f:
            f.write(file_content)
            s3.save_file_s3(object_info.bucket_name, object_info.file_name, object_info.s3_path, object_info.rename)
    except Exception as e:
        return JSONResponse(status_code=500, content={'message': f'An error occurred while saving the file:{e}'})
    
    return JSONResponse(status_code=200, content={'message': f'File {file.filename} saved in local'})
