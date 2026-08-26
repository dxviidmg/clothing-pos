from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, catalog, inventory, products, sales, stores

app = FastAPI(
    title="Clothing POS API",
    description="Multi-tenant Point of Sale system for clothing stores",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(stores.router)
app.include_router(catalog.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(sales.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
