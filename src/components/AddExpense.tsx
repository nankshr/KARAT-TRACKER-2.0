
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { ArrowLeft, Receipt, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import postgrest from '@/lib/postgrestClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logActivityWithContext } from '@/lib/activityLogger';

// Common expense item names for consistent categorization
const COMMON_EXPENSE_ITEMS = [
  "Tiffin",
  "Hallmark",
  "Iraivan",
  "Salary Amount",
  "Tea katai",
  "Mathina Bata",
  "GV Bata",
  "Kaviya Bata",
  "Bata Kaviya",
  "Anna Bata",
  "Tharmam",
  "Souinthar meruku",
  "Bata Anna",
  "Bata GV",
  "Appa Bata",
  "Appa Vaara Bata",
  "Bata Mathina",
  "Bata sadam",
  "Bata jevitha",
  "Water",
];

export const AddExpense = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const editId = searchParams.get('id');

  const [formData, setFormData] = useState({
    asof_date: format(new Date(), 'yyyy-MM-dd'),
    expense_type: '',
    item_name: '',
    cost: '',
    is_credit: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchExpenseRecord();
    }
  }, [isEditMode, editId]);

  const fetchExpenseRecord = async () => {
    if (!editId) {
      console.log('No editId provided');
      return;
    }

    console.log('fetchExpenseRecord called with editId:', editId, 'Type:', typeof editId);
    setIsLoading(true);
    try {
      const { data, error } = await postgrest
        .from('expense_log')
        .select('*')
        .eq('id', editId)
        .single()
        .execute();

      console.log('Initial fetch result:', { data, error });

      if (error) {
        console.error('Error fetching expense record:', error);
        toast.error('Failed to fetch expense record');
        navigate('/table-export');
        return;
      }

      if (data) {
        setOriginalData(data);

        // Pre-populate form with existing data
        setFormData({
          asof_date: data.asof_date,
          expense_type: data.expense_type,
          item_name: data.item_name,
          cost: data.cost?.toString() || '',
          is_credit: data.is_credit || false
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
      navigate('/table-export');
    } finally {
      setIsLoading(false);
    }
  };

  const updateExpenseRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!editId || !originalData) {
      toast.error('Original expense data not found');
      return;
    }

    if (!formData.asof_date || !formData.expense_type || !formData.item_name || !formData.cost) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Updating expense record with ID:', editId, 'Type:', typeof editId);

      // Check for duplicate expense entry (excluding current record)
      const duplicateEntry = await checkDuplicateExpense(
        formData.asof_date,
        formData.expense_type,
        formData.item_name,
        editId
      );

      if (duplicateEntry) {
        toast.error(`Duplicate expense detected! This expense (${formData.expense_type} - ${formData.item_name}) for today was already entered by ${duplicateEntry.inserted_by}.`);
        return;
      }

      const expenseData = {
        asof_date: formData.asof_date,
        expense_type: formData.expense_type,
        item_name: formData.item_name,
        cost: parseFloat(formData.cost),
        is_credit: formData.is_credit
      };

      // First check if the record exists
      console.log('Checking if record exists with ID:', editId);
      const { data: existingRecord, error: checkError} = await postgrest
        .from('expense_log')
        .select('*')
        .eq('id', editId)
        .single()
        .execute();

      console.log('Existence check result:', { existingRecord, checkError });

      if (checkError || !existingRecord) {
        console.error('Record not found for ID:', editId, 'Error:', checkError);
        throw new Error(`Expense record with ID ${editId} not found`);
      }

      console.log('Record exists, proceeding with update for ID:', editId);
      console.log('Update data:', expenseData);

      const { data, error } = await postgrest
        .from('expense_log')
        .update(expenseData)
        .eq('id', editId)
        .select()
        .execute();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No data returned from update. Data:', data);
        throw new Error('Record not found or could not be updated');
      }

      const updatedRecord = data[0];

      // Log the activity manually
      await logActivityWithContext(
        user.username,
        'expense_log',
        'UPDATE',
        updatedRecord.id,
        originalData,
        updatedRecord
      );

      toast.success('Expense updated successfully!');
      navigate('/table-export');

    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // If in edit mode, update the record
    if (isEditMode) {
      updateExpenseRecord(e);
      return;
    }

    // Otherwise, create new expense
    submitNewExpense(e);
  };

  const submitNewExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!user || !formData.asof_date || !formData.expense_type || !formData.item_name || !formData.cost) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {

      // Check for duplicate expense entry
      const duplicateEntry = await checkDuplicateExpense(
        formData.asof_date,
        formData.expense_type,
        formData.item_name
      );

      if (duplicateEntry) {
        toast.error(`Duplicate expense detected! This expense (${formData.expense_type} - ${formData.item_name}) for today was already entered by ${duplicateEntry.inserted_by}.`);
        return;
      }

      const expenseData = {
        inserted_by: user.username,
        asof_date: formData.asof_date,
        expense_type: formData.expense_type,
        item_name: formData.item_name,
        cost: parseFloat(formData.cost),
        is_credit: formData.is_credit
      };

      const { data, error } = await postgrest
        .from('expense_log')
        .insert(expenseData)
        .select()
        .single()
        .execute();

      if (error) {
        throw error;
      }

      // Log the activity manually
      await logActivityWithContext(
        user.username,
        'expense_log',
        'INSERT',
        data.id,
        undefined,
        data
      );

      toast.success('Expense added successfully!');
      
      // Clear form fields except date
      setFormData(prev => ({
        ...prev,
        expense_type: '',
        item_name: '',
        cost: '',
        is_credit: false
      }));

    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // When unchecking is_credit in edit mode, set cost to 0 (expense is settled)
      if (field === 'is_credit' && !value && isEditMode) {
        newData.cost = '0';
      }

      return newData;
    });
  };

  const checkDuplicateExpense = async (asofDate: string, expenseType: string, itemName: string, excludeId?: string) => {
    let query = postgrest
      .from('expense_log')
      .select('inserted_by, id')
      .eq('asof_date', asofDate)
      .eq('expense_type', expenseType)
      .eq('item_name', itemName);

    // If editing and excludeId is provided, exclude the current record
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.limit(1).execute();

    if (error) {
      console.error('Error in duplicate check:', error);
      throw error;
    }

    // Return the first record if any duplicates found, otherwise null
    return data && data.length > 0 ? data[0] : null;
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {isEditMode ? 'Edit Expense' : 'Add Expense'}
              </h1>
              <p className="text-slate-600">
                {isEditMode ? 'Update business expense' : 'Record a new business expense'}
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">Expense Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="asof_date" className="text-slate-700 font-medium">
                    Date *
                  </Label>
                  <Input
                    id="asof_date"
                    type="date"
                    value={formData.asof_date}
                    onChange={(e) => handleInputChange('asof_date', e.target.value)}
                    className="border-slate-300 focus:border-blue-400 focus:ring-blue-400"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense_type" className="text-slate-700 font-medium">
                    Expense Type *
                  </Label>
                  <Select value={formData.expense_type} onValueChange={(value) => handleInputChange('expense_type', value)}>
                    <SelectTrigger className="border-slate-300 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue placeholder="Select expense type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="indirect">Indirect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_name" className="text-slate-700 font-medium">
                  Item Name *
                </Label>
                <Combobox
                  value={formData.item_name}
                  onChange={(value) => handleInputChange('item_name', value)}
                  options={COMMON_EXPENSE_ITEMS}
                  placeholder="Select or type item name"
                  emptyText="No matching item. Press Enter to use custom name."
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost" className="text-slate-700 font-medium">
                  Cost (₹) *
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount in rupees"
                  value={formData.cost}
                  onChange={(e) => handleInputChange('cost', e.target.value)}
                  className="border-slate-300 focus:border-blue-400 focus:ring-blue-400"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_credit"
                  checked={formData.is_credit}
                  onChange={(e) => handleInputChange('is_credit', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={isLoading}
                />
                <Label htmlFor="is_credit" className="text-slate-700 font-medium">
                  Udhaar (Credit)
                </Label>
                <span className="text-sm text-slate-500">
                  Check if this is a credit/loan expense
                </span>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 border-slate-300 text-slate-700"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Expense' : 'Save Expense')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
