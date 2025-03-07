// src/app/admin/dashboard/membresias/nuevo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import { Mensaje } from "@/types";

interface FormData {
  nombre: string;
  precio: string;
  duracion_meses: string;
  limite_proveedores: string;
  limite_articulos: string;
  limite_listas: string;
  descripcion: string;
}

interface MembresiaData {
  nombre: string;
  precio: number;
  duracion_meses: number;
  limite_proveedores: number | null;
  limite_articulos: number | null;
  limite_listas: number | null;
  descripcion: string | null;
}

export default function NuevaMembresiaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    precio: "",
    duracion_meses: "1",
    limite_proveedores: "",
    limite_articulos: "",
    limite_listas: "",
    descripcion: "",
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombre.trim()) {
      setMensaje({
        texto: "El nombre del plan es obligatorio",
        tipo: "error"
      });
      return;
    }

    if (
      !formData.precio.trim() ||
      isNaN(Number(formData.precio)) ||
      Number(formData.precio) < 0
    ) {
      setMensaje({
        texto: "Por favor ingrese un precio válido",
        tipo: "error"
      });
      return;
    }

    try {
      setLoading(true);
      setMensaje(null);

      // Preparar los datos para insertar
      const membresiaData: MembresiaData = {
        nombre: formData.nombre.trim(),
        precio: parseFloat(formData.precio),
        duracion_meses: parseInt(formData.duracion_meses),
        limite_proveedores: formData.limite_proveedores.trim()
          ? parseInt(formData.limite_proveedores)
          : null,
        limite_articulos: formData.limite_articulos.trim()
          ? parseInt(formData.limite_articulos)
          : null,
        limite_listas: formData.limite_listas.trim()
          ? parseInt(formData.limite_listas)
          : null,
        descripcion: formData.descripcion.trim() || null,
      };

      // Insertar en la base de datos
      const { error: insertError } = await supabase
        .from("membresia_tipos")
        .insert(membresiaData);

      if (insertError) throw insertError;

      // Redireccionar a la lista de membresías
      router.push("/admin/dashboard/membresias");
    } catch (err) {
      console.error("Error al crear plan de membresía:", err);
      setMensaje({
        texto: "No se pudo crear el plan de membresía. Por favor, intenta nuevamente.",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Crear Nuevo Plan de Membresía
        </h1>
        <Button
          variant="secondary"
          onClick={() => router.push("/admin/dashboard/membresias")}
        >
          Cancelar
        </Button>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <Input
                id="nombre"
                name="nombre"
                label="Nombre del Plan"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                fullWidth
              />
            </div>

            <div>
              <Input
                id="precio"
                name="precio"
                label="Precio (€)"
                type="number"
                min="0"
                step="0.01"
                value={formData.precio}
                onChange={handleInputChange}
                required
                fullWidth
              />
            </div>

            <div>
              <label
                htmlFor="duracion_meses"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duración (meses) <span className="text-red-500">*</span>
              </label>
              <select
                id="duracion_meses"
                name="duracion_meses"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.duracion_meses}
                onChange={handleInputChange}
                required
              >
                <option value="1">1 mes</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
              </select>
            </div>

            <div>
              <Input
                id="limite_proveedores"
                name="limite_proveedores"
                label="Límite de Proveedores"
                type="number"
                min="0"
                step="1"
                value={formData.limite_proveedores}
                onChange={handleInputChange}
                helpText="Dejar en blanco para ilimitado"
                fullWidth
              />
            </div>

            <div>
              <Input
                id="limite_articulos"
                name="limite_articulos"
                label="Límite de Artículos"
                type="number"
                min="0"
                step="1"
                value={formData.limite_articulos}
                onChange={handleInputChange}
                helpText="Dejar en blanco para ilimitado"
                fullWidth
              />
            </div>

            <div>
              <Input
                id="limite_listas"
                name="limite_listas"
                label="Límite de Listas de Compra"
                type="number"
                min="0"
                step="1"
                value={formData.limite_listas}
                onChange={handleInputChange}
                helpText="Dejar en blanco para ilimitado"
                fullWidth
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="descripcion"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descripción
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Describe las características de este plan"
              ></textarea>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading}
            >
              Guardar Plan
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
