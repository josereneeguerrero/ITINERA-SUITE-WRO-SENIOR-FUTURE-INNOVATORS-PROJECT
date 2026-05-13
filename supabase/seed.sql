-- =============================================================================
-- Itinera Suite — Seed data (Honduras Demo)
-- st_* functions live in extensions schema
set search_path to public, extensions;
-- Idempotent: uses ON CONFLICT DO NOTHING / NOT EXISTS guards
-- Run via: SQL Editor in Supabase dashboard or psql -f seed.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Regions (Honduras)
-- ---------------------------------------------------------------------------
insert into public.regions (id, slug, name_i18n, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'copan',         '{"es":"Copán","en":"Copan"}',                       1),
  ('00000000-0000-0000-0000-000000000002', 'tegucigalpa',   '{"es":"Tegucigalpa","en":"Tegucigalpa"}',            2),
  ('00000000-0000-0000-0000-000000000003', 'la-ceiba',      '{"es":"La Ceiba","en":"La Ceiba"}',                  3),
  ('00000000-0000-0000-0000-000000000004', 'roatan',        '{"es":"Roatán","en":"Roatan"}',                      4),
  ('00000000-0000-0000-0000-000000000005', 'comayagua',     '{"es":"Comayagua","en":"Comayagua"}',                5),
  ('00000000-0000-0000-0000-000000000006', 'san-pedro-sula','{"es":"San Pedro Sula","en":"San Pedro Sula"}',      6)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Place categories
-- ---------------------------------------------------------------------------
insert into public.place_categories (id, slug, name_i18n, icon_name, sort_order) values
  ('00000000-0000-0000-0001-000000000001', 'heritage',    '{"es":"Patrimonio Cultural","en":"Cultural Heritage"}', 'landmark',    1),
  ('00000000-0000-0000-0001-000000000002', 'nature',      '{"es":"Naturaleza","en":"Nature"}',                     'leaf',        2),
  ('00000000-0000-0000-0001-000000000003', 'food',        '{"es":"Gastronomía","en":"Food & Dining"}',             'utensils',    3),
  ('00000000-0000-0000-0001-000000000004', 'adventure',   '{"es":"Aventura","en":"Adventure"}',                    'zap',         4),
  ('00000000-0000-0000-0001-000000000005', 'arts',        '{"es":"Arte y Museos","en":"Arts & Museums"}',          'palette',     5),
  ('00000000-0000-0000-0001-000000000006', 'religion',    '{"es":"Religioso","en":"Religious"}',                   'church',      6),
  ('00000000-0000-0000-0001-000000000007', 'beach',       '{"es":"Playa","en":"Beach"}',                           'waves',       7)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Place types
-- ---------------------------------------------------------------------------
insert into public.place_types (id, slug, name_i18n, category_id) values
  ('00000000-0000-0000-0002-000000000001', 'ruins',          '{"es":"Ruinas Arqueológicas","en":"Archaeological Ruins"}', '00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0002-000000000002', 'colonial-town',  '{"es":"Ciudad Colonial","en":"Colonial Town"}',             '00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0002-000000000003', 'museum',         '{"es":"Museo","en":"Museum"}',                              '00000000-0000-0000-0001-000000000005'),
  ('00000000-0000-0000-0002-000000000004', 'national-park',  '{"es":"Parque Nacional","en":"National Park"}',             '00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0002-000000000005', 'restaurant',     '{"es":"Restaurante","en":"Restaurant"}',                    '00000000-0000-0000-0001-000000000003'),
  ('00000000-0000-0000-0002-000000000006', 'beach',          '{"es":"Playa","en":"Beach"}',                               '00000000-0000-0000-0001-000000000007'),
  ('00000000-0000-0000-0002-000000000007', 'cathedral',      '{"es":"Catedral","en":"Cathedral"}',                        '00000000-0000-0000-0001-000000000006'),
  ('00000000-0000-0000-0002-000000000008', 'zipline-canopy', '{"es":"Canopy/Zipline","en":"Canopy/Zipline"}',              '00000000-0000-0000-0001-000000000004')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
insert into public.tags (id, slug, name_i18n) values
  ('00000000-0000-0000-0003-000000000001', 'maya',          '{"es":"Maya","en":"Mayan"}'),
  ('00000000-0000-0000-0003-000000000002', 'familia',       '{"es":"Familiar","en":"Family-friendly"}'),
  ('00000000-0000-0000-0003-000000000003', 'unesco',        '{"es":"UNESCO","en":"UNESCO"}'),
  ('00000000-0000-0000-0003-000000000004', 'local-food',    '{"es":"Comida Típica","en":"Local Food"}'),
  ('00000000-0000-0000-0003-000000000005', 'eco',           '{"es":"Ecoturismo","en":"Ecotourism"}'),
  ('00000000-0000-0000-0003-000000000006', 'accesible',     '{"es":"Accesible","en":"Accessible"}'),
  ('00000000-0000-0000-0003-000000000007', 'fotografía',    '{"es":"Fotogénico","en":"Photogenic"}'),
  ('00000000-0000-0000-0003-000000000008', 'historia',      '{"es":"Histórico","en":"Historical"}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Places (key Honduras attractions)
-- PostGIS: ST_GeomFromText('POINT(lng lat)', 4326)
-- ---------------------------------------------------------------------------
insert into public.places (
  id, slug, name_i18n, description_i18n, ai_summary_i18n,
  place_type_id, category_id, region_id,
  location, address_i18n,
  accessibility, price_level, local_favorite, featured,
  aggregated_rating, review_count, status
) values
  -- Ruinas de Copán
  (
    '00000000-0000-0000-0004-000000000001',
    'ruinas-copan',
    '{"es":"Ruinas de Copán","en":"Copán Ruins"}',
    '{"es":"Sitio arqueológico Maya declarado Patrimonio de la Humanidad por la UNESCO en 1980. Famoso por sus estelas y el Patio de los Hieroglíficos.","en":"Maya archaeological site declared a UNESCO World Heritage Site in 1980, famous for its stelae and the Hieroglyphic Stairway."}',
    '{"es":"Las Ruinas de Copán son el corazón del legado Maya en Honduras. Aquí los mayas registraron su historia en piedra mediante una de las escalinatas de jeroglíficos más largas del mundo.","en":"Copán Ruins are the heart of the Mayan legacy in Honduras, where the Maya recorded their history in stone through one of the world longest hieroglyphic stairways."}',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    st_setsrid(st_makepoint(-89.1422, 14.8383), 4326)::geography,
    '{"es":"Copán Ruinas, Copán, Honduras","en":"Copan Ruinas, Copan, Honduras"}',
    true, 2, true, true, 4.80, 0, 'published'
  ),
  -- Catedral de Comayagua
  (
    '00000000-0000-0000-0004-000000000002',
    'catedral-comayagua',
    '{"es":"Catedral de Comayagua","en":"Comayagua Cathedral"}',
    '{"es":"La catedral más antigua de América Central (1558). Alberga el reloj árabe más antiguo del mundo aún en funcionamiento, donado por el rey Alfonso X el Sabio.","en":"The oldest cathedral in Central America (1558), housing the oldest Arab clock in the world still in operation, gifted by King Alfonso X."}',
    '{"es":"La Catedral de Comayagua es un tesoro colonial que guarda siglos de fe e historia. Su reloj árabe del siglo XIII sigue marcando el tiempo, conectando Honduras con la España medieval.","en":"Comayagua Cathedral is a colonial treasure preserving centuries of faith and history. Its 13th-century Arab clock still keeps time, connecting Honduras to medieval Spain."}',
    '00000000-0000-0000-0002-000000000007',
    '00000000-0000-0000-0001-000000000006',
    '00000000-0000-0000-0000-000000000005',
    st_setsrid(st_makepoint(-87.6375, 14.4607), 4326)::geography,
    '{"es":"Parque Central, Comayagua, Honduras","en":"Central Park, Comayagua, Honduras"}',
    true, 1, true, true, 4.60, 0, 'published'
  ),
  -- Parque Nacional Cusuco
  (
    '00000000-0000-0000-0004-000000000003',
    'parque-nacional-cusuco',
    '{"es":"Parque Nacional Cusuco","en":"Cusuco National Park"}',
    '{"es":"Bosque nuboso con una de las mayores biodiversidades de Mesoamérica. Hogar de quetzales, pumas y más de 270 especies de aves.","en":"Cloud forest with one of the highest biodiversities in Mesoamerica, home to quetzals, pumas, and over 270 bird species."}',
    '{"es":"El Parque Nacional Cusuco es el pulmón verde de Honduras occidental. Sus bosques nubosos son refugio del quetzal y testimonio vivo de la riqueza natural hondureña.","en":"Cusuco National Park is the green lung of western Honduras, where cloud forests shelter the quetzal and showcase the country extraordinary natural wealth."}',
    '00000000-0000-0000-0002-000000000004',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000006',
    st_setsrid(st_makepoint(-88.2310, 15.4833), 4326)::geography,
    '{"es":"San Pedro Sula, Cortés, Honduras","en":"San Pedro Sula, Cortes, Honduras"}',
    false, 2, false, true, 4.70, 0, 'published'
  ),
  -- Playa West Bay, Roatán
  (
    '00000000-0000-0000-0004-000000000004',
    'playa-west-bay-roatan',
    '{"es":"Playa West Bay","en":"West Bay Beach"}',
    '{"es":"Una de las mejores playas del Caribe. Arena blanca, aguas turquesa cristalinas y arrecife de coral a pocos metros de la orilla. Ideal para snorkel y buceo.","en":"One of the best beaches in the Caribbean, with white sand, crystal-clear turquoise water, and a coral reef just meters from shore. Perfect for snorkeling and diving."}',
    '{"es":"West Bay es la joya caribeña de Honduras. Su arrecife mesoamericano es el segundo más grande del mundo y ofrece una experiencia submarina incomparable para visitantes de todo el mundo.","en":"West Bay is Honduras Caribbean gem. Its Mesoamerican Reef, the second largest in the world, offers an unparalleled underwater experience for visitors worldwide."}',
    '00000000-0000-0000-0002-000000000006',
    '00000000-0000-0000-0001-000000000007',
    '00000000-0000-0000-0000-000000000004',
    st_setsrid(st_makepoint(-83.9669, 16.3198), 4326)::geography,
    '{"es":"West Bay, Roatán, Islas de la Bahía, Honduras","en":"West Bay, Roatan, Bay Islands, Honduras"}',
    true, 3, false, true, 4.90, 0, 'published'
  ),
  -- La Tigra, Tegucigalpa
  (
    '00000000-0000-0000-0004-000000000005',
    'parque-nacional-la-tigra',
    '{"es":"Parque Nacional La Tigra","en":"La Tigra National Park"}',
    '{"es":"El primer parque nacional de Honduras (1980), a solo 22 km de Tegucigalpa. Bosque nuboso que abastece de agua potable a la capital. Ideal para senderismo.","en":"Honduras first national park (1980), just 22 km from Tegucigalpa. A cloud forest that supplies drinking water to the capital, ideal for hiking."}',
    '{"es":"La Tigra protege el bosque que da de beber a Tegucigalpa. A pocos minutos de la capital, este parque conecta a los habitantes con su patrimonio natural y es un aula verde al aire libre.","en":"La Tigra protects the forest that gives Tegucigalpa its water. Just minutes from the capital, this park connects residents to their natural heritage and serves as an open-air green classroom."}',
    '00000000-0000-0000-0002-000000000004',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000002',
    st_setsrid(st_makepoint(-87.0833, 14.1167), 4326)::geography,
    '{"es":"San Juancito, Francisco Morazán, Honduras","en":"San Juancito, Francisco Morazan, Honduras"}',
    false, 1, true, false, 4.50, 0, 'published'
  )
on conflict (id) do nothing;

-- Place tags
insert into public.place_tags (place_id, tag_id) values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001'), -- copan + maya
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000003'), -- copan + UNESCO
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000008'), -- copan + historia
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000007'), -- copan + fotografía
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000008'), -- catedral + historia
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000007'), -- catedral + fotografía
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000002'), -- catedral + familia
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000005'), -- cusuco + eco
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000002'), -- cusuco + familia
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0003-000000000007'), -- west bay + fotografía
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0003-000000000002'), -- west bay + familia
  ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0003-000000000005'), -- la tigra + eco
  ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0003-000000000002')  -- la tigra + familia
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Stories (cultural content)
-- ---------------------------------------------------------------------------
insert into public.stories (id, slug, title_i18n, summary_i18n, body_markdown_i18n, region_id, featured, status, moderation_status)
values
  (
    '00000000-0000-0000-0005-000000000001',
    'legado-maya-copan',
    '{"es":"El Legado Maya de Copán","en":"The Mayan Legacy of Copán"}',
    '{"es":"Descubre cómo los mayas construyeron uno de los centros intelectuales más importantes de Mesoamérica en las selvas de Honduras.","en":"Discover how the Maya built one of the most important intellectual centers of Mesoamerica in the jungles of Honduras."}',
    '{"es":"## El Legado Maya\n\nCopán fue la capital del reino maya conocido como Xukpi. Durante el período Clásico (250-900 d.C.), se convirtió en un centro de astronomía, arte y escritura.\n\n### La Escalinata Jeroglífica\nCon más de 2,200 glifos, es el texto maya más largo conocido...\n\n### Los Reyes de Copán\nEl rey más famoso fue Uaxaclajuun Ub''aah K''awiil (18 Conejo), quien gobernó de 695 a 738 d.C.","en":"## The Mayan Legacy\n\nCopán was the capital of the Mayan kingdom known as Xukpi..."}',
    '00000000-0000-0000-0000-000000000001',
    true, 'published', 'approved'
  ),
  (
    '00000000-0000-0000-0005-000000000002',
    'reloj-arabe-comayagua',
    '{"es":"El Reloj Árabe de Comayagua","en":"The Arab Clock of Comayagua"}',
    '{"es":"La historia del reloj más antiguo del mundo en funcionamiento, que viajó desde España hasta Honduras en el siglo XVI.","en":"The story of the oldest working clock in the world, which traveled from Spain to Honduras in the 16th century."}',
    '{"es":"## Un Tesoro Medieval en América\n\nEl reloj de la Catedral de Comayagua data del siglo XIII, construido originalmente para la Alhambra de Granada, España...\n\n### El Viaje al Nuevo Mundo\nFue donado por el Rey Felipe II de España a la naciente colonia...\n\n### Funcionamiento Único\nSigue funcionando con el mismo mecanismo original después de 800 años.","en":"## A Medieval Treasure in America\n\nThe clock dates back to the 13th century..."}',
    '00000000-0000-0000-0000-000000000005',
    true, 'published', 'approved'
  )
on conflict (id) do nothing;

-- Link stories to places
insert into public.story_places (story_id, place_id) values
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000001'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0004-000000000002')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Sponsor demo (UNICAH)
-- ---------------------------------------------------------------------------
insert into public.sponsors (id, slug, name_i18n, website, active, starts_at, ends_at)
values (
  '00000000-0000-0000-0006-000000000001',
  'unicah',
  '{"es":"UNICAH - Universidad Católica de Honduras","en":"UNICAH - Catholic University of Honduras"}',
  'https://www.unicah.edu',
  true,
  now(),
  now() + interval '1 year'
)
on conflict (id) do nothing;

insert into public.sponsor_campaigns (
  id, sponsor_id, name, target, boost_weight, boost_cap,
  starts_at, ends_at, active
) values (
  '00000000-0000-0000-0007-000000000001',
  '00000000-0000-0000-0006-000000000001',
  'UNICAH Brand Awareness - Honduras Cultural',
  'global',
  0.10,
  0.10,
  now(),
  now() + interval '1 year',
  true
)
on conflict (id) do nothing;
