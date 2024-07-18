from ..modules.mongodb.services import MongoDBService
from ..modules.mongodb.schemas import CollectionSchema, RawMiniatureSchema
from fastapi import APIRouter, Path, HTTPException

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


@router.post('/create_collection/', tags=['MongoDB'], status_code=201)
async def create_collection(collection: CollectionSchema) -> dict:
    try:
        await mongodb.create_collection(collection.name, collection.database)
        return {'message': f'Collection {collection.name} created in database {collection.database}'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete('/drop_collection/', tags=['MongoDB'], status_code=204)
async def drop_collection(collection: CollectionSchema):
    await mongodb.drop_collection(collection.name, collection.database)
    return {'message': f'Collection {collection.name} dropped from database {collection.database}'}

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
@router.post('/get_documents/', tags=['MongoDB'], status_code=200)
async def get_documents(collection: CollectionSchema) -> list:
    documents = await mongodb.get_documents(collection.name, collection.database)
    return documents
