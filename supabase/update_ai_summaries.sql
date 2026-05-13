-- Update ai_summary_i18n with rich content for all seeded places
-- Run this in Supabase SQL Editor

UPDATE public.places SET ai_summary_i18n = '{
  "es": "Las Ruinas de Copán fueron la capital del reino Maya Xukpi — la Atenas del mundo precolombino. Aquí los mayas construyeron la escalinata jeroglífica más larga del mundo (2,200 glifos) y crearon el calendario solar más preciso de su época. Es Patrimonio de la Humanidad UNESCO desde 1980 y uno de los sitios arqueológicos más importantes del continente.",
  "en": "Copán Ruins were the capital of the Maya kingdom Xukpi — the Athens of the pre-Columbian world. Here the Maya built the longest hieroglyphic stairway in the world (2,200 glyphs) and created the most precise solar calendar of their era. UNESCO World Heritage since 1980."
}'::jsonb
WHERE slug = ''ruinas-copan'';

UPDATE public.places SET ai_summary_i18n = '{
  "es": "La Catedral de Comayagua guarda uno de los secretos medievales más insólitos de América: un reloj árabe del siglo XIII que el rey Alfonso X de España donó a Honduras en el siglo XVI. Lleva más de 800 años marcando el tiempo sin parar — el más antiguo en funcionamiento del mundo. La catedral misma, construida en 1558, es la más antigua de Centroamérica.",
  "en": "Comayagua Cathedral holds one of the most unusual medieval secrets in the Americas: a 13th-century Arab clock that King Alfonso X of Spain donated to Honduras in the 16th century. It has been keeping time for over 800 years — the oldest working clock in the world."
}'::jsonb
WHERE slug = ''catedral-comayagua'';

UPDATE public.places SET ai_summary_i18n = '{
  "es": "El Parque Nacional Cusuco es un mundo perdido a 30 minutos de San Pedro Sula. Sus bosques nubosos albergan el quetzal — el pájaro sagrado de los mayas — junto a pumas, más de 270 especies de aves y orquídeas únicas en el mundo. Es uno de los ecosistemas más biodiversos de Mesoamérica y prácticamente inexplorado por el turismo masivo.",
  "en": "Cusuco National Park is a lost world 30 minutes from San Pedro Sula. Its cloud forests shelter the quetzal — the sacred Maya bird — alongside pumas, 270+ bird species and world-unique orchids. One of Mesoamerica''s most biodiverse ecosystems, virtually untouched by mass tourism."
}'::jsonb
WHERE slug = ''parque-nacional-cusuco'';

UPDATE public.places SET ai_summary_i18n = '{
  "es": "West Bay es la postal perfecta del Caribe: arena blanca como polvo, agua turquesa transparente hasta 30 metros de profundidad y el arrecife mesoamericano — el segundo más grande del mundo — a metros de la orilla. Los buzos y snorkelistas la consideran una de las mejores experiencias submarinas del Atlántico. Roatán pertenece al segundo arrecife de coral más extenso del planeta.",
  "en": "West Bay is the perfect Caribbean postcard: powder-white sand, turquoise water transparent to 30 meters deep, and the Mesoamerican Reef — the world''s second largest — meters from shore. Divers and snorkelers rank it among the Atlantic''s top underwater experiences."
}'::jsonb
WHERE slug = ''playa-west-bay-roatan'';

UPDATE public.places SET ai_summary_i18n = '{
  "es": "La Tigra fue el primer parque nacional de Honduras (1980) y es la razón por la que Tegucigalpa tiene agua potable — sus bosques nubosos abastecen el 40% del suministro de la capital. A solo 22 km del centro, es un aula verde al aire libre con más de 238 especies de aves, orquídeas silvestres y senderos que parecen sacados de un cuento.",
  "en": "La Tigra was Honduras''s first national park (1980) and the reason Tegucigalpa has drinking water — its cloud forests supply 40% of the capital''s water. Just 22 km from downtown, it''s an open-air green classroom with 238+ bird species, wild orchids and fairy-tale trails."
}'::jsonb
WHERE slug = ''parque-nacional-la-tigra'';
