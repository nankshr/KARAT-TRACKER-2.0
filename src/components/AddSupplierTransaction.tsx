import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Package, Save, Calculator } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import postgrest from '@/lib/postgrestClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logActivityWithContext } from '@/lib/activityLogger';

export const AddSupplierTransaction = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const editId = searchParams.get('id');

  const [formData, setFormData] = useState({
    asof_date: format(new Date(), 'yyyy-MM-dd'),
    supplier_name: '',
    material: '',
    type: 'input',
    calculation_type: 'cashToKacha',
    input_value_1: '',
    input_value_2: '',
    result: '',
    is_credit: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  // Check role on mount
  useEffect(() => {
    if (user?.role === 'employee') {
      toast.error('Access Denied: Only admin/owner can access supplier management');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchTransactionRecord();
    }
  }, [isEditMode, editId]);

  const fetchTransactionRecord = async () => {
    if (!editId) return;

    setIsLoading(true);
    try {
      const { data, error } = await postgrest
        .from('supplier_transactions')
        .select('*')
        .eq('id', editId)
        .single()
        .execute();

      if (error) {
        console.error('Error fetching transaction record:', error);
        toast.error('Failed to fetch transaction record');
        navigate('/table-export');
        return;
      }

      if (data) {
        setOriginalData(data);
        setFormData({
          asof_date: data.asof_date,
          supplier_name: data.supplier_name,
          material: data.material,
          type: data.type,
          calculation_type: data.calculation_type,
          input_value_1: data.input_value_1?.toString() || '',
          input_value_2: data.input_value_2?.toString() || '',
          result: data.result?.toString() || '',
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

  const getFieldLabels = () => {
    switch (formData.calculation_type) {
      case 'cashToKacha':
        return {
          value1: 'Cash Amount (₹)',
          value2: 'Rate per gram (₹)',
          result: 'Kacha Weight (g)',
          formula: 'Cash ÷ Rate',
          value1Placeholder: 'e.g., 150000',
          value2Placeholder: 'e.g., 150'
        };
      case 'kachaToPurity':
        return {
          value1: 'Kacha Weight (g)',
          value2: 'Purity (%)',
          result: 'Pure Gold (g)',
          formula: 'Kacha × Purity%',
          value1Placeholder: 'e.g., 1000',
          value2Placeholder: 'e.g., 80'
        };
      case 'ornamentToPurity':
        return {
          value1: 'Ornament Weight (g)',
          value2: 'Purity (%)',
          result: 'Pure Gold (g)',
          formula: 'Ornament × Purity%',
          value1Placeholder: 'e.g., 1000',
          value2Placeholder: 'e.g., 91.6'
        };
      default:
        return {
          value1: 'Value 1',
          value2: 'Value 2',
          result: 'Result',
          formula: '',
          value1Placeholder: '',
          value2Placeholder: ''
        };
    }
  };

  const handleCalculation = () => {
    const val1 = parseFloat(formData.input_value_1);
    const val2 = parseFloat(formData.input_value_2);

    if (isNaN(val1) || isNaN(val2)) {
      toast.error('Please enter valid numbers for calculation');
      return;
    }

    let result: number;
    if (formData.calculation_type === 'cashToKacha') {
      result = val1 / val2; // Cash ÷ Rate
    } else {
      // kachaToPurity or ornamentToPurity
      result = val1 * (val2 / 100); // Weight × Purity%
    }

    setFormData(prev => ({ ...prev, result: result.toFixed(3) }));
    toast.success('Calculation completed!');
  };

  const checkDuplicateTransaction = async (
    asofDate: string,
    supplierName: string,
    material: string,
    type: string,
    excludeId?: string
  ) => {
    let query = postgrest
      .from('supplier_transactions')
      .select('inserted_by, id')
      .eq('asof_date', asofDate)
      .eq('supplier_name', supplierName)
      .eq('material', material)
      .eq('type', type);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error in duplicate check:', error);
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  };

  const validateForm = () => {
    if (!formData.asof_date) {
      toast.error('Please select a date');
      return false;
    }
    if (!formData.supplier_name) {
      toast.error('Please enter supplier name');
      return false;
    }
    if (!formData.material) {
      toast.error('Please select material');
      return false;
    }
    if (!formData.type) {
      toast.error('Please select type');
      return false;
    }
    if (!formData.input_value_1 || !formData.input_value_2) {
      toast.error('Please fill all calculation fields');
      return false;
    }
    if (!formData.result) {
      toast.error('Please calculate the result before saving');
      return false;
    }
    return true;
  };

  const updateTransactionRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!editId || !originalData) {
      toast.error('Original transaction data not found');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for duplicates (excluding current record)
      const duplicateEntry = await checkDuplicateTransaction(
        formData.asof_date,
        formData.supplier_name,
        formData.material,
        formData.type,
        editId
      );

      if (duplicateEntry) {
        toast.error(
          `Duplicate entry detected! Transaction for ${formData.supplier_name} (${formData.material}, ${formData.type}) on this date was already entered by ${duplicateEntry.inserted_by}.`
        );
        return;
      }

      const transactionData = {
        asof_date: formData.asof_date,
        supplier_name: formData.supplier_name,
        material: formData.material,
        type: formData.type,
        calculation_type: formData.calculation_type,
        input_value_1: parseFloat(formData.input_value_1),
        input_value_2: parseFloat(formData.input_value_2),
        result: parseFloat(formData.result),
        is_credit: formData.is_credit
      };

      const { data, error } = await postgrest
        .from('supplier_transactions')
        .update(transactionData)
        .eq('id', editId)
        .select()
        .execute();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Record not found or could not be updated');
      }

      const updatedRecord = data[0];

      // Log the activity
      await logActivityWithContext(
        user.username,
        'supplier_transactions',
        'UPDATE',
        updatedRecord.id,
        originalData,
        updatedRecord
      );

      toast.success('Supplier transaction updated successfully!');
      navigate('/table-export');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const submitNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for duplicates
      const duplicateEntry = await checkDuplicateTransaction(
        formData.asof_date,
        formData.supplier_name,
        formData.material,
        formData.type
      );

      if (duplicateEntry) {
        toast.error(
          `Duplicate entry detected! Transaction for ${formData.supplier_name} (${formData.material}, ${formData.type}) on this date was already entered by ${duplicateEntry.inserted_by}.`
        );
        return;
      }

      const transactionData = {
        inserted_by: user.username,
        asof_date: formData.asof_date,
        supplier_name: formData.supplier_name,
        material: formData.material,
        type: formData.type,
        calculation_type: formData.calculation_type,
        input_value_1: parseFloat(formData.input_value_1),
        input_value_2: parseFloat(formData.input_value_2),
        result: parseFloat(formData.result),
        is_credit: formData.is_credit
      };

      const { data, error } = await postgrest
        .from('supplier_transactions')
        .insert(transactionData)
        .select()
        .single()
        .execute();

      if (error) throw error;

      // Log the activity
      await logActivityWithContext(
        user.username,
        'supplier_transactions',
        'INSERT',
        data.id,
        undefined,
        data
      );

      toast.success('Supplier transaction added successfully!');

      // Clear form fields except date
      setFormData(prev => ({
        ...prev,
        supplier_name: '',
        material: '',
        type: 'input',
        calculation_type: 'cashToKacha',
        input_value_1: '',
        input_value_2: '',
        result: '',
        is_credit: false
      }));
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isEditMode) {
      updateTransactionRecord(e);
    } else {
      submitNewTransaction(e);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Clear calculation fields when calculation type changes
      if (field === 'calculation_type') {
        newData.input_value_1 = '';
        newData.input_value_2 = '';
        newData.result = '';
      }

      return newData;
    });
  };

  const labels = getFieldLabels();
  const buttonColor = formData.calculation_type === 'cashToKacha' ? 'blue' :
                      formData.calculation_type === 'kachaToPurity' ? 'purple' : 'orange';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-gray-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            size="sm"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {isEditMode ? 'Edit Supplier Transaction' : 'Add Supplier Transaction'}
              </h1>
              <p className="text-slate-600">
                {isEditMode ? 'Update material transaction' : 'Record a new material transaction with supplier'}
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-yellow-100 to-gray-100 border-b-2 border-yellow-200">
            <CardTitle className="text-xl text-slate-800">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="asof_date" className="text-slate-700 font-medium">
                    Date *
                  </Label>
                  <Input
                    id="asof_date"
                    type="date"
                    value={formData.asof_date}
                    onChange={(e) => handleInputChange('asof_date', e.target.value)}
                    className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier_name" className="text-slate-700 font-medium">
                    Supplier Name *
                  </Label>
                  <Input
                    id="supplier_name"
                    type="text"
                    placeholder="Enter supplier name"
                    value={formData.supplier_name}
                    onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                    className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material" className="text-slate-700 font-medium">
                    Material *
                  </Label>
                  <Select value={formData.material} onValueChange={(value) => handleInputChange('material', value)}>
                    <SelectTrigger className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-slate-700 font-medium">
                    Type *
                  </Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">Input (வாங்குவது)</SelectItem>
                      <SelectItem value="output">Output (கொடுப்பது)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calculation_type" className="text-slate-700 font-medium">
                    Calculation Type *
                  </Label>
                  <Select value={formData.calculation_type} onValueChange={(value) => handleInputChange('calculation_type', value)}>
                    <SelectTrigger className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400">
                      <SelectValue placeholder="Select calculation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashToKacha">Cash → Kacha</SelectItem>
                      <SelectItem value="kachaToPurity">Kacha → Purity</SelectItem>
                      <SelectItem value="ornamentToPurity">Ornament → Purity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculation Section */}
              <div className={`p-6 rounded-lg border-2 ${
                formData.calculation_type === 'cashToKacha' ? 'bg-blue-50 border-blue-200' :
                formData.calculation_type === 'kachaToPurity' ? 'bg-purple-50 border-purple-200' :
                'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-bold text-gray-800">Calculation: {labels.formula}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="input_value_1" className={`font-semibold ${
                      formData.calculation_type === 'cashToKacha' ? 'text-blue-700' :
                      formData.calculation_type === 'kachaToPurity' ? 'text-purple-700' :
                      'text-orange-700'
                    }`}>
                      {labels.value1} *
                    </Label>
                    <Input
                      id="input_value_1"
                      type="number"
                      step="0.001"
                      placeholder={labels.value1Placeholder}
                      value={formData.input_value_1}
                      onChange={(e) => handleInputChange('input_value_1', e.target.value)}
                      className={`border-2 ${
                        formData.calculation_type === 'cashToKacha' ? 'border-blue-300 focus:border-blue-500' :
                        formData.calculation_type === 'kachaToPurity' ? 'border-purple-300 focus:border-purple-500' :
                        'border-orange-300 focus:border-orange-500'
                      }`}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="input_value_2" className={`font-semibold ${
                      formData.calculation_type === 'cashToKacha' ? 'text-blue-700' :
                      formData.calculation_type === 'kachaToPurity' ? 'text-purple-700' :
                      'text-orange-700'
                    }`}>
                      {labels.value2} *
                    </Label>
                    <Input
                      id="input_value_2"
                      type="number"
                      step="0.001"
                      placeholder={labels.value2Placeholder}
                      value={formData.input_value_2}
                      onChange={(e) => handleInputChange('input_value_2', e.target.value)}
                      className={`border-2 ${
                        formData.calculation_type === 'cashToKacha' ? 'border-blue-300 focus:border-blue-500' :
                        formData.calculation_type === 'kachaToPurity' ? 'border-purple-300 focus:border-purple-500' :
                        'border-orange-300 focus:border-orange-500'
                      }`}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Button
                      type="button"
                      onClick={handleCalculation}
                      className={`w-full ${
                        formData.calculation_type === 'cashToKacha' ? 'bg-blue-600 hover:bg-blue-700' :
                        formData.calculation_type === 'kachaToPurity' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-orange-600 hover:bg-orange-700'
                      } text-white font-semibold`}
                      disabled={isLoading}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="result" className="font-semibold text-green-700">
                      {labels.result}
                    </Label>
                    <Input
                      id="result"
                      type="text"
                      value={formData.result}
                      readOnly
                      placeholder="Result"
                      className="border-2 border-green-400 bg-green-50 font-bold text-green-700"
                    />
                  </div>
                </div>
              </div>

              {/* Credit Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_credit"
                  checked={formData.is_credit}
                  onChange={(e) => handleInputChange('is_credit', e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  disabled={isLoading}
                />
                <Label htmlFor="is_credit" className="text-slate-700 font-medium">
                  Udhaar (Credit)
                </Label>
                <span className="text-sm text-slate-500">
                  Check if this is a credit transaction
                </span>
              </div>

              {/* Action Buttons */}
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
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading
                    ? (isEditMode ? 'Updating...' : 'Saving...')
                    : (isEditMode ? 'Update Transaction' : 'Save Transaction')
                  }
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
