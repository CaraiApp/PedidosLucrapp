Crear Nueva Membresía
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Nombre</th>
                <th className="py-3 px-4 text-left">Precio</th>
                <th className="py-3 px-4 text-left">Duración</th>
                <th className="py-3 px-4 text-left">Límite Artículos</th>
                <th className="py-3 px-4 text-left">Límite Proveedores</th>
                <th className="py-3 px-4 text-left">Límite Listas</th>
                <th className="py-3 px-4 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiposMembresia.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 px-4 text-center text-gray-500">
                    No hay tipos de membresía registrados
                  </td>
                </tr>
              ) : (
                tiposMembresia.map((membresia) => (
                  <tr key={membresia.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">{membresia.nombre}</td>
                    <td className="py-3 px-4">{formatCurrency(membresia.precio)}</td>
                    <td className="py-3 px-4">{membresia.duracion_meses} meses</td>
                    <td className="py-3 px-4">{membresia.limite_articulos ?? 'Ilimitado'}</td>
                    <td className="py-3 px-4">{membresia.limite_proveedores ?? 'Ilimitado'}</td>
                    <td className="py-3 px-4">{membresia.limite_listas ?? 'Ilimitado'}</td>
                    <td className="py-3 px-4">
                      <button
                        className="text-blue-600 hover:text-blue-800 mr-3"
                        onClick={() => handleEdit(membresia)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleDelete(membresia.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Membresías de Usuarios */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Membresías de Usuarios</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Usuario</th>
                <th className="py-3 px-4 text-left">Tipo de Membresía</th>
                <th className="py-3 px-4 text-left">Fecha Inicio</th>
                <th className="py-3 px-4 text-left">Fecha Fin</th>
                <th className="py-3 px-4 text-left">Estado</th>
                <th className="py-3 px-4 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {membresiasUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 px-4 text-center text-gray-500">
                    No hay membresías de usuarios registradas
                  </td>
                </tr>
              ) : (
                membresiasUsuarios.map((membresia) => (
                  <tr key={membresia.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {membresia.usuario?.username || 'N/A'}<br />
                      <span className="text-sm text-gray-500">{membresia.usuario?.email || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4">
                      {membresia.tipo_membresia?.nombre || 'N/A'}<br />
                      <span className="text-sm text-gray-500">
                        {membresia.tipo_membresia?.precio 
                          ? formatCurrency(membresia.tipo_membresia.precio) 
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(membresia.fecha_inicio)}</td>
                    <td className="py-3 px-4">{formatDate(membresia.fecha_fin)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${membresia.estado === 'activa' 
                          ? 'bg-green-100 text-green-800' 
                          : membresia.estado === 'cancelada' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'}`}>
                        {membresia.estado.charAt(0).toUpperCase() + membresia.estado.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        className="border rounded py-1 px-2"
                        value={membresia.estado}
                        onChange={(e) => handleUpdateEstado(membresia.id, e.target.value)}
                      >
                        <option value="activa">Activa</option>
                        <option value="cancelada">Cancelada</option>
                        <option value="expirada">Expirada</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear/editar membresía */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">
              {editingMembresia ? 'Editar Membresía' : 'Crear Nueva Membresía'}
            </h3>
            
            <form onSubmit={editingMembresia ? handleUpdate : handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (€)
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio || 0}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración (meses)
                </label>
                <input
                  type="number"
                  name="duracion_meses"
                  value={formData.duracion_meses || 1}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite de Artículos (vacío = ilimitado)
                </label>
                <input
                  type="number"
                  name="limite_articulos"
                  value={formData.limite_articulos || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite de Proveedores (vacío = ilimitado)
                </label>
                <input
                  type="number"
                  name="limite_proveedores"
                  value={formData.limite_proveedores || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite de Listas (vacío = ilimitado)
                </label>
                <input
                  type="number"
                  name="limite_listas"
                  value={formData.limite_listas || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}