export type Service = {
  id: string;
  title: string;
  description: string;
  features: string[];
};

export const services: Service[] = [
  {
    id: "repair",
    title: "Machinery Repair",
    description:
      "Technical repair support for machinery and equipment based on the actual service requirement.",
    features: [
      "Fault inspection",
      "Technical diagnosis",
      "Component replacement",
      "Repair support",
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance",
    description:
      "Maintenance support intended to keep machinery operating reliably and efficiently.",
    features: [
      "Routine maintenance",
      "Equipment inspection",
      "Preventive maintenance",
      "Maintenance consultation",
    ],
  },
  {
    id: "installation",
    title: "Installation",
    description:
      "Technical assistance for machinery installation and commissioning requirements.",
    features: [
      "Site assessment",
      "Installation support",
      "Equipment setup",
      "Technical guidance",
    ],
  },
  {
    id: "spare-parts",
    title: "Spare Parts",
    description:
      "Machinery parts and replacement components based on customer and equipment requirements.",
    features: [
      "Part identification",
      "Replacement components",
      "Model-based requirements",
      "Parts inquiry support",
    ],
  },
  {
    id: "rental",
    title: "Machinery Rental",
    description:
      "Machinery rental support where applicable to customer requirements and equipment availability.",
    features: [
      "Equipment requirements",
      "Rental inquiry",
      "Availability checking",
      "Rental coordination",
    ],
  },
  {
    id: "consultation",
    title: "Technical Consultation",
    description:
      "Technical consultation to help customers identify appropriate machinery, parts and service requirements.",
    features: [
      "Equipment selection",
      "Technical guidance",
      "Application assessment",
      "Requirement consultation",
    ],
  },
];