import React, { useState } from 'react';

interface ProductSearchProps {
  onAddToCart: (product: any) => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ onAddToCart }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Productos de ejemplo
  const products = [
    { id: 1, name: 'Paracetamol 500mg', price: 25.50, stock: 45, barcode: '750123456789' },
    { id: 2, name: 'Amoxicilina 250mg', price: 89.00, stock: 23, barcode: '750123456790' },
    { id: 3, name: 'Omeprazol 20mg', price: 45.00, stock: 67, barcode: '750123456791' },
    { id: 4, name: 'Aspirina 500mg', price: 35.00, stock: 89, barcode: '750123456792' },
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Buscar Productos</h2>
      
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-gray-800">{product.name}</h3>
            <p className="text-sm text-gray-600">Código: {product.barcode}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</span>
              <span className={`text-sm ${product.stock < 30 ? 'text-red-600' : 'text-green-600'}`}>
                Stock: {product.stock}
              </span>
            </div>
            <button
              onClick={() => onAddToCart(product)}
              className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar al Carrito
            </button>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron productos
        </div>
      )}
    </div>
  );
};

export default ProductSearch;