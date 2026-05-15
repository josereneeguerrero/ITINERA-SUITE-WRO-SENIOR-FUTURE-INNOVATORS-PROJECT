-- Seed: Lugares de Comayagua (11 places, all categories)
-- Run in Supabase SQL Editor. Idempotent via NOT EXISTS checks.
-- Catedral de Comayagua already exists — skipped.
-- PostGIS location: st_setsrid(st_makepoint(lng, lat), 4326)::geography

begin;

-- Iglesia de La Merced
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'iglesia-la-merced-comayagua',
  '{"es":"Iglesia de La Merced","en":"Church of La Merced"}'::jsonb,
  '{"es":"La Iglesia de La Merced, construida en 1550 por Fray Gaspar de Quintanilla, es la iglesia más antigua de Honduras y fue la primera en recibir la categoría de catedral del país en 1561. Su arquitectura colonial de cal y canto es un testimonio único de la evangelización en Centroamérica. El templo conserva su campanario original y su fachada barroca de sobria belleza. Es considerada Monumento Nacional de Honduras.","en":"Built in 1550 by Fray Gaspar de Quintanilla, La Merced is the oldest church still standing in Honduras and was the country''s first cathedral, designated in 1561. Its thick stone-and-mortar walls and restrained Baroque facade represent the earliest phase of colonial religious architecture in Central America. The original bell tower survives intact."}'::jsonb,
  '{"es":"La Iglesia de La Merced es la iglesia colonial más antigua de Honduras, fundada en 1550, y testigo vivo de cinco siglos de fe y arquitectura barroca en Comayagua.","en":"La Merced is Honduras'' oldest standing church, built in 1550, and a living witness to five centuries of colonial faith and Baroque architecture in Comayagua."}'::jsonb,
  st_setsrid(st_makepoint(-87.6407, 14.4577), 4326)::geography,
  4.6, 1, true, false, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'religion' limit 1)
where not exists (select 1 from public.places where slug = 'iglesia-la-merced-comayagua');

-- Iglesia de San Francisco
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'iglesia-san-francisco-comayagua',
  '{"es":"Iglesia de San Francisco","en":"Church of Saint Francis"}'::jsonb,
  '{"es":"La Iglesia de San Francisco fue edificada en 1560 y alberga la campana más antigua de América, la Antonina, fundida en España en 1460. Es la segunda iglesia más antigua de Comayagua. Fue transferida a los frailes franciscanos en 1575. Su sencilla fachada blanca contrasta con la riqueza histórica que resguarda.","en":"Built in 1560, Iglesia San Francisco houses the Antonina bell cast in Spain in 1460, considered the oldest bell in the Americas. It is Comayagua''s second-oldest church, transferred to the Franciscans in 1575. Its plain whitewashed facade belies its extraordinary historical significance."}'::jsonb,
  '{"es":"San Francisco alberga la campana más antigua de América, fundida en 1460, y fue centro de evangelización franciscana desde el siglo XVI en el corazón colonial de Comayagua.","en":"San Francisco holds the oldest bell in the Americas, cast in 1460, and served as a Franciscan evangelization hub since the 16th century in Comayagua''s colonial heart."}'::jsonb,
  st_setsrid(st_makepoint(-87.6408, 14.4620), 4326)::geography,
  4.5, 1, true, false, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'religion' limit 1)
where not exists (select 1 from public.places where slug = 'iglesia-san-francisco-comayagua');

-- Iglesia de La Caridad
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'iglesia-la-caridad-comayagua',
  '{"es":"Iglesia de La Caridad","en":"Church of Our Lady of Charity"}'::jsonb,
  '{"es":"Construida entre 1629 y 1654, la Iglesia de La Caridad fue parroquia de indígenas, pardos y mulatos durante la época colonial. Su fachada exhibe la transición entre el estilo barroco y el neoclásico. En la parte trasera se conserva la única capilla de indios que subsiste en Honduras, usada para la evangelización al aire libre. Fue declarada Monumento Nacional el 11 de octubre de 1972.","en":"Built between 1629 and 1654, La Caridad was the parish church for indigenous and mulato communities in colonial Comayagua. Its facade transitions between Baroque and Neoclassical styles. At the rear stands Honduras'' only surviving open-air indigenous chapel. It was declared a National Monument on October 11, 1972."}'::jsonb,
  '{"es":"La Iglesia de La Caridad alberga la única capilla de indios sobreviviente de Honduras, un monumento barroco-neoclásico del siglo XVII dedicado a las comunidades marginadas de la colonia.","en":"La Caridad houses Honduras'' only surviving open-air indigenous chapel, a 17th-century Baroque-Neoclassical monument dedicated to the colony''s marginalized communities."}'::jsonb,
  st_setsrid(st_makepoint(-87.6430, 14.4625), 4326)::geography,
  4.4, 1, true, false, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'religion' limit 1)
where not exists (select 1 from public.places where slug = 'iglesia-la-caridad-comayagua');

-- Iglesia de San Sebastian
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'iglesia-san-sebastian-comayagua',
  '{"es":"Iglesia de San Sebastián","en":"Church of Saint Sebastian"}'::jsonb,
  '{"es":"La Iglesia de San Sebastián, levantada en 1581, es la única iglesia colonial de Comayagua fuera del distrito histórico, erigida para la población indígena y negra de los barrios periféricos. Es la tercera colonial más antigua de Honduras. En su interior reposan los restos del expresidente José Trinidad Cabañas. La iglesia fue restaurada en 1957 tras sufrir daños por terremotos.","en":"Built in 1581, San Sebastián is the only colonial church in Comayagua outside the historic district, built for indigenous and Black populations. It is Honduras'' third-oldest colonial church. The remains of former president General José Trinidad Cabañas are interred here. The church was restored in 1957 after earthquake damage."}'::jsonb,
  '{"es":"San Sebastián es la única iglesia colonial de Comayagua fuera del centro histórico y el panteón del general Cabañas, expresidente de Honduras y héroe de la independencia centroamericana.","en":"San Sebastián is Comayagua''s only colonial church outside the historic center, housing the remains of General Cabañas, former Honduran president and Central American independence hero."}'::jsonb,
  st_setsrid(st_makepoint(-87.6360, 14.4508), 4326)::geography,
  4.3, 1, true, false, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'religion' limit 1)
where not exists (select 1 from public.places where slug = 'iglesia-san-sebastian-comayagua');

-- Museo de Comayagua
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, website, region_id, category_id)
select 'museo-comayagua',
  '{"es":"Museo de Comayagua","en":"Comayagua Museum"}'::jsonb,
  '{"es":"El Museo de Comayagua, fundado en 1940 y administrado por el IHAH, ocupa una casona colonial del siglo XVI que fue residencia presidencial. Con diez salas de exhibición, es el único museo del mundo dedicado a la cultura Lenca. Expone paleontología, arqueología prehispánica, arte colonial y patrimonio republicano. Su colección documenta la ocupación humana del Valle de Comayagua desde tiempos prehistóricos.","en":"Founded in 1940 and managed by IHAH, the Comayagua Museum is housed in a 16th-century colonial mansion that once served as the presidential residence. Its ten exhibition rooms make it the only museum in the world dedicated to Lenca culture, displaying paleontology, pre-Hispanic archaeology, colonial art, and republican heritage."}'::jsonb,
  '{"es":"El Museo de Comayagua es el único museo mundial dedicado a la cultura Lenca, alojado en una mansión colonial del siglo XVI que fue residencia presidencial de Honduras.","en":"The Comayagua Museum is the world''s only museum dedicated to Lenca culture, housed in a 16th-century colonial mansion that once served as Honduras'' presidential residence."}'::jsonb,
  st_setsrid(st_makepoint(-87.6430, 14.4615), 4326)::geography,
  4.5, 1, true, false, true, 'published',
  'https://ihah.hn/museo-de-comayagua/',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'arts' limit 1)
where not exists (select 1 from public.places where slug = 'museo-comayagua');

-- Museo Colonial de Arte Religioso
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'museo-arte-religioso-comayagua',
  '{"es":"Museo Colonial de Arte Religioso","en":"Museum of Colonial Religious Art"}'::jsonb,
  '{"es":"El Museo Colonial de Arte Religioso, el único de su tipo en Honduras, conserva 1,700 piezas del período colonial: esculturas, pinturas, ornamentos bordados en oro, custodias con esmeraldas y objetos litúrgicos de los siglos XVII y XVIII. Funciona en el Palacio Episcopal adyacente a la catedral. Destruido por un incendio en 2009, reabrió en 2012 con el 60% de la colección rescatada.","en":"Honduras'' only colonial religious art museum houses 1,700 pieces: sculptures, paintings, gold-thread vestments, emerald-inlaid monstrances, and 17th–18th century liturgical objects. Located in the Episcopal Palace adjacent to the cathedral. Destroyed by fire in 2009, it reopened in 2012 with 60% of the original collection recovered."}'::jsonb,
  '{"es":"El único museo de arte religioso colonial de Honduras resguarda 1,700 piezas de los siglos XVII y XVIII, incluyendo custodias incrustadas de esmeraldas, en el Palacio Episcopal de Comayagua.","en":"Honduras'' only colonial religious art museum safeguards 1,700 pieces including emerald-inlaid monstrances inside Comayagua''s historic Episcopal Palace."}'::jsonb,
  st_setsrid(st_makepoint(-87.6431, 14.4549), 4326)::geography,
  4.5, 1, false, false, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'arts' limit 1)
where not exists (select 1 from public.places where slug = 'museo-arte-religioso-comayagua');

-- La Caxa Real
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'la-caxa-real-comayagua',
  '{"es":"La Caxa Real","en":"The Royal Treasury"}'::jsonb,
  '{"es":"La Caxa Real, construida entre 1739 y 1741 por el arquitecto Baltasar de Maradiaga, fue el centro administrativo más importante de la Honduras colonial, donde se procesaban los tributos de oro y plata para la Corona española. Tras una restauración concluida en 2013 fue declarada Monumento Nacional y reconvertida en centro cultural. Hoy acoge exposiciones y eventos cívicos en el centro histórico.","en":"Built between 1739 and 1741 by architect Baltasar de Maradiaga, La Caxa Real was colonial Honduras'' most important administrative building, where gold and silver tribute was processed for the Spanish Crown. Following restoration completed in 2013 it was declared a National Monument and converted into a cultural center hosting exhibitions and civic events."}'::jsonb,
  '{"es":"La Caxa Real fue la tesorería real de la Honduras colonial; hoy es un centro cultural restaurado y Monumento Nacional en el corazón histórico de Comayagua.","en":"La Caxa Real was colonial Honduras'' royal treasury; today a restored National Monument and active cultural center at the heart of Comayagua''s historic district."}'::jsonb,
  st_setsrid(st_makepoint(-87.6401, 14.4610), 4326)::geography,
  4.4, 1, true, false, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'heritage' limit 1)
where not exists (select 1 from public.places where slug = 'la-caxa-real-comayagua');

-- Casa de la Cultura
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, region_id, category_id)
select 'casa-de-la-cultura-comayagua',
  '{"es":"Casa de la Cultura de Comayagua","en":"Comayagua Cultural House"}'::jsonb,
  '{"es":"La Casa de la Cultura de Comayagua, creada en 2007, ocupa una casona colonial restaurada frente al Parque Central. Sus salas exhiben objetos históricos, artesanías locales y exposiciones rotativas. También imparte clases de teatro, danza, pintura y música. Su patio interior colonial es uno de los espacios más fotogénicos del centro histórico.","en":"Created in 2007, the Comayagua Cultural House occupies a restored colonial mansion facing Parque Central. Its rooms exhibit historical objects, local handicrafts, and rotating displays. The center offers community classes in theater, dance, painting, and music. Its colonial inner courtyard is one of the most picturesque spaces in the historic district."}'::jsonb,
  '{"es":"La Casa de la Cultura es el corazón artístico de Comayagua: una casona colonial con exposiciones, talleres y un hermoso patio colonial frente al Parque Central.","en":"Casa de la Cultura is Comayagua''s artistic heart: a restored colonial mansion with exhibits, workshops, and a beautiful courtyard facing Parque Central."}'::jsonb,
  st_setsrid(st_makepoint(-87.6414, 14.4603), 4326)::geography,
  4.3, 1, true, true, false, 'published',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'arts' limit 1)
where not exists (select 1 from public.places where slug = 'casa-de-la-cultura-comayagua');

-- PANACOMA
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, website, region_id, category_id)
select 'panacoma-comayagua',
  '{"es":"Parque Nacional Montaña de Comayagua","en":"Comayagua Mountain National Park"}'::jsonb,
  '{"es":"El Parque Nacional Montaña de Comayagua (PANACOMA), establecido en 1987, cubre 30,094 hectáreas de bosque nuboso que protegen las cuencas del Valle de Comayagua. Su punto más alto, El Portillo, alcanza los 2,407 m. Senderos señalizados conducen a la Cascada de los Ensueños, una caída de 50 metros. El parque alberga tucanes, quetzales y más de 200 especies de aves.","en":"Established in 1987, PANACOMA covers 30,094 hectares of cloud forest protecting the Comayagua Valley watersheds. Its highest peak, El Portillo, reaches 2,407 meters. Marked trails lead to the 50-meter Cascada de los Ensueños waterfall. The park is home to toucans, quetzals, and over 200 bird species."}'::jsonb,
  '{"es":"PANACOMA es el bosque nuboso más importante del centro de Honduras: 30,094 hectáreas con el pico El Portillo a 2,407 m y senderos a cascadas de 50 metros con quetzales.","en":"PANACOMA is central Honduras'' most important cloud forest: 30,094 hectares with El Portillo peak at 2,407 m and trails to 50-meter waterfalls inhabited by quetzals."}'::jsonb,
  st_setsrid(st_makepoint(-87.5542, 14.5425), 4326)::geography,
  4.6, 1, false, false, true, 'published',
  'https://redhonduras.hn/en/biodiversity/comayagua-mountain-national-park/',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'nature' limit 1)
where not exists (select 1 from public.places where slug = 'panacoma-comayagua');

-- Restaurante El Torito
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, phone, website, region_id, category_id)
select 'restaurante-el-torito-comayagua',
  '{"es":"Restaurante El Torito","en":"El Torito Restaurant"}'::jsonb,
  '{"es":"Restaurante El Torito es el asador de referencia de Comayagua, reconocido como uno de los mejores de carnes del país. Bajo dirección uruguaya, el menú se inspira en la tradición gaucha: parrilladas mixtas, chorizos, anafre hondureño y cortes a la brasa. Abre de martes a domingo con estacionamiento propio y barra completa.","en":"El Torito is Comayagua''s benchmark steakhouse, recognized as one of the finest meat restaurants in Honduras. Under Uruguayan ownership, the menu draws on gaucho tradition: mixed grills, chorizo, Honduran anafre, and prime charcoal-grilled cuts. Open Tuesday through Sunday with parking and full bar."}'::jsonb,
  '{"es":"El Torito combina la tradición gaucha uruguaya con el sabor hondureño, ofreciendo las mejores carnes a la brasa de Comayagua con décadas de trayectoria.","en":"El Torito blends Uruguayan gaucho tradition with Honduran flavor, serving Comayagua''s finest charcoal-grilled meats with decades of local reputation."}'::jsonb,
  st_setsrid(st_makepoint(-87.6354, 14.4407), 4326)::geography,
  4.4, 2, true, true, false, 'published',
  '+504 2772-7113', 'https://www.facebook.com/resttorito/',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'food' limit 1)
where not exists (select 1 from public.places where slug = 'restaurante-el-torito-comayagua');

-- La Antoniana Gastro Pub
insert into public.places (slug, name_i18n, description_i18n, ai_summary_i18n, location, aggregated_rating, price_level, accessibility, local_favorite, featured, status, phone, region_id, category_id)
select 'la-antoniana-comayagua',
  '{"es":"La Antoniana Gastro Pub","en":"La Antoniana Gastro Pub"}'::jsonb,
  '{"es":"La Antoniana Gastro Pub rescata los ingredientes y técnicas de la cocina hondureña tradicional en formato de gastropub moderno. El menú celebra los sabores del Valle de Comayagua con platos creativos que combinan productos autóctonos con preparaciones actuales. Ubicada en Barrio Abajo a pasos del Parque Central, es uno de los restaurantes más valorados del centro histórico.","en":"La Antoniana rescues traditional Honduran ingredients and techniques in a modern gastropub format. The menu celebrates the flavors of the Comayagua Valley through creative dishes combining native produce with modern preparations. Located in Barrio Abajo steps from Parque Central, it is one of the most highly rated restaurants in the historic center."}'::jsonb,
  '{"es":"La Antoniana es el gastropub más innovador de Comayagua, que reinterpreta la cocina tradicional del Valle en un ambiente moderno a pasos del Parque Central.","en":"La Antoniana is Comayagua''s most innovative gastropub, reinterpreting the valley''s traditional cuisine in a modern setting steps from Parque Central."}'::jsonb,
  st_setsrid(st_makepoint(-87.6422, 14.4608), 4326)::geography,
  4.5, 2, true, true, false, 'published',
  '+504 9942-6200',
  (select id from public.regions where slug = 'comayagua' limit 1),
  (select id from public.place_categories where slug = 'food' limit 1)
where not exists (select 1 from public.places where slug = 'la-antoniana-comayagua');

commit;

-- Verify
select p.slug, p.name_i18n->>'es' as nombre, c.name_i18n->>'es' as categoria, r.name_i18n->>'es' as region, p.aggregated_rating
from public.places p
left join public.place_categories c on c.id = p.category_id
left join public.regions r on r.id = p.region_id
where r.slug = 'comayagua'
order by p.created_at;
