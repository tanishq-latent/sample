"""
Delivery Time (ETA) Prediction API
----------------------------------
Run locally:   uvicorn main:app --reload
Open the UI:   http://127.0.0.1:8000
API docs:      http://127.0.0.1:8000/docs
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

MODEL_PATH = "model/delivery_time_model.pkl"

# A simple dictionary to keep the loaded model in memory
ml = {}


# ------------------------------------------------------------------
# 1. Lifespan: load the model ONCE when the server starts
# ------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs on startup
    ml["model"] = joblib.load(MODEL_PATH)
    print("✅ Model loaded from", MODEL_PATH)

    yield  # The API is running while we are "paused" here

    # Runs on shutdown
    ml.clear()
    print("👋 Model removed from memory")


app = FastAPI(
    title="Delivery ETA API",
    description="Predicts how many minutes an order will take to be delivered.",
    lifespan=lifespan,
)


# ------------------------------------------------------------------
# 2. Pydantic models: what the API accepts and returns
# ------------------------------------------------------------------
class OrderInput(BaseModel):
    # Delivery partner
    agent_age: int = Field(ge=15, le=60, description="Age of the delivery partner")
    agent_rating: float = Field(ge=1, le=5, description="Rating between 1 and 5")

    # Locations
    store_latitude: float = Field(ge=-90, le=90)
    store_longitude: float = Field(ge=-180, le=180)
    drop_latitude: float = Field(ge=-90, le=90)
    drop_longitude: float = Field(ge=-180, le=180)

    # When the order was placed
    order_time: datetime

    # Conditions
    weather: Literal["Sunny", "Cloudy", "Windy", "Fog", "Stormy", "Sandstorms"]
    traffic: Literal["Low", "Medium", "High", "Jam"]
    vehicle: Literal["motorcycle", "scooter", "van", "bicycle"]
    area: Literal["Urban", "Metropolitian", "Semi-Urban", "Other"]
    category: Literal[
        "Clothing", "Electronics", "Sports", "Cosmetics", "Toys", "Snacks",
        "Shoes", "Apparel", "Jewelry", "Outdoors", "Grocery", "Books",
        "Kitchen", "Home", "Pet Supplies", "Skincare",
    ]

    # Example shown in /docs
    model_config = {
        "json_schema_extra": {
            "examples": [{
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
                "category": "Electronics",
            }]
        }
    }


class PredictionOutput(BaseModel):
    eta_minutes: float
    distance_km: float


# ------------------------------------------------------------------
# 3. Feature engineering: SAME steps as in the notebook
# ------------------------------------------------------------------
def make_features(order: OrderInput) -> pd.DataFrame:
    # Distance: difference in coordinates, 1 degree = about 111 km
    lat_diff = abs(abs(order.drop_latitude) - abs(order.store_latitude))
    lon_diff = abs(abs(order.drop_longitude) - abs(order.store_longitude))
    distance_km = (lat_diff + lon_diff) * 111

    # Time features
    order_hour = order.order_time.hour
    order_day = order.order_time.weekday()  # 0 = Monday ... 6 = Sunday
    is_weekend = 1 if order_day >= 5 else 0

    # Column names must match the notebook exactly
    return pd.DataFrame([{
        "Agent_Age": order.agent_age,
        "Agent_Rating": order.agent_rating,
        "Distance_km": distance_km,
        "Order_Hour": order_hour,
        "Order_Day": order_day,
        "Is_Weekend": is_weekend,
        "Traffic": order.traffic,
        "Weather": order.weather,
        "Vehicle": order.vehicle,
        "Area": order.area,
        "Category": order.category,
    }])


# ------------------------------------------------------------------
# 4. Endpoints
# ------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in ml}


@app.post("/predict", response_model=PredictionOutput)
def predict(order: OrderInput):
    features = make_features(order)
    distance_km = float(features["Distance_km"][0])

    # In the notebook we removed orders above 100 km, so the model never saw them
    if distance_km >= 100:
        raise HTTPException(
            status_code=400,
            detail=f"Store and drop are {distance_km:.0f} km apart. The model only works for deliveries under 100 km.",
        )

    eta = ml["model"].predict(features)[0]

    return PredictionOutput(eta_minutes=round(float(eta), 1), distance_km=round(distance_km, 2))


# ------------------------------------------------------------------
# 5. Serve the UI (must be the LAST line, after all API routes)
# ------------------------------------------------------------------
app.mount("/", StaticFiles(directory="static", html=True), name="static")
