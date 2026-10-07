export type Service = {
  id: string;
  title: string;
  description: string;
  features: string[];
  /** Nepali version of the same fields (same order of features). */
  ne: { title: string; description: string; features: string[] };
};

export const services: Service[] = [
  {
    id: "repair",
    title: "Machinery Repair",
    description: "Technical repair support for machinery and equipment based on the actual service requirement.",
    features: ["Fault inspection", "Technical diagnosis", "Component replacement", "Repair support"],
    ne: {
      title: "मेसिन मर्मत",
      description: "वास्तविक आवश्यकताअनुसार मेसिन तथा उपकरणका लागि प्राविधिक मर्मत सहयोग।",
      features: ["खराबी जाँच", "प्राविधिक निदान", "पार्ट्स फेर्ने", "मर्मत सहयोग"],
    },
  },
  {
    id: "maintenance",
    title: "Maintenance",
    description: "Maintenance support intended to keep machinery operating reliably and efficiently.",
    features: ["Routine maintenance", "Equipment inspection", "Preventive maintenance", "Maintenance consultation"],
    ne: {
      title: "सम्भार सेवा",
      description: "मेसिनलाई भरपर्दो र प्रभावकारी ढङ्गले चलिरहन मद्दत गर्ने सम्भार सहयोग।",
      features: ["नियमित सम्भार", "उपकरण जाँच", "रोकथाममूलक सम्भार", "सम्भार परामर्श"],
    },
  },
  {
    id: "installation",
    title: "Installation",
    description: "Technical assistance for machinery installation and commissioning requirements.",
    features: ["Site assessment", "Installation support", "Equipment setup", "Technical guidance"],
    ne: {
      title: "जडान",
      description: "मेसिन जडान तथा सञ्चालनमा ल्याउन प्राविधिक सहयोग।",
      features: ["साइट मूल्याङ्कन", "जडान सहयोग", "उपकरण सेटअप", "प्राविधिक मार्गदर्शन"],
    },
  },
  {
    id: "spare-parts",
    title: "Spare Parts",
    description: "Machinery parts and replacement components based on customer and equipment requirements.",
    features: ["Part identification", "Replacement components", "Model-based requirements", "Parts inquiry support"],
    ne: {
      title: "स्पेयर पार्ट्स",
      description: "ग्राहक र उपकरणको आवश्यकताअनुसार मेसिनका पार्ट्स र प्रतिस्थापन सामग्री।",
      features: ["पार्ट पहिचान", "प्रतिस्थापन पार्ट्स", "मोडलअनुसार आवश्यकता", "पार्ट्स सोधपुछ सहयोग"],
    },
  },
  {
    id: "rental",
    title: "Machinery Rental",
    description: "Machinery rental support where applicable to customer requirements and equipment availability.",
    features: ["Equipment requirements", "Rental inquiry", "Availability checking", "Rental coordination"],
    ne: {
      title: "मेसिन भाडा",
      description: "ग्राहकको आवश्यकता र उपकरणको उपलब्धताअनुसार मेसिन भाडा सहयोग।",
      features: ["उपकरण आवश्यकता", "भाडा सोधपुछ", "उपलब्धता जाँच", "भाडा समन्वय"],
    },
  },
  {
    id: "consultation",
    title: "Technical Consultation",
    description: "Technical consultation to help customers identify appropriate machinery, parts and service requirements.",
    features: ["Equipment selection", "Technical guidance", "Application assessment", "Requirement consultation"],
    ne: {
      title: "प्राविधिक परामर्श",
      description: "उपयुक्त मेसिन, पार्ट्स र सेवा आवश्यकता पहिचान गर्न प्राविधिक परामर्श।",
      features: ["उपकरण छनोट", "प्राविधिक मार्गदर्शन", "प्रयोग मूल्याङ्कन", "आवश्यकता परामर्श"],
    },
  },
];