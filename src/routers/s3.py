from ..modules.s3 import S3Service
from ..modules.s3.schemas import S3Object
from ..modules.s3.dependencies import get_s3test_model
from fastapi import APIRouter, Path, File, UploadFile, Depends, HTTPException
from fastapi.responses import JSONResponse

s3 = S3Service()

router = APIRouter()

