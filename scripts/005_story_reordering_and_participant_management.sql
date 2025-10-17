-- Script de documentation pour les nouvelles fonctionnalités
-- Ce script documente les fonctionnalités de réorganisation des stories et de gestion des participants

-- La colonne order_index existe déjà dans la table stories
-- Elle est utilisée pour maintenir l'ordre des stories dans la queue

-- Fonctionnalités ajoutées :
-- 1. Réorganisation des User Stories par drag & drop
--    - Utilise la colonne order_index existante
--    - Permet au Scrum Master de réorganiser la queue de stories
--
-- 2. Gestion des participants
--    - Permet au Scrum Master d'exclure des participants (kick)
--    - Ne peut pas exclure le Scrum Master lui-même
--    - Supprime automatiquement les votes du participant exclu
--
-- 3. Suppression de stories
--    - Permet de supprimer des stories de la queue
--    - Réorganise automatiquement les order_index après suppression

-- Vérification que la colonne order_index existe bien
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'scrum_poker'
  AND table_name = 'stories'
  AND column_name = 'order_index';

-- Index existants pour les performances
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'scrum_poker'
  AND tablename IN ('stories', 'participants', 'votes');
