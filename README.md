# 🚚 Delivery ETA – FastAPI + Docker

Predicts how many minutes an order will take to be delivered, using the model trained in `Amazon_Delivery_Time_Prediction.ipynb`.

## Folder structure

```
delivery-eta-app/
├── main.py              # FastAPI app (lifespan, Pydantic, /predict, static files)
├── requirements.txt     # Python libraries
├── Dockerfile           # How to build the Docker image
├── .dockerignore        # Files Docker should skip
├── model/
│   └── delivery_time_model.pkl   # ← YOU add this (from the notebook)
└── static/
    ├── index.html       # The web page
    ├── style.css        # The design
    └── script.js        # Talks to the API
```

## Step 1: Add your model

Run the notebook till the end. It creates `delivery_time_model.pkl`. Copy it into the `model/` folder.

⚠️ **Version check:** the scikit-learn version in `requirements.txt` must match the one you trained with. In the notebook run:

```python
import sklearn; print(sklearn.__version__)
```

and put that exact version in `requirements.txt`.

## Step 2: Run locally (without Docker)

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

- Web page: http://127.0.0.1:8000
- API docs (try the API in the browser): http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## Step 3: Run with Docker

```bash
docker build -t delivery-eta .
docker run -p 8000:8000 delivery-eta
```

Then open http://127.0.0.1:8000

## Step 4: Deploy on Render (free)

1. Push this folder to a GitHub repo (including `model/delivery_time_model.pkl`).
2. On [render.com](https://render.com): **New → Web Service** → connect the repo.
3. Render detects the `Dockerfile` automatically. Click **Deploy**.
4. Your app is live at `https://<your-app>.onrender.com`.

## How the API works

1. **Lifespan:** the model is loaded **once** when the server starts, not on every request.
2. **Pydantic (`OrderInput`):** checks every request. A rating of 7 or a traffic level of "Heavy" is rejected with a clear 422 error before it reaches the model.
3. **`make_features()`:** creates `Distance_km`, `Order_Hour`, `Order_Day` and `Is_Weekend` with the **same steps as the notebook**. If these don't match the notebook, predictions will be wrong.
4. **`/predict`:** turns the order into a one-row DataFrame and calls `model.predict()`. The pipeline inside the `.pkl` handles imputing, PowerTransformer, scaling and encoding.
5. **Static files:** `app.mount("/", ...)` serves the web page. It must come **after** the API routes, otherwise it would catch `/predict` too.

## Example request

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "agent_age": 28,
    "agent_rating": 4.7,
    "store_latitude": 12.9141,
    "store_longitude": 77.6782,
    "drop_latitude": 12.9741,
    "drop_longitude": 77.7182,
    "order_time": "2022-03-19T19:30:00",
    "weather": "Stormy",
    "traffic": "Jam",
    "vehicle": "motorcycle",
    "area": "Metropolitian",
    "category": "Electronics"
  }'
```

Response shape (the minutes depend on your trained model):

```json
{ "eta_minutes": 42.0, "distance_km": 11.1 }
```
