import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function StatCard({ title, value, icon: Icon, trend, trendValue, color = 'blue' }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
            <span className="text-gray-500 ml-1">from last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
