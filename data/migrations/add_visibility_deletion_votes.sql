-- Añadir campo de visibilidad (suponiendo que 1=visible, 0=oculto)
ALTER TABLE incidents ADD COLUMN visibility INTEGER NOT NULL DEFAULT 1;

-- Añadir campo para contar votos de borrado
ALTER TABLE incidents ADD COLUMN deletion_votes INTEGER NOT NULL DEFAULT 0;

-- Crear índice para el campo de visibilidad para optimizar consultas
CREATE INDEX idx_incidents_visibility ON incidents(visibility);
