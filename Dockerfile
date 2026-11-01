# 1. Start from a small official Python image
FROM python:3.12-slim

# 2. All our files will live in /app inside the container
WORKDIR /app

# 3. Install the libraries first (Docker caches this step, so rebuilds are faster)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy the rest of the project (main.py, model/, static/)
COPY . .

# 5. The port our app listens on
EXPOSE 8000 

# 6. Start the server. ${PORT:-8000} uses the PORT given by hosts like Render, or 8000 locally
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
