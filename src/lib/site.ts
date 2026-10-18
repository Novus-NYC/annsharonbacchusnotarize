// Every fact on the site comes from `raw messy data/`. Keep it here so a
// change to a phone number or address only happens once.

export const notary = {
  name: "Ann Sharon Bacchus",
  title: "Notary Public",
  phone: "347-564-5172",
  phoneHref: "tel:+13475645172",
  smsHref: "sms:+13475645172",
  email: "annsharonbacchus@gmail.com",
  street: "1493 Fulton Street",
  locality: "Brooklyn",
  region: "NY",
  postalCode: "11216",
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=1493+Fulton+Street+Brooklyn+NY+11216",
};

// Wording follows the source list exactly; only "where permitted" comes
// with a note because the source qualifies it.
export const services: { name: string; note?: string }[] = [
  { name: "General document notarization" },
  { name: "Divorce documents & wills" },
  { name: "Oaths & affirmations" },
  { name: "Certified copies", note: "Where permitted." },
  { name: "Loan signing support" },
  { name: "Mobile notary services" },
];

export const places = ["Your home", "Your office", "Hospital", "Other agreed-upon location"];

export const realEstate = {
  name: "Sharon Bacchus",
  title: "Licensed Real Estate Salesperson",
  brokerage: "EXIT Realty Island Elite",
  brokerageAddress: "4699 Nesconset Hwy., Suite 2, Port Jefferson Station, NY 11776",
  officePhone: "631-331-4000",
  officePhoneHref: "tel:+16313314000",
  website: "https://www.exitrealtyislandelite.com",
  websiteLabel: "EXITRealtyIslandElite.com",
  missions: [
    "My mission is to make buying and selling real estate simple, strategic, and rewarding. Through expert guidance, innovative marketing, and unwavering commitment, I help my clients move forward with confidence.",
    "I am dedicated to providing personalized service, building lasting relationships, and helping every client achieve their real estate goals with clarity and peace of mind.",
  ],
  buyers: [
    "Buyer consultation and needs assessment",
    "Property search and listing recommendations",
    "Scheduling and coordinating property showings",
    "Market analysis and property comparisons",
    "Guidance with making an offer",
    "Offer negotiation",
    "Assistance with purchase contracts and disclosures",
    "Home inspection coordination",
    "Appraisal and financing coordination",
    "Communication with lenders and attorneys",
  ],
  sellers: [
    "Seller consultation and property evaluation",
    "Comparative Market Analysis (CMA)",
    "Pricing strategy",
    "Preparing the property for market",
    "Recommendations for staging and presentation",
    "Professional photography and marketing materials",
    "Listing creation and promotion",
    "Online and social media marketing",
    "Open house coordination",
    "Scheduling and managing showings",
    "Reviewing and presenting offers",
    "Negotiating price and terms",
    "Managing buyer inquiries",
    "Inspection and appraisal coordination",
  ],
};
