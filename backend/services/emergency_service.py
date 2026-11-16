import re
from typing import Optional
from backend.models.schemas import EmergencyInfo

# Keywords in English and common Indic romanized/script forms
EMERGENCY_PATTERNS = {
    "violence_abuse": [
        r"\bviolence\b", r"\babuse\b", r"\bbeating\b", r"\bassault\b", r"\bdomestic violence\b",
        r"\bhurt\b", r"\bthreatened\b", r"\battack\b", r"\bmurder\b", r"\brape\b", r"\bmarpeet\b",
        r"\bhinsa\b", r"\bmaar peet\b", r"मारपीट", r"हिंसा", r"घरेलू हिंसा", r"தாக்குதல்", r"கொலை"
    ],
    "arrest_custody": [
        r"\barrest\b", r"\barrested\b", r"\bpolice custody\b", r"\blockup\b", r"\bhandcuff\b",
        r"\bgiraftaar\b", r"\bgirftari\b", r"\bhirasat\b", r"गिरफ्तार", r"हिरासत", r"கைது"
    ],
    "suicide_selfharm": [
        r"\bsuicide\b", r"\bkill myself\b", r"\bend my life\b", r"\bself harm\b", r"\batmahatya\b",
        r"आत्महत्या", r"தற்கொலை"
    ],
    "cyber_threats": [
        r"\bblackmail\b", r"\bcyber fraud\b", r"\bmoney stolen online\b", r"\botp scam\b",
        r"\bextortion\b", r"\bdhamki\b", r"धमकी", r"साइबर फ्रॉड"
    ]
}

HELPLINE_DATA = [
    {"service": "National Emergency Helpline", "number": "112", "description": "Police, Fire, Ambulance 24x7"},
    {"service": "Women Helpline (Domestic Abuse/Violence)", "number": "181", "description": "Toll-free 24/7 emergency response for women"},
    {"service": "Childline (Children in distress)", "number": "1098", "description": "National 24-hour emergency phone service for children"},
    {"service": "National Cyber Crime Helpline", "number": "1930", "description": "Immediate financial fraud reporting & assistance"},
    {"service": "Tele-Law / Free Legal Aid (NALSA)", "number": "14454", "description": "Free legal advice from panel advocates"}
]

def check_emergency(text: str) -> Optional[EmergencyInfo]:
    if not text:
        return None
    
    matched_category = None
    lower_text = text.lower()
    
    for category, patterns in EMERGENCY_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, lower_text, re.IGNORECASE):
                matched_category = category
                break
        if matched_category:
            break
            
    if not matched_category:
        return None
        
    advisories = {
        "violence_abuse": "If you or someone else is in immediate physical danger, please contact emergency authorities right away. Help is available 24/7.",
        "arrest_custody": "If you or a loved one is being arrested, remember your rights: right to see grounds of arrest, right to an arrest memo, right to inform family, and right to consult a lawyer. Dial 112 or Tele-Law 14454.",
        "suicide_selfharm": "You are not alone. Please reach out to compassionate professionals immediately. Call National Emergency 112 or Tele-MANAS 14416.",
        "cyber_threats": "For cyber financial fraud, report immediately to 1930 within the golden hour to freeze fraudulent transactions."
    }
    
    return EmergencyInfo(
        is_emergency=True,
        category=matched_category,
        helplines=HELPLINE_DATA,
        advisory=advisories.get(matched_category, "Emergency assistance is available. Please reach out to verified helplines immediately.")
    )
