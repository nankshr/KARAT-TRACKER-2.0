import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ShoppingCart, Save, Calculator, Plus, Trash2, Package, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import postgrest from '@/lib/postgrestClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logActivityWithContext } from '@/lib/activityLogger';

interface DailyRate {
  material: string;
  karat: string;
  new_price_per_gram: number;
  old_price_per_gram: number;
}

interface SaleEntry {
  id: string;
  formData: {
    asof_date: string;
    material: string;
    type: string;
    item_name: string;
    tag_no: string;
    customer_name: string;
    customer_phone: string;
    purchase_weight_grams: string;
    purchase_purity: string;
    selling_purity: string;
    wastage: string;
    selling_cost: string;
    old_weight_grams: string;
    old_purchase_purity: string;
    o2_gram: string;
    old_sales_purity: string;
  };
  calculations: {
    purchaseCost: number;
    sellingCost: number;
    oldCost: number;
    profit: number;
  };
  timestamp: Date;
}

export const AddSales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const editId = searchParams.get('id');

  const [rates, setRates] = useState<DailyRate[]>([]);
  const [showOldMaterials, setShowOldMaterials] = useState(false);
  const [is18Karat, setIs18Karat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [saleEntries, setSaleEntries] = useState<SaleEntry[]>([]);
  const [basicInfoLocked, setBasicInfoLocked] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const [formData, setFormData] = useState({
    asof_date: format(new Date(), 'yyyy-MM-dd'),
    material: '',
    type: '',
    item_name: '',
    tag_no: '',
    customer_name: '',
    customer_phone: '',
    purchase_weight_grams: '',
    purchase_purity: '',
    selling_purity: '',
    wastage: '',
    selling_cost: '',
    old_weight_grams: '',
    old_purchase_purity: '',
    o2_gram: '',
    old_sales_purity: '',
    old_purchase_cost: '',
    old_sales_cost: ''
  });

  useEffect(() => {
    fetchRates();
  }, [formData.asof_date]);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchSalesRecord();
    }
  }, [isEditMode, editId]);

  // Recalculate all costs when rates change
  useEffect(() => {
    if (rates.length > 0 && formData.purchase_weight_grams) {
      setFormData(prev => {
        const newData = { ...prev };

        // Recalculate selling cost based on current transaction type
        if (newData.type === 'retail') {
          if (newData.material === 'gold' && newData.wastage) {
            // Gold retail with wastage
            const calculatedCost = calculateSellingCostFromWastage(newData.wastage, newData.purchase_weight_grams);
            newData.selling_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
          } else if (newData.material === 'silver') {
            // Silver retail
            const rate = getRateByMaterialAndKarat('silver', '');
            const grams = parseFloat(newData.purchase_weight_grams);
            if (rate && grams > 0) {
              newData.selling_cost = (rate.new_price_per_gram * grams).toFixed(2);
            }
          }
        } else if (newData.type === 'wholesale' && newData.selling_purity) {
          // Wholesale
          const grams = parseFloat(newData.purchase_weight_grams);
          const purity = parseFloat(newData.selling_purity) / 100;
          let rate;

          if (newData.material === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else if (newData.material === 'silver') {
            rate = getRateByMaterialAndKarat('silver', '');
          }

          if (rate && grams > 0) {
            newData.selling_cost = (rate.new_price_per_gram * grams * purity).toFixed(2);
          }
        }

        // Recalculate old material costs if old materials exist
        if (newData.old_weight_grams) {
          if (newData.old_purchase_purity) {
            const grams = parseFloat(newData.old_weight_grams);
            const purity = parseFloat(newData.old_purchase_purity) / 100;
            let rate;

            if (newData.material === 'gold') {
              rate = getRateByMaterialAndKarat('gold', '24k');
            } else if (newData.material === 'silver') {
              rate = getRateByMaterialAndKarat('silver', '');
            }

            const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
            newData.old_purchase_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
          }

          if (newData.old_sales_purity) {
            const grams = parseFloat(newData.old_weight_grams);
            const purity = parseFloat(newData.old_sales_purity) / 100;
            let rate;

            if (newData.material === 'gold') {
              rate = getRateByMaterialAndKarat('gold', '24k');
            } else if (newData.material === 'silver') {
              rate = getRateByMaterialAndKarat('silver', '');
            }

            const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
            newData.old_sales_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
          }
        }

        return newData;
      });
    }
  }, [rates]); // Trigger when rates change

  const fetchSalesRecord = async () => {
    if (!editId) {
      console.log('No editId provided');
      return;
    }

    console.log('fetchSalesRecord called with editId:', editId, 'Type:', typeof editId);
    setIsLoading(true);
    try {
      const { data, error } = await postgrest
        .from('sales_log')
        .select('*')
        .eq('id', editId)
        .single()
        .execute();

      console.log('Initial fetch result:', { data, error });

      if (error) {
        console.error('Error fetching sales record:', error);
        toast.error('Failed to fetch sales record');
        navigate('/table-export');
        return;
      }

      if (data) {
        setOriginalData(data);

        // Pre-populate form with existing data
        setFormData({
          asof_date: data.asof_date,
          material: data.material,
          type: data.type,
          item_name: data.item_name,
          tag_no: data.tag_no,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          purchase_weight_grams: data.purchase_weight_grams?.toString() || '',
          purchase_purity: data.purchase_purity?.toString() || '',
          selling_purity: data.selling_purity?.toString() || '',
          wastage: data.wastage?.toString() || '',
          selling_cost: data.selling_cost?.toString() || '',
          old_weight_grams: data.old_weight_grams?.toString() || '',
          old_purchase_purity: data.old_purchase_purity?.toString() || '',
          o2_gram: data.o2_gram?.toString() || '',
          old_sales_purity: data.old_sales_purity?.toString() || '',
          old_purchase_cost: '',
          old_sales_cost: ''
        });

        // Set component states based on data
        setShowOldMaterials(data.old_weight_grams > 0);
        if (data.material === 'gold' && data.type === 'retail') {
          // Determine if it's 18k based on the selling cost vs calculated cost
          const grams = parseFloat(data.purchase_weight_grams?.toString() || '0');
          const wastage = parseFloat(data.wastage?.toString() || '0') / 100;
          const sellingGrams = grams + (grams * wastage);

          // Check against both 18k and 22k rates to determine which was used
          const rate18k = rates.find(r => r.material === 'gold' && r.karat === '18k');
          const rate22k = rates.find(r => r.material === 'gold' && r.karat === '22k');

          if (rate18k && rate22k) {
            const calc18k = rate18k.new_price_per_gram * sellingGrams;
            const calc22k = rate22k.new_price_per_gram * sellingGrams;
            const diff18k = Math.abs(data.selling_cost - calc18k);
            const diff22k = Math.abs(data.selling_cost - calc22k);
            setIs18Karat(diff18k < diff22k);
          }
        }

        // Disable batch mode in edit mode
        setBatchMode(false);
        setBasicInfoLocked(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
      navigate('/table-export');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRates = async () => {
    // First try to get from localStorage cache
    const cachedRates = localStorage.getItem(`rates_${formData.asof_date}`);
    if (cachedRates) {
      setRates(JSON.parse(cachedRates));
      return;
    }

    // Fetch from database
    const { data, error } = await postgrest
      .from('daily_rates')
      .select('*')
      .eq('asof_date', formData.asof_date)
      .execute();

    if (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to fetch daily rates');
      return;
    }

    if (data && data.length > 0) {
      const formattedRates = data.map(rate => ({
        material: rate.material,
        karat: rate.karat,
        new_price_per_gram: rate.new_price_per_gram || 0,
        old_price_per_gram: rate.old_price_per_gram || 0
      }));
      setRates(formattedRates);
    } else {
      setRates([]);
      toast.error('No rates available for selected date. Please set daily rates first.');
    }
  };

  const getRateByMaterialAndKarat = (material: string, karat: string) => {
    return rates.find(rate => rate.material === material && rate.karat === karat);
  };

  const calculatePurchaseCost = () => {
    if (!formData.purchase_weight_grams || !formData.purchase_purity || !formData.material) return 0;

    const grams = parseFloat(formData.purchase_weight_grams);
    const purity = parseFloat(formData.purchase_purity) / 100;
    
    if (formData.material === 'gold') {
      const rate = getRateByMaterialAndKarat('gold', '24k');
      return rate ? rate.new_price_per_gram * grams * purity : 0;
    } else {
      const rate = getRateByMaterialAndKarat('silver', '');
      return rate ? rate.new_price_per_gram * grams * purity : 0;
    }
  };

  const calculateSellingCostFromWastage = (wastageValue: string, gramsValue: string) => {
    if (!gramsValue || !wastageValue || formData.material !== 'gold' || formData.type !== 'retail') return 0;
    
    const grams = parseFloat(gramsValue);
    const wastage = parseFloat(wastageValue) / 100;
    const sellingGrams = grams + (grams * wastage);
    const rate = is18Karat ? 
      getRateByMaterialAndKarat('gold', '18k') : 
      getRateByMaterialAndKarat('gold', '22k');
    return rate ? rate.new_price_per_gram * sellingGrams : 0;
  };

  const calculateSellingCost = () => {
    if (!formData.purchase_weight_grams || !formData.material) return 0;

    const grams = parseFloat(formData.purchase_weight_grams);
    
    if (formData.material === 'gold') {
      if (formData.type === 'wholesale' && formData.selling_purity) {
        const rate = getRateByMaterialAndKarat('gold', '24k');
        const purity = parseFloat(formData.selling_purity) / 100;
        return rate ? rate.new_price_per_gram * grams * purity : 0;
      } else if (formData.type === 'retail') {
        if (formData.selling_cost) {
          return parseFloat(formData.selling_cost);
        } else if (formData.wastage) {
          return calculateSellingCostFromWastage(formData.wastage, formData.purchase_weight_grams);
        }
      }
    } else if (formData.material === 'silver') {
      const rate = getRateByMaterialAndKarat('silver', '');
      if (formData.type === 'wholesale' && formData.selling_purity) {
        const purity = parseFloat(formData.selling_purity) / 100;
        return rate ? rate.new_price_per_gram * grams * purity : 0;
      } else if (formData.type === 'retail') {
        // Check if user has manually entered a selling cost for silver retail
        if (formData.selling_cost) {
          return parseFloat(formData.selling_cost);
        } else {
          // Fall back to calculated value if no manual entry
          return rate ? rate.new_price_per_gram * grams : 0;
        }
      }
    }
  };

  const calculateWastageFromSellingCost = (sellingCostValue: string, gramsValue: string) => {
    if (!sellingCostValue || !gramsValue || formData.material !== 'gold' || formData.type !== 'retail') {
      return 0;
    }

    const sellingCost = parseFloat(sellingCostValue);
    const grams = parseFloat(gramsValue);
    const rate = is18Karat ?
      getRateByMaterialAndKarat('gold', '18k') :
      getRateByMaterialAndKarat('gold', '22k');

    if (!rate || rate.new_price_per_gram === 0) return 0;

    // Formula: wastage% = ((selling_cost / (grams * rate)) - 1) * 100
    const wastage = ((sellingCost / (grams * rate.new_price_per_gram)) - 1) * 100;
    return wastage;
  };

  const calculateOldPurchaseCost = () => {
    if (!formData.old_weight_grams || !formData.old_purchase_purity || !formData.material) return 0;

    const grams = parseFloat(formData.old_weight_grams);
    const purity = parseFloat(formData.old_purchase_purity) / 100;

    if (formData.material === 'gold') {
      const rate = getRateByMaterialAndKarat('gold', '24k');
      return rate ? rate.old_price_per_gram * grams * purity : 0;
    } else {
      const rate = getRateByMaterialAndKarat('silver', '');
      return rate ? rate.old_price_per_gram * grams * purity : 0;
    }
  };

  const calculateOldSalesCost = () => {
    if (!formData.old_weight_grams || !formData.old_sales_purity || !formData.material) return 0;

    const grams = parseFloat(formData.old_weight_grams);
    const purity = parseFloat(formData.old_sales_purity) / 100;

    if (formData.material === 'gold') {
      const rate = getRateByMaterialAndKarat('gold', '24k');
      return rate ? rate.old_price_per_gram * grams * purity : 0;
    } else {
      const rate = getRateByMaterialAndKarat('silver', '');
      return rate ? rate.old_price_per_gram * grams * purity : 0;
    }
  };

  const calculateOldPurchasePurityFromCost = (purchaseCostValue: string, gramsValue: string) => {
    if (!purchaseCostValue || !gramsValue || !formData.material) return 0;

    const purchaseCost = parseFloat(purchaseCostValue);
    const grams = parseFloat(gramsValue);

    let rate;
    if (formData.material === 'gold') {
      rate = getRateByMaterialAndKarat('gold', '24k');
    } else {
      rate = getRateByMaterialAndKarat('silver', '');
    }

    if (!rate || rate.old_price_per_gram === 0 || grams === 0) return 0;

    // Formula: purity = (purchase_cost / (grams * old_price)) * 100
    const purity = (purchaseCost / (grams * rate.old_price_per_gram)) * 100;
    return purity;
  };

  const calculateOldSalesPurityFromCost = (salesCostValue: string, gramsValue: string) => {
    if (!salesCostValue || !gramsValue || !formData.material) return 0;

    const salesCost = parseFloat(salesCostValue);
    const grams = parseFloat(gramsValue);

    let rate;
    if (formData.material === 'gold') {
      rate = getRateByMaterialAndKarat('gold', '24k');
    } else {
      rate = getRateByMaterialAndKarat('silver', '');
    }

    if (!rate || rate.old_price_per_gram === 0 || grams === 0) return 0;

    // Formula: purity = (sales_cost / (grams * old_price_per_gram)) * 100
    const purity = (salesCost / (grams * rate.old_price_per_gram)) * 100;
    return purity;
  };

  const calculateOldCost = () => {
    // New logic: old_material_profit = Old Sales Cost - Old Purchase Cost
    const oldSalesCost = calculateOldSalesCost();
    const oldPurchaseCost = calculateOldPurchaseCost();

    return oldSalesCost - oldPurchaseCost;
  };

  const calculateProfit = () => {
    const sellingCost = calculateSellingCost();
    const purchaseCost = calculatePurchaseCost();
    const oldCost = calculateOldCost();

    // New formula: profit = (selling_cost - purchase_cost) + old_material_profit
    // Where old_material_profit is now the profit on old materials (sales - purchase)
    if (oldCost !== undefined && oldCost !== null) {
      return (sellingCost - purchaseCost) + oldCost;
    } else {
      // Fallback formula without old cost
      return sellingCost - purchaseCost;
    }
  };


  const resetCostCalculatedFields = () => {
    setFormData(prev => ({
      ...prev,
      selling_purity: '',
      wastage: '',
      selling_cost: '',
      old_weight_grams: '',
      old_purchase_purity: '',
      o2_gram: '',
      old_sales_purity: '',
      old_purchase_cost: '',
      old_sales_cost: ''
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Reset cost calculated fields when transaction type changes
      if (field === 'type') {
        newData.selling_purity = '';
        newData.wastage = '';
        newData.selling_cost = '';
      }

      // Recalculate old costs when material changes
      if (field === 'material' && value && newData.old_weight_grams) {
        // Recalculate old purchase cost if old_purchase_purity exists
        if (newData.old_purchase_purity) {
          const grams = parseFloat(newData.old_weight_grams);
          const purity = parseFloat(newData.old_purchase_purity) / 100;
          let rate;
          if (value === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else {
            rate = getRateByMaterialAndKarat('silver', '');
          }
          const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
          newData.old_purchase_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
        }

        // Recalculate old sales cost if old_sales_purity exists
        if (newData.old_sales_purity) {
          const grams = parseFloat(newData.old_weight_grams);
          const purity = parseFloat(newData.old_sales_purity) / 100;
          let rate;
          if (value === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else {
            rate = getRateByMaterialAndKarat('silver', '');
          }
          const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
          newData.old_sales_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
        }
      }

      // Recalculate selling cost when material changes
      if (field === 'material' && value && newData.purchase_weight_grams && newData.type) {
        if (newData.type === 'retail') {
          if (value === 'gold') {
            // Gold retail - reset wastage and selling cost for fresh entry
            newData.wastage = '';
            newData.selling_cost = '';
          } else if (value === 'silver') {
            // Silver retail - calculate based on rate and clear wastage
            newData.wastage = ''; // Clear wastage as it's not used for silver
            const rate = getRateByMaterialAndKarat('silver', '');
            const grams = parseFloat(newData.purchase_weight_grams);
            if (rate && grams > 0) {
              newData.selling_cost = (rate.new_price_per_gram * grams).toFixed(2);
            }
          }
        } else if (newData.type === 'wholesale' && newData.selling_purity) {
          // Wholesale with selling purity
          const grams = parseFloat(newData.purchase_weight_grams);
          const purity = parseFloat(newData.selling_purity) / 100;
          let rate;

          if (value === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else if (value === 'silver') {
            rate = getRateByMaterialAndKarat('silver', '');
          }

          if (rate && grams > 0) {
            newData.selling_cost = (rate.new_price_per_gram * grams * purity).toFixed(2);
          }
        }
      }

      // Recalculate all costs when date changes (rates change)
      if (field === 'asof_date' && value && newData.purchase_weight_grams) {
        // Note: This will trigger after rates are fetched due to useEffect dependency
        // But we can set a flag or recalculate based on current rates

        // Recalculate selling cost based on current transaction type
        if (newData.type === 'retail') {
          if (newData.material === 'gold' && newData.wastage) {
            // Gold retail with wastage
            const calculatedCost = calculateSellingCostFromWastage(newData.wastage, newData.purchase_weight_grams);
            newData.selling_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
          } else if (newData.material === 'silver') {
            // Silver retail
            const rate = getRateByMaterialAndKarat('silver', '');
            const grams = parseFloat(newData.purchase_weight_grams);
            if (rate && grams > 0) {
              newData.selling_cost = (rate.new_price_per_gram * grams).toFixed(2);
            }
          }
        } else if (newData.type === 'wholesale' && newData.selling_purity) {
          // Wholesale
          const grams = parseFloat(newData.purchase_weight_grams);
          const purity = parseFloat(newData.selling_purity) / 100;
          let rate;

          if (newData.material === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else if (newData.material === 'silver') {
            rate = getRateByMaterialAndKarat('silver', '');
          }

          if (rate && grams > 0) {
            newData.selling_cost = (rate.new_price_per_gram * grams * purity).toFixed(2);
          }
        }

        // Recalculate old material costs if old materials exist
        if (newData.old_weight_grams) {
          if (newData.old_purchase_purity) {
            const grams = parseFloat(newData.old_weight_grams);
            const purity = parseFloat(newData.old_purchase_purity) / 100;
            let rate;

            if (newData.material === 'gold') {
              rate = getRateByMaterialAndKarat('gold', '24k');
            } else if (newData.material === 'silver') {
              rate = getRateByMaterialAndKarat('silver', '');
            }

            const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
            newData.old_purchase_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
          }

          if (newData.old_sales_purity) {
            const grams = parseFloat(newData.old_weight_grams);
            const purity = parseFloat(newData.old_sales_purity) / 100;
            let rate;

            if (newData.material === 'gold') {
              rate = getRateByMaterialAndKarat('gold', '24k');
            } else if (newData.material === 'silver') {
              rate = getRateByMaterialAndKarat('silver', '');
            }

            const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
            newData.old_sales_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
          }
        }
      }

      // Auto-calculate selling cost when wastage changes (for gold retail)
      if (field === 'wastage' && newData.material === 'gold' && newData.type === 'retail' && value) {
        const calculatedCost = calculateSellingCostFromWastage(value, newData.purchase_weight_grams);
        newData.selling_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
      }

      // Clear selling cost when wastage is cleared
      if (field === 'wastage' && !value && newData.material === 'gold' && newData.type === 'retail') {
        newData.selling_cost = '';
      }

      // Auto-recalculate selling cost when grams change (for gold retail with existing wastage)
      if (field === 'purchase_weight_grams' && newData.material === 'gold' && newData.type === 'retail' && value && newData.wastage) {
        const calculatedCost = calculateSellingCostFromWastage(newData.wastage, value);
        newData.selling_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
      }

      // Clear selling cost when grams is cleared (for retail)
      if (field === 'purchase_weight_grams' && !value && newData.type === 'retail') {
        newData.selling_cost = '';
      }

      // Auto-recalculate selling cost when grams change (for silver retail)
      if (field === 'purchase_weight_grams' && newData.material === 'silver' && newData.type === 'retail' && value) {
        const rate = getRateByMaterialAndKarat('silver', '');
        const grams = parseFloat(value);
        if (rate && grams > 0) {
          newData.selling_cost = (rate.new_price_per_gram * grams).toFixed(2);
        }
      }

      // Auto-recalculate selling cost when grams change (for wholesale with existing selling_purity)
      if (field === 'purchase_weight_grams' && newData.type === 'wholesale' && value && newData.selling_purity && newData.material) {
        const grams = parseFloat(value);
        const purity = parseFloat(newData.selling_purity) / 100;
        let rate;

        if (newData.material === 'gold') {
          rate = getRateByMaterialAndKarat('gold', '24k');
        } else if (newData.material === 'silver') {
          rate = getRateByMaterialAndKarat('silver', '');
        }

        if (rate && grams > 0) {
          newData.selling_cost =(rate.new_price_per_gram * grams * purity).toFixed(2);
        }
      }

      // Auto-recalculate selling cost when selling_purity changes (for wholesale with existing purchase_weight_grams)
      if (field === 'selling_purity' && newData.type === 'wholesale' && value && newData.purchase_weight_grams && newData.material) {
        const grams = parseFloat(newData.purchase_weight_grams);
        const purity = parseFloat(value) / 100;
        let rate;

        if (newData.material === 'gold') {
          rate = getRateByMaterialAndKarat('gold', '24k');
        } else if (newData.material === 'silver') {
          rate = getRateByMaterialAndKarat('silver', '');
        }

        if (rate && grams > 0) {
          newData.selling_cost =(rate.new_price_per_gram * grams * purity).toFixed(2);
        }
      }

      // Clear selling cost when grams is cleared (for wholesale and silver retail)
      if (field === 'purchase_weight_grams' && !value) {
        if ((newData.type === 'wholesale') || (newData.material === 'silver' && newData.type === 'retail')) {
          newData.selling_cost = '';
        }
      }

      // Clear selling cost when selling_purity is cleared (for wholesale)
      if (field === 'selling_purity' && !value && newData.type === 'wholesale') {
        newData.selling_cost = '';
      }

      // Note: Purchase cost is automatically recalculated via calculatePurchaseCost() function
      // when purchase_weight_grams or purchase_purity changes, so no manual intervention needed for purchase cost

      // Recalculate old costs when old_weight_grams changes
      if (field === 'old_weight_grams' && value && newData.material) {
        // Recalculate old purchase cost if old_purchase_purity exists
        if (newData.old_purchase_purity) {
          const grams = parseFloat(value);
          const purity = parseFloat(newData.old_purchase_purity) / 100;
          let rate;
          if (newData.material === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else {
            rate = getRateByMaterialAndKarat('silver', '');
          }
          const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
          newData.old_purchase_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
        }

        // Recalculate old sales cost if old_sales_purity exists
        if (newData.old_sales_purity) {
          const grams = parseFloat(value);
          const purity = parseFloat(newData.old_sales_purity) / 100;
          let rate;
          if (newData.material === 'gold') {
            rate = getRateByMaterialAndKarat('gold', '24k');
          } else {
            rate = getRateByMaterialAndKarat('silver', '');
          }
          const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
          newData.old_sales_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
        }
      }

      // Clear old costs when old_weight_grams is cleared
      if (field === 'old_weight_grams' && !value) {
        newData.old_purchase_cost = '';
        newData.old_sales_cost = '';
      }

      // Auto-calculate old purchase cost when old_purchase_purity changes
      if (field === 'old_purchase_purity' && value && newData.old_weight_grams && newData.material) {
        const grams = parseFloat(newData.old_weight_grams);
        const purity = parseFloat(value) / 100;
        let rate;
        if (newData.material === 'gold') {
          rate = getRateByMaterialAndKarat('gold', '24k');
        } else {
          rate = getRateByMaterialAndKarat('silver', '');
        }
        const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
        newData.old_purchase_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
      }

      // Auto-calculate old sales cost when old_sales_purity changes
      if (field === 'old_sales_purity' && value && newData.old_weight_grams && newData.material) {
        const grams = parseFloat(newData.old_weight_grams);
        const purity = parseFloat(value) / 100;
        let rate;
        if (newData.material === 'gold') {
          rate = getRateByMaterialAndKarat('gold', '24k');
        } else {
          rate = getRateByMaterialAndKarat('silver', '');
        }
        const calculatedCost = rate ? rate.old_price_per_gram * grams * purity : 0;
        newData.old_sales_cost = calculatedCost > 0 ? calculatedCost.toFixed(2) : '';
      }

      // Clear old costs when purities are cleared
      if (field === 'old_purchase_purity' && !value) {
        newData.old_purchase_cost = '';
      }
      if (field === 'old_sales_purity' && !value) {
        newData.old_sales_cost = '';
      }

      return newData;
    });
  };

  const handleSellingCostChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, selling_cost: value };

      // Auto-calculate wastage when selling cost changes (for gold retail)
      if (newData.material === 'gold' && newData.type === 'retail' && value && newData.purchase_weight_grams) {
        const calculatedWastage = calculateWastageFromSellingCost(value, newData.purchase_weight_grams);
        newData.wastage = calculatedWastage.toFixed(2);
      }

      // Clear wastage when selling cost is cleared
      if (!value && newData.material === 'gold' && newData.type === 'retail') {
        newData.wastage = '';
      }

      // Handle silver retail manual override - ensure calculated value is overridden
      if (newData.material === 'silver' && newData.type === 'retail') {
        // For silver retail, we simply override the calculated selling cost with user input
        // No additional calculations needed (no wastage for silver)
        newData.selling_cost = value;
      }

      return newData;
    });
  };

  const handleOldPurchaseCostChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, old_purchase_cost: value };

      // Auto-calculate old_purchase_purity when old purchase cost changes
      if (value && newData.old_weight_grams) {
        const calculatedPurity = calculateOldPurchasePurityFromCost(value, newData.old_weight_grams);
        newData.old_purchase_purity = calculatedPurity > 0 ? calculatedPurity.toFixed(2) : '';
      }

      // Clear old_purchase_purity when cost is cleared
      if (!value) {
        newData.old_purchase_purity = '';
      }

      return newData;
    });
  };

  const handleOldSalesCostChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, old_sales_cost: value };

      // Auto-calculate old_sales_purity when old sales cost changes
      if (value && newData.old_weight_grams) {
        const calculatedPurity = calculateOldSalesPurityFromCost(value, newData.old_weight_grams);
        newData.old_sales_purity = calculatedPurity > 0 ? calculatedPurity.toFixed(2) : '';
      }

      // Clear old_sales_purity when cost is cleared
      if (!value) {
        newData.old_sales_purity = '';
      }

      return newData;
    });
  };

  // Handle 18k checkbox change
  const handle18KaratChange = (checked: boolean) => {
    setIs18Karat(checked);
    
    // Recalculate based on current values using the new karat selection
    if (formData.material === 'gold' && formData.type === 'retail') {
      if (formData.wastage && formData.purchase_weight_grams) {
        // Recalculate selling cost based on wastage with new karat
        const grams = parseFloat(formData.purchase_weight_grams);
        const wastage = parseFloat(formData.wastage) / 100;
        const sellingGrams = grams + (grams * wastage);
        const rate = checked ? 
          getRateByMaterialAndKarat('gold', '18k') : 
          getRateByMaterialAndKarat('gold', '22k');
        const calculatedCost = rate ? rate.new_price_per_gram * sellingGrams : 0;
        
        setFormData(prev => ({
          ...prev,
          selling_cost: calculatedCost > 0 ? calculatedCost.toFixed(2) : ''
        }));
      } else if (formData.selling_cost && formData.purchase_weight_grams) {
        // Recalculate wastage based on selling cost with new karat
        const sellingCost = parseFloat(formData.selling_cost);
        const grams = parseFloat(formData.purchase_weight_grams);
        const rate = checked ? 
          getRateByMaterialAndKarat('gold', '18k') : 
          getRateByMaterialAndKarat('gold', '22k');
        
        if (rate && rate.new_price_per_gram > 0) {
          const wastage = ((sellingCost / (grams * rate.new_price_per_gram)) - 1) * 100;
          setFormData(prev => ({
            ...prev,
            wastage: wastage.toFixed(2)
          }));
        }
      }
    }
  };

  const checkDuplicateSale = async (asofDate: string, itemName: string, customerName: string, pGrams: number) => {
    try {
      let query = postgrest
        .from('sales_log')
        .select('inserted_by, id')
        .eq('asof_date', asofDate)
        .eq('item_name', itemName)
        .eq('customer_name', customerName)
        .eq('purchase_weight_grams', pGrams);

      // If in edit mode, exclude the current record from duplicate check
      if (isEditMode && editId) {
        query = query.neq('id', editId);
      }

      const { data, error } = await query.limit(1).execute();

      if (error) {
        console.error('Error checking for duplicate sale:', error);
        throw error;
      }

      // Return the first record if any duplicates found, otherwise null
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error checking for duplicate sale:', error);
      throw error;
    }
  };

  const addToBatch = () => {
    // Validate basic mandatory information first
    const basicInfoFields = ['asof_date', 'material', 'type', 'customer_name'];
    const missingBasicInfo = basicInfoFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingBasicInfo.length > 0) {
      toast.error('Please fill all basic information (Date, Material, Type, Customer Name) before adding to batch');
      return;
    }

    // Validate all required fields
    const requiredFields = ['material', 'type', 'item_name', 'tag_no', 'customer_name', 'purchase_weight_grams', 'purchase_purity'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error('Please fill all required fields before adding to batch');
      return;
    }

    // Check for duplicates within the batch
    const isDuplicateInBatch = saleEntries.some(entry => 
      entry.formData.item_name === formData.item_name &&
      entry.formData.customer_name === formData.customer_name &&
      parseFloat(entry.formData.purchase_weight_grams) === parseFloat(formData.purchase_weight_grams)
    );

    if (isDuplicateInBatch) {
      toast.error(`Duplicate entry detected! This item (${formData.item_name} - ${formData.purchase_weight_grams}g for ${formData.customer_name}) already exists in the batch.`);
      return;
    }

    // Enable batch mode and lock basic info when first item is added
    setBatchMode(true);
    setBasicInfoLocked(true);

    const newEntry: SaleEntry = {
      id: Date.now().toString(),
      formData: { ...formData },
      calculations: {
        purchaseCost: calculatePurchaseCost(),
        sellingCost: calculateSellingCost(),
        oldCost: calculateOldCost(),
        profit: calculateProfit()
      },
      timestamp: new Date()
    };

    setSaleEntries(prev => [...prev, newEntry]);
    
    // Only clear purchase and selling specific fields, keep customer info and other shared data
    setFormData(prev => ({
      ...prev,
      // Keep these values for the next item
      asof_date: prev.asof_date,
      material: prev.material,
      type: prev.type,
      customer_name: prev.customer_name,
      customer_phone: prev.customer_phone,
      // Reset only purchase and selling specific fields
      item_name: '',
      tag_no: '',
      purchase_weight_grams: '',
      purchase_purity: '',
      selling_purity: '',
      wastage: '',
      selling_cost: '',
      old_weight_grams: '',
      old_purchase_purity: '',
      o2_gram: '',
      old_sales_purity: '',
      old_purchase_cost: '',
      old_sales_cost: ''
    }));
    
    // Reset component states that are item-specific
    setShowOldMaterials(false);
    setIs18Karat(false);

    toast.success('Item added to batch successfully!');
  };

  const clearBatch = () => {
    setSaleEntries([]);
    setBatchMode(false);
    setBasicInfoLocked(false);
    toast.success('Batch cleared');
  };

  const removeFromBatch = (entryId: string) => {
    setSaleEntries(prev => {
      const newEntries = prev.filter(entry => entry.id !== entryId);
      // If this was the last item, unlock basic info
      if (newEntries.length === 0) {
        setBatchMode(false);
        setBasicInfoLocked(false);
      }
      return newEntries;
    });
    toast.success('Item removed from batch');
  };

  const updateSalesRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || rates.length === 0) {
      toast.error('Daily rates not available for selected date');
      return;
    }

    if (!editId || !originalData) {
      toast.error('Original sales data not found');
      return;
    }

    // Validate required fields
    const requiredFields = ['material', 'type', 'item_name', 'tag_no', 'customer_name', 'purchase_weight_grams', 'purchase_purity'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);

    // Check for duplicate entry first (excluding current record)
    try {
      const duplicateEntry = await checkDuplicateSale(
        formData.asof_date,
        formData.item_name,
        formData.customer_name,
        parseFloat(formData.purchase_weight_grams)
      );

      if (duplicateEntry) {
        toast.error(`Duplicate entry detected! This sale (${formData.item_name} - ${formData.purchase_weight_grams}g for ${formData.customer_name}) was already entered by ${duplicateEntry.inserted_by}.`);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking for duplicate sale:', error);
      toast.error('Failed to check for duplicate entries. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Updating sales record with ID:', editId, 'Type:', typeof editId);

      const purchaseCost = calculatePurchaseCost();
      const sellingCost = calculateSellingCost();
      const oldCost = calculateOldCost();
      const profit = calculateProfit();

      const salesData = {
        asof_date: formData.asof_date,
        material: formData.material,
        type: formData.type,
        item_name: formData.item_name,
        tag_no: formData.tag_no,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        purchase_weight_grams: parseFloat(formData.purchase_weight_grams),
        purchase_purity: parseFloat(formData.purchase_purity),
        purchase_cost: purchaseCost,
        selling_purity: formData.selling_purity ? parseFloat(formData.selling_purity) : null,
        wastage: formData.wastage ? parseFloat(formData.wastage) : null,
        selling_cost: sellingCost,
        old_weight_grams: formData.old_weight_grams ? parseFloat(formData.old_weight_grams) : null,
        old_purchase_purity: formData.old_purchase_purity ? parseFloat(formData.old_purchase_purity) : null,
        o2_gram: null, // No longer used - set to null
        old_sales_purity: formData.old_sales_purity ? parseFloat(formData.old_sales_purity) : null,
        old_material_profit: oldCost,
        profit: profit
      };

      // First check if the record exists
      console.log('Checking if record exists with ID:', editId);
      const { data: existingRecord, error: checkError } = await postgrest
        .from('sales_log')
        .select('*')
        .eq('id', editId)
        .single()
        .execute();

      console.log('Existence check result:', { existingRecord, checkError });

      if (checkError || !existingRecord) {
        console.error('Record not found for ID:', editId, 'Error:', checkError);
        throw new Error(`Sales record with ID ${editId} not found`);
      }

      console.log('Record exists, proceeding with update for ID:', editId);
      console.log('Update data:', salesData);

      const { data, error } = await postgrest
        .from('sales_log')
        .update(salesData)
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
        'sales_log',
        'UPDATE',
        updatedRecord.id,
        originalData,
        updatedRecord
      );

      toast.success('Sale updated successfully!');
      navigate('/table-export');

    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error('Failed to update sale');
    } finally {
      setIsLoading(false);
    }
  };

  const submitSingleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || rates.length === 0) {
      toast.error('Daily rates not available for selected date');
      return;
    }

    // Validate required fields
    const requiredFields = ['material', 'type', 'item_name', 'tag_no', 'customer_name', 'purchase_weight_grams', 'purchase_purity'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    
    // Check for duplicate entry first (outside try-catch to handle errors properly)
    try {
      const duplicateEntry = await checkDuplicateSale(
        formData.asof_date,
        formData.item_name,
        formData.customer_name,
        parseFloat(formData.purchase_weight_grams)
      );

      if (duplicateEntry) {
        toast.error(`Duplicate entry detected! This sale (${formData.item_name} - ${formData.purchase_weight_grams}g for ${formData.customer_name}) was already entered by ${duplicateEntry.inserted_by}.`);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking for duplicate sale:', error);
      toast.error('Failed to check for duplicate entries. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const purchaseCost = calculatePurchaseCost();
      const sellingCost = calculateSellingCost();
      const oldCost = calculateOldCost();
      const profit = calculateProfit();

      const salesData = {
        inserted_by: user.username,
        asof_date: formData.asof_date,
        material: formData.material,
        type: formData.type,
        item_name: formData.item_name,
        tag_no: formData.tag_no,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        purchase_weight_grams: parseFloat(formData.purchase_weight_grams),
        purchase_purity: parseFloat(formData.purchase_purity),
        purchase_cost: purchaseCost,
        selling_purity: formData.selling_purity ? parseFloat(formData.selling_purity) : null,
        wastage: formData.wastage ? parseFloat(formData.wastage) : null,
        selling_cost: sellingCost,
        old_weight_grams: formData.old_weight_grams ? parseFloat(formData.old_weight_grams) : null,
        old_purchase_purity: formData.old_purchase_purity ? parseFloat(formData.old_purchase_purity) : null,
        o2_gram: null, // No longer used - set to null
        old_sales_purity: formData.old_sales_purity ? parseFloat(formData.old_sales_purity) : null,
        old_material_profit: oldCost,
        profit: profit
      };

      const { data, error } = await postgrest
        .from('sales_log')
        .insert(salesData)
        .select()
        .single()
        .execute();

      if (error) {
        throw error;
      }

      // Log the activity manually
      await logActivityWithContext(
        user.username,
        'sales_log',
        'INSERT',
        data.id,
        undefined,
        data
      );

      toast.success('Sale recorded successfully!');
    //  navigate('/dashboard');
      // Clear batch and form
      setSaleEntries([]);
      setFormData(prev => ({
        ...prev,
        material: '',
        type: '',
        item_name: '',
        tag_no: '',
        customer_name: '',
        customer_phone: '',
        purchase_weight_grams: '',
        purchase_purity: '',
        selling_purity: '',
        wastage: '',
        selling_cost: '',
        old_weight_grams: '',
        old_purchase_purity: '',
        o2_gram: '',
        old_sales_purity: ''
      }));

      setShowOldMaterials(false);
      setIs18Karat(false);
      setBatchMode(false);
      setBasicInfoLocked(false);

    } catch (error) {
      console.error('Error adding batch sales:', error);
      toast.error('Failed to record batch sales');
    } finally {
      setIsLoading(false);
    }
  };

  const submitBatchSales = async () => {
    if (saleEntries.length === 0) {
      toast.error('No items in batch to submit');
      return;
    }

    if (!user || rates.length === 0) {
      toast.error('Daily rates not available for selected date');
      return;
    }

    setIsLoading(true);
    
    // Check for duplicates in all batch entries first (outside try-catch to handle errors properly)
    try {
      const duplicateChecks = await Promise.all(
        saleEntries.map(async (entry) => {
          const duplicateEntry = await checkDuplicateSale(
            entry.formData.asof_date,
            entry.formData.item_name,
            entry.formData.customer_name,
            parseFloat(entry.formData.purchase_weight_grams)
          );
          return { entry, duplicateEntry };
        })
      );

      // Find any duplicates
      const duplicates = duplicateChecks.filter(check => check.duplicateEntry !== null);
      
      if (duplicates.length > 0) {
        const duplicateMessages = duplicates.map(({ entry, duplicateEntry }) => 
          `${entry.formData.item_name} - ${entry.formData.purchase_weight_grams}g for ${entry.formData.customer_name} (entered by ${duplicateEntry!.inserted_by})`
        );
        
        toast.error(`Duplicate entries detected! The following items were already entered today:\n${duplicateMessages.join('\n')}`);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking for duplicate sales:', error);
      toast.error('Failed to check for duplicate entries. Please try again.');
      setIsLoading(false);
      return;
    }

    try {

      const salesData = saleEntries.map(entry => ({
        inserted_by: user.username,
        asof_date: entry.formData.asof_date,
        material: entry.formData.material,
        type: entry.formData.type,
        item_name: entry.formData.item_name,
        tag_no: entry.formData.tag_no,
        customer_name: entry.formData.customer_name,
        customer_phone: entry.formData.customer_phone,
        purchase_weight_grams: parseFloat(entry.formData.purchase_weight_grams),
        purchase_purity: parseFloat(entry.formData.purchase_purity),
        purchase_cost: entry.calculations.purchaseCost,
        selling_purity: entry.formData.selling_purity ? parseFloat(entry.formData.selling_purity) : null,
        wastage: entry.formData.wastage ? parseFloat(entry.formData.wastage) : null,
        selling_cost: entry.calculations.sellingCost,
        old_weight_grams: entry.formData.old_weight_grams ? parseFloat(entry.formData.old_weight_grams) : null,
        old_purchase_purity: entry.formData.old_purchase_purity ? parseFloat(entry.formData.old_purchase_purity) : null,
        o2_gram: null, // No longer used - set to null
        old_sales_purity: entry.formData.old_sales_purity ? parseFloat(entry.formData.old_sales_purity) : null,
        old_material_profit: entry.calculations.oldCost,
        profit: entry.calculations.profit
      }));

      const { data, error } = await postgrest
        .from('sales_log')
        .insert(salesData)
        .select()
        .execute();

      if (error) {
        throw error;
      }

      // Log activity for each sale
      for (const sale of data) {
        await logActivityWithContext(
          user.username,
          'sales_log',
          'INSERT',
          sale.id,
          undefined,
          sale
        );
      }

      toast.success(`${saleEntries.length} sales recorded successfully!`);

      // Clear batch and form
      setSaleEntries([]);
      setFormData(prev => ({
        ...prev,
        material: '',
        type: '',
        item_name: '',
        tag_no: '',
        customer_name: '',
        customer_phone: '',
        purchase_weight_grams: '',
        purchase_purity: '',
        selling_purity: '',
        wastage: '',
        selling_cost: '',
        old_weight_grams: '',
        old_purchase_purity: '',
        o2_gram: '',
        old_sales_purity: ''
      }));

      setShowOldMaterials(false);
      setIs18Karat(false);
      setBatchMode(false);
      setBasicInfoLocked(false);

    } catch (error) {
      console.error('Error adding batch sales:', error);
      toast.error('Failed to record batch sales');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    // If in edit mode, update the record
    if (isEditMode) {
      updateSalesRecord(e);
      return;
    }

    // If we have batch entries, submit them, otherwise submit single sale
    if (saleEntries.length > 0) {
      submitBatchSales();
    } else {
      submitSingleSale(e);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const canEnterSales = rates.length > 0;

  // Calculate batch totals
  const batchTotals = saleEntries.reduce(
    (totals, entry) => ({
      purchaseCost: totals.purchaseCost + entry.calculations.purchaseCost,
      sellingCost: totals.sellingCost + entry.calculations.sellingCost,
      oldCost: totals.oldCost + entry.calculations.oldCost,
      profit: totals.profit + entry.calculations.profit,
      count: totals.count + 1
    }),
    { purchaseCost: 0, sellingCost: 0, oldCost: 0, profit: 0, count: 0 }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {isEditMode ? 'Edit Sales' : 'Add Sales'}
              </h1>
              <p className="text-sm md:text-base text-slate-600">
                {isEditMode ? 'Update sales transaction' : 'Record a new sales transaction'}
              </p>
            </div>
          </div>
        </div>

        {!canEnterSales && (
          <Card className="mb-3 md:mb-6 bg-red-50 border-red-200">
            <CardContent className="p-3 md:p-4">
              <p className="text-red-700 font-medium text-sm">
                ⚠️ Daily rates are not available for the selected date. Please set the daily rates first before recording sales.
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          {/* Basic Information */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm relative">
            {basicInfoLocked && !batchMode && (
              <div className="absolute inset-0 bg-slate-300/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="bg-white/90 px-4 py-3 rounded-lg shadow-lg border border-slate-200 flex items-center gap-3">
                  <Lock className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="font-medium text-slate-800">Basic Information Locked</div>
                    <div className="text-sm text-slate-600">Complete or clear batch to edit</div>
                  </div>
                </div>
              </div>
            )}
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl text-slate-800 flex items-center gap-2">
                <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="asof_date" className="text-slate-700 font-medium">Date *</Label>
                  <Input
                    id="asof_date"
                    type="date"
                    value={formData.asof_date}
                    onChange={(e) => handleInputChange('asof_date', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || batchMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material" className="text-slate-700 font-medium">Material *</Label>
                  <Select value={formData.material} onValueChange={(value) => handleInputChange('material', value)} disabled={isLoading}>
                    <SelectTrigger className="border-slate-300 focus:border-green-400 focus:ring-green-400">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-slate-700 font-medium">Transaction Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)} disabled={isLoading}>
                    <SelectTrigger className="border-slate-300 focus:border-green-400 focus:ring-green-400">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-slate-700 font-medium">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    type="text"
                    placeholder="Enter customer name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || !canEnterSales || batchMode}
                  />
                </div>
                <div className="space-y-2">
                <Label htmlFor="customer_phone" className="text-slate-700 font-medium">Customer Phone</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    placeholder="Enter customer phone"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || !canEnterSales || batchMode}
                  />
                </div>
              </div>

              {/* Daily Rates Display */}
              {rates.length > 0 && (
                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {rates.map((rate, index) => (
                      <div key={index} className="text-center">
                        <span className="text-xs md:text-sm text-slate-600 capitalize">
                          {rate.material} {rate.karat && rate.karat !== '' ? rate.karat : ''}
                        </span>
                        <div className="text-lg md:text-xl font-bold text-slate-800">
                          {formatCurrency(rate.new_price_per_gram)}
                        </div>
                        {rate.old_price_per_gram > 0 && rate.old_price_per_gram !== rate.new_price_per_gram && (
                          <div className="text-xs md:text-sm text-slate-500">
                            Old: {formatCurrency(rate.old_price_per_gram)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase & Selling Details */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl text-slate-800 flex items-center gap-2">
                <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                Purchase & Selling Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 pt-0">
              {/* Purchase Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                  <Label htmlFor="item_name" className="text-slate-700 font-medium">Item Name *</Label>
                  <Input
                    id="item_name"
                    type="text"
                    placeholder="Enter item name"
                    value={formData.item_name}
                    onChange={(e) => handleInputChange('item_name', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || !canEnterSales}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag_no" className="text-slate-700 font-medium">Tag Number *</Label>
                  <Input
                    id="tag_no"
                    type="text"
                    placeholder="Enter unique tag number"
                    value={formData.tag_no}
                    onChange={(e) => handleInputChange('tag_no', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || !canEnterSales}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_weight_grams" className="text-slate-700 font-medium">Purchase & Selling Grams *</Label>
                  <Input
                    id="purchase_weight_grams"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={formData.purchase_weight_grams}
                    onChange={(e) => handleInputChange('purchase_weight_grams', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || !canEnterSales}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_purity" className="text-slate-700 font-medium">Purchase Purity (%) *</Label>
                  <Input
                    id="purchase_purity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchase_purity}
                    onChange={(e) => handleInputChange('purchase_purity', e.target.value)}
                    className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                    disabled={isLoading || !canEnterSales}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Purchase Cost (Calculated)</Label>
                  <div className="p-3 bg-slate-100 rounded-md text-lg font-semibold text-slate-800">
                    {formatCurrency(calculatePurchaseCost())}
                  </div>
                </div>
              

              {/* Selling Details Row 
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <Label className="text-slate-600 text-sm font-normal">Selling Grams</Label>
                  <div className="px-2 py-1 bg-slate-50 rounded text-sm font-medium text-slate-700 border border-slate-200">
                    {formData.purchase_weight_grams ? parseFloat(formData.purchase_weight_grams).toFixed(3) : '0.000'} g
                  </div>
                </div> */}

                {/* Show selling purity for gold/silver wholesale */}
                {((formData.material === 'gold' || formData.material === 'silver') && formData.type === 'wholesale') && (
                  <div className="space-y-2">
                    <Label htmlFor="selling_purity" className="text-slate-700 font-medium">Selling Purity (%)</Label>
                    <Input
                      id="selling_purity"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.selling_purity}
                      onChange={(e) => handleInputChange('selling_purity', e.target.value)}
                      className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                      disabled={isLoading || !canEnterSales}
                    />
                  </div>
                )}

                {/* Show 18k checkbox for gold retail */}
                {(formData.material === 'gold' && formData.type === 'retail') && (
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="is18k"
                      checked={is18Karat}
                      onCheckedChange={handle18KaratChange}
                      disabled={isLoading || !canEnterSales}
                    />
                    <Label htmlFor="is18k" className="text-slate-700 font-medium">
                      Selling 18 Karat
                    </Label>
                  </div>
                )}
              </div>

              {/* Wastage and Selling Cost for Gold Retail */}
              {(formData.material === 'gold' && formData.type === 'retail') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="wastage" className="text-slate-700 font-medium">Wastage (%)</Label>
                    <Input
                      id="wastage"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.wastage}
                      onChange={(e) => handleInputChange('wastage', e.target.value)}
                      className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                      disabled={isLoading || !canEnterSales}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_cost_input" className="text-slate-700 font-medium">Selling Cost</Label>
                    <Input
                      id="selling_cost_input"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.selling_cost}
                      onChange={(e) => handleSellingCostChange(e.target.value)}
                      className="border-slate-300 focus:border-green-400 focus:ring-green-400 text-lg font-semibold"
                      disabled={isLoading || !canEnterSales}
                    />
                  </div>
                </div>
              )}

              {/* Selling Cost for Silver Retail */}
              {(formData.material === 'silver' && formData.type === 'retail') && (
                <div className="space-y-2">
                  <Label htmlFor="selling_cost_silver" className="text-slate-700 font-medium">Selling Cost</Label>
                  <div className="relative">
                    <Input
                      id="selling_cost_silver"
                      type="number"
                      step="0.01"
                      placeholder={calculateSellingCost() > 0 ? calculateSellingCost().toString() : "0.00"}
                      value={formData.selling_cost || (calculateSellingCost() > 0 ? calculateSellingCost().toString() : "")}
                      onChange={(e) => handleSellingCostChange(e.target.value)}
                      className="border-slate-300 focus:border-green-400 focus:ring-green-400 text-lg font-semibold pr-16"
                      disabled={isLoading || !canEnterSales}
                    />
                    {(!formData.selling_cost || formData.selling_cost === "") && calculateSellingCost() > 0 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 font-normal">
                        {formatCurrency(calculateSellingCost())}
                      </div>
                    )}
                  </div>
                  {(!formData.selling_cost || formData.selling_cost === "") && calculateSellingCost() > 0 && (
                    <p className="text-sm text-slate-600">
                      Calculated: {formatCurrency(calculateSellingCost())} - You can override this value
                    </p>
                  )}
                </div>
              )}

              {/* Selling Cost for non-gold/non-silver retail or non-retail */}
              {!(formData.material === 'gold' && formData.type === 'retail') && !(formData.material === 'silver' && formData.type === 'retail') && (
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Selling Cost (Calculated)</Label>
                  <div className="p-3 bg-slate-100 rounded-md text-lg font-semibold text-slate-800">
                    {formatCurrency(calculateSellingCost())}
                  </div>
                </div>
              )}
            </CardContent>

            {/* Add to Batch Button - Hidden in edit mode */}
            {!isEditMode && (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    addToBatch();
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                  disabled={isLoading || !canEnterSales}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Batch
                </Button>
              </div>
            )}
            </Card>

          {/* Old Materials */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl text-slate-800 flex items-center justify-between">
                Old Materials
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showOldMaterials"
                    checked={showOldMaterials}
                    onCheckedChange={(checked) => {
                      setShowOldMaterials(checked as boolean);
                      // Reset old material fields when unchecking
                      if (!checked) {
                        setFormData(prev => ({
                          ...prev,
                          old_weight_grams: '',
                          old_purchase_purity: '',
                          o2_gram: '',
                          old_sales_purity: '',
                          old_purchase_cost: '',
                          old_sales_cost: ''
                        }));
                      }
                    }}
                    disabled={isLoading || !canEnterSales}
                  />
                  <Label htmlFor="showOldMaterials" className="text-xs md:text-sm font-normal">
                    Add Old Materials
                  </Label>
                </div>
              </CardTitle>
            </CardHeader>
            {showOldMaterials && (
              <CardContent className="space-y-4 md:space-y-6 pt-0">
                {/* Old Material Details */}
                <div>
                  <h4 className="text-base md:text-lg font-medium text-slate-700 mb-3 md:mb-4">Old Material</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="old_weight_grams" className="text-slate-700 font-medium">Old Grams</Label>
                      <Input
                        id="old_weight_grams"
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={formData.old_weight_grams}
                        onChange={(e) => handleInputChange('old_weight_grams', e.target.value)}
                        className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                        disabled={isLoading || !canEnterSales}
                      />
                    </div>
                  </div>
                </div>

                {/* Old Purchase Details */}
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="old_purchase_purity" className="text-slate-700 font-medium">Old Purchase Purity (%)</Label>
                      <Input
                        id="old_purchase_purity"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.old_purchase_purity}
                        onChange={(e) => handleInputChange('old_purchase_purity', e.target.value)}
                        className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                        disabled={isLoading || !canEnterSales}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="old_purchase_cost" className="text-slate-700 font-medium">Old Purchase Cost</Label>
                      <Input
                        id="old_purchase_cost"
                        type="number"
                        step="0.01"
                        placeholder={calculateOldPurchaseCost() > 0 ? calculateOldPurchaseCost().toFixed(2) : "0.00"}
                        value={formData.old_purchase_cost || (calculateOldPurchaseCost() > 0 ? calculateOldPurchaseCost().toFixed(2) : "")}
                        onChange={(e) => handleOldPurchaseCostChange(e.target.value)}
                        className="border-slate-300 focus:border-green-400 focus:ring-green-400 text-lg font-semibold"
                        disabled={isLoading || !canEnterSales}
                      />
                      {(!formData.old_purchase_cost || formData.old_purchase_cost === "") && calculateOldPurchaseCost() > 0 && (
                        <p className="text-sm text-slate-600">
                          Calculated: {formatCurrency(calculateOldPurchaseCost())} - You can override this value
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Old Sales Details */}
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="old_sales_purity" className="text-slate-700 font-medium">Old Sales Purity (%)</Label>
                      <Input
                        id="old_sales_purity"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.old_sales_purity}
                        onChange={(e) => handleInputChange('old_sales_purity', e.target.value)}
                        className="border-slate-300 focus:border-green-400 focus:ring-green-400"
                        disabled={isLoading || !canEnterSales}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="old_sales_cost" className="text-slate-700 font-medium">Old Sales Cost</Label>
                      <Input
                        id="old_sales_cost"
                        type="number"
                        step="0.01"
                        placeholder={calculateOldSalesCost() > 0 ? calculateOldSalesCost().toFixed(2) : "0.00"}
                        value={formData.old_sales_cost || (calculateOldSalesCost() > 0 ? calculateOldSalesCost().toFixed(2) : "")}
                        onChange={(e) => handleOldSalesCostChange(e.target.value)}
                        className="border-slate-300 focus:border-green-400 focus:ring-green-400 text-lg font-semibold"
                        disabled={isLoading || !canEnterSales}
                      />
                      {(!formData.old_sales_cost || formData.old_sales_cost === "") && calculateOldSalesCost() > 0 && (
                        <p className="text-sm text-slate-600">
                          Calculated: {formatCurrency(calculateOldSalesCost())} - You can override this value
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Profit on Old (Calculated)</Label>
                  <div className="p-3 bg-slate-100 rounded-md text-lg font-semibold text-slate-800">
                    {formatCurrency(calculateOldCost())}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Summary */}
          <Card className="shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl text-slate-800">Transaction Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 text-center">
                <div>
                  <p className="text-sm text-slate-600">Purchase Cost</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(calculatePurchaseCost())}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Selling Cost</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(calculateSellingCost())}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Profit on Old</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(calculateOldCost())}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Profit</p>
                  <p className={`text-xl font-bold ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(calculateProfit())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Submit Buttons - Only for single sales */}
          <div className="flex gap-2 md:gap-4 pt-3 md:pt-4">
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
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold"
              disabled={isLoading || !canEnterSales || (!isEditMode && saleEntries.length > 0)}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? (isEditMode ? 'Updating...' : 'Completing...') : (isEditMode ? 'Update Sales' : 'Complete Sales')}
            </Button>
            {!isEditMode && saleEntries.length > 0 && (
              <Button
                type="button"
                onClick={submitBatchSales}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Complete Batch ({saleEntries.length})
              </Button>
            )}
          </div>
        </form>

        {/* Batch Entries Display - Hidden in edit mode */}
        {!isEditMode && saleEntries.length > 0 && (
          <Card className="mt-4 md:mt-6 shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 md:h-5 md:w-5" />
                  Batch Entries ({saleEntries.length})
                </div>
                <Button
                  onClick={clearBatch}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  disabled={isLoading}
                >
                  Clear All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 pt-0">
              {saleEntries.map((entry, index) => (
                <div key={entry.id} className="border border-slate-200 rounded-lg p-3 md:p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-medium text-slate-600">Item {index + 1}</span>
                      <span className="text-xs text-slate-500">
                        {entry.formData.item_name} - {entry.formData.purchase_weight_grams}g
                      </span>
                    </div>
                    <Button
                      onClick={() => removeFromBatch(entry.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                    <div>
                      <span className="text-slate-600">Purchase:</span>
                      <div className="font-semibold text-slate-800 text-sm md:text-base">{formatCurrency(entry.calculations.purchaseCost)}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Selling:</span>
                      <div className="font-semibold text-slate-800 text-sm md:text-base">{formatCurrency(entry.calculations.sellingCost)}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Profit on Old:</span>
                      <div className="font-semibold text-slate-800 text-sm md:text-base">{formatCurrency(entry.calculations.oldCost)}</div>
                    </div>
                    <div>
                      <span className="text-slate-600">Profit:</span>
                      <div className={`font-semibold text-sm md:text-base ${entry.calculations.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(entry.calculations.profit)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-500">
                    Customer: {entry.formData.customer_name} | Tag: {entry.formData.tag_no}
                  </div>
                </div>
              ))}
              
              {/* Batch Totals */}
              <div className="border-t border-slate-300 pt-3 md:pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-center">
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">Total Purchase Cost</p>
                    <p className="text-base md:text-lg font-bold text-slate-800">{formatCurrency(batchTotals.purchaseCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">Total Selling Cost</p>
                    <p className="text-base md:text-lg font-bold text-slate-800">{formatCurrency(batchTotals.sellingCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">Total Profit on Old</p>
                    <p className="text-base md:text-lg font-bold text-slate-800">{formatCurrency(batchTotals.oldCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">Total Profit</p>
                    <p className={`text-base md:text-lg font-bold ${batchTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(batchTotals.profit)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            
            {/* Complete Batch Button */}
            <div className="p-3 md:p-4 bg-slate-100">
              <Button
                onClick={submitBatchSales}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Completing Batch...' : `Complete All ${saleEntries.length} Sales`}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};