from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Role(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    SYSTEM = "system"
    CRAWLER = "crawler"

class ActionType(str, Enum):
    NAVIGATE = "navigate"
    CLICK = "click"
    INPUT = "input"
    VERIFY_TEXT = "verify_text"
    EXTRACT_TEXT = "extract_text"
    SCREENSHOT = "screenshot"
    WAIT = "wait"
    RELOAD = "reload"

class ElementFingerprint(BaseModel):
    """Visual and structural DNA of a UI element."""
    tag: str
    text: Optional[str] = None
    attributes: Dict[str, str] = {}
    xpath: Optional[str] = None
    location: Dict[str, float] = {} # {"x": 0, "y": 0}

class TestStep(BaseModel):
    step_id: int
    role: Role
    action: ActionType
    description: str
    selector: Optional[str] = None
    value: Optional[str] = None
    key_to_extract: Optional[str] = None
    fingerprint: Optional[ElementFingerprint] = None # 👈 Captured during discovery

class TestPlan(BaseModel):
    intent: str
    steps: List[TestStep]
    is_chaos_mode: bool = False # 👈 Flag for destructive testing
