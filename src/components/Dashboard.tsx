
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DailyRatesBanner } from './DailyRatesBanner';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Receipt, ShoppingCart, LogOut, User, Crown, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-amber-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  Karat Tracker
                </h1>
                <p className="text-xs text-slate-600">Premium Jewelry Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-full">
                <User className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-medium text-amber-800">
                  {user?.username} ({user?.role})
                </span>
              </div>
              <Button
                onClick={handleLogout}
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Daily Rates Banner */}
        <DailyRatesBanner />

        {/* Action Cards */}
        <div className={`grid grid-cols-1 ${(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'employee') ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Receipt className="h-8 w-8 text-white" />
                </div>
                <PlusCircle className="h-6 w-6 text-blue-500 group-hover:text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Add Expenses</h3>
              <p className="text-slate-600 mb-6">
                Record and track business expenses with detailed categorization
              </p>
              <Button
                onClick={() => navigate('/add-expense')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg"
              >
                Add New Expense
              </Button>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
                <PlusCircle className="h-6 w-6 text-green-500 group-hover:text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Add Sales</h3>
              <p className="text-slate-600 mb-6">
                Log sales transactions with comprehensive purchase and selling details
              </p>
              <Button
                onClick={() => navigate('/add-sales')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg"
              >
                Add New Sale
              </Button>
            </CardContent>
          </Card>

          {/* Table Export Card - For Admin, Owner, and Employee */}
          {(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'employee') && (
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <Database className="h-8 w-8 text-white" />
                  </div>
                  <PlusCircle className="h-6 w-6 text-purple-500 group-hover:text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Table Export</h3>
                <p className="text-slate-600 mb-6">
                  Export database tables to CSV format with date filtering
                </p>
                <Button
                  onClick={() => navigate('/table-export')}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg"
                >
                  Export Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
