"""Location and practice-area matching for the lawyer directory.

The directory is deliberately small (a few dozen verified profiles), so the
router loads verified rows and filters them here in Python. That keeps the
matching behaviour testable and lets us support aliases, typo tolerance,
native-script city names and PIN codes without fragile SQL LIKE chains.
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Set

from backend.services.language_names import canonical_language_name

# Words that describe a location but should not prevent a match on their own,
# e.g. "South Delhi" should still find Delhi, and "Mumbai City" should find
# Mumbai. They are only ignored when a stronger term in the query matched.
OPTIONAL_LOCATION_WORDS = {
    "india", "in", "near", "city", "district", "state", "area", "locality",
    "region", "north", "south", "east", "west", "central", "new", "old",
}

LOCATION_ALIASES = {
    "bangalore": "bengaluru",
    "bangalor": "bengaluru",
    "bengalore": "bengaluru",
    "bengluru": "bengaluru",
    "bengalooru": "bengaluru",
    "bombay": "mumbai",
    "madras": "chennai",
    "calcutta": "kolkata",
    "cochin": "kochi",
    "trivandrum": "thiruvananthapuram",
    "gurgaon": "gurugram",
    "gurgoan": "gurugram",
    "hydrabad": "hyderabad",
    "vizag": "visakhapatnam",
    "vishakhapatnam": "visakhapatnam",
    "vizagapatnam": "visakhapatnam",
    "bhubaneshwar": "bhubaneswar",
    "newdelhi": "delhi",
    "new delhi": "delhi",
    "old delhi": "delhi",
    "gauhati": "guwahati",
    "gawhati": "guwahati",
    "orissa": "odisha",
    "uttaranchal": "uttarakhand",
    "pondicherry": "puducherry",
    "telengana": "telangana",
    "rajastan": "rajasthan",
    "maharasthra": "maharashtra",
    "gujrat": "gujarat",
}

REGION_GROUPS = {
    "ncr": {"delhi", "noida", "gurugram"},
    "delhi ncr": {"delhi", "noida", "gurugram"},
    "national capital region": {"delhi", "noida", "gurugram"},
    "mumbai metropolitan region": {"mumbai", "thane", "navi mumbai"},
    "mmr": {"mumbai", "thane", "navi mumbai"},
}

# Native-script names for the cities/states the directory covers. Keys are
# normalised at import time, so matras/viramas are preserved consistently.
NATIVE_LOCATION_ALIASES = {
    # Delhi
    "दिल्ली": "delhi", "दिल्ली शहर": "delhi", "ఢిల్లీ": "delhi", "டெல்லி": "delhi",
    "ದೆಹಲಿ": "delhi", "ഡൽഹി": "delhi", "দিল্লি": "delhi", "દિલ્હી": "delhi",
    "ਦਿੱਲੀ": "delhi", "دہلی": "delhi",
    # Mumbai
    "मुंबई": "mumbai", "బొంబాయి": "mumbai", "ముంబై": "mumbai", "மும்பை": "mumbai",
    "ಮುಂಬೈ": "mumbai", "മുംബൈ": "mumbai", "মুম্বই": "mumbai", "મુંબઈ": "mumbai",
    "ਮੁੰਬਈ": "mumbai", "ممبئی": "mumbai",
    # Bengaluru
    "बेंगलुरु": "bengaluru", "बंगलौर": "bengaluru", "బెంగళూరు": "bengaluru",
    "பெங்களூரு": "bengaluru", "ಬೆಂಗಳೂರು": "bengaluru", "ബെംഗളൂരു": "bengaluru",
    "বেঙ্গালুরু": "bengaluru", "બેંગલુરુ": "bengaluru", "ਬੰਗਲੌਰ": "bengaluru",
    "بنگلور": "bengaluru",
    # Hyderabad
    "हैदराबाद": "hyderabad", "హైదరాబాద్": "hyderabad", "హైదరాబాదు": "hyderabad",
    "ஹைதராபாத்": "hyderabad", "ಹೈದರಾಬಾದ್": "hyderabad", "ഹൈദരാബാദ്": "hyderabad",
    "হায়দ্রাবাদ": "hyderabad", "હૈદરાબાદ": "hyderabad", "حیدرآباد": "hyderabad",
    # Chennai
    "चेन्नई": "chennai", "చెన్నై": "chennai", "சென்னை": "chennai", "ಚೆನ್ನೈ": "chennai",
    "ചെന്നൈ": "chennai", "চেন্নাই": "chennai", "ચેન્નાઈ": "chennai", "ਚੇਨਈ": "chennai",
    "چنئی": "chennai",
    # Kolkata
    "कोलकाता": "kolkata", "कलकत्ता": "kolkata", "కోల్కతా": "kolkata",
    "கொல்கத்தா": "kolkata", "ಕೋಲ್ಕತ್ತಾ": "kolkata", "കൊൽക്കത്ത": "kolkata",
    "কলকাতা": "kolkata", "કોલકાતા": "kolkata", "ਕੋਲਕਾਤਾ": "kolkata", "کولکاتا": "kolkata",
    # Pune
    "पुणे": "pune", "పుణె": "pune", "புனே": "pune", "ಪುಣೆ": "pune", "പൂനെ": "pune",
    "পুনে": "pune", "પુણે": "pune", "ਪੁਣੇ": "pune", "پونے": "pune",
    # Ahmedabad
    "अहमदाबाद": "ahmedabad", "అహ్మదాబాద్": "ahmedabad", "அகமதாபாத்": "ahmedabad",
    "ಅಹಮದಾಬಾದ್": "ahmedabad", "അഹമ്മദാബാദ്": "ahmedabad", "আহমেদাবাদ": "ahmedabad",
    "અમદાવાદ": "ahmedabad", "ਅਹਿਮਦਾਬਾਦ": "ahmedabad", "احمدآباد": "ahmedabad",
    # Jaipur
    "जयपुर": "jaipur", "జైపూర్": "jaipur", "ஜெய்ப்பூர்": "jaipur", "ಜೈಪುರ": "jaipur",
    "ജയ്പൂർ": "jaipur", "জয়পুর": "jaipur", "જયપુર": "jaipur", "ਜੈਪੁਰ": "jaipur",
    "جے پور": "jaipur",
    # Lucknow
    "लखनऊ": "lucknow", "లక్నో": "lucknow", "லக்னோ": "lucknow", "ಲಕ್ನೋ": "lucknow",
    "ലക്നൗ": "lucknow", "লক্ষ্ণৌ": "lucknow", "લખનૌ": "lucknow", "ਲਖਨਊ": "lucknow",
    "لکھنؤ": "lucknow",
    # Chandigarh
    "चंडीगढ़": "chandigarh", "చండీగఢ్": "chandigarh", "சண்டிகர்": "chandigarh",
    "ಚಂಡೀಗಢ": "chandigarh", "ചണ്ഡിഗഢ്": "chandigarh", "চণ্ডীগড়": "chandigarh",
    "ચંડીગઢ": "chandigarh", "ਚੰਡੀਗੜ੍ਹ": "chandigarh", "چندی گڑھ": "chandigarh",
    # Kochi
    "कोच्चि": "kochi", "कोचीन": "kochi", "కొచ్చి": "kochi", "கொச்சி": "kochi",
    "ಕೊಚ್ಚಿ": "kochi", "കൊച്ചി": "kochi", "কোচি": "kochi", "કોચી": "kochi",
    "ਕੋਚੀ": "kochi", "کوچی": "kochi",
    # Indore
    "इंदौर": "indore", "ఇందూర్": "indore", "இந்தூர்": "indore", "ಇಂದೋರ್": "indore",
    "ഇൻഡോർ": "indore", "ইন্দোর": "indore", "ઇન્દોર": "indore", "ਇੰਦੌਰ": "indore",
    "اندور": "indore",
    # Patna
    "पटना": "patna", "పట్నా": "patna", "பாட்னா": "patna", "ಪಾಟ್ನಾ": "patna",
    "പട്ന": "patna", "পাটনা": "patna", "પટના": "patna", "ਪਟਨਾ": "patna", "پٹنہ": "patna",
    # Bhopal
    "भोपाल": "bhopal", "భోపాల్": "bhopal", "போபால்": "bhopal", "ಭೋಪಾಲ್": "bhopal",
    "ഭോപ്പാൽ": "bhopal", "ভোপাল": "bhopal", "ભોપાલ": "bhopal", "ਭੋਪਾਲ": "bhopal",
    "بھوپال": "bhopal",
    # Visakhapatnam
    "विशाखापत्तनम": "visakhapatnam", "విశాఖపట్నం": "visakhapatnam",
    "விசாகப்பட்டினம்": "visakhapatnam", "ವಿಶಾಖಪಟ್ಟಣ": "visakhapatnam",
    "വിശാഖപട്ടണം": "visakhapatnam", "বিশাখাপত্তনম": "visakhapatnam",
    "વિશાખાપટ્ટનમ": "visakhapatnam", "ਵਿਸ਼ਾਖਾਪਟਨਮ": "visakhapatnam",
    "وشاکھاپٹنم": "visakhapatnam",
    # Guwahati
    "गुवाहाटी": "guwahati", "గౌహతి": "guwahati", "குவாஹாட்டி": "guwahati",
    "ಗುವಾಹಟಿ": "guwahati", "ഗുവാഹത്തി": "guwahati", "গুয়াহাটি": "guwahati",
    "ગુવાહાટી": "guwahati", "ਗੁਵਾਹਾਟੀ": "guwahati", "گوہاٹی": "guwahati",
    # Bhubaneswar
    "भुवनेश्वर": "bhubaneswar", "భువనేశ్వర్": "bhubaneswar", "புவனேஸ்வர்": "bhubaneswar",
    "ಭುವನೇಶ್ವರ": "bhubaneswar", "ഭുവനേശ്വർ": "bhubaneswar", "ভুবনেশ্বর": "bhubaneswar",
    "ભુવનેશ્વર": "bhubaneswar", "ਭੁਵਨੇਸ਼ਵਰ": "bhubaneswar", "بھوبنیشور": "bhubaneswar",
    # Thiruvananthapuram
    "तिरुवनंतपुरम": "thiruvananthapuram", "తిరువనంతపురం": "thiruvananthapuram",
    "திருவனந்தபுரம்": "thiruvananthapuram", "ತಿರುವನಂತಪುರಂ": "thiruvananthapuram",
    "തിരുവനന്തപുരം": "thiruvananthapuram", "তিরুবনন্তপুরম": "thiruvananthapuram",
    "તિરુવનંતપુરમ": "thiruvananthapuram", "ਤਿਰੁਵਨੰਤਪੁਰਮ": "thiruvananthapuram",
    "ترواننت پورم": "thiruvananthapuram",
    # Dehradun
    "देहरादून": "dehradun", "డెహ్రాడూన్": "dehradun", "டேராடூன்": "dehradun",
    "ಡೆಹ್ರಾಡೂನ್": "dehradun", "ഡെറാഡൂൺ": "dehradun", "দেরাদুন": "dehradun",
    "દહેરાદૂન": "dehradun", "ਦੇਹਰਾਦੂਨ": "dehradun", "دہرادون": "dehradun",
    # Noida
    "नोएडा": "noida", "నోయిడా": "noida", "நொய்டா": "noida", "ನೊಯಿಡಾ": "noida",
    "നോയിഡ": "noida", "নয়ডা": "noida", "નોઇડા": "noida", "ਨੋਇਡਾ": "noida",
    "نوئیڈا": "noida",
    # Gurugram
    "गुरुग्राम": "gurugram", "गुड़गांव": "gurugram", "గురుగ్రామ్": "gurugram",
    "குருகிராம்": "gurugram", "ಗುರುಗ್ರಾಮ್": "gurugram", "ഗുരുഗ്രാം": "gurugram",
    "গুরুগ্রাম": "gurugram", "ગુરુગ્રામ": "gurugram", "ਗੁਰੂਗ੍ਰਾਮ": "gurugram",
    "گروگرام": "gurugram",
    # States
    "तेलंगाना": "telangana", "तेलंगणा": "telangana", "తెలంగాణ": "telangana",
    "ತೆಲಂಗಾಣ": "telangana", "തെലങ്കാന": "telangana", "তেলেঙ্গানা": "telangana",
    "તેલંગાણા": "telangana", "ਤੇਲੰਗਾਣਾ": "telangana", "تلنگانہ": "telangana",
    "कर्नाटक": "karnataka", "కర్ణాటక": "karnataka", "கருநாடகம்": "karnataka",
    "ಕರ್ನಾಟಕ": "karnataka", "കർണാടക": "karnataka", "কর্ণাটক": "karnataka",
    "કર્ણાટક": "karnataka", "ਕਰਨਾਟਕ": "karnataka", "کرناٹک": "karnataka",
    "तमिलनाडु": "tamil nadu", "తమిళనాడు": "tamil nadu", "தமிழ்நாடு": "tamil nadu",
    "ತಮಿಳುನಾಡು": "tamil nadu", "തമിഴ്നാട്": "tamil nadu", "তামিলনাড়ু": "tamil nadu",
    "તમિલનાડુ": "tamil nadu", "ਤਮਿਲਨਾਡੂ": "tamil nadu", "تمل ناڈو": "tamil nadu",
    "महाराष्ट्र": "maharashtra", "మహారాష్ట్ర": "maharashtra", "மகாராஷ்டிரா": "maharashtra",
    "ಮಹಾರಾಷ್ಟ್ರ": "maharashtra", "മഹാരാഷ്ട്ര": "maharashtra", "মহারাষ্ট্র": "maharashtra",
    "મહારાષ્ટ્ર": "maharashtra", "ਮਹਾਰਾਸ਼ਟਰ": "maharashtra", "مہاراشٹر": "maharashtra",
    "गुजरात": "gujarat", "గుజరాత్": "gujarat", "குஜராத்": "gujarat",
    "ಗುಜರಾತ್": "gujarat", "ഗുജറാത്ത്": "gujarat", "গুজরাট": "gujarat",
    "ગુજરાત": "gujarat", "ਗੁਜਰਾਤ": "gujarat", "گجرات": "gujarat",
    "राजस्थान": "rajasthan", "రాజస్థాన్": "rajasthan", "ராஜஸ்தான்": "rajasthan",
    "ರಾಜಸ್ಥಾನ": "rajasthan", "രാജസ്ഥാൻ": "rajasthan", "রাজস্থান": "rajasthan",
    "રાજસ્થાન": "rajasthan", "ਰਾਜਸਥਾਨ": "rajasthan", "راجستھان": "rajasthan",
    "उत्तर प्रदेश": "uttar pradesh", "ఉత్తర ప్రదేశ్": "uttar pradesh",
    "உத்தரப் பிரதேசம்": "uttar pradesh", "ಉತ್ತರ ಪ್ರದೇಶ": "uttar pradesh",
    "ഉത്തർപ്രദേശ്": "uttar pradesh", "উত্তরপ্রদেশ": "uttar pradesh",
    "ઉત્તર પ્રદેશ": "uttar pradesh", "ਉੱਤਰ ਪ੍ਰਦੇਸ਼": "uttar pradesh",
    "اتر پردیش": "uttar pradesh",
    "केरल": "kerala", "కేరళ": "kerala", "கேரளா": "kerala", "ಕೇರಳ": "kerala",
    "കേരളം": "kerala", "কেরালা": "kerala", "કેરળ": "kerala", "ਕੇਰਲ": "kerala",
    "کیرالہ": "kerala",
    "मध्य प्रदेश": "madhya pradesh", "మధ్య ప్రదేశ్": "madhya pradesh",
    "மத்தியப் பிரதேசம்": "madhya pradesh", "ಮಧ್ಯ ಪ್ರದೇಶ": "madhya pradesh",
    "മധ്യപ്രദേശ്": "madhya pradesh", "মধ্যপ্রদেশ": "madhya pradesh",
    "મધ્ય પ્રદેશ": "madhya pradesh", "ਮੱਧ ਪ੍ਰਦੇਸ਼": "madhya pradesh",
    "مدھیہ پردیش": "madhya pradesh",
    "बिहार": "bihar", "బీహార్": "bihar", "பீகார்": "bihar", "ಬಿಹಾರ": "bihar",
    "ബിഹാർ": "bihar", "বিহার": "bihar", "બિહાર": "bihar", "ਬਿਹਾਰ": "bihar",
    "بہار": "bihar",
    "आंध्र प्रदेश": "andhra pradesh", "ఆంధ్ర ప్రదేశ్": "andhra pradesh",
    "ஆந்திரப் பிரதேசம்": "andhra pradesh", "ಆಂಧ್ರ ಪ್ರದೇಶ": "andhra pradesh",
    "ആന്ധ്രാപ്രദേശ്": "andhra pradesh", "অন্ধ্রপ্রদেশ": "andhra pradesh",
    "આંધ્ર પ્રદેશ": "andhra pradesh", "ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼": "andhra pradesh",
    "آندھرا پردیش": "andhra pradesh",
    "असम": "assam", "అసోం": "assam", "அசாம்": "assam", "ಅಸ್ಸಾಂ": "assam",
    "അസം": "assam", "আসাম": "assam", "આસામ": "assam", "ਅਸਾਮ": "assam",
    "آسام": "assam",
    "ओडिशा": "odisha", "ఒడిశా": "odisha", "ஒடிசா": "odisha", "ಒಡಿಶಾ": "odisha",
    "ഒഡിഷ": "odisha", "ওড়িশা": "odisha", "ઓડિશા": "odisha", "ਓਡੀਸ਼ਾ": "odisha",
    "اوڈیشہ": "odisha",
    "उत्तराखंड": "uttarakhand", "ఉత్తరాఖండ్": "uttarakhand",
    "உத்தரகாண்ட்": "uttarakhand", "ಉತ್ತರಾಖಂಡ": "uttarakhand",
    "ഉത്തരാഖണ്ഡ്": "uttarakhand", "উত্তরাখণ্ড": "uttarakhand",
    "ઉત્તરાખંડ": "uttarakhand", "ਉੱਤਰਾਖੰਡ": "uttarakhand",
    "اتراکھنڈ": "uttarakhand",
    "हरियाणा": "haryana", "హర్యానా": "haryana", "ஹரியானா": "haryana",
    "ಹರಿಯಾಣ": "haryana", "ഹരിയാന": "haryana", "হরিয়ানা": "haryana",
    "હરિયાણા": "haryana", "ਹਰਿਆਣਾ": "haryana", "ہریانہ": "haryana",
    "पंजाब": "punjab", "పంజాబ్": "punjab", "பஞ்சாப்": "punjab",
    "ಪಂಜಾಬ್": "punjab", "പഞ്ചാബ്": "punjab", "পাঞ্জাব": "punjab",
    "પંજાબ": "punjab", "ਪੰਜਾਬ": "punjab", "پنجاب": "punjab",
    "पश्चिम बंगाल": "west bengal", "పశ్చిమ బెంగాల్": "west bengal",
    "மேற்கு வங்காளம்": "west bengal", "ಪಶ್ಚಿಮ ಬಂಗಾಳ": "west bengal",
    "പശ്ചിമ ബംഗാൾ": "west bengal", "পশ্চিমবঙ্গ": "west bengal",
    "પશ્ચિમ બંગાળ": "west bengal", "ਪੱਛਮੀ ਬੰਗਾਲ": "west bengal",
    "مغربی بنگال": "west bengal",
}

PRACTICE_STOPWORDS = {
    "law", "laws", "legal", "and", "the", "of", "for", "matter", "matters",
    "case", "cases", "service", "services", "advocate", "lawyer", "help",
}

PRACTICE_SYNONYMS = {
    "criminal": {"criminal", "bail", "fir", "police"},
    "crime": {"crime", "criminal", "cyber"},
    "bail": {"bail", "criminal", "anticipatory"},
    "family": {"family", "divorce", "matrimonial", "maintenance", "custody"},
    "divorce": {"divorce", "family", "matrimonial"},
    "matrimonial": {"matrimonial", "family", "divorce"},
    "property": {"property", "real estate", "civil", "title", "possession"},
    "estate": {"real estate", "property"},
    "consumer": {"consumer", "dispute", "disputes"},
    "cyber": {"cyber", "technology", "online", "fraud"},
    "labour": {"labour", "labor", "employment", "workman", "industrial"},
    "labor": {"labour", "labor", "employment", "workman", "industrial"},
    "employment": {"employment", "labour", "labor", "service"},
    "corporate": {"corporate", "company", "contract", "commercial"},
    "contract": {"contract", "corporate", "commercial", "agreement"},
    "tax": {"tax", "taxation", "gst", "income"},
    "gst": {"gst", "taxation", "tax"},
    "motor": {"motor", "accident", "insurance", "vehicle"},
    "accident": {"accident", "motor", "insurance", "vehicle"},
    "insurance": {"insurance", "motor", "accident"},
    "land": {"land", "tenancy", "rent", "property", "real estate"},
    "tenancy": {"tenancy", "land", "rent", "eviction"},
    "rent": {"rent", "tenancy", "land", "eviction"},
    "cheque": {"cheque", "bounce", "recovery", "negotiable"},
    "bounce": {"bounce", "cheque", "recovery"},
    "recovery": {"recovery", "cheque", "banking", "loan", "debt"},
    "women": {"women", "woman", "child", "domestic", "protection"},
    "woman": {"women", "woman", "child", "domestic", "protection"},
    "child": {"child", "women", "woman", "juvenile", "protection", "pocso"},
    "protection": {"protection", "women", "child", "consumer", "pocso"},
    "ipr": {"ipr", "intellectual", "patent", "trademark", "copyright", "technology"},
    "intellectual": {"intellectual", "ipr", "patent", "trademark", "copyright"},
    "technology": {"technology", "cyber", "ipr", "data"},
    "banking": {"banking", "loan", "debt"},
    "loan": {"loan", "banking", "recovery", "debt"},
    "service": {"service", "administrative", "employment"},
    "administrative": {"administrative", "service", "constitutional"},
    "constitutional": {"constitutional", "rti", "writ", "fundamental"},
    "rti": {"rti", "constitutional", "information"},
    "environment": {"environment", "environmental", "pollution", "forest"},
    "environmental": {"environment", "environmental", "pollution", "forest"},
    "immigration": {"immigration", "passport", "visa", "foreigner"},
    "succession": {"succession", "will", "inheritance", "probate"},
    "will": {"will", "succession", "inheritance", "probate"},
    "arbitration": {"arbitration", "mediation", "conciliation"},
    "mediation": {"mediation", "arbitration", "conciliation"},
    "pocso": {"pocso", "child", "juvenile", "protection"},
}


def normalize_text(value: Any) -> str:
    """Case-fold text, preserve Indic/Arabic combining marks, collapse spaces."""
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value)).casefold()
    text = re.sub(r"[^\w\s\u0900-\u0DFF\u0600-\u06FF]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


_NATIVE_ALIASES = {normalize_text(key): value for key, value in NATIVE_LOCATION_ALIASES.items()}
_ALIASES = {normalize_text(key): normalize_text(value) for key, value in LOCATION_ALIASES.items()}
_REGION_GROUPS = {normalize_text(key): value for key, value in REGION_GROUPS.items()}


def canonical_location_term(value: str) -> str:
    term = normalize_text(value)
    if not term:
        return ""
    term = _NATIVE_ALIASES.get(term, term)
    term = _ALIASES.get(term, term)
    return term


def _best_ratio(term: str, candidates: Iterable[str]) -> float:
    best = 0.0
    for candidate in candidates:
        if not candidate:
            continue
        length_gap = abs(len(candidate) - len(term))
        if length_gap > max(3, int(len(term) * 0.45)):
            continue
        ratio = SequenceMatcher(None, term, candidate).ratio()
        if ratio > best:
            best = ratio
    return best


def _field(row: Mapping[str, Any], name: str) -> str:
    return normalize_text(row.get(name, ""))


def _row_candidates(row: Mapping[str, Any]) -> Set[str]:
    """Words/values that belong to this lawyer only, used for typo matching."""
    candidates: Set[str] = set()
    for field in ("city", "state", "area", "court", "address"):
        value = _field(row, field)
        if value:
            candidates.add(value)
            candidates.update(word for word in value.split() if len(word) >= 3)
    return candidates


def _word_matches(word: str, haystack: str, candidates: Set[str]) -> bool:
    if word in haystack:
        return True
    for token in haystack.split():
        if len(word) >= 3 and len(token) >= 3 and token.startswith(word):
            return True
    return _best_ratio(word, candidates) >= 0.86


def _segment_matches(segment: str, row: Mapping[str, Any]) -> bool:
    term = canonical_location_term(segment)
    if not term:
        return True

    city = _field(row, "city")
    if term in _REGION_GROUPS:
        return city in _REGION_GROUPS[term]

    state = _field(row, "state")
    area = _field(row, "area")
    pincode = _field(row, "pincode")
    address = _field(row, "address")
    court = _field(row, "court")
    haystack = " ".join(part for part in (city, state, area, pincode, address, court) if part)

    if term.isdigit() and 3 <= len(term) <= 6 and pincode:
        return pincode.startswith(term)

    if term in haystack:
        return True

    candidates = _row_candidates(row)
    words = [canonical_location_term(word) for word in term.split()]
    words = [word for word in words if word and word not in OPTIONAL_LOCATION_WORDS]
    if words and all(_word_matches(word, haystack, candidates) for word in words):
        return True

    # Full-string fuzzy matching is only safe for a single word ("Hydrabad"),
    # not for "Sector 62" vs "Sector 76" where most characters are identical.
    if len(term.split()) == 1 and not term.isdigit():
        return _best_ratio(term, candidates) >= 0.84
    return False


def split_location_query(query: str) -> List[str]:
    return [part.strip() for part in re.split(r"[,/|;]+", query or "") if part.strip()]


def match_location(row: Mapping[str, Any], query: str) -> bool:
    segments = split_location_query(query)
    if not segments:
        return True
    return all(_segment_matches(segment, row) for segment in segments)


def location_match_score(row: Mapping[str, Any], query: str) -> float:
    segments = split_location_query(query)
    if not segments:
        return 0.0
    city = _field(row, "city")
    state = _field(row, "state")
    area = _field(row, "area")
    pincode = _field(row, "pincode")
    address = _field(row, "address")
    score = 0.0
    for segment in segments:
        term = canonical_location_term(segment)
        if not term:
            continue
        if term == pincode:
            score += 40
        if term == area:
            score += 35
        elif term in area:
            score += 22
        if term == city:
            score += 30
        elif term in city or city in term:
            score += 18
        if term == state:
            score += 14
        elif term in state:
            score += 8
        if term in address:
            score += 6
        if term in _REGION_GROUPS and city in _REGION_GROUPS[term]:
            score += 12
    try:
        score += min(int(row.get("years_experience", 0) or 0), 30) * 0.15
    except (TypeError, ValueError):
        pass
    return score


def matches_practice_area(practice_area: str, query: str) -> bool:
    if not query or not query.strip():
        return True
    text = normalize_text(practice_area)
    words = [word for word in normalize_text(query).split() if word not in PRACTICE_STOPWORDS]
    if not words:
        return True
    text_words = set(text.split())
    for word in words:
        alternatives = PRACTICE_SYNONYMS.get(word, {word})
        if any(alternative in text for alternative in alternatives):
            continue
        if _best_ratio(word, text_words) >= 0.84:
            continue
        return False
    return True


def matches_language(languages: Sequence[str], query: str) -> bool:
    if not query or not query.strip():
        return True
    words = [canonical_language_name(word) for word in normalize_text(query).split()]
    if not words:
        return True
    normalized = [normalize_text(canonical_language_name(language)) for language in languages if language]
    for word in words:
        word = normalize_text(word)
        if any(word in language or language in word for language in normalized):
            continue
        if _best_ratio(word, normalized) >= 0.84:
            continue
        return False
    return True


CITY_ORDER = [
    "Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune",
    "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Indore", "Patna",
    "Bhopal", "Visakhapatnam", "Guwahati", "Bhubaneswar", "Thiruvananthapuram",
    "Dehradun", "Noida", "Gurugram",
]
_CITY_RANK = {normalize_text(city): index for index, city in enumerate(CITY_ORDER)}

_ALIASES_BY_CANONICAL: Dict[str, Set[str]] = {}
for _alias, _canonical in {**_ALIASES, **_NATIVE_ALIASES}.items():
    _ALIASES_BY_CANONICAL.setdefault(normalize_text(_canonical), set()).add(_alias)


def _suggestion_hit(term: str, text: str) -> int:
    """3 = exact, 2 = word starts with query, 1 = substring in a word."""
    if not text:
        return 0
    words = text.split()
    if term == text:
        return 3
    if any(word.startswith(term) for word in words):
        return 2
    if len(term) >= 4 and any(term in word for word in words):
        return 1
    return 0


def _entry_aliases(entry: Mapping[str, Any]) -> Set[str]:
    canonical = normalize_text(entry.get("city") or entry.get("state") or "")
    return _ALIASES_BY_CANONICAL.get(canonical, set())


def build_location_suggestions(
    rows: Sequence[Mapping[str, Any]], query: str = "", limit: int = 8
) -> List[Dict[str, str]]:
    entries: Dict[str, Dict[str, Any]] = {}
    counts: Dict[str, int] = {}

    def add(value: str, label: str, kind: str, city: str, state: str) -> None:
        key = normalize_text(value)
        if not key:
            return
        if key not in entries:
            entries[key] = {
                "label": label, "value": value, "type": kind,
                "city": city, "state": state,
            }
            counts[key] = 0
        counts[key] += 1

    for row in rows:
        city = str(row.get("city", "") or "").strip()
        state = str(row.get("state", "") or "").strip()
        area = str(row.get("area", "") or "").strip()
        if city:
            add(city, f"{city}, {state}" if state else city, "city", city, state)
        if area:
            add(f"{area}, {city}", f"{area}, {city}", "area", city, state)
        if state:
            add(state, state, "state", "", state)

    term = canonical_location_term(query)
    scored = []
    for key, entry in entries.items():
        if not term:
            if entry["type"] != "city":
                continue
            rank = _CITY_RANK.get(normalize_text(entry["city"]), 999)
            scored.append((1000 - rank, entry))
            continue

        value = normalize_text(entry["value"])
        label = normalize_text(entry["label"])
        hit = max(
            _suggestion_hit(term, value),
            _suggestion_hit(term, label),
            *(_suggestion_hit(term, alias) for alias in _entry_aliases(entry)),
        )
        if hit:
            score = 120.0 if hit == 3 else (100.0 if hit == 2 else 75.0)
        else:
            ratio = max(
                SequenceMatcher(None, term, value).ratio(),
                SequenceMatcher(None, term, label).ratio(),
            )
            if ratio < 0.72:
                continue
            score = ratio * 50

        if entry["type"] == "area":
            score += 6
        elif entry["type"] == "city":
            score += 10
        else:
            score += 2
        scored.append((score, entry))

    scored.sort(key=lambda item: (-item[0], item[1]["label"]))
    return [entry for _, entry in scored[: max(1, min(limit, 20))]]
