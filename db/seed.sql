-- ALIBI seed data — 7 days of fake-Yewen activity
-- Run this in your Vercel Postgres dashboard after CREATE TABLE

-- ============ DAY -6 (Sunday) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('slow morning. coffee + reading about 3.js', 'morning reading on Three.js', 'learning', 'creative', 60, 'neutral', 'easy', 'satisfied', '{"novelty": true}'::jsonb, NOW() - INTERVAL '6 days' + TIME '10:30'),
('went for a walk to broadway market, got veg', 'walked to Broadway Market for groceries', 'errands', 'errands', 75, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '6 days' + TIME '12:00'),
('cooked lunch w keifer, tried that miso aubergine recipe', 'cooked lunch with Keifer', 'home', 'care', 60, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '6 days' + TIME '14:00'),
('finally sorted the cinecircle backlog notes', 'sorted Cinecircle backlog notes', 'cinecircle', 'admin', 45, 'proud', 'medium', 'satisfied', '{"avoidance": true}'::jsonb, NOW() - INTERVAL '6 days' + TIME '17:00'),
('netil radio prep — picked tracks for next show', 'prepped tracks for Netil Radio show', 'music', 'creative', 90, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '6 days' + TIME '20:00'),
('feeling pretty good today actually', 'felt good — gentle Sunday', 'self', 'rest', NULL, 'joyful', 'easy', 'satisfied', '{"self_compassionate": true}'::jsonb, NOW() - INTERVAL '6 days' + TIME '22:00');

-- ============ DAY -5 (Monday) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('ugh the email i''ve been avoiding for 2 weeks. finally sent it', 'sent the avoided email', 'admin', 'admin', 20, 'guilty', 'hard', 'satisfied', '{"avoidance": true, "procrastination_long": true}'::jsonb, NOW() - INTERVAL '5 days' + TIME '11:15'),
('socket.io thing in cinecircle, 2hrs in and still stuck', 'debugging Socket.io in Cinecircle', 'cinecircle', 'deep_work', 120, 'flat', 'grind', 'frustrated', '{"hyperfocus": true}'::jsonb, NOW() - INTERVAL '5 days' + TIME '14:00'),
('lunch was just toast lol', 'lunch — toast', 'home', 'care', 10, 'flat', 'easy', 'unclear', '{}'::jsonb, NOW() - INTERVAL '5 days' + TIME '15:00'),
('back at the socket thing. finally figured out the connection drop', 'fixed Socket.io connection drop', 'cinecircle', 'deep_work', 90, 'proud', 'hard', 'satisfied', '{"hyperfocus": true, "breakthrough": true}'::jsonb, NOW() - INTERVAL '5 days' + TIME '18:30'),
('called mum, like 40 mins', 'called mum for 40 minutes', 'family', 'social', 40, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '5 days' + TIME '20:00'),
('exhausted. brain fully fried', 'wiped out — long day', 'self', 'rest', NULL, 'flat', NULL, 'unclear', '{"forced_rest": true, "aftermath_depleted": true}'::jsonb, NOW() - INTERVAL '5 days' + TIME '22:30');

-- ============ DAY -4 (Tuesday) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('coffee w ines, talked through cinecircle scope', 'coffee with Ines re: Cinecircle scope', 'cinecircle', 'social', 75, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '4 days' + TIME '10:30'),
('drafted the midi relay server thing for pete', 'drafted MIDI relay server for Pete', 'speakers-corner', 'deep_work', 150, 'proud', 'medium', 'satisfied', '{"hyperfocus": true}'::jsonb, NOW() - INTERVAL '4 days' + TIME '13:00'),
('lunch — actually cooked, dal and rice', 'cooked dal and rice for lunch', 'home', 'care', 30, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '4 days' + TIME '15:30'),
('quick tweaks to portfolio site, fixed broken link', 'fixed portfolio site broken link', 'portfolio', 'admin', 25, 'neutral', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '4 days' + TIME '16:30'),
('wrote that cover letter for the SharpEnd role', 'wrote SharpEnd cover letter', 'job-hunt', 'admin', 60, 'neutral', 'hard', 'mixed', '{"avoidance": true}'::jsonb, NOW() - INTERVAL '4 days' + TIME '18:00'),
('movie with keifer. brain off', 'movie with Keifer', 'home', 'rest', 120, 'joyful', 'easy', 'satisfied', '{"restoration": true}'::jsonb, NOW() - INTERVAL '4 days' + TIME '20:30');

-- ============ DAY -3 (Wednesday) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('couldnt sleep til 3am. woke up trash', 'woke up exhausted, bad sleep', 'self', 'rest', NULL, 'flat', NULL, 'frustrated', '{"poor_sleep": true}'::jsonb, NOW() - INTERVAL '3 days' + TIME '10:00'),
('did one email. one. then doom scrolled', 'replied to one email, then doomscrolled', 'admin', 'admin', 15, 'guilty', 'hard', 'frustrated', '{"guilt": true, "self_critical": true}'::jsonb, NOW() - INTERVAL '3 days' + TIME '12:00'),
('forced myself to walk. felt better after', 'forced walk — felt better', 'self', 'rest', 40, 'neutral', 'medium', 'satisfied', '{"forced_action": true, "restoration": true}'::jsonb, NOW() - INTERVAL '3 days' + TIME '14:00'),
('back to cinecircle, just refactored the timeline hook', 'refactored useCommentTimeline hook', 'cinecircle', 'deep_work', 90, 'proud', 'medium', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '3 days' + TIME '16:00'),
('made dinner. nothing fancy', 'made simple dinner', 'home', 'care', 30, 'neutral', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '3 days' + TIME '19:00'),
('feeling like i wasted today', 'felt like wasted day', 'self', 'rest', NULL, 'guilty', NULL, 'frustrated', '{"guilt": true, "self_critical": true, "all_or_nothing": true}'::jsonb, NOW() - INTERVAL '3 days' + TIME '22:00');

-- ============ DAY -2 (Thursday) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('better sleep. felt like a person again', 'slept well, feeling restored', 'self', 'rest', NULL, 'joyful', 'easy', 'satisfied', '{"restoration": true}'::jsonb, NOW() - INTERVAL '2 days' + TIME '09:00'),
('deep work morning. dawkeeper, 3hrs straight on the diff parser', 'deep work on DAWkeeper diff parser', 'dawkeeper', 'deep_work', 180, 'joyful', 'hard', 'satisfied', '{"hyperfocus": true, "flow": true}'::jsonb, NOW() - INTERVAL '2 days' + TIME '11:00'),
('proper lunch finally. salmon and greens', 'cooked salmon and greens', 'home', 'care', 30, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '2 days' + TIME '14:30'),
('zoom w pete about the midi thing, scoped it down', 'call with Pete on MIDI relay scope', 'speakers-corner', 'social', 45, 'proud', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '2 days' + TIME '16:00'),
('netil radio show went live, played a lot of new stuff', 'live Netil Radio show', 'music', 'creative', 90, 'joyful', 'medium', 'satisfied', '{"flow": true}'::jsonb, NOW() - INTERVAL '2 days' + TIME '20:00'),
('great day. like genuinely', 'great day overall', 'self', 'rest', NULL, 'joyful', NULL, 'satisfied', '{"self_compassionate": true}'::jsonb, NOW() - INTERVAL '2 days' + TIME '23:00');

-- ============ DAY -1 (Friday) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('groggy start, dragged self to laptop', 'slow start, dragged self to work', 'self', 'rest', NULL, 'flat', 'hard', 'unclear', '{"low_initiation": true}'::jsonb, NOW() - INTERVAL '1 days' + TIME '10:30'),
('answered 4 emails i''d been putting off', 'cleared 4 avoided emails', 'admin', 'admin', 30, 'proud', 'hard', 'satisfied', '{"avoidance": true}'::jsonb, NOW() - INTERVAL '1 days' + TIME '11:30'),
('cinecircle — wrote the test for the timeline hook', 'wrote test for timeline hook', 'cinecircle', 'deep_work', 60, 'neutral', 'medium', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '1 days' + TIME '13:00'),
('coffee w mark at climpsons. talked about the gallery thing', 'coffee with Mark at Climpsons', 'social', 'social', 90, 'joyful', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '1 days' + TIME '15:00'),
('couldn''t focus after. did some admin', 'couldn''t refocus, did light admin', 'admin', 'admin', 45, 'flat', 'medium', 'mixed', '{"context_switch_cost": true}'::jsonb, NOW() - INTERVAL '1 days' + TIME '17:30'),
('drinks w the goldsmiths people', 'drinks with Goldsmiths friends', 'social', 'social', 180, 'joyful', 'easy', 'satisfied', '{"restoration": true}'::jsonb, NOW() - INTERVAL '1 days' + TIME '20:00');

-- ============ DAY 0 (Today, partial) ============
INSERT INTO activities (raw_input, description, project, category, duration_min, mood, effort, satisfaction, markers, activity_at) VALUES
('slow morning, stayed in bed too long', 'slow morning in bed', 'self', 'rest', NULL, 'flat', 'easy', 'unclear', '{}'::jsonb, NOW() - INTERVAL '4 hours'),
('finally replied to the omnea referral email', 'replied to Omnea referral email', 'job-hunt', 'admin', 20, 'proud', 'hard', 'satisfied', '{"avoidance": true}'::jsonb, NOW() - INTERVAL '3 hours'),
('cinecircle work — sketched the dual timestamp model', 'sketched Cinecircle dual timestamp model', 'cinecircle', 'deep_work', 75, 'proud', 'hard', 'satisfied', '{"hyperfocus": true}'::jsonb, NOW() - INTERVAL '90 minutes'),
('quick lunch — leftover dal', 'lunch — leftover dal', 'home', 'care', 15, 'neutral', 'easy', 'satisfied', '{}'::jsonb, NOW() - INTERVAL '60 minutes');