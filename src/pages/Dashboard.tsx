import React from 'react';

const Dashboard: React.FC = () => {
  const stats = [
    { label: 'Ventas Hoy', value: '$12,458', change: '+12%', color: 'blue' },
    { label: 'Productos Vendidos', value: '156', change: '+8%', color: 'green' },
    { label: 'Inventario Bajo', value: '23', change: '-5%', color: 'yellow' },
    { label: 'Clientes Atendidos', value: '89', change: '+15%', color: 'purple' },
  ];

  const recentSales = [
    { id: '#00123', customer: 'Juan Pérez', amount: '$245.00', time: '10:30 AM' },
    { id: '#00124', customer: 'María García', amount: '$189.50', time: '11:15 AM' },
    { id: '#00125', customer: 'Carlos López', amount: '$320.75', time: '11:45 AM' },
    { id: '#00126', customer: 'Ana Martínez', amount: '$156.25', time: '12:20 PM' },
  ];

  const popularProducts = [
    { name: 'Paracetamol 500mg', sold: 45, revenue: '$1,147.50' },
    { name: 'Amoxicilina 250mg', sold: 32, revenue: '$2,848.00' },
    { name: 'Omeprazol 20mg', sold: 28, revenue: '$1,260.00' },
    { name: 'Aspirina 500mg', sold: 25, revenue: '$875.00' },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'border-blue-500 bg-blue-50',
      green: 'border-green-500 bg-green-50',
      yellow: 'border-yellow-500 bg-yellow-50',
      purple: 'border-purple-500 bg-purple-50',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border">
          Actualizado hace 5 min
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className={`card p-6 border-l-4 ${getColorClasses(stat.color)}`}>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">{stat.label}</h3>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Recientes */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas Recientes</h3>
          <div className="space-y-3">
            {recentSales.map((sale, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium text-gray-800">{sale.id}</div>
                  <div className="text-sm text-gray-600">{sale.customer}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{sale.amount}</div>
                  <div className="text-sm text-gray-500">{sale.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Productos Populares */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Populares</h3>
          <div className="space-y-3">
            {popularProducts.map((product, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium text-gray-800">{product.name}</div>
                  <div className="text-sm text-gray-600">{product.sold} vendidos</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">{product.revenue}</div>
                  <div className="text-sm text-gray-500">Ingresos</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;