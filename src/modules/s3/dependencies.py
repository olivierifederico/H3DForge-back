from fastapi import Form, HTTPException
from .schemas import S3Object
from pydantic import ValidationError

async def get_s3test_model(bucket_name: str = Form(...), s3_path: str = Form(...), file_name: str = Form(...), rename: str = Form(None)) -> S3Object:
    try:
        return S3Object(bucket_name=bucket_name, s3_path=s3_path, file_name=file_name, rename=rename)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())