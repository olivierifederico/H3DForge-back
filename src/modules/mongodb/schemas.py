from pydantic import BaseModel, Field
from typing import Optional


class CollectionSchema(BaseModel):
    name: str
    database: Optional[str] = 'h3dforge'

    class Config:
        json_schema_extra = {
            "example": {
                "name": "voidx",
                "database": "h3dforge"
            }
        }


class RawMiniatureSchema(BaseModel):
    name: str = Field(..., title='Miniature name', min_length=3, max_length=255)
    source: str = Field(..., title='Source', min_length=3, max_length=255)
    tags: list = Field(..., title='Tags', min_length=1)
    prefix_sku: str = Field('raw', title='Prefix SKU', min_length=3, max_length=5)
    path: Optional[str] = Field(None, title='Path', min_length=3, max_length=255)
    ready: Optional[bool] = Field(False, title='Ready')
    link: Optional[str] = Field(None, title='Link', min_length=3, max_length=255)
    split: Optional[bool] = Field(False, title='Split')
    size: Optional[int] = Field(None, title='Size')
    group: Optional[str] = Field(None, title='Group')
    

    class Config:
        json_schema_extra = {
            "example":{
                'name': 'Miniature Name',
                'source': 'Mega',
                'tags': ['sword', 'warrior', 'orc', 'dnd'],
                'prefix_sku': 'raw',
                'path': 'path/to/file',
                'ready': False,
                'link': 'https://link.to/miniature',
                'split': False,
                'size': 100,
                'group': 'group'
            }
        }

