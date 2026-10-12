-- Every Imperial Home unit is a furnished studio: one very large bedroom, two bathrooms,
-- a large living room, a large kitchen and a balcony. Not two or three bedrooms.

update public.properties
set
  bedrooms = 1,
  bathrooms = 2,
  living_areas = 1,
  description_fr = 'Studio meublé : une très grande chambre, deux salles de bain, un grand salon, une grande cuisine et un balcon.',
  description_en = 'Furnished studio: one very large bedroom, two bathrooms, a large living room, a large kitchen and a balcony.'
where status <> 'archived';
