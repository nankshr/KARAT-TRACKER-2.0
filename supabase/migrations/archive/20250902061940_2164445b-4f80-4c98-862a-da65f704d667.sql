
-- Create users table for authentication
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    sessionid TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default admin user
INSERT INTO public.users (username, password, role) 
VALUES ('admin', 'admin', 'admin');

-- Create daily_rates table
CREATE TABLE public.daily_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('gold', 'silver')),
    karat TEXT NOT NULL,
    n_price DECIMAL(10,2) NOT NULL,
    o_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense_log table with udhaar column included
CREATE TABLE public.expense_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('direct', 'indirect')),
    item_name TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    udhaar BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add udhaar column to expense_log table
--ALTER TABLE public.expense_log 
--ADD COLUMN udhaar BOOLEAN DEFAULT false;

-- Create sales_log table
CREATE TABLE public.sales_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('gold', 'silver')),
    type TEXT NOT NULL CHECK (type IN ('wholesale', 'retail')),
    item_name TEXT NOT NULL,
    tag_no TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    o1_gram DECIMAL(10,3),
    o1_purity DECIMAL(5,2),
    o2_gram DECIMAL(10,3),
    o2_purity DECIMAL(5,2),
    o_cost DECIMAL(10,2),
    p_grams DECIMAL(10,3) NOT NULL,
    p_purity DECIMAL(5,2) NOT NULL,
    p_cost DECIMAL(10,2) NOT NULL,
    s_purity DECIMAL(5,2),
    wastage DECIMAL(5,2),
    s_cost DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_log ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own session" ON public.users FOR UPDATE USING (true);

-- Create policies for daily_rates table
CREATE POLICY "Users can view all daily rates" ON public.daily_rates FOR SELECT USING (true);
CREATE POLICY "Users can insert daily rates" ON public.daily_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update daily rates" ON public.daily_rates FOR UPDATE USING (true);

-- Create policies for expense_log table
CREATE POLICY "Users can view all expenses" ON public.expense_log FOR SELECT USING (true);
CREATE POLICY "Users can insert expenses" ON public.expense_log FOR INSERT WITH CHECK (true);

-- Create policies for sales_log table
CREATE POLICY "Users can view all sales" ON public.sales_log FOR SELECT USING (true);
CREATE POLICY "Users can insert sales" ON public.sales_log FOR INSERT WITH CHECK (true);

-- Create unique constraint for daily rates to prevent duplicates
CREATE UNIQUE INDEX daily_rates_unique ON public.daily_rates (asof_date, material, karat);


-- Create activity_log table for tracking all database changes
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(username),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
