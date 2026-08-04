/* ===================================================================
   GEROBAK BETAWI, OUTLET DATA (single source of truth)
   Used by lokasi.html and menu.html to render outlet cards via JS,
   so phone numbers/addresses are maintained in exactly one place.
   =================================================================== */

window.GB_OUTLETS = [
  {
    id: "taman-ratu",
    name: "Gerobak Betawi Taman Ratu",
    address: "Jl. Suryawijaya Blok BB1 No. 1D-E, Taman Ratu, Jakarta Barat",
    city: "Jakarta Barat",
    phones: ["(021) 5698-0648", "(021) 5698-0647"],
    whatsapp: "6281909821941",
    whatsappDisplay: "0819-0982-1941",
    gofood: "https://gofood.co.id/jakarta-barat/restaurant/gerobak-betawi-green-ville-db015c54-6678-4de8-8886-f2017583a93f",
    grabfood: "https://food.grab.com/id/id/restaurant/gerobak-betawi-taman-ratu-delivery/IDGFSTI0000017b",
    mapsQuery: "Gerobak Betawi Taman Ratu Jakarta Barat",
    lat: -6.1733,
    lng: 106.7656,
    rating: 4.4,
    reviewCount: 2592
  },
  {
    id: "sunter",
    name: "Gerobak Betawi Sunter",
    address: "Jl. Danau Sunter Utara Blok R No. 51-52, Jakarta Utara",
    city: "Jakarta Utara",
    phones: ["(021) 640-2220", "(021) 640-2221"],
    whatsapp: "6285886858304",
    whatsappDisplay: "0858-8685-8304",
    gofood: "https://gofood.co.id/en/jakarta/restaurant/gerobak-betawi-sunter-a04487f3-8f6f-4129-bd8d-f40195a5b725",
    grabfood: "https://food.grab.com/id/id/restaurant/gerobak-betawi-dsu-delivery/IDGFSTI000000ir",
    mapsQuery: "Gerobak Betawi Sunter Jakarta Utara",
    lat: -6.1392,
    lng: 106.8714,
    rating: 4.4,
    reviewCount: 1959
  },
  {
    id: "pik",
    name: "Gerobak Betawi PIK",
    address: "Ruko Cordoba Blok F No. 15, Bukit Golf Mediterania, Pantai Indah Kapuk, Jakarta Utara",
    city: "Jakarta Utara",
    phones: ["(021) 2967-9888", "(021) 5698-3536"],
    whatsapp: "6287820602540",
    whatsappDisplay: "0878-2060-2540",
    gofood: "https://gofood.co.id/jakarta-utara/restaurant/gerobak-betawi-ruko-cordobra-pik-3caa9bd4-5065-4d85-b4b9-43b4b9184267",
    grabfood: "https://food.grab.com/id/id/restaurant/gerobak-betawi-pik-delivery/IDGFSTI0000056q",
    mapsQuery: "Gerobak Betawi Pantai Indah Kapuk",
    lat: -6.1075,
    lng: 106.7392,
    rating: 4.4,
    reviewCount: 1524
  },
  {
    id: "kelapa-gading",
    name: "Gerobak Betawi Kelapa Gading",
    address: "Jl. Boulevard Raya Blok QA3 No. 19-20, Kelapa Gading, Jakarta Utara",
    city: "Jakarta Utara",
    phones: ["(021) 452-3088", "(021) 452-3089"],
    whatsapp: "6285695951731",
    whatsappDisplay: "0856-9595-1731",
    gofood: "https://gofood.co.id/jakarta-utara/restaurant/gerobak-betawi-kelapa-gading-b7a1157d-8421-4b3d-a87d-6fab725631d0",
    grabfood: "https://food.grab.com/id/id/restaurant/gerobak-betawi-kelapa-gading-delivery/IDGFSTI0000204n",
    mapsQuery: "Gerobak Betawi Kelapa Gading",
    lat: -6.1571,
    lng: 106.9114,
    rating: 4.5,
    reviewCount: 1668
  },
  {
    id: "gading-serpong",
    name: "Gerobak Betawi Gading Serpong",
    address: "Jl. Gading Serpong Boulevard Blok BA4 No. 10-11, Gading Serpong, Tangerang 15810",
    city: "Tangerang",
    phones: ["(021) 2222-3113"],
    whatsapp: "6281220585801",
    whatsappDisplay: "0812-2058-5801",
    gofood: "https://gofood.co.id/tangerang/restaurant/gerobak-betawi-gading-serpong-f119dc2a-81e4-42f7-b172-5a1c879cce1e",
    grabfood: "https://food.grab.com/id/en/restaurant/gerobak-betawi-gading-serpong-delivery/6-CZNFARLGHFBGG2",
    mapsQuery: "Gerobak Betawi Gading Serpong Tangerang",
    lat: -6.2384,
    lng: 106.6285,
    rating: 4.6,
    reviewCount: 1023
  },
  {
    id: "alam-sutera",
    name: "Gerobak Betawi Alam Sutera",
    address: "Ruko De Mansion Blok A No. 17, 19, Alam Sutera, Kunciran, Pinang, Kota Tangerang",
    city: "Tangerang",
    phones: ["(021) 5010-6616"],
    whatsapp: null,
    whatsappDisplay: null,
    gofood: null,
    grabfood: null,
    mapsQuery: "Gerobak Betawi Alam Sutera Tangerang",
    lat: -6.2239,
    lng: 106.6536,
    rating: 4.6,
    reviewCount: 455
  }
];

/* Helper builders shared by pages */
window.GB_HELPERS = {
  waLink(phoneIntl, text) {
    const msg = encodeURIComponent(text || "Halo Gerobak Betawi, saya ingin bertanya tentang menu.");
    return `https://wa.me/${phoneIntl}?text=${msg}`;
  },
  telLink(displayNumber) {
    const digits = displayNumber.replace(/[^\d+]/g, "");
    return `tel:${digits}`;
  },
  mapsLink(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  },
  mapsEmbed(query) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  }
};
