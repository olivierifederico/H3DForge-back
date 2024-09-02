from fastapi import APIRouter, Request
from ..modules.mongodb.services import MongoDBService
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import base64

mongodb = MongoDBService()
core_templates = Jinja2Templates(directory='templates')
router = APIRouter()

class ImageData(BaseModel):
    image: str


@router.get('/', tags=['Core'], status_code=200)
async def read_root(request: Request):
    data = {
        'mega_raw_files_s3': await mongodb.count_documents('h3dforge', 'files',
        {
            'status.s3': True,
            'sku': {'$regex': 'mega-00'}
            }),
        'mega_raw_files': await mongodb.count_documents('h3dforge', 'files'),
    }
    return core_templates.TemplateResponse('index.html', {'request': request, 'data': data})

@router.get('/raw_to_db', tags=['Core'], status_code=200)
async def raw_to_db(request: Request):
    return core_templates.TemplateResponse('raw_to_db.html', {'request': request})


@router.post('/upload_image', tags=['Core'], status_code=200)
async def upload_screenshot(data: ImageData):
    image_data = data.image.split(",")[1]
    image_bytes = base64.b64decode(image_data)

    with open("image.png", "wb") as file:
        file.write(image_bytes)
    
    return {"status": "ok"}

@router.get('/test', tags=['Core'], status_code=200)
async def test(request: Request):
    return core_templates.TemplateResponse('test.html', {'request': request})




