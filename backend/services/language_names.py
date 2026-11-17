"""Canonical English names for the languages used by the lawyer directory."""

from typing import Dict

LANGUAGE_ALIASES: Dict[str, str] = {
    # English
    "english": "English", "eng": "English", "अंग्रेजी": "English",
    "ఆంగ్లం": "English", "ஆங்கிலம்": "English", "ಇಂಗ್ಲಿಷ್": "English",
    "ഇംഗ്ലീഷ്": "English", "ইংরেজি": "English", "અંગ્રેજી": "English",
    "ਅੰਗਰੇਜ਼ੀ": "English", "انگریزی": "English",
    # Hindi
    "hindi": "Hindi", "hin": "Hindi", "हिंदी": "Hindi", "हिन्दी": "Hindi",
    "హిందీ": "Hindi", "இந்தி": "Hindi", "ಹಿಂದಿ": "Hindi", "ഹിന്ദി": "Hindi",
    "হিন্দি": "Hindi", "હિન્દી": "Hindi", "ਹਿੰਦੀ": "Hindi", "ہندی": "Hindi",
    # Telugu
    "telugu": "Telugu", "telgu": "Telugu", "तेलुगु": "Telugu", "तेलुगू": "Telugu",
    "తెలుగు": "Telugu", "தெலுங்கு": "Telugu", "ತೆಲುಗು": "Telugu",
    "തെലുങ്ക്": "Telugu", "তেলুগু": "Telugu", "તેલુગુ": "Telugu",
    "ਤੇਲੁਗੂ": "Telugu", "تلگو": "Telugu",
    # Tamil
    "tamil": "Tamil", "तमिल": "Tamil", "தமிழ்": "Tamil", "తమిళం": "Tamil",
    "ತಮಿಳು": "Tamil", "തമിഴ്": "Tamil", "তামিল": "Tamil", "તમિલ": "Tamil",
    "ਤਮਿਲ": "Tamil", "تمل": "Tamil",
    # Kannada
    "kannada": "Kannada", "कन्नड़": "Kannada", "ಕನ್ನಡ": "Kannada",
    "కన్నడ": "Kannada", "கன்னடம்": "Kannada", "കന്നഡ": "Kannada",
    "কন্নড়": "Kannada", "કન્નડ": "Kannada", "ਕੰਨੜ": "Kannada", "کنڑ": "Kannada",
    # Malayalam
    "malayalam": "Malayalam", "मलयालम": "Malayalam", "മലയാളം": "Malayalam",
    "మలయాళం": "Malayalam", "மலையாளம்": "Malayalam", "ಮಲಯಾಳಂ": "Malayalam",
    "মালায়ালাম": "Malayalam", "મલયાલમ": "Malayalam", "ਮਲਿਆਲਮ": "Malayalam",
    "ملیالم": "Malayalam",
    # Marathi
    "marathi": "Marathi", "मराठी": "Marathi", "మరాఠీ": "Marathi",
    "மராத்தி": "Marathi", "ಮರಾಠಿ": "Marathi", "മറാത്തി": "Marathi",
    "মারাঠি": "Marathi", "મરાઠી": "Marathi", "ਮਰਾਠੀ": "Marathi",
    "مراٹھی": "Marathi",
    # Bengali
    "bengali": "Bengali", "bangla": "Bengali", "बंगाली": "Bengali",
    "বাংলা": "Bengali", "బెంగాలీ": "Bengali", "வங்காளம்": "Bengali",
    "ಬಂಗಾಳಿ": "Bengali", "ബംഗാളി": "Bengali", "બંગાળી": "Bengali",
    "ਬੰਗਾਲੀ": "Bengali", "بنگالی": "Bengali",
    # Gujarati
    "gujarati": "Gujarati", "गुजराती": "Gujarati", "ગુજરાતી": "Gujarati",
    "గుజరాతీ": "Gujarati", "குஜராத்தி": "Gujarati", "ಗುಜರಾತಿ": "Gujarati",
    "ഗുജറാത്തി": "Gujarati", "গুজরাটি": "Gujarati", "ਗੁਜਰਾਤੀ": "Gujarati",
    "گجراتی": "Gujarati",
    # Punjabi
    "punjabi": "Punjabi", "पंजाबी": "Punjabi", "ਪੰਜਾਬੀ": "Punjabi",
    "పంజాబీ": "Punjabi", "பஞ்சாபி": "Punjabi", "ಪಂಜಾಬಿ": "Punjabi",
    "പഞ്ചാബി": "Punjabi", "পাঞ্জাবি": "Punjabi", "પંજાબી": "Punjabi",
    "پنجابی": "Punjabi",
    # Urdu
    "urdu": "Urdu", "उर्दू": "Urdu", "اردو": "Urdu", "ఉర్దూ": "Urdu",
    "உருது": "Urdu", "ಉರ್ದು": "Urdu", "ഉർദു": "Urdu", "উর্দু": "Urdu",
    "ઉર્દૂ": "Urdu", "ਉਰਦੂ": "Urdu",
    # Odia
    "odia": "Odia", "oriya": "Odia", "ओडिया": "Odia", "ଓଡ଼ିଆ": "Odia",
    "ఒడియా": "Odia", "ஒடியா": "Odia", "ಒಡಿಯಾ": "Odia", "ഒഡിയ": "Odia",
    "ওড়িয়া": "Odia", "ઓડિયા": "Odia", "ਓਡੀਆ": "Odia",
    # Assamese
    "assamese": "Assamese", "असमिया": "Assamese", "অসমীয়া": "Assamese",
    "అస్సామీస్": "Assamese", "அசாமி": "Assamese", "ಅಸ್ಸಾಮಿ": "Assamese",
    "അസമീസ്": "Assamese", "આસામી": "Assamese", "ਅਸਾਮੀ": "Assamese",
    # Regional / additional languages present in the directory
    "marwari": "Marwari", "मारवाड़ी": "Marwari", "మార్వాడీ": "Marwari",
    "மார்வாரி": "Marwari", "ಮಾರ್ವಾಡಿ": "Marwari", "മാർവാരി": "Marwari",
    "মারোয়াড়ি": "Marwari", "મારવાડી": "Marwari", "ਮਾਰਵਾੜੀ": "Marwari",
    "bhojpuri": "Bhojpuri", "भोजपुरी": "Bhojpuri", "భోజ్పురి": "Bhojpuri",
    "போஜ்புரி": "Bhojpuri", "ಭೋಜಪುರಿ": "Bhojpuri", "ഭോജ്പുരി": "Bhojpuri",
    "ভোজপুরি": "Bhojpuri", "ભોજપુરી": "Bhojpuri", "ਭੋਜਪੁਰੀ": "Bhojpuri",
    "haryanvi": "Haryanvi", "हरियाणवी": "Haryanvi", "హర్యాన్వీ": "Haryanvi",
    "ஹரியான்வி": "Haryanvi", "ಹರಿಯಾಣ್ವಿ": "Haryanvi", "ഹരിയാൻവി": "Haryanvi",
    "হরিয়ানভি": "Haryanvi", "હરિયાણવી": "Haryanvi", "ਹਰਿਆਣਵੀ": "Haryanvi",
    "garhwali": "Garhwali", "गढ़वाली": "Garhwali", "గర్వాలీ": "Garhwali",
    "கர்வாலி": "Garhwali", "ಗರ್ವಾಲಿ": "Garhwali", "ഗർവാളി": "Garhwali",
    "গাড়োয়ালি": "Garhwali", "ગઢવાલી": "Garhwali", "ਗੜ੍ਹਵਾਲੀ": "Garhwali",
}


def canonical_language_name(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    return LANGUAGE_ALIASES.get(text.casefold(), text)
