export type Topic = {
  id: string;
  /** product id (data/products.ts) to link a quote button to */
  product?: string;
  words: string[];
  en: string;
  ne: string;
};

// General guidance only. Prices, stock, brands and hours are never stated here - the team confirms those.
export const topics: Topic[] = [
  {
    id: "power-tiller", product: "power-tiller",
    words: ["tiller", "tillers", "cultivator", "plough", "plow", "ploughing", "rotavator", "jotne", "टिलर", "जोत्ने", "जोत्न"],
    en: "A power tiller (a walk-behind small tractor) ploughs, breaks up and puddles soil, and suits small and terraced hill farms. Choose by land size, terrace width, engine power and the attachments you need. Routine care: check engine oil, clean the air filter, grease the gearbox and tighten blade bolts. Ask us for models and price.",
    ne: "पावर टिलर (हातले हिँडाएर चलाउने सानो ट्र्याक्टर) ले जमिन जोत्ने, माटो भुसभुसे बनाउने र खेत लेदो बनाउने काम गर्छ; साना र गरा/पाखा खेतका लागि उपयुक्त हुन्छ। जग्गाको आकार, गराको चौडाइ, इन्जिन क्षमता र चाहिने उपकरण हेरेर छान्नुहोस्। हेरचाह: इन्जिन तेल जाँच्ने, एयर फिल्टर सफा गर्ने, गियरबक्समा ग्रिस हाल्ने र ब्लेडका बोल्ट कस्ने। मोडल र मूल्यका लागि सोध्नुहोस्।",
  },
  {
    id: "reaper", product: "self-propelled-reaper",
    words: ["reaper", "reapers", "harvester", "harvest", "harvesting", "katni", "रिपर", "कटनी", "काट्ने", "कटानी"],
    en: "A self-propelled reaper cuts crops such as rice and wheat in rows and lays them down, saving a lot of harvest labour and time. It works best on fairly flat plots with room to turn. Compare cutting width, engine type and fuel use. Keep blades sharp, grease moving parts and clean crop residue after each day's work.",
    ne: "सेल्फ-प्रोपेल्ड रिपरले धान, गहुँ जस्ता बाली पङ्क्तिमा काटेर ढल्काउँछ, जसले कटानीमा धेरै श्रम र समय बचाउँछ। यो समतल र घुम्न ठाउँ भएका खेतमा राम्रो चल्छ। काट्ने चौडाइ, इन्जिनको प्रकार र इन्धन खपत तुलना गर्नुहोस्। ब्लेड धारिलो राख्ने, चल्ने भागमा ग्रिस हाल्ने र दिनभरको काम पछि बालीका अवशेष सफा गर्ने।",
  },
  {
    id: "corn-sheller", product: "corn-sheller",
    words: ["sheller", "shellers", "corn", "maize", "makai", "shelling", "मकै", "सेलर", "घोगा"],
    en: "A corn (maize) sheller separates kernels from the cob much faster than hand shelling. It comes in hand-operated and motor or engine driven types. Check capacity (kg per hour), power source and whether it suits dry cobs. Feed dry cobs, keep belts tight and stop the machine before clearing a jam.",
    ne: "कर्न (मकै) सेलरले घोगाबाट दाना छुट्याउँछ र हातले छोडाउनुभन्दा धेरै छिटो काम गर्छ। यो हातले चलाउने र मोटर/इन्जिनले चल्ने प्रकारमा आउँछ। क्षमता (किलो/घण्टा), शक्तिको स्रोत र सुख्खा घोगा मिल्छ कि हेर्नुहोस्। सुख्खा घोगा हाल्ने, बेल्ट कसिलो राख्ने र जाम खुलाउँदा मेसिन बन्द गर्ने।",
  },
  {
    id: "chainsaw", product: "chainsaw",
    words: ["chainsaw", "chainsaws", "timber", "firewood", "saw", "चेनसो", "आरा", "दाउरा"],
    en: "A chainsaw cuts timber and firewood. Use the fuel and oil mix and bar oil your manual specifies, keep the chain sharp and correctly tensioned, and wear gloves, eye and ear protection. Ask us for chains, bars and spare parts.",
    ne: "चेनसो काठ र दाउरा काट्न प्रयोग हुन्छ। म्यानुअलमा भनिएअनुसार इन्धन–तेल मिश्रण र बार-अयल प्रयोग गर्नुहोस्, चेन धारिलो र ठीक तनावमा राख्नुहोस्, तथा पन्जा, आँखा र कानको सुरक्षा लगाउनुहोस्। चेन, बार र पार्ट्सका लागि हामीलाई सोध्नुहोस्।",
  },
  {
    id: "tools", product: "cordless-tool-kit",
    words: ["cordless", "drill", "battery", "driver", "spanner", "wrench", "plier", "tools", "tool", "टुल", "औजार", "ड्रिल", "ब्याट्री"],
    en: "A cordless multi-tool kit makes drilling, driving and cutting easy in fields and workshops without mains power - compare battery capacity, charger and the accessories included. Mechanical hand tools such as spanners, wrenches and pliers are also useful for workshop and repair work. Ask us about stock and price.",
    ne: "कर्डलेस मल्टी-टुल किटले बिजुली नहुने खेत र वर्कशपमा ड्रिल, ड्राइभ र काट्ने काम सजिलो बनाउँछ — ब्याट्रीको क्षमता, चार्जर र साथ आउने एक्सेसरी तुलना गर्नुहोस्। स्प्यानर, रिन्च, प्लायर जस्ता मेकानिकल टुल पनि वर्कशप र मर्मतका लागि उपयोगी हुन्छन्। स्टक र मूल्य सोध्नुहोस्।",
  },
  {
    id: "engine-pump", product: "machinery",
    words: ["engine", "engines", "pump", "pumps", "generator", "irrigation", "इन्जिन", "पम्प", "जेनेरेटर", "सिँचाइ"],
    en: "For engines, pumps and generators, tell us the use (irrigation, workshop, power backup), the power you need and your preferred fuel. Our team will suggest suitable equipment and confirm availability.",
    ne: "इन्जिन, पम्प र जेनेरेटरका लागि प्रयोग (सिँचाइ, वर्कशप, ब्याकअप पावर), चाहिने क्षमता र मन पर्ने इन्धन बताउनुहोस्। हाम्रो टोलीले उपयुक्त उपकरण सुझाउँछ र उपलब्धता पुष्टि गर्छ।",
  },
  {
    id: "choose",
    words: ["choose", "select", "selection", "suitable", "recommend", "recommendation", "best", "which", "छान्न", "छान्ने", "छनोट", "सिफारिस", "कुन"],
    en: "To pick the right machine, tell me: 1) the work (ploughing, harvesting, shelling...), 2) land size and terrain (flat or terraced hills), 3) preferred power or fuel, and 4) your budget. Our team will recommend suitable machines.",
    ne: "सही मेसिन छान्न यी कुरा बताउनुहोस्: १) कुन काम (जोत्ने, कटानी, मकै छोडाउने...), २) जग्गाको आकार र भू-बनावट (समतल/पाखो), ३) मन पर्ने शक्ति/इन्धन, ४) बजेट। हाम्रो टोलीले उपयुक्त मेसिन सिफारिस गर्नेछ।",
  },
  {
    id: "maintenance",
    words: ["maintain", "maintenance", "grease", "filter", "care", "lubrication", "सम्भार", "हेरचाह", "ग्रिस"],
    en: "General care: before each use check engine oil, fuel and loose bolts; clean the air filter often; grease moving parts; keep blades and chains sharp. After the season drain old fuel, clean the machine and store it dry. Follow your manual's service intervals. We offer maintenance and repair support.",
    ne: "सामान्य हेरचाह: प्रत्येक प्रयोगअघि इन्जिन तेल, इन्धन र खुकुलो बोल्ट जाँच्नुहोस्; एयर फिल्टर नियमित सफा गर्नुहोस्; चल्ने भागमा ग्रिस हाल्नुहोस्; ब्लेड र चेन धारिलो राख्नुहोस्। सिजन सकिएपछि पुरानो इन्धन निकाल्ने, मेसिन सफा गर्ने र सुख्खा ठाउँमा राख्ने। सर्भिस अन्तराल म्यानुअलअनुसार मान्नुहोस्। हामी मर्मत तथा सम्भार सहयोग उपलब्ध गराउँछौँ।",
  },
  {
    id: "safety",
    words: ["safety", "safe", "danger", "dangerous", "accident", "protection", "सुरक्षा", "सुरक्षित", "दुर्घटना"],
    en: "Safety first: read the manual, wear gloves, eye and ear protection, stop the engine before clearing a jam, refuelling or adjusting, keep children and animals away, and never remove safety guards.",
    ne: "सुरक्षा पहिलो: म्यानुअल पढ्नुहोस्; पन्जा, आँखा र कानको सुरक्षा लगाउनुहोस्; जाम खुलाउँदा, इन्धन हाल्दा वा मिलाउँदा इन्जिन बन्द गर्नुहोस्; बालबालिका र पशुलाई टाढा राख्नुहोस्; सुरक्षा गार्ड कहिल्यै नखोल्नुहोस्।",
  },
  {
    id: "rental",
    words: ["rent", "rental", "hire", "भाडा", "भाडामा"],
    en: "We support machinery rental inquiries where equipment is available. Tell us the machine you need and the dates.",
    ne: "उपकरण उपलब्ध भएमा हामी मेसिन भाडाको सोधपुछमा सहयोग गर्छौँ। चाहिएको मेसिन र मिति बताउनुहोस्।",
  },
  {
    id: "agri",
    words: ["agriculture", "agricultural", "agri", "farm", "farming", "farmer", "krishi", "kheti", "कृषि", "खेती", "किसान"],
    en: "Agricultural machines save time and labour on the farm: a power tiller prepares the land, a self-propelled reaper harvests rice and wheat, and a corn sheller removes maize kernels. Tell me your crop, land size and terrain (flat or terraced hills) and I'll point you to the right machine. Our team confirms availability and price.",
    ne: "कृषि मेसिनले खेतीमा समय र श्रम बचत गर्छ: पावर टिलरले जमिन तयार गर्छ, सेल्फ-प्रोपेल्ड रिपरले धान र गहुँ काट्छ, र कर्न सेलरले मकैको दाना छुटाउँछ। बाली, जग्गाको आकार र भू-बनावट (समतल/पाखो) बताउनुहोस्, म उपयुक्त मेसिन सुझाउँछु। उपलब्धता र मूल्य हाम्रो टोलीले पुष्टि गर्छ।",
  },
  {
    id: "about",
    words: ["about", "who", "company", "bnb", "b b", "history", "बारे", "कम्पनी", "पसल", "को हो"],
    en: "Machinery Tools Nepal is at Baglung Buspark, Pokhara (Kaski). We supply agricultural machinery, power and mechanical tools, machinery parts and technical services - repair, maintenance, installation, rental support and consultation - for customers in Kaski, Baglung, Mustang and Syangja. Call or WhatsApp +977 9856088600.",
    ne: "Machinery Tools Nepal बाग्लुङ बसपार्क, पोखरा (कास्की) मा अवस्थित छ। हामी कृषि मेसिनरी, पावर तथा मेकानिकल टुल, मेसिनरीका पार्ट्स र प्राविधिक सेवा — मर्मत, सम्भार, जडान, भाडा सहयोग र परामर्श — कास्की, बाग्लुङ, मुस्ताङ र स्याङ्जाका ग्राहकलाई उपलब्ध गराउँछौँ। फोन वा WhatsApp: +977 9856088600।",
  },
];