from fastapi import APIRouter, Request
from ..modules.mongodb.services import MongoDBService
from fastapi.templating import Jinja2Templates

mongodb = MongoDBService()
core_templates = Jinja2Templates(directory='templates')
router = APIRouter()



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

@router.get('/test', tags=['Core'], status_code=200)
async def test(request: Request):
    return core_templates.TemplateResponse('test.html', {'request': request})