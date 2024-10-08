from ..modules.mongodb.services import MongoDBService
from ..modules.mongodb.schemas import CollectionSchema, RawMiniatureSchema
from fastapi import APIRouter, Path, HTTPException, Query
from ..modules import utils
from bson import ObjectId

mongodb = MongoDBService()

router = APIRouter()

@router.get('/databases', tags=['MongoDB'], status_code=200)
async def get_databases() -> list:
    databases = await mongodb.get_databases()
    return databases

@router.get('/{db_name}/collections/', tags=['MongoDB'], status_code=200)
async def get_collections(db_name: str = Path(..., title='Database name')) -> list:
    collections = await mongodb.get_collections(db_name)
    return collections

# FIX HARDCODED DB NAME AND COLLECTION NAME
@router.get('/get_document_by_id/{id}', tags=['MongoDB'], status_code=200)
async def get_document_by_id(id: str) -> dict:
    document = await mongodb.get_document_by_id('h3dforge', 'files', id, ['source_data._id'])
    return document

@router.get('/get_raw_file/{source_id}/{extension}', tags=['MongoDB'], status_code=200)
async def get_first_document(source_id:str, extension:str) -> dict:
    extension = utils.decode_url_params(extension)
    print(source_id, extension)
    source_id = ObjectId(source_id)
    filter_query = {
        'source_data._id': source_id,
        'status.s3': True,
        'status.db': False,
        'status.fix': {'$ne': True},
        'sub_category': {'$nin': ['monster', 'other', 'part', 'terrain']}
    }
    if extension != 'no_extension' or extension != 'any_extension':
        filter_query['extension'] = extension

    document = await mongodb.get_first_document(
        'h3dforge',
        'files',
        filter_query,
        ['source_data._id']
    )
    return document

@router.post('/add_3d_model/', tags=['MongoDB'], status_code=200)
async def add_3dmodel(model_data:dict) -> bool:
    print(model_data)
    return True

# add a new option to the document
@router.put('/add_form_option/{id}/{detail_field}/{field}/{option}', tags=['MongoDB'], status_code=200)
async def add_form_option(id: str, detail_field: str, field:str ,option: str) -> bool:
    option = utils.decode_url_params(option)
    response = await mongodb.add_form_option('h3dforge', 'forms', id, detail_field, field, option)
    return response



@router.put('/set_sub_category/{id}/{sub_category}', tags=['MongoDB'], status_code=200)
async def set_model_type(id: str, sub_category: str) -> bool:
    model_type = utils.decode_url_params(sub_category)
    response = await mongodb.update_document('h3dforge', 'files','_id', id, {'sub_category': sub_category})
    return response

@router.put('/set_fix/{id}/{reason}', tags=['MongoDB'], status_code=200)
async def set_fix(id: str, reason: str) -> bool:
    reason = utils.decode_url_params(reason)
    response = await mongodb.update_document('h3dforge', 'files','_id', id, {'status.fix': True, 'status.reason': reason, 'status.updated_at': utils.get_current_time()})
    return response
    

@router.post('/create_collection/', tags=['MongoDB'], status_code=201)
async def create_collection(collection: CollectionSchema) -> dict:
    try:
        await mongodb.create_collection(collection.name, collection.database)
        return {'message': f'Collection {collection.name} created in database {collection.database}'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/get_form/{form_id}', tags=['MongoDB'], status_code=200)
async def get_form(form_id: str = Path(..., title='Form id')) -> dict:
    form = await mongodb.get_document_by_field('h3dforge', 'forms', 'id', form_id)
    return form

# insertar documento en una colección
@router.post('/insert_document/', tags=['MongoDB'], status_code=201)
async def insert_document(document: RawMiniatureSchema, collection: CollectionSchema) -> dict:
    # try:
        document_dict = document.model_dump()
        document_dict['sku'] = await mongodb.generate_sku(collection.database, collection.name, document_dict['prefix_sku'])
        await mongodb.insert_document(document_dict, collection.name, collection.database)
        return {'message': f'Document {document.name} inserted in collection {collection.name}'}
    # except Exception as e:
    #     raise HTTPException(status_code=400, detail=str(e))
    
# obtener documentos de una colección
@router.get('/get_documents/', tags=['MongoDB'], status_code=200)
async def get_documents(database: str = Query(...), name: str = Query(...)) -> list:
    print(database, name)
    documents = await mongodb.get_documents(database, name)
    return documents

@router.get('/get_categories_data/', tags=['MongoDB'], status_code=200)
async def get_cat_info() -> dict:
    categories, sub_categories = await mongodb.get_sub_categories('h3dforge')
    return {'categories': categories, 'sub_categories': sub_categories}