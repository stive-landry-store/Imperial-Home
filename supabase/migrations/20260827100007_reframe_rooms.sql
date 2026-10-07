-- Impérial Home: one guest house, named rooms (not separate apartments)

update public.properties set
  slug = 'abidjan',
  name = 'Abidjan',
  description_en = 'The Abidjan room at Impérial Home — warm tones, soft light, and a calm atmosphere for couples or solo travellers.',
  description_fr = 'La chambre Abidjan à Impérial Home — tons chauds, lumière douce et ambiance paisible pour couples ou voyageurs seuls.',
  welcome_message_en = 'Welcome to the Abidjan room at Impérial Home.',
  welcome_message_fr = 'Bienvenue dans la chambre Abidjan à Impérial Home.',
  address = 'Impérial Home, Bonapriso',
  city = 'Douala',
  neighborhood = 'Bonapriso',
  latitude = 4.0128,
  longitude = 9.7324,
  capacity = 2,
  bedrooms = 1,
  bathrooms = 1,
  living_areas = 0,
  nightly_rate_xaf = 55000,
  recommendations_en = 'Bonapriso waterfront restaurants are a short drive away.',
  recommendations_fr = 'Les restaurants du bord de l''eau à Bonapriso sont à quelques minutes.',
  rules_en = 'No parties. No smoking indoors. Quiet hours 22:00–07:00. Respect other guests.',
  rules_fr = 'Pas de fêtes. Interdiction de fumer à l''intérieur. Silence 22h00–07h00. Respectez les autres hôtes.'
where slug = 'villa-imperiale-bonapriso';

update public.properties set
  slug = 'singapour',
  name = 'Singapour',
  description_en = 'The Singapour room — contemporary lines, city-inspired décor, and a refined stay inside Impérial Home.',
  description_fr = 'La chambre Singapour — lignes contemporaines, décor inspiré de la ville et séjour raffiné à Impérial Home.',
  welcome_message_en = 'Welcome to the Singapour room at Impérial Home.',
  welcome_message_fr = 'Bienvenue dans la chambre Singapour à Impérial Home.',
  address = 'Impérial Home, Bonapriso',
  city = 'Douala',
  neighborhood = 'Bonapriso',
  latitude = 4.0128,
  longitude = 9.7324,
  capacity = 2,
  bedrooms = 1,
  bathrooms = 1,
  living_areas = 0,
  nightly_rate_xaf = 65000,
  recommendations_en = 'Bonapriso waterfront restaurants are a short drive away.',
  recommendations_fr = 'Les restaurants du bord de l''eau à Bonapriso sont à quelques minutes.',
  rules_en = 'No parties. No smoking indoors. Quiet hours 22:00–07:00. Respect other guests.',
  rules_fr = 'Pas de fêtes. Interdiction de fumer à l''intérieur. Silence 22h00–07h00. Respectez les autres hôtes.'
where slug = 'residence-akwa-prestige';

update public.properties set
  slug = 'dubai',
  name = 'Dubai',
  description_en = 'The Dubai room — our most spacious room at Impérial Home, ideal for small families or longer stays.',
  description_fr = 'La chambre Dubai — notre chambre la plus spacieuse à Impérial Home, idéale pour les petites familles ou les longs séjours.',
  welcome_message_en = 'Welcome to the Dubai room at Impérial Home.',
  welcome_message_fr = 'Bienvenue dans la chambre Dubai à Impérial Home.',
  address = 'Impérial Home, Bonapriso',
  city = 'Douala',
  neighborhood = 'Bonapriso',
  latitude = 4.0128,
  longitude = 9.7324,
  capacity = 3,
  bedrooms = 1,
  bathrooms = 1,
  living_areas = 0,
  nightly_rate_xaf = 75000,
  recommendations_en = 'Bonapriso waterfront restaurants are a short drive away.',
  recommendations_fr = 'Les restaurants du bord de l''eau à Bonapriso sont à quelques minutes.',
  rules_en = 'No parties. No smoking indoors. Quiet hours 22:00–07:00. Respect other guests.',
  rules_fr = 'Pas de fêtes. Interdiction de fumer à l''intérieur. Silence 22h00–07h00. Respectez les autres hôtes.'
where slug = 'suite-bonanjo';

update public.promotions set
  name = 'Ouverture Impérial Home',
  description_en = 'Introductory offer on selected rooms at Impérial Home.',
  description_fr = 'Offre d''ouverture sur certaines chambres à Impérial Home.'
where name in ('Ouverture Douala', 'Ouverture Impérial Home');
