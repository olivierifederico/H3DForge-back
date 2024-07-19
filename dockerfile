FROM python:3.12.3-slim

WORKDIR /app

COPY ./src app/src
COPY ./src/.env app/src/.env
COPY requirements.txt app/src/requirements/requirements.txt

RUN pip install --upgrade pip
RUN pip install --no-cache-dir --upgrade -r app/src/requirements/requirements.txt

CMD ["uvicorn", "app.src.main:app", "--host", "0.0.0.0", "--port", "80"]