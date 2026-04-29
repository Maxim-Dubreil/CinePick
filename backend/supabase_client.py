import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not url or not key:
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(url, key)
