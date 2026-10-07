-- Official contact and sample catalogue (safe to re-run in a fresh project)

insert into public.system_config (key, value) values
  ('brand_name', to_jsonb('Imperial Home'::text)),
  ('phone', to_jsonb('+237 674 09 22 63'::text)),
  ('whatsapp', to_jsonb('237674092263'::text)),
  ('email', to_jsonb('imperialhome237@gmail.com'::text)),
  ('city', to_jsonb('Douala, Cameroon'::text)),
  ('hold_minutes', to_jsonb('30'::text)),
  ('bootstrap_admin_email', to_jsonb('imperialhome237@gmail.com, stivelandry16@gmail.com'::text)),
  ('bootstrap_admin_emails', '["imperialhome237@gmail.com", "stivelandry16@gmail.com"]'::jsonb),
  ('payment_instructions_en', to_jsonb('Pay the exact amount shown for your reservation via MTN Mobile Money or Orange Money, then send the receipt on WhatsApp to +237 674 09 22 63. Include your reservation code. An administrator will confirm the payment — do not mark it paid yourself.'::text)),
  ('payment_instructions_fr', to_jsonb('Réglez le montant exact de votre réservation via MTN Mobile Money ou Orange Money, puis envoyez le reçu sur WhatsApp au +237 674 09 22 63. Indiquez votre code de réservation. Un administrateur confirmera le paiement.'::text))
on conflict (key) do nothing;

insert into public.amenities (slug, name_en, name_fr, icon) values
  ('wifi', 'Wi-Fi', 'Wi-Fi', 'wifi'),
  ('ac', 'Air conditioning', 'Climatisation', 'snowflake'),
  ('kitchen', 'Equipped kitchen', 'Cuisine équipée', 'utensils'),
  ('tv', 'Smart TV', 'TV intelligente', 'tv'),
  ('parking', 'Parking', 'Parking', 'car'),
  ('washer', 'Washing machine', 'Machine à laver', 'washing-machine'),
  ('security', '24h security', 'Sécurité 24h', 'shield'),
  ('generator', 'Generator', 'Groupe électrogène', 'zap'),
  ('workspace', 'Workspace', 'Espace de travail', 'laptop'),
  ('hot-water', 'Hot water', 'Eau chaude', 'droplets')
on conflict (slug) do nothing;

insert into public.properties (
  slug, name, description_en, description_fr, welcome_message_en, welcome_message_fr,
  address, city, neighborhood, latitude, longitude, capacity, bedrooms, bathrooms, living_areas,
  kitchen_info_en, kitchen_info_fr, rules_en, rules_fr, safety_info_en, safety_info_fr,
  equipment_instructions_en, equipment_instructions_fr, nightly_rate_xaf, recommendations_en, recommendations_fr, status
) values
(
  'abidjan',
  'Abidjan',
  'The Abidjan room at Impérial Home — warm tones, soft light, and a calm atmosphere for couples or solo travellers.',
  'La chambre Abidjan à Impérial Home — tons chauds, lumière douce et ambiance paisible pour couples ou voyageurs seuls.',
  'Welcome to the Abidjan room at Impérial Home.',
  'Bienvenue dans la chambre Abidjan à Impérial Home.',
  'Impérial Home, Bonapriso', 'Douala', 'Bonapriso', 4.0128, 9.7324,
  2, 1, 1, 0,
  'Full kitchen with fridge, cooktop, microwave, and coffee maker.',
  'Cuisine complète avec réfrigérateur, plaques, micro-ondes et cafetière.',
  'No parties. No smoking indoors. Quiet hours 22:00–07:00. Maximum 4 guests.',
  'Pas de fêtes. Interdiction de fumer à l’intérieur. Silence 22h00–07h00. 4 personnes maximum.',
  'Fire extinguisher in the kitchen. First-aid kit in the bathroom cabinet. Emergency contacts in this welcome book.',
  'Extincteur dans la cuisine. Trousse de secours dans la salle de bain. Contacts d’urgence dans ce livret.',
  'AC remotes are in the living room drawer. Generator switches to automatic during outages.',
  'Les télécommandes de climatisation sont dans le tiroir du salon. Le groupe passe en automatique en cas de coupure.',
  55000,
  'Bonapriso waterfront restaurants are a short drive away.',
  'Les restaurants du bord de l’eau à Bonapriso sont à quelques minutes.',
  'published'
),
(
  'singapour',
  'Singapour',
  'The Singapour room — contemporary lines, city-inspired décor, and a refined stay inside Impérial Home.',
  'La chambre Singapour — lignes contemporaines, décor inspiré de la ville et séjour raffiné à Impérial Home.',
  'Welcome to the Singapour room at Impérial Home.',
  'Bienvenue dans la chambre Singapour à Impérial Home.',
  'Impérial Home, Bonapriso', 'Douala', 'Bonapriso', 4.0128, 9.7324,
  2, 1, 1, 0,
  'Kitchenette with fridge, kettle, and induction plate.',
  'Kitchenette avec réfrigérateur, bouilloire et plaque à induction.',
  'No smoking. No extra overnight guests without notice. Check-out by 11:00.',
  'Non-fumeur. Pas d’invités supplémentaires sans prévenir. Départ avant 11h00.',
  'Building has 24h security at the entrance. Keep the door locked.',
  'Immeuble avec sécurité 24h à l’entrée. Verrouillez toujours la porte.',
  'Wi-Fi details are in your housing sheet. The TV uses the HDMI stick in the console.',
  'Les identifiants Wi-Fi sont dans votre fiche logement. La TV utilise le dongle HDMI dans le meuble.',
  65000,
  'Bonapriso waterfront restaurants are a short drive away.',
  'Les restaurants du bord de l’eau à Bonapriso sont à quelques minutes.',
  'published'
),
(
  'dubai',
  'Dubai',
  'The Dubai room — our most spacious room at Impérial Home, ideal for small families or longer stays.',
  'La chambre Dubai — notre chambre la plus spacieuse à Impérial Home, idéale pour les petites familles ou les longs séjours.',
  'Welcome to the Dubai room at Impérial Home.',
  'Bienvenue dans la chambre Dubai à Impérial Home.',
  'Impérial Home, Bonapriso', 'Douala', 'Bonapriso', 4.0128, 9.7324,
  3, 1, 1, 0,
  'Large kitchen, dining table for 8, dishwasher, and filter coffee.',
  'Grande cuisine, table pour 8, lave-vaisselle et café filtre.',
  'Families welcome. No events without prior written approval. Respect neighbours.',
  'Familles bienvenues. Pas d’événements sans accord écrit. Respectez le voisinage.',
  'Two exits. Extinguishers on each floor of the building. Share gate code only with your party.',
  'Deux sorties. Extincteurs à chaque étage. Ne partagez le code du portail qu’avec votre groupe.',
  'Workspace monitors connect via HDMI. The washing machine cycle is 40 minutes.',
  'Les écrans du bureau se branchent en HDMI. Le cycle de la machine dure 40 minutes.',
  75000,
  'Bonapriso waterfront restaurants are a short drive away.',
  'Les restaurants du bord de l’eau à Bonapriso sont à quelques minutes.',
  'published'
)
on conflict (slug) do nothing;

insert into public.property_welcome_secrets (property_id, wifi_name, wifi_password, access_notes)
select id, 'Imperial-' || initcap(neighborhood), 'Ask-after-confirm', 'Gate code is sent after payment confirmation.'
from public.properties
on conflict (property_id) do nothing;

insert into public.property_images (property_id, url, alt_en, alt_fr, sort_order, is_cover)
select p.id, i.url, i.alt_en, i.alt_fr, i.sort_order, i.is_cover
from public.properties p
join (
  values
    ('abidjan', 'https://images.unsplash.com/photo-1616594039964-bdfa8af9ee78?auto=format&fit=crop&w=1600&q=80', 'Abidjan room', 'Chambre Abidjan', 0, true),
    ('singapour', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80', 'Singapour room', 'Chambre Singapour', 0, true),
    ('dubai', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80', 'Dubai room', 'Chambre Dubai', 0, true)
) as i(slug, url, alt_en, alt_fr, sort_order, is_cover)
  on i.slug = p.slug
where not exists (select 1 from public.property_images x where x.property_id = p.id);

insert into public.property_amenities (property_id, amenity_id)
select p.id, a.id
from public.properties p
join public.amenities a on a.slug in ('wifi', 'ac', 'kitchen', 'tv', 'security', 'hot-water')
where p.slug = 'abidjan'
on conflict do nothing;

insert into public.property_amenities (property_id, amenity_id)
select p.id, a.id
from public.properties p
join public.amenities a on a.slug in ('wifi', 'ac', 'kitchen', 'tv', 'workspace')
where p.slug = 'singapour'
on conflict do nothing;

insert into public.property_amenities (property_id, amenity_id)
select p.id, a.id
from public.properties p
join public.amenities a on a.slug in ('wifi', 'ac', 'kitchen', 'tv', 'parking', 'washer', 'security', 'generator', 'workspace', 'hot-water')
where p.slug = 'dubai'
on conflict do nothing;

insert into public.promotions (name, description_en, description_fr, discount_type, discount_value, starts_at, ends_at, is_active)
select 'Ouverture Impérial Home', 'Introductory offer on selected rooms at Impérial Home.', 'Offre d’ouverture sur certaines chambres à Impérial Home.', 'percent', 10, current_date - 5, current_date + 60, true
where not exists (select 1 from public.promotions where name = 'Ouverture Impérial Home');

insert into public.promotion_properties (promotion_id, property_id)
select pr.id, p.id
from public.promotions pr
join public.properties p on p.slug in ('abidjan', 'singapour')
where pr.name = 'Ouverture Impérial Home'
on conflict do nothing;
