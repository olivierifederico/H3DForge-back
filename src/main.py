from fastapi import FastAPI


app = FastAPI()
app.title = 'Hefesto'
app.description = 'dataload'
app.version = '0.1.0'
app.docs_url = '/docs'

@app.get('/')
def read_root():
    return {'Hello': 'World'}