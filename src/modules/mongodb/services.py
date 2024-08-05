from .config import MongoDBConfig
import os
from datetime import datetime, timezone

now = datetime.now(timezone.utc)

class MongoDBService(MongoDBConfig):
    def __init__(self):
        super().__init__()
        self. __client = self.create_client()

    async def get_databases(self):
        return await self.__client.list_database_names()
    
    async def drop_database(self, db_name: str):
        await self.__client.drop_database(f'{db_name}_{os.getenv('ENV')}')
    
    async def create_collection(self, collection_name: str, db_name: str):
        await self.__client[f'{db_name}_{os.getenv('ENV')}'].create_collection(collection_name)

    async def get_collections(self, db_name: str):
        return await self.__client[f'{db_name}_{os.getenv('ENV')}'].list_collection_names()

    async def drop_collection(self, collection_name: str, db_name: str):
        await self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name].drop()

    async def insert_document(self, db_name: str, collection_name: str, document: dict):
        await self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name].insert_one(document)

    async def insert_many_documents(self, documents: list, collection_name: str, db_name: str):
        await self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name].insert_many(documents)
    
    async def get_documents(self, db_name: str, collection_name: str, query: dict = None):
        try:
            collection = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name]
            cursor = collection.find({}) if query is None else collection.find(query)
            documents = await cursor.to_list(length=None)
            for doc in documents:
                doc['_id'] = str(doc['_id'])
        except Exception as e:
            raise ValueError(f"An error occurred while getting the documents: {e}")
        return documents
    
    async def update_document(self, db_name: str, collection_name: str, doc_field:str, doc_value:any, document: dict):
        try:
            collection = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name]
            await collection.update_one({doc_field: doc_value}, {'$set': document})
        except Exception as e:
            raise ValueError(f"An error occurred while updating the document: {e}")
        
    async def update_many_documents(self, db_name: str, collection_name: str, query: dict, document: dict):
        try:
            collection = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name]
            await collection.update_many(query, {'$set': document})
        except Exception as e:
            raise ValueError(f"An error occurred while updating the documents: {e}")
        
    async def update_source(self, db_name:str, source_sku: str, document: dict):
        await self.update_document(db_name, 'sources', 'sku', source_sku, document)
    
    async def generate_sku(self, db_name:str, collection_name: str, prefix_sku: str, fill: int = 4) -> str:
        try:
            collection = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name]
            cursor = collection.find({'prefix_sku': prefix_sku}).sort('sku', -1).limit(1)
            documents = await cursor.to_list(length=None)
            if not documents:
                sku = ''
                return sku.zfill(fill)
            else:
                # necesito obtener el numero despues del ultimo
                max_sku = int(documents[0]['sku_number'])
                new_sku = str(max_sku + 1).zfill(fill)
                return new_sku
        except Exception as e:
            raise ValueError(f"An error occurred while getting the last SKU: {e}")
        

    async def insert_source(self, db_name:str, source: dict):
        collection = 'sources'
        prev_source = await self.get_document_by_name(db_name, collection, 'name', source['name'])
        if prev_source['exists']:
            return False, prev_source['sku']
        else:
            try:
                source['prefix_sku'] = source['origin']
                source.pop('origin')
                source['sku_number'] = await self.generate_sku(db_name, collection, source['prefix_sku'], fill=2)
                source['sku'] = f"{source['prefix_sku']}-{source['sku_number']}"
                source['timestamp'] = now.strftime('%Y-%m-%d %H:%M:%S')
                await self.insert_document(db_name, collection, source)
                return True, source['sku']
            except Exception as e:
                raise ValueError(f"An error occurred while inserting the source's document: {e}")
        
    async def insert_main_folder(self, db_name:str, folder: dict):
        collection = 'main_folders'
        prev_folder = await self.get_document_by_field(db_name, collection, 'name', folder['name'])
        if prev_folder['exists']:
            return False, prev_folder['sku']
        else:
            try:
                folder['sku_number'] = await self.generate_sku(db_name, collection, folder['prefix_sku'])
                folder['sku'] = f"{folder['prefix_sku']}-{folder['sku_number']}"
                folder['timestamp'] = now.strftime('%Y-%m-%d %H:%M:%S')
                await self.insert_document(db_name, collection, folder)
                return True, folder['sku']
            except Exception as e:
                raise ValueError(f"An error occurred while inserting the folder's document: {e}")
            
    async def insert_sub_folders(self, db_name:str, main_folder_sku: str,sub_folder: dict):
        collection = 'sub_folders'
        prev_sub_folder = await self.get_document_by_field(db_name, collection, 'name', sub_folder['name'])
        print(prev_sub_folder)
        if prev_sub_folder['exists']:
            return False, prev_sub_folder['sku']
        else:
            try:
                sub_folder['prefix_sku'] = main_folder_sku
                sub_folder['sku_number'] = await self.generate_sku(db_name, collection, sub_folder['prefix_sku'])
                sub_folder['sku'] = f"{sub_folder['prefix_sku']}-{sub_folder['sku_number']}"
                sub_folder['timestamp'] = now.strftime('%Y-%m-%d %H:%M:%S')
                await self.insert_document(db_name, collection, sub_folder)
                return True, sub_folder['sku']
            except Exception as e:
                raise ValueError(f"An error occurred while inserting the sub folder's document: {e}")

    async def get_document_by_field(self, db_name:str, collection_name: str, document_field: str, field_value: str) -> dict:
        try:
            collection = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection_name]
            cursor = collection.find({document_field: field_value})
            documents = await cursor.to_list(length=None)
            for doc in documents:
                doc['_id'] = str(doc['_id'])
        except Exception as e:
            raise ValueError(f"An error occurred while getting the documents: {e}")
        if not documents:
            documents = {}
            documents['exists'] = False
        else:
            documents = documents[0]
            documents['exists'] = True
        return documents
    
    async def get_subfolder_names(self, db_name:str, main_folder_sku: str):
        collection = 'sub_folders'
        cursor = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection].find({'prefix_sku': main_folder_sku})
        documents = await cursor.to_list(length=None)
        subfolders = []
        for doc in documents:
            subfolders.append(doc['name'])
        return subfolders
    
    async def get_sub_folders(self, db_name:str, main_folder_sku: str):
        collection = 'sub_folders'
        cursor = self.__client[f'{db_name}_{os.getenv('ENV')}'][collection].find({'prefix_sku': main_folder_sku})
        documents = await cursor.to_list(length=None)
        for doc in documents:
            doc['_id'] = str(doc['_id'])
        return documents
    