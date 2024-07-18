from .config import MongoDBConfig

class MongoDBService(MongoDBConfig):
    def __init__(self):
        super().__init__()
        self. __client = self.create_client()

    async def get_databases(self):
        return await self.__client.list_database_names()
    
    async def create_collection(self, collection_name: str, db_name: str):
        await self.__client[db_name].create_collection(collection_name)

    async def get_collections(self, db_name: str):
        return await self.__client[db_name].list_collection_names()

    async def drop_collection(self, collection_name: str, db_name: str):
        await self.__client[db_name][collection_name].drop()

    async def insert_document(self, document: dict, collection_name: str, db_name: str):
        await self.__client[db_name][collection_name].insert_one(document)
    
    async def get_documents(self, collection_name: str, db_name: str):
        try:
            collection = self.__client[db_name][collection_name]
            cursor = collection.find({})
            documents = await cursor.to_list(length=None)
            for doc in documents:
                doc['_id'] = str(doc['_id'])
        except Exception as e:
            raise ValueError(f"An error occurred while getting the documents: {e}")
        return documents
    
    async def generate_sku(self, db_name:str, collection_name: str, prefix_sku: str):
        try:
            collection = self.__client[db_name][collection_name]
            cursor = collection.find({'prefix_sku': prefix_sku}).sort('sku', -1).limit(1)
            documents = await cursor.to_list(length=None)
            if not documents:
                return '0000'
            max_sku = int(documents[0]['sku'])
            new_sku = str(max_sku + 1).zfill(4)
            return new_sku
        except Exception as e:
            raise ValueError(f"An error occurred while getting the last SKU: {e}")