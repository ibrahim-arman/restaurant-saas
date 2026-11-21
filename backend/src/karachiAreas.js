// Popular Karachi delivery areas. New stores get these automatically.
// Owners can edit fees, minimum orders and switch areas on or off in their portal.
const AREAS = [
  // Central and nearby: lower fee
  ['Saddar', 150, 500], ['Clifton', 150, 500], ['DHA', 150, 500], ['PECHS', 150, 500],
  ['Bahadurabad', 150, 500], ['Tariq Road', 150, 500], ['Defence Phase 5', 150, 500], ['Kharadar', 150, 500],
  // Mid distance
  ['Gulshan-e-Iqbal', 200, 800], ['Gulistan-e-Johar', 200, 800], ['North Nazimabad', 200, 800], ['Nazimabad', 200, 800],
  ['Federal B Area', 200, 800], ['North Karachi', 250, 800], ['Liaquatabad', 200, 800], ['Gulberg', 200, 800],
  ['Karsaz', 200, 800], ['Shahrah-e-Faisal', 200, 800], ['Malir Cantt', 250, 800],
  // Farther: higher fee
  ['Korangi', 300, 1000], ['Malir', 300, 1000], ['Landhi', 350, 1000], ['Scheme 33', 300, 1000],
  ['Orangi Town', 350, 1000], ['Surjani Town', 350, 1000], ['Bahria Town Karachi', 400, 1200],
];
exports.defaultDeliveryAreas = () => AREAS.map(([name, deliveryFee, minimumOrder]) => ({ name, deliveryFee, minimumOrder, enabled: true }));
