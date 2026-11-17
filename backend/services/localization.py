"""Localized deterministic response templates.

This module is used by the offline / no-API-key legal engine so that answers are
actually produced in the language selected by the citizen instead of always
falling back to English. Statutory names and section numbers are intentionally
kept in English inside brackets, as required for legal accuracy.
"""

from typing import Dict, List

DISCLAIMER = "Legal information, not legal advice."

# Category keys: police, traffic, fir, consumer, rti, default
L10N: Dict[str, Dict[str, object]] = {
    "en": {
        "intro": 'According to statutory Indian law, the relevant provisions for your question "{query}" are:',
        "safeguards_heading": "Key Citizen Safeguards & Statutory Rights:",
        "source_label": "Statutory text",
        "note": "(Note: The Indian Penal Code is replaced by the Bharatiya Nyaya Sanhita; CrPC by the Bharatiya Nagarik Suraksha Sanhita; and the Indian Evidence Act by the Bharatiya Sakshya Adhiniyam.)",
        "no_sources": (
            "The available statutory sources do not cover this specific question. "
            "For formal legal counsel, please consult a verified advocate or call the "
            "Government of India Tele-Law toll-free helpline at 14454.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• Grounds of arrest and bailability must be communicated immediately [BNSS Section 47 (CrPC S.50)].",
                "• An arrest memo must be prepared and a family member informed without delay [BNSS Section 36 (CrPC S.41B)].",
                "• You have the right to consult an advocate of your choice during interrogation [BNSS Section 38 (CrPC S.41D)].",
            ],
            "traffic": [
                "• Presenting documents through DigiLocker or mParivahan is legally valid [MVA Section 130].",
                "• A compliant helmet is mandatory for rider and pillion; violations attract a fine [MVA Sections 129, 194D].",
                "• E-challans can be contested online through Virtual Courts [MVA Section 208].",
            ],
            "fir": [
                "• A Zero FIR can be registered at ANY police station, irrespective of jurisdiction [BNSS Section 173 (CrPC S.154)].",
                "• The police must record the complaint and transfer it to the jurisdictional station.",
            ],
            "consumer": [
                "• A store cannot refuse a refund for a defective product; it is an unfair trade practice [Consumer Protection Act, Section 2(47)].",
                "• Consumer complaints can be filed online through e-Daakhil [Consumer Protection Act, Section 35].",
            ],
            "rti": [
                "• The Public Information Officer must reply within 30 days (48 hours for life or liberty) [RTI Act, Section 7].",
                "• Unjustified delay can attract a penalty of up to ₹25,000 on the officer [RTI Act, Section 20].",
            ],
            "default": [
                "• Eligible citizens can get free legal aid under Section 12 of the Legal Services Authorities Act. Call Tele-Law at 14454.",
            ],
        },
    },
    "hi": {
        "intro": 'भारतीय वैधानिक कानून के अनुसार, आपके प्रश्न "{query}" के संदर्भ में विधिक प्रावधान निम्नलिखित हैं:',
        "safeguards_heading": "नागरिकों के लिए मुख्य वैधानिक सुरक्षा उपाय:",
        "source_label": "वैधानिक पाठ",
        "note": "(नोट: IPC को BNS, CrPC को BNSS और भारतीय साक्ष्य अधिनियम को BSA द्वारा प्रतिस्थापित किया गया है।)",
        "no_sources": (
            "उपलब्ध वैधानिक स्रोत इस विशिष्ट प्रश्न को कवर नहीं करते हैं। "
            "औपचारिक कानूनी सलाह के लिए, कृपया किसी सत्यापित अधिवक्ता से परामर्श लें या "
            "भारत सरकार की टेली-लॉ हेल्पलाइन 14454 पर संपर्क करें।\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• गिरफ्तारी के आधार और जमानत की पात्रता तुरंत बतानी होगी [BNSS Section 47 (CrPC S.50)]।",
                "• गिरफ्तारी मेमो बनाकर परिवार को तुरंत सूचित करना अनिवार्य है [BNSS Section 36 (CrPC S.41B)]।",
                "• पूछताछ के दौरान अपने पसंद के वकील से परामर्श करने का अधिकार है [BNSS Section 38 (CrPC S.41D)]।",
                "• महिलाओं को सूर्यास्त के बाद केवल असाधारण परिस्थितियों में, मजिस्ट्रेट की पूर्व अनुमति से महिला पुलिस अधिकारी द्वारा गिरफ्तार किया जा सकता है [BNSS Section 43]।",
            ],
            "traffic": [
                "• डिजिलॉकर या एम-परिवहन से दस्तावेज दिखाना पूरी तरह वैध है [MVA Section 130]।",
                "• हेलमेट पहनना अनिवार्य है; उल्लंघन पर जुर्माना लगेगा [MVA Sections 129, 194D]।",
                "• ई-चालान का ऑनलाइन वर्चुअल कोर्ट के माध्यम से विरोध किया जा सकता है [MVA Section 208]।",
            ],
            "fir": [
                "• किसी भी पुलिस थाने में जीरो एफआईआर दर्ज कराई जा सकती है [BNSS Section 173 (CrPC S.154)]।",
                "• पुलिस शिकायत दर्ज कर उसे संबंधित थाने को भेजने के लिए बाध्य है।",
            ],
            "consumer": [
                "• दोषपूर्ण उत्पाद पर रिफंड से मना करना अनुचित व्यापार व्यवहार है [Consumer Protection Act, Section 2(47)]।",
                "• उपभोक्ता शिकायत ई-दाखिल पोर्टल से ऑनलाइन दर्ज की जा सकती है [Consumer Protection Act, Section 35]।",
            ],
            "rti": [
                "• सूचना अधिकारी को 30 दिनों के भीतर (जीवन या स्वतंत्रता के मामले में 48 घंटे) जवाब देना होगा [RTI Act, Section 7]।",
                "• बिना कारण देरी पर अधिकारी पर ₹25,000 तक जुर्माना लग सकता है [RTI Act, Section 20]।",
            ],
            "default": [
                "• पात्र नागरिक विधिक सेवा प्राधिकरण अधिनियम की धारा 12 के तहत मुफ्त कानूनी सहायता प्राप्त कर सकते हैं। टेली-लॉ 14454 पर कॉल करें।",
            ],
        },
    },
    "ta": {
        "intro": 'இந்தியச் சட்டத்தின்படி, உங்கள் கேள்வி "{query}" தொடர்பான சட்ட விதிகள் கீழே உள்ளன:',
        "safeguards_heading": "குடிமக்களுக்கான முக்கிய சட்டப் பாதுகாப்புகள்:",
        "source_label": "சட்ட வாசகம்",
        "note": "(குறிப்பு: IPC → BNS, CrPC → BNSS, இந்திய சாட்சியச் சட்டம் → BSA ஆக மாற்றப்பட்டுள்ளது.)",
        "no_sources": (
            "கிடைக்கக்கூடிய விதிகள் இந்தக் கேள்வியை உள்ளடக்கவில்லை. "
            "முறையான சட்ட ஆலோசனைக்கு தகுதியான வழக்கறிஞரை அணுகவும் அல்லது "
            "தொலை-சட்ட உதவி எண் 14454 ஐ அழைக்கவும்.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• கைதுக்கான துல்லியமான காரணங்களையும் ஜாமீன் விவரத்தையும் உடனடியாகத் தெரிவிக்க வேண்டும் [BNSS Section 47].",
                "• கைது நினைவுக் குறிப்பை (Arrest Memo) தயாரித்து குடும்பத்தினருக்கு உடனடியாகத் தெரிவிக்க வேண்டும் [BNSS Section 36].",
                "• விசாரணையின்போது தேர்ந்தெடுத்த வழக்கறிஞரைச் சந்திக்க உரிமை உண்டு [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker அல்லது mParivahan மூலம் ஆவணங்களைக் காட்டுவது சட்டப்படி செல்லும் [MVA Section 130].",
                "• ஹெல்மெட் அணிவது கட்டாயம்; மீறினால் அபராதம் [MVA Sections 129, 194D].",
                "• e-சலான் போட்டியை ஆன்லைன் விர்ச்சுவல் நீதிமன்றம் மூலம் எதிர்க்கலாம் [MVA Section 208].",
            ],
            "fir": [
                "• எந்தக் காவல்நிலையத்திலும் Zero FIR பதிவு செய்யலாம் [BNSS Section 173].",
                "• காவல்துறை புகாரைப் பதிவு செய்து சம்பந்தப்பட்ட நிலையத்திற்கு அனுப்ப வேண்டும்.",
            ],
            "consumer": [
                "• குறைபாடுள்ள பொருளுக்கு பணத்தைத் திரும்பப் பெற மறுக்க முடியாது; இது நியாயமற்ற வணிக நடைமுறை [CPA Section 2(47)].",
                "• e-Daakhil மூலம் ஆன்லைனில் புகார் அளிக்கலாம் [CPA Section 35].",
            ],
            "rti": [
                "• தகவல் அறியும் உரிமை விண்ணப்பத்திற்கு 30 நாட்களுக்குள் பதிலளிக்க வேண்டும் [RTI Act Section 7].",
                "• தாமதத்திற்கு அதிகாரிக்கு ₹25,000 வரை அபராதம் [RTI Act Section 20].",
            ],
            "default": [
                "• தகுதியுள்ள குடிமக்களுக்கு இலவச சட்ட உதவி கிடைக்கும்; 14454 ஐ அழைக்கவும் [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "te": {
        "intro": 'భారతీయ చట్టం ప్రకారం, మీ ప్రశ్న "{query}"కు సంబంధించిన చట్టపరమైన నిబంధనలు క్రింద ఉన్నాయి:',
        "safeguards_heading": "పౌరులకు ముఖ్యమైన చట్టపరమైన రక్షణలు:",
        "source_label": "చట్టపరమైన పాఠ్యం",
        "note": "(గమనిక: IPC → BNS, CrPC → BNSS, భారతీయ సాక్ష్య చట్టం → BSAగా మార్చబడ్డాయి.)",
        "no_sources": (
            "అందుబాటులో ఉన్న చట్టపరమైన మూలాలు ఈ ప్రశ్నను కవర్ చేయవు. "
            "అధికారిక చట్టపరమైన సలహా కోసం అర్హత కలిగిన న్యాయవాదిని సంప్రదించండి లేదా "
            "టెలి-లా ఉచిత హెల్ప్‌లైన్ 14454కు కాల్ చేయండి.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• అరెస్టుకు గల ఖచ్చితమైన కారణాలు మరియు బెయిల్ వివరాలను వెంటనే తెలియజేయాలి [BNSS Section 47].",
                "• అరెస్ట్ మెమో తయారు చేసి కుటుంబ సభ్యులకు వెంటనే సమాచారం ఇవ్వాలి [BNSS Section 36].",
                "• విచారణ సమయంలో తాను ఎంచుకున్న న్యాయవాదిని కలవడానికి హక్కు ఉంది [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker లేదా mParivahan ద్వారా పత్రాలు చూపించడం చట్టబద్ధం [MVA Section 130].",
                "• హెల్మెట్ ధరించడం తప్పనిసరి; ఉల్లంఘనకు జరిమానా [MVA Sections 129, 194D].",
                "• ఈ-చలాన్‌ను ఆన్‌లైన్ వర్చువల్ కోర్టు ద్వారా సవాలు చేయవచ్చు [MVA Section 208].",
            ],
            "fir": [
                "• ఏ పోలీస్ స్టేషన్‌లో అయినా Zero FIR నమోదు చేయవచ్చు [BNSS Section 173].",
                "• పోలీసులు ఫిర్యాదును నమోదు చేసి సంబంధిత స్టేషన్‌కు పంపాలి.",
            ],
            "consumer": [
                "• లోపభూయిష్ట వస్తువుపై రిఫండ్‌ను నిరాకరించడం అన్యాయమైన వాణిజ్య పద్ధతి [CPA Section 2(47)].",
                "• e-Daakhil ద్వారా ఆన్‌లైన్‌లో ఫిర్యాదు చేయవచ్చు [CPA Section 35].",
            ],
            "rti": [
                "• సమాచార హక్కు దరఖాస్తుకు 30 రోజుల్లోగా సమాధానం ఇవ్వాలి [RTI Act Section 7].",
                "• ఆలస్యానికి అధికారిపై ₹25,000 వరకు జరిమానా [RTI Act Section 20].",
            ],
            "default": [
                "• అర్హత కలిగిన పౌరులు ఉచిత న్యాయ సహాయం పొందవచ్చు; 14454కు కాల్ చేయండి [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "kn": {
        "intro": 'ಭಾರತೀಯ ಕಾನೂನಿನ ಪ್ರಕಾರ, ನಿಮ್ಮ ಪ್ರಶ್ನೆ "{query}" ಗೆ ಸಂಬಂಧಿಸಿದ ಕಾನೂನು ನಿಬಂಧನೆಗಳು ಕೆಳಗಿವೆ:',
        "safeguards_heading": "ನಾಗರಿಕರಿಗೆ ಪ್ರಮುಖ ಕಾನೂನು ರಕ್ಷಣೆಗಳು:",
        "source_label": "ಕಾನೂನು ಪಠ್ಯ",
        "note": "(ಸೂಚನೆ: IPC → BNS, CrPC → BNSS, ಭಾರತೀಯ ಸಾಕ್ಷ್ಯ ಕಾಯ್ದೆ → BSA ಆಗಿ ಬದಲಾಗಿದೆ.)",
        "no_sources": (
            "ಲಭ್ಯವಿರುವ ಕಾನೂನು ಮೂಲಗಳು ಈ ಪ್ರಶ್ನೆಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ. "
            "ಅಧಿಕೃತ ಕಾನೂನು ಸಲಹೆಗಾಗಿ ಅರ್ಹ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ "
            "ಟೆಲಿ-ಲಾ ಉಚಿತ ಸಹಾಯವಾಣಿ 14454 ಗೆ ಕರೆ ಮಾಡಿ.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• ಬಂಧನದ ನಿಖರ ಕಾರಣಗಳು ಮತ್ತು ಜಾಮೀನು ಮಾಹಿತಿಯನ್ನು ತಕ್ಷಣ ತಿಳಿಸಬೇಕು [BNSS Section 47].",
                "• ಬಂಧನ ಮೆಮೊ ಸಿದ್ಧಪಡಿಸಿ ಕುಟುಂಬ ಸದಸ್ಯರಿಗೆ ತಕ್ಷಣ ಮಾಹಿತಿ ನೀಡಬೇಕು [BNSS Section 36].",
                "• ವಿಚಾರಣೆ ವೇಳೆ ತಾವು ಆಯ್ಕೆ ಮಾಡಿದ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸುವ ಹಕ್ಕಿದೆ [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker ಅಥವಾ mParivahan ಮೂಲಕ ದಾಖಲೆಗಳನ್ನು ತೋರಿಸುವುದು ಕಾನೂನುಬದ್ಧ [MVA Section 130].",
                "• ಹೆಲ್ಮೆಟ್ ಧರಿಸುವುದು ಕಡ್ಡಾಯ; ಉಲ್ಲಂಘನೆಗೆ ದಂಡ [MVA Sections 129, 194D].",
                "• ಇ-ಚಲಾನ್ ಅನ್ನು ಆನ್‌ಲೈನ್ ವರ್ಚುವಲ್ ನ್ಯಾಯಾಲಯದ ಮೂಲಕ ಪ್ರಶ್ನಿಸಬಹುದು [MVA Section 208].",
            ],
            "fir": [
                "• ಯಾವುದೇ ಪೊಲೀಸ್ ಠಾಣೆಯಲ್ಲಿ Zero FIR ದಾಖಲಿಸಬಹುದು [BNSS Section 173].",
                "• ಪೊಲೀಸರು ದೂರನ್ನು ದಾಖಲಿಸಿ ಸಂಬಂಧಿತ ಠಾಣೆಗೆ ಕಳುಹಿಸಬೇಕು.",
            ],
            "consumer": [
                "• ದೋಷಯುಕ್ತ ಉತ್ಪನ್ನಕ್ಕೆ ಮರುಪಾವತಿಯನ್ನು ನಿರಾಕರಿಸುವುದು ಅನ್ಯಾಯದ ವ್ಯಾಪಾರ ಪದ್ಧತಿ [CPA Section 2(47)].",
                "• e-Daakhil ಮೂಲಕ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ದೂರು ಸಲ್ಲಿಸಬಹುದು [CPA Section 35].",
            ],
            "rti": [
                "• ಮಾಹಿತಿ ಹಕ್ಕು ಅರ್ಜಿಗೆ 30 ದಿನಗಳೊಳಗೆ ಉತ್ತರ ನೀಡಬೇಕು [RTI Act Section 7].",
                "• ವಿಳಂಬಕ್ಕೆ ಅಧಿಕಾರಿಗೆ ₹25,000 ವರೆಗೆ ದಂಡ [RTI Act Section 20].",
            ],
            "default": [
                "• ಅರ್ಹ ನಾಗರಿಕರು ಉಚಿತ ಕಾನೂನು ಸಹಾಯ ಪಡೆಯಬಹುದು; 14454 ಗೆ ಕರೆ ಮಾಡಿ [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "ml": {
        "intro": 'ഇന്ത്യൻ നിയമപ്രകാരം, നിങ്ങളുടെ ചോദ്യം "{query}" സംബന്ധിച്ച നിയമവ്യവസ്ഥകൾ താഴെ നൽകുന്നു:',
        "safeguards_heading": "പൗരന്മാർക്കുള്ള പ്രധാന നിയമസംരക്ഷണങ്ങൾ:",
        "source_label": "നിയമപാഠം",
        "note": "(കുറിപ്പ്: IPC → BNS, CrPC → BNSS, ഇന്ത്യൻ തെളിവ് നിയമം → BSA എന്നിവയായി മാറ്റിയിട്ടുണ്ട്.)",
        "no_sources": (
            "ലഭ്യമായ നിയമസ്രോതസ്സുകൾ ഈ ചോദ്യം ഉൾക്കൊള്ളുന്നില്ല. "
            "ഔദ്യോഗിക നിയമോപദേശത്തിന് യോഗ്യതയുള്ള അഭിഭാഷകനെ സമീപിക്കുക അല്ലെങ്കിൽ "
            "ടെലി-ലോ സൗജന്യ ഹെൽപ്‌ലൈൻ 14454 വിളിക്കുക.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• അറസ്റ്റിന്റെ കൃത്യമായ കാരണങ്ങളും ജാമ്യവിവരവും ഉടൻ അറിയിക്കണം [BNSS Section 47].",
                "• അറസ്റ്റ് മെമോ തയ്യാറാക്കി കുടുംബാംഗങ്ങളെ ഉടൻ അറിയിക്കണം [BNSS Section 36].",
                "• ചോദ്യം ചെയ്യലിനിടെ താൻ തിരഞ്ഞെടുത്ത അഭിഭാഷകനെ കാണാനുള്ള അവകാശമുണ്ട് [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker അല്ലെങ്കിൽ mParivahan വഴി രേഖകൾ കാണിക്കുന്നത് നിയമപരമായി സാധുതയുള്ളതാണ് [MVA Section 130].",
                "• ഹെൽമെറ്റ് ധരിക്കുന്നത് നിർബന്ധമാണ്; ലംഘനത്തിന് പിഴ [MVA Sections 129, 194D].",
                "• ഇ-ചലാൻ ഓൺലൈൻ വെർച്വൽ കോടതി വഴി ചോദ്യം ചെയ്യാം [MVA Section 208].",
            ],
            "fir": [
                "• ഏത് പോലീസ് സ്റ്റേഷനിലും Zero FIR രജിസ്റ്റർ ചെയ്യാം [BNSS Section 173].",
                "• പോലീസ് പരാതി രേഖപ്പെടുത്തി ബന്ധപ്പെട്ട സ്റ്റേഷനിലേക്ക് അയക്കണം.",
            ],
            "consumer": [
                "• വീണ്ടും വിൽക്കാനാകാത്ത വസ്തുവിന് റീഫണ്ട് നിഷേധിക്കുന്നത് അന്യായ വ്യാപാരരീതിയാണ് [CPA Section 2(47)].",
                "• e-Daakhil വഴി ഓൺലൈനായി പരാതി നൽകാം [CPA Section 35].",
            ],
            "rti": [
                "• വിവരാവകാശ അപേക്ഷയ്ക്ക് 30 ദിവസത്തിനുള്ളിൽ മറുപടി നൽകണം [RTI Act Section 7].",
                "• കാലതാമസത്തിന് ഉദ്യോഗസ്ഥന് ₹25,000 വരെ പിഴ [RTI Act Section 20].",
            ],
            "default": [
                "• യോഗ്യരായ പൗരന്മാർക്ക് സൗജന്യ നിയമസഹായം ലഭിക്കും; 14454 വിളിക്കുക [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "mr": {
        "intro": 'भारतीय कायद्यानुसार, तुमच्या "{query}" या प्रश्नाशी संबंधित कायदेशीर तरतुदी खाली दिल्या आहेत:',
        "safeguards_heading": "नागरिकांसाठी महत्त्वाच्या कायदेशीर सुरक्षा:",
        "source_label": "कायदेशीर मजकूर",
        "note": "(टीप: IPC ची जागा BNS, CrPC ची जागा BNSS आणि भारतीय पुरावा कायद्याची जागा BSA ने घेतली आहे.)",
        "no_sources": (
            "उपलब्ध कायदेशीर स्रोत या विशिष्ट प्रश्नाचे उत्तर देत नाहीत. "
            "औपचारिक कायदेशीर सल्ल्यासाठी पात्र वकिलाचा सल्ला घ्या किंवा "
            "टेली-लॉ मोफत हेल्पलाइन 14454 वर कॉल करा.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• अटक केल्याची नेमकी कारणे आणि जामीन माहिती तात्काळ सांगणे आवश्यक [BNSS Section 47].",
                "• अटक मेमो तयार करून कुटुंबियांना तात्काळ कळवणे बंधनकारक [BNSS Section 36].",
                "• चौकशीदरम्यान आपल्या पसंतीच्या वकिलाचा सल्ला घेण्याचा अधिकार आहे [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker किंवा mParivahan द्वारे कागदपत्रे दाखवणे कायदेशीरदृष्ट्या वैध आहे [MVA Section 130].",
                "• हेल्मेट घालणे अनिवार्य; उल्लंघनास दंड [MVA Sections 129, 194D].",
                "• ई-चलनाला ऑनलाइन व्हर्च्युअल कोर्टाद्वारे आव्हान देता येते [MVA Section 208].",
            ],
            "fir": [
                "• कोणत्याही पोलीस ठाण्यात Zero FIR नोंदवता येते [BNSS Section 173].",
                "• पोलिसांनी तक्रार नोंदवून संबंधित ठाण्याकडे पाठवणे आवश्यक.",
            ],
            "consumer": [
                "• सदोष वस्तूसाठी परतावा नाकारणे अनुचित व्यापार पद्धत आहे [CPA Section 2(47)].",
                "• e-Daakhil द्वारे ऑनलाइन तक्रार दाखल करता येते [CPA Section 35].",
            ],
            "rti": [
                "• माहिती अधिकार अर्जाला 30 दिवसांत उत्तर देणे आवश्यक [RTI Act Section 7].",
                "• उशिरासाठी अधिकाऱ्यावर ₹25,000 पर्यंत दंड [RTI Act Section 20].",
            ],
            "default": [
                "• पात्र नागरिकांना मोफत कायदेशीर मदत मिळू शकते; 14454 वर कॉल करा [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "bn": {
        "intro": 'ভারতীয় আইন অনুযায়ী, আপনার প্রশ্ন "{query}" সম্পর্কিত আইনি বিধানগুলি নিচে দেওয়া হলো:',
        "safeguards_heading": "নাগরিকদের জন্য প্রধান আইনি সুরক্ষা:",
        "source_label": "আইনি পাঠ",
        "note": "(দ্রষ্টব্য: IPC → BNS, CrPC → BNSS এবং ভারতীয় সাক্ষ্য আইন → BSA দ্বারা প্রতিস্থাপিত হয়েছে।)",
        "no_sources": (
            "উপলব্ধ আইনি উৎসগুলি এই নির্দিষ্ট প্রশ্নটি কভার করে না। "
            "আনুষ্ঠানিক আইনি পরামর্শের জন্য যোগ্য আইনজীবীর সাথে পরামর্শ করুন অথবা "
            "টেলি-ল ফ্রি হেল্পলাইন 14454-এ কল করুন।\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• গ্রেপ্তারের সঠিক কারণ ও জামিনের তথ্য অবিলম্বে জানাতে হবে [BNSS Section 47]।",
                "• গ্রেপ্তার মেমো তৈরি করে পরিবারকে অবিলম্বে জানাতে হবে [BNSS Section 36]।",
                "• জিজ্ঞাসাবাদের সময় নিজের পছন্দের আইনজীবীর সাথে পরামর্শের অধিকার আছে [BNSS Section 38]।",
            ],
            "traffic": [
                "• DigiLocker বা mParivahan-এ নথি দেখানো আইনত বৈধ [MVA Section 130]।",
                "• হেলমেট পরা বাধ্যতামূলক; লঙ্ঘনে জরিমানা [MVA Sections 129, 194D]।",
                "• ই-চালান অনলাইন ভার্চুয়াল কোর্টে চ্যালেঞ্জ করা যায় [MVA Section 208]।",
            ],
            "fir": [
                "• যেকোনো থানায় Zero FIR দায়ের করা যায় [BNSS Section 173]।",
                "• পুলিশ অভিযোগ নথিভুক্ত করে সংশ্লিষ্ট থানায় পাঠাতে বাধ্য।",
            ],
            "consumer": [
                "• ত্রুটিপূর্ণ পণ্যের জন্য রিফান্ড অস্বীকার করা অন্যায্য বাণিজ্যিক প্রথা [CPA Section 2(47)]।",
                "• e-Daakhil-এর মাধ্যমে অনলাইনে অভিযোগ করা যায় [CPA Section 35]।",
            ],
            "rti": [
                "• তথ্য অধিকার আবেদনের ৩০ দিনের মধ্যে উত্তর দিতে হবে [RTI Act Section 7]।",
                "• বিলম্বের জন্য কর্মকর্তার উপর ₹২৫,০০০ পর্যন্ত জরিমানা [RTI Act Section 20]।",
            ],
            "default": [
                "• যোগ্য নাগরিকরা বিনামূল্যে আইনি সহায়তা পেতে পারেন; 14454-এ কল করুন [Legal Services Authorities Act Section 12]।",
            ],
        },
    },
    "gu": {
        "intro": 'ભારતીય કાયદા અનુસાર, તમારા પ્રશ્ન "{query}" સંબંધિત કાનૂની જોગવાઈઓ નીચે આપેલી છે:',
        "safeguards_heading": "નાગરિકો માટે મુખ્ય કાનૂની રક્ષણ:",
        "source_label": "કાનૂની લખાણ",
        "note": "(નોંધ: IPC → BNS, CrPC → BNSS અને ભારતીય પુરાવા કાયદો → BSA દ્વારા બદલાયા છે.)",
        "no_sources": (
            "ઉપલબ્ધ કાનૂની સ્રોતો આ પ્રશ્નને આવરી લેતા નથી. "
            "ઔપચારિક કાનૂની સલાહ માટે લાયક વકીલનો સંપર્ક કરો અથવા "
            "ટેલી-લૉ મફત હેલ્પલાઇન 14454 પર કૉલ કરો.\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• ધરપકડના ચોક્કસ કારણો અને જામીનની માહિતી તરત જ જણાવવી જરૂરી [BNSS Section 47].",
                "• ધરપકડ મેમો બનાવીને પરિવારને તરત જ જાણ કરવી ફરજિયાત [BNSS Section 36].",
                "• પૂછપરછ દરમિયાન પોતાની પસંદગીના વકીલની સલાહ લેવાનો અધિકાર છે [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker અથવા mParivahan દ્વારા દસ્તાવેજો બતાવવા કાયદેસર માન્ય છે [MVA Section 130].",
                "• હેલ્મેટ પહેરવું ફરજિયાત છે; ઉલ્લંઘન પર દંડ [MVA Sections 129, 194D].",
                "• ઈ-ચલાણને ઓનલાઈન વર્ચ્યુઅલ કોર્ટ દ્વારા પડકારી શકાય છે [MVA Section 208].",
            ],
            "fir": [
                "• કોઈપણ પોલીસ સ્ટેશનમાં Zero FIR નોંધી શકાય છે [BNSS Section 173].",
                "• પોલીસે ફરિયાદ નોંધીને સંબંધિત સ્ટેશનને મોકલવી જરૂરી છે.",
            ],
            "consumer": [
                "• ખામીયુક્ત ઉત્પાદન પર રિફંડ આપવાનો ઇનકાર અન્યાયી વેપાર પ્રથા છે [CPA Section 2(47)].",
                "• e-Daakhil દ્વારા ઓનલાઈન ફરિયાદ કરી શકાય છે [CPA Section 35].",
            ],
            "rti": [
                "• માહિતી અધિકાર અરજીનો જવાબ 30 દિવસમાં આપવો પડે [RTI Act Section 7].",
                "• વિલંબ માટે અધિકારી પર ₹25,000 સુધીનો દંડ [RTI Act Section 20].",
            ],
            "default": [
                "• લાયક નાગરિકોને મફત કાનૂની સહાય મળી શકે છે; 14454 પર કૉલ કરો [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "pa": {
        "intro": 'ਭਾਰਤੀ ਕਾਨੂੰਨ ਅਨੁਸਾਰ, ਤੁਹਾਡੇ ਸਵਾਲ "{query}" ਨਾਲ ਸੰਬੰਧਿਤ ਕਾਨੂੰਨੀ ਪ੍ਰਬੰਧ ਹੇਠਾਂ ਦਿੱਤੇ ਗਏ ਹਨ:',
        "safeguards_heading": "ਨਾਗਰਿਕਾਂ ਲਈ ਮੁੱਖ ਕਾਨੂੰਨੀ ਸੁਰੱਖਿਆ:",
        "source_label": "ਕਾਨੂੰਨੀ ਪਾਠ",
        "note": "(ਨੋਟ: IPC → BNS, CrPC → BNSS ਅਤੇ ਭਾਰਤੀ ਸਬੂਤ ਕਾਨੂੰਨ → BSA ਨਾਲ ਬਦਲ ਦਿੱਤੇ ਗਏ ਹਨ।)",
        "no_sources": (
            "ਉਪਲਬਧ ਕਾਨੂੰਨੀ ਸਰੋਤ ਇਸ ਖਾਸ ਸਵਾਲ ਨੂੰ ਕਵਰ ਨਹੀਂ ਕਰਦੇ। "
            "ਰਸਮੀ ਕਾਨੂੰਨੀ ਸਲਾਹ ਲਈ ਯੋਗ ਵਕੀਲ ਨਾਲ ਸੰਪਰਕ ਕਰੋ ਜਾਂ "
            "ਟੈਲੀ-ਲਾਅ ਮੁਫ਼ਤ ਹੈਲਪਲਾਈਨ 14454 'ਤੇ ਕਾਲ ਕਰੋ।\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• ਗ੍ਰਿਫ਼ਤਾਰੀ ਦੇ ਸਹੀ ਕਾਰਨ ਅਤੇ ਜ਼ਮਾਨਤ ਦੀ ਜਾਣਕਾਰੀ ਤੁਰੰਤ ਦੇਣੀ ਲਾਜ਼ਮੀ ਹੈ [BNSS Section 47].",
                "• ਗ੍ਰਿਫ਼ਤਾਰੀ ਮੈਮੋ ਬਣਾ ਕੇ ਪਰਿਵਾਰ ਨੂੰ ਤੁਰੰਤ ਸੂਚਿਤ ਕਰਨਾ ਲਾਜ਼ਮੀ ਹੈ [BNSS Section 36].",
                "• ਪੁੱਛਗਿੱਛ ਦੌਰਾਨ ਆਪਣੀ ਪਸੰਦ ਦੇ ਵਕੀਲ ਦੀ ਸਲਾਹ ਲੈਣ ਦਾ ਅਧਿਕਾਰ ਹੈ [BNSS Section 38].",
            ],
            "traffic": [
                "• DigiLocker ਜਾਂ mParivahan ਰਾਹੀਂ ਦਸਤਾਵੇਜ਼ ਦਿਖਾਉਣਾ ਕਾਨੂੰਨੀ ਤੌਰ 'ਤੇ ਵੈਧ ਹੈ [MVA Section 130].",
                "• ਹੈਲਮੇਟ ਪਹਿਨਣਾ ਲਾਜ਼ਮੀ ਹੈ; ਉਲੰਘਣਾ 'ਤੇ ਜੁਰਮਾਨਾ [MVA Sections 129, 194D].",
                "• ਈ-ਚਲਾਨ ਨੂੰ ਆਨਲਾਈਨ ਵਰਚੁਅਲ ਕੋਰਟ ਰਾਹੀਂ ਚੁਣੌਤੀ ਦਿੱਤੀ ਜਾ ਸਕਦੀ ਹੈ [MVA Section 208].",
            ],
            "fir": [
                "• ਕਿਸੇ ਵੀ ਪੁਲਿਸ ਥਾਣੇ ਵਿੱਚ Zero FIR ਦਰਜ ਕੀਤੀ ਜਾ ਸਕਦੀ ਹੈ [BNSS Section 173].",
                "• ਪੁਲਿਸ ਨੂੰ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਕੇ ਸੰਬੰਧਿਤ ਥਾਣੇ ਭੇਜਣੀ ਲਾਜ਼ਮੀ ਹੈ.",
            ],
            "consumer": [
                "• ਖਰਾਬ ਉਤਪਾਦ ਲਈ ਰਿਫੰਡ ਦੇਣ ਤੋਂ ਇਨਕਾਰ ਕਰਨਾ ਅਨਿਆਂਪੂਰਨ ਵਪਾਰਕ ਅਭਿਆਸ ਹੈ [CPA Section 2(47)].",
                "• e-Daakhil ਰਾਹੀਂ ਆਨਲਾਈਨ ਸ਼ਿਕਾਇਤ ਕੀਤੀ ਜਾ ਸਕਦੀ ਹੈ [CPA Section 35].",
            ],
            "rti": [
                "• ਸੂਚਨਾ ਦੇ ਅਧਿਕਾਰ ਦੀ ਅਰਜ਼ੀ ਦਾ ਜਵਾਬ 30 ਦਿਨਾਂ ਵਿੱਚ ਦੇਣਾ ਹੁੰਦਾ ਹੈ [RTI Act Section 7].",
                "• ਦੇਰੀ ਲਈ ਅਧਿਕਾਰੀ 'ਤੇ ₹25,000 ਤੱਕ ਜੁਰਮਾਨਾ [RTI Act Section 20].",
            ],
            "default": [
                "• ਯੋਗ ਨਾਗਰਿਕਾਂ ਨੂੰ ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ ਮਿਲ ਸਕਦੀ ਹੈ; 14454 'ਤੇ ਕਾਲ ਕਰੋ [Legal Services Authorities Act Section 12].",
            ],
        },
    },
    "ur": {
        "intro": 'بھارتی قانون کے مطابق، آپ کے سوال "{query}" سے متعلق قانونی دفعات درج ذیل ہیں:',
        "safeguards_heading": "شہریوں کے لیے اہم قانونی تحفظات:",
        "source_label": "قانونی متن",
        "note": "(نوٹ: IPC کی جگہ BNS، CrPC کی جگہ BNSS اور انڈین ایویڈنس ایکٹ کی جگہ BSA لے چکا ہے۔)",
        "no_sources": (
            "دستیاب قانونی ذرائع اس مخصوص سوال کا احاطہ نہیں کرتے۔ "
            "رسمی قانونی مشورے کے لیے کسی مستند وکیل سے رابطہ کریں یا "
            "ٹیلی-لا مفت ہیلپ لائن 14454 پر کال کریں۔\n\n" + DISCLAIMER
        ),
        "bullets": {
            "police": [
                "• گرفتاری کی درست وجوہات اور ضمانت کی معلومات فوری بتانا لازم ہے [BNSS Section 47]۔",
                "• گرفتاری میمو تیار کر کے خاندان کو فوری اطلاع دینا لازمی ہے [BNSS Section 36]۔",
                "• تفتیش کے دوران اپنی پسند کے وکیل سے مشورہ کرنے کا حق ہے [BNSS Section 38]۔",
            ],
            "traffic": [
                "• DigiLocker یا mParivahan کے ذریعے دستاویزات دکھانا قانونی طور پر درست ہے [MVA Section 130]۔",
                "• ہیلمٹ پہننا لازمی ہے؛ خلاف ورزی پر جرمانہ [MVA Sections 129, 194D]۔",
                "• ای-چالان کو آن لائن ورچوئل کورٹ کے ذریعے چیلنج کیا جا سکتا ہے [MVA Section 208]۔",
            ],
            "fir": [
                "• کسی بھی پولیس اسٹیشن میں Zero FIR درج کرائی جا سکتی ہے [BNSS Section 173]۔",
                "• پولیس شکایت درج کر کے متعلقہ اسٹیشن کو بھیجنے کی پابند ہے۔",
            ],
            "consumer": [
                "• خراب مصنوعات پر رقم واپس کرنے سے انکار غیر منصفانہ تجارتی عمل ہے [CPA Section 2(47)]۔",
                "• e-Daakhil کے ذریعے آن لائن شکایت کی جا سکتی ہے [CPA Section 35]۔",
            ],
            "rti": [
                "• معلومات کے حق کی درخواست کا جواب 30 دنوں میں دینا لازم ہے [RTI Act Section 7]۔",
                "• تاخیر پر افسر پر ₹25,000 تک جرمانہ [RTI Act Section 20]۔",
            ],
            "default": [
                "• اہل شہری مفت قانونی امداد حاصل کر سکتے ہیں؛ 14454 پر کال کریں [Legal Services Authorities Act Section 12]۔",
            ],
        },
    },
}

SUPPORTED_OUTPUT_LANGUAGES = tuple(L10N.keys())


def get_templates(language: str) -> Dict[str, object]:
    """Return localized templates for a language code, defaulting to English."""
    return L10N.get((language or "en").lower(), L10N["en"])


def detect_category(query: str) -> str:
    """Keyword classifier used by the deterministic fallback engine.

    Coverage spans all 11 supported languages (native script + the Latin
    legal vocabulary that citizens naturally mix in, e.g. "Zero FIR").
    """
    q = (query or "").lower()
    police_words = (
        "police", "arrest", "warrant", "stop", "custody", "lockup", "lock-up",
        "interrogation", "interrogate", "questioned", " थाने",
        "पुलिस", "गिरफ्तार", "थाने", "गिरफ्तार कर", "हिरासत",
        "போலீஸ்", "கைது", "காவல்", "கைது செய்",
        "పోలీస్", "అరెస్ట్", "విచారణ", "ప్రశ్నింపు", "ప్రశ్నించు",
        "ಪೊಲೀಸ್", "ಬಂಧನ", "ವಿಚಾರಣೆ",
        "പോലീസ്", "അറസ്റ്റ്", "വിചാരണ",
        "पोलीस", "अटक", "चौकशी",
        "পুলিশ", "গ্রেপ্তার", "থানা",
        "પોલીસ", "ધરપકડ", "પૂછપરછ",
        "ਪੁਲਿਸ", "ਗ੍ਰਿਫਤਾਰੀ", "ਥਾਣਾ",
        "پولیس", "گرفتار", "تھانہ",
    )
    fir_words = (
        "zero fir", "zero-fir", " fir ", " fir", "fir", "first information",
        "complaint", "register fir", "file fir",
        "एफआईआर", "एफ.आई.आर", "एफआईयार", "प्राथमिकी", "जीरो एफआईआर", "रिपोर्ट",
        "எப்ஐஆர்", "ஜீரோ எப்ஐஆர்", "புகார்",
        "ఎఫ్ఐఆర్", "జిరో ఎఫ్ఐఆర్", "ఫిర్యాదు",
        "ಎಫ್ಐಆರ್", "ಜೀರೋ ಎಫ್ಐಆರ್", "ದೂರು",
        "എഫ്ഐആർ", "സീറോ എഫ്ഐആർ", "പരാതി",
        "एफआयआर", "तक्रार",
        "এফআইআর", "জিরো এফআইআর", "অভিযোগ",
        "એફઆઇઆર", "ફરિયાદ",
        "ਐਫਆਈਆਰ", "ਸ਼ਿਕਾਇਤ",
        "ایف آئی آر", "شکایت",
    )
    traffic_words = (
        "traffic", "vehicle", "helmet", "licence", "license", "challan", "speed",
        "insurance", "drunk", "drink and drive", "seatbelt", "seat belt", "mva",
        "puc", "parking", "driving", "rash", "negligent", "rash driving",
        "हेलमेट", "चालान", "गाड़ी", "बाइक", "सीट बेल्ट", "हेलमेट",
        "ஹெல்மெட்", "சலான்", "வாகன",
        "హెల్మెట్", "చలాన్", "వాహన",
        "ಹೆಲ್ಮೆಟ್", "ಚಲಾನ್", "ವಾಹನ",
        "ഹെൽമെറ്റ്", "ചലാൻ", "വാഹന",
        "हेल्मेट", "चलन", "वाहन",
        "হেলমেট", "চালান", "গাড়ি",
        "હેલ્મેટ", "ચલાણ", "વાહન",
        "ਹੈਲਮੇਟ", "ਚਲਾਨ", "ਵਾਹਨ",
        "ہیلمٹ", "چالان", "گاڑی",
    )
    consumer_words = (
        "consumer", "refund", "defective", "warranty", "store", "e-daakhil",
        "edaakhil", "e daakhil", "replace", "replacement", "damaged",
        "product", "unfair trade", "seller", "online shopping",
        "रिफंड", "उपभोक्ता", "वारंटी", "वापसी",
        "நுகர்வோர்", "பணம் திரும்ப", "பொருள்",
        "వినియోగదారు", "రిఫండ్",
        "ಗ್ರಾಹಕ", "ರಿಫಂಡ್",
        "ഉപഭോക്താവ്", "തിരിച്ചടയ്ക്കൽ",
        "ग्राहक",
        "ভোক্তা", "রিফাণ্ড",
        "ગ્રાહક", "રિફંડ",
        "ਖਪਤਕਾਰ",
        "صارف", "ریفر",
    )
    rti_words = (
        "rti", "right to information", "pio", "information", "ఆర్టి",
        "सूचना", "जानकारी",
        "தகவல்",
        "సమాచార",
        "ಮಾಹಿತಿ",
        "വിവര",
        "माहिती",
        "তথ্য",
        "માહિતી",
        "ਜਾਣਕਾਰੀ",
        "معلومات",
    )

    # Order matters: FIR before police ("Zero FIR" is about a legal process, not
    # custody); traffic before consumer (e-challan disputes, not refunds).
    if any(w in q for w in fir_words):
        return "fir"
    if any(w in q for w in police_words):
        return "police"
    if any(w in q for w in traffic_words):
        return "traffic"
    if any(w in q for w in consumer_words):
        return "consumer"
    if any(w in q for w in rti_words):
        return "rti"
    return "default"
