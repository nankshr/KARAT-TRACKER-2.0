import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Package, Save, Calculator, UserPlus } from 'lucide-react';
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
    description: '',
    amount_currency: '',
    grams_weight: '',
    purity_percentage: '',
    rate_price: '',
    result_amount: '',
    result_grams: '',
    is_credit: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  // Supplier management state
  const [suppliers, setSuppliers] = useState<Array<{ id: string; supplier_name: string; phone_number: string }>>([]);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    supplier_name: '',
    phone_number: ''
  });
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Role check removed - employees can now access supplier management

  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchTransactionRecord();
    }
  }, [isEditMode, editId]);

  // Auto-calculate result when input values or calculation type changes
  useEffect(() => {
    const amount = parseFloat(formData.amount_currency);
    const grams = parseFloat(formData.grams_weight);
    const purity = parseFloat(formData.purity_percentage);
    const rate = parseFloat(formData.rate_price);

    let resultAmount = '';
    let resultGrams = '';

    switch (formData.calculation_type) {
      case 'cashToKacha':
        // amount_currency ÷ rate_price = Result_grams
        if (!isNaN(amount) && !isNaN(rate) && amount > 0 && rate > 0) {
          resultGrams = (amount / rate).toFixed(3);
        }
        break;

      case 'kachaToPurity':
      case 'ornamentToPurity':
        // grams_weight × purity_percentage% = Result_grams
        if (!isNaN(grams) && !isNaN(purity) && grams > 0 && purity > 0) {
          resultGrams = (grams * (purity / 100)).toFixed(3);
        }
        break;

      case 'Cash':
        // Direct cash entry = Result_amount
        if (!isNaN(amount) && amount > 0) {
          resultAmount = amount.toFixed(2);
        }
        break;

      case 'Material':
        // Direct material weight entry = Result_grams
        if (!isNaN(grams) && grams > 0) {
          resultGrams = grams.toFixed(3);
        }
        break;

      case 'ornamentToCash':
        // grams_weight × rate_price = Result_amount
        if (!isNaN(grams) && !isNaN(rate) && grams > 0 && rate > 0) {
          resultAmount = (grams * rate).toFixed(2);
        }
        break;

      case 'PurityCalculation':
        // grams_weight × purity_percentage% × rate_price = Result_amount
        if (!isNaN(grams) && !isNaN(purity) && !isNaN(rate) && grams > 0 && purity > 0 && rate > 0) {
          resultAmount = (grams * (purity / 100) * rate).toFixed(2);
        }
        break;
    }

    setFormData(prev => ({
      ...prev,
      result_amount: resultAmount,
      result_grams: resultGrams
    }));
  }, [formData.amount_currency, formData.grams_weight, formData.purity_percentage, formData.rate_price, formData.calculation_type]);

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

        // Find matching supplier to get display format with phone number
        const matchingSupplier = suppliers.find(s => s.supplier_name === data.supplier_name);
        const supplierDisplayName = matchingSupplier
          ? `${matchingSupplier.supplier_name} (${matchingSupplier.phone_number})`
          : data.supplier_name;

        setFormData({
          asof_date: data.asof_date,
          supplier_name: supplierDisplayName,
          material: data.material,
          type: data.type,
          calculation_type: data.calculation_type,
          description: data.description || '',
          amount_currency: data.amount_currency?.toString() || '',
          grams_weight: data.grams_weight?.toString() || '',
          purity_percentage: data.purity_percentage?.toString() || '',
          rate_price: data.rate_price?.toString() || '',
          result_amount: data.result_amount?.toString() || '',
          result_grams: data.result_grams?.toString() || '',
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

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await postgrest
        .from('supplierdetails')
        .select('id, supplier_name, phone_number')
        .order('supplier_name', { ascending: true })
        .execute();

      if (error) {
        console.error('Error fetching suppliers:', error);
        toast.error('Failed to fetch suppliers');
        return;
      }

      setSuppliers(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred while fetching suppliers');
    }
  };

  const addNewSupplier = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!newSupplierData.supplier_name.trim()) {
      toast.error('Please enter supplier name');
      return;
    }

    if (!newSupplierData.phone_number.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    setIsAddingSupplier(true);
    try {
      // Check for duplicate supplier name
      const { data: existingSupplier } = await postgrest
        .from('supplierdetails')
        .select('supplier_name')
        .eq('supplier_name', newSupplierData.supplier_name.trim())
        .limit(1)
        .execute();

      if (existingSupplier && existingSupplier.length > 0) {
        toast.error('Supplier with this name already exists');
        setIsAddingSupplier(false);
        return;
      }

      const supplierData = {
        supplier_name: newSupplierData.supplier_name.trim(),
        phone_number: newSupplierData.phone_number.trim(),
        created_by: user.username
      };

      const { data, error } = await postgrest
        .from('supplierdetails')
        .insert(supplierData)
        .select()
        .single()
        .execute();

      if (error) throw error;

      // Log the activity
      await logActivityWithContext(
        user.username,
        'supplierdetails',
        'INSERT',
        data.id,
        undefined,
        data
      );

      toast.success('Supplier added successfully!');

      // Refresh supplier list
      await fetchSuppliers();

      // Set the newly added supplier as selected (with display format)
      setFormData(prev => ({
        ...prev,
        supplier_name: `${data.supplier_name} (${data.phone_number})`
      }));

      // Close dialog and reset form
      setIsAddSupplierDialogOpen(false);
      setNewSupplierData({ supplier_name: '', phone_number: '' });
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Failed to add supplier');
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const getFieldLabels = () => {
    switch (formData.calculation_type) {
      case 'cashToKacha':
        return {
          formula: 'Cash ÷ Rate = Weight',
          fields: ['amount_currency', 'rate_price'],
          labels: {
            amount_currency: 'Cash Amount (₹)',
            rate_price: 'Rate per gram (₹/g)'
          },
          placeholders: {
            amount_currency: 'e.g., 150000',
            rate_price: 'e.g., 7500'
          },
          resultLabel: 'Kacha Weight (g)',
          resultField: 'result_grams'
        };
      case 'kachaToPurity':
        return {
          formula: 'Weight × Purity% = Pure Weight',
          fields: ['grams_weight', 'purity_percentage'],
          labels: {
            grams_weight: 'Kacha Weight (g)',
            purity_percentage: 'Purity (%)'
          },
          placeholders: {
            grams_weight: 'e.g., 1000',
            purity_percentage: 'e.g., 80'
          },
          resultLabel: 'Pure Gold (g)',
          resultField: 'result_grams'
        };
      case 'ornamentToPurity':
        return {
          formula: 'Weight × Purity% = Pure Weight',
          fields: ['grams_weight', 'purity_percentage'],
          labels: {
            grams_weight: 'Ornament Weight (g)',
            purity_percentage: 'Purity (%)'
          },
          placeholders: {
            grams_weight: 'e.g., 1000',
            purity_percentage: 'e.g., 91.6'
          },
          resultLabel: 'Pure Gold (g)',
          resultField: 'result_grams'
        };
      case 'Cash':
        return {
          formula: 'Direct Cash Entry',
          fields: ['amount_currency'],
          labels: {
            amount_currency: 'Cash Amount (₹)'
          },
          placeholders: {
            amount_currency: 'e.g., 50000'
          },
          resultLabel: 'Cash Amount (₹)',
          resultField: 'result_amount'
        };
      case 'Material':
        return {
          formula: 'Direct Material Entry',
          fields: ['grams_weight'],
          labels: {
            grams_weight: 'Weight (g)'
          },
          placeholders: {
            grams_weight: 'e.g., 500'
          },
          resultLabel: 'Weight (g)',
          resultField: 'result_grams'
        };
      case 'ornamentToCash':
        return {
          formula: 'Weight × Rate = Amount',
          fields: ['grams_weight', 'rate_price'],
          labels: {
            grams_weight: 'Ornament Weight (g)',
            rate_price: 'Rate per gram (₹/g)'
          },
          placeholders: {
            grams_weight: 'e.g., 500',
            rate_price: 'e.g., 7500'
          },
          resultLabel: 'Cash Amount (₹)',
          resultField: 'result_amount'
        };
      case 'PurityCalculation':
        return {
          formula: 'Weight × Purity% × Rate = Amount',
          fields: ['grams_weight', 'purity_percentage', 'rate_price'],
          labels: {
            grams_weight: 'Ornament Weight (g)',
            purity_percentage: 'Purity (%)',
            rate_price: 'Rate per gram (₹/g)'
          },
          placeholders: {
            grams_weight: 'e.g., 1000',
            purity_percentage: 'e.g., 91.6',
            rate_price: 'e.g., 7500'
          },
          resultLabel: 'Cash Amount (₹)',
          resultField: 'result_amount'
        };
      default:
        return {
          formula: '',
          fields: [],
          labels: {},
          placeholders: {},
          resultLabel: 'Result',
          resultField: 'result_amount'
        };
    }
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

    const { data, error } = await query.limit(1).execute();

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
      toast.error('Please select supplier name');
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

    // Validate required fields based on calculation type
    const labels = getFieldLabels();
    for (const field of labels.fields) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(`Please fill all required fields: ${labels.labels[field]}`);
        return false;
      }
    }

    // Ensure at least one result has value
    const resultAmount = parseFloat(formData.result_amount);
    const resultGrams = parseFloat(formData.result_grams);

    if ((isNaN(resultAmount) || resultAmount <= 0) && (isNaN(resultGrams) || resultGrams <= 0)) {
      toast.error('Invalid result value. Please check your input values.');
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
      // Extract actual supplier name from display format
      const actualSupplierName = extractSupplierName(formData.supplier_name);

      // Check for duplicates (excluding current record)
      const duplicateEntry = await checkDuplicateTransaction(
        formData.asof_date,
        actualSupplierName,
        formData.material,
        formData.type,
        editId
      );

      if (duplicateEntry) {
        toast.error(
          `Duplicate entry detected! Transaction for ${actualSupplierName} (${formData.material}, ${formData.type}) on this date was already entered by ${duplicateEntry.inserted_by}.`
        );
        return;
      }

      const transactionData = {
        asof_date: formData.asof_date,
        supplier_name: actualSupplierName,
        material: formData.material,
        type: formData.type,
        calculation_type: formData.calculation_type,
        description: formData.description || null,
        amount_currency: formData.amount_currency ? parseFloat(formData.amount_currency) : null,
        grams_weight: formData.grams_weight ? parseFloat(formData.grams_weight) : null,
        purity_percentage: formData.purity_percentage ? parseFloat(formData.purity_percentage) : null,
        rate_price: formData.rate_price ? parseFloat(formData.rate_price) : null,
        result_amount: formData.result_amount ? parseFloat(formData.result_amount) : null,
        result_grams: formData.result_grams ? parseFloat(formData.result_grams) : null,
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
      // Extract actual supplier name from display format
      const actualSupplierName = extractSupplierName(formData.supplier_name);

      // Check for duplicates
      const duplicateEntry = await checkDuplicateTransaction(
        formData.asof_date,
        actualSupplierName,
        formData.material,
        formData.type
      );

      if (duplicateEntry) {
        toast.error(
          `Duplicate entry detected! Transaction for ${actualSupplierName} (${formData.material}, ${formData.type}) on this date was already entered by ${duplicateEntry.inserted_by}.`
        );
        return;
      }

      const transactionData = {
        inserted_by: user.username,
        asof_date: formData.asof_date,
        supplier_name: actualSupplierName,
        material: formData.material,
        type: formData.type,
        calculation_type: formData.calculation_type,
        description: formData.description || null,
        amount_currency: formData.amount_currency ? parseFloat(formData.amount_currency) : null,
        grams_weight: formData.grams_weight ? parseFloat(formData.grams_weight) : null,
        purity_percentage: formData.purity_percentage ? parseFloat(formData.purity_percentage) : null,
        rate_price: formData.rate_price ? parseFloat(formData.rate_price) : null,
        result_amount: formData.result_amount ? parseFloat(formData.result_amount) : null,
        result_grams: formData.result_grams ? parseFloat(formData.result_grams) : null,
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
        description: '',
        amount_currency: '',
        grams_weight: '',
        purity_percentage: '',
        rate_price: '',
        result_amount: '',
        result_grams: '',
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
        newData.amount_currency = '';
        newData.grams_weight = '';
        newData.purity_percentage = '';
        newData.rate_price = '';
        newData.result_amount = '';
        newData.result_grams = '';
      }

      return newData;
    });
  };

  // Helper function to extract supplier name from display format "Name (Phone)"
  const extractSupplierName = (displayValue: string): string => {
    const match = displayValue.match(/^(.+?)\s*\(/);
    return match ? match[1].trim() : displayValue;
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="supplier_name" className="text-slate-700 font-medium">
                      Supplier Name *
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsAddSupplierDialogOpen(true)}
                      className="text-sm text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                      disabled={isLoading}
                    >
                      <UserPlus className="h-3 w-3" />
                      Add New Supplier
                    </button>
                  </div>
                  <Combobox
                    value={formData.supplier_name}
                    onChange={(value) => handleInputChange('supplier_name', value)}
                    options={suppliers.map(s => `${s.supplier_name} (${s.phone_number})`)}
                    placeholder="Select or search supplier"
                    emptyText="No supplier found."
                    disabled={isLoading}
                    className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400"
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
                      <SelectItem value="Cash">Cash (Direct Entry)</SelectItem>
                      <SelectItem value="Material">Material (Direct Entry)</SelectItem>
                      <SelectItem value="ornamentToCash">Ornament → Cash</SelectItem>
                      <SelectItem value="PurityCalculation">Purity Calculation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700 font-medium">
                  Description
                </Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Enter transaction description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="border-slate-300 focus:border-yellow-400 focus:ring-yellow-400"
                  disabled={isLoading}
                />
              </div>

              {/* Calculation Section */}
              <div className={`p-6 rounded-lg border-2 ${
                formData.calculation_type === 'cashToKacha' ? 'bg-blue-50 border-blue-200' :
                formData.calculation_type === 'kachaToPurity' ? 'bg-purple-50 border-purple-200' :
                formData.calculation_type === 'ornamentToPurity' ? 'bg-orange-50 border-orange-200' :
                formData.calculation_type === 'Cash' ? 'bg-green-50 border-green-200' :
                formData.calculation_type === 'Material' ? 'bg-teal-50 border-teal-200' :
                formData.calculation_type === 'ornamentToCash' ? 'bg-indigo-50 border-indigo-200' :
                formData.calculation_type === 'PurityCalculation' ? 'bg-rose-50 border-rose-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-bold text-gray-800">Calculation: {labels.formula}</h3>
                </div>

                <div className={`grid grid-cols-1 gap-4 items-end ${
                  labels.fields.length === 1 ? 'md:grid-cols-2' :
                  labels.fields.length === 2 ? 'md:grid-cols-3' :
                  labels.fields.length === 3 ? 'md:grid-cols-4' :
                  'md:grid-cols-2'
                }`}>
                  {/* Dynamic input fields based on calculation type */}
                  {labels.fields.map((field: string) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className={`font-semibold ${
                        formData.calculation_type === 'cashToKacha' ? 'text-blue-700' :
                        formData.calculation_type === 'kachaToPurity' ? 'text-purple-700' :
                        formData.calculation_type === 'ornamentToPurity' ? 'text-orange-700' :
                        formData.calculation_type === 'Cash' ? 'text-green-700' :
                        formData.calculation_type === 'Material' ? 'text-teal-700' :
                        formData.calculation_type === 'ornamentToCash' ? 'text-indigo-700' :
                        formData.calculation_type === 'PurityCalculation' ? 'text-rose-700' :
                        'text-gray-700'
                      }`}>
                        {labels.labels[field]} *
                      </Label>
                      <Input
                        id={field}
                        type="number"
                        step={field.includes('amount') || field.includes('rate') || field.includes('purity') ? '0.01' : '0.001'}
                        placeholder={labels.placeholders[field]}
                        value={formData[field as keyof typeof formData] as string}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className={`border-2 ${
                          formData.calculation_type === 'cashToKacha' ? 'border-blue-300 focus:border-blue-500' :
                          formData.calculation_type === 'kachaToPurity' ? 'border-purple-300 focus:border-purple-500' :
                          formData.calculation_type === 'ornamentToPurity' ? 'border-orange-300 focus:border-orange-500' :
                          formData.calculation_type === 'Cash' ? 'border-green-300 focus:border-green-500' :
                          formData.calculation_type === 'Material' ? 'border-teal-300 focus:border-teal-500' :
                          formData.calculation_type === 'ornamentToCash' ? 'border-indigo-300 focus:border-indigo-500' :
                          formData.calculation_type === 'PurityCalculation' ? 'border-rose-300 focus:border-rose-500' :
                          'border-gray-300 focus:border-gray-500'
                        }`}
                        disabled={isLoading}
                      />
                    </div>
                  ))}

                  {/* Result field */}
                  <div className="space-y-2">
                    <Label htmlFor="result" className="font-semibold text-green-700">
                      {labels.resultLabel}
                    </Label>
                    <Input
                      id="result"
                      type="text"
                      value={formData[labels.resultField as keyof typeof formData] as string}
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

        {/* Add New Supplier Dialog */}
        <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-600">
                <UserPlus className="w-5 h-5" />
                Add New Supplier
              </DialogTitle>
              <DialogDescription>
                Add a new supplier to the database. The supplier will be available for selection in transactions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new_supplier_name" className="text-slate-700 font-medium">
                  Supplier Name *
                </Label>
                <Input
                  id="new_supplier_name"
                  type="text"
                  placeholder="Enter supplier name"
                  value={newSupplierData.supplier_name}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  className="border-slate-300 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isAddingSupplier}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAddingSupplier) {
                      e.preventDefault();
                      addNewSupplier();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_phone_number" className="text-slate-700 font-medium">
                  Phone Number *
                </Label>
                <Input
                  id="new_phone_number"
                  type="text"
                  placeholder="Enter phone number"
                  value={newSupplierData.phone_number}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="border-slate-300 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isAddingSupplier}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAddingSupplier) {
                      e.preventDefault();
                      addNewSupplier();
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddSupplierDialogOpen(false);
                  setNewSupplierData({ supplier_name: '', phone_number: '' });
                }}
                disabled={isAddingSupplier}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addNewSupplier}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                disabled={isAddingSupplier}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isAddingSupplier ? 'Adding...' : 'Add Supplier'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
