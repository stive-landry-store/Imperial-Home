-- Anciennes URLs Unsplash Corolla (404) → remplacement

delete from public.vehicle_media
where vehicle_id in (select id from public.vehicles where slug = 'toyota-corolla-vert')
  and url in (
    'https://images.unsplash.com/photo-1623869675783-e504a3445483?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1590362893262-a234cd5663ea?auto=format&fit=crop&w=1600&q=80'
  );

insert into public.vehicle_media (vehicle_id, url, media_type, sort_order)
select v.id, m.url, 'image', m.sort_order
from public.vehicles v
join (
  values
    ('toyota-corolla-vert', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1600&q=80', 0),
    ('toyota-corolla-vert', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=80', 1)
) as m(slug, url, sort_order) on m.slug = v.slug
where not exists (
  select 1 from public.vehicle_media vm where vm.vehicle_id = v.id and vm.url = m.url
);
