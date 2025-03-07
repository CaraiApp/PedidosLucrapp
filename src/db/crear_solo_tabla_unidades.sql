-- Solo crear la tabla de unidades
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  abreviatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar unidades básicas una por una
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Unidades', 'uds');
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Kilogramos', 'kg');
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Litros', 'l');
INSERT INTO public.unidades (nombre, abreviatura) VALUES ('Cajas', 'caj');