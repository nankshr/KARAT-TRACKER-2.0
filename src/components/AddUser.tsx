import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Save, Shield, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import postgrest from '@/lib/postgrestClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logActivityWithContext } from '@/lib/activityLogger';

export const AddUser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const editId = searchParams.get('id');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check role on mount - only admin can access
  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Access Denied: Only admin users can manage users');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchUserRecord();
    }
  }, [isEditMode, editId]);

  const fetchUserRecord = async () => {
    if (!editId) return;

    setIsLoading(true);
    try {
      const { data, error } = await postgrest
        .from('users')
        .select('id, username, role, created_at, updated_at')
        .eq('id', editId)
        .single()
        .execute();

      if (error) {
        console.error('Error fetching user record:', error);
        toast.error('Failed to fetch user record');
        navigate('/table-export');
        return;
      }

      if (data) {
        setOriginalData(data);
        setFormData({
          username: data.username,
          password: '', // Don't populate password for security
          confirmPassword: '',
          role: data.role
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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    // Username validation
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return false;
    }

    // Password validation for create mode or when password is being changed
    if (!isEditMode) {
      // Create mode - password is required
      if (!formData.password) {
        toast.error('Password is required');
        return false;
      }
    }

    // If password is being changed (in edit mode) or in create mode
    if (formData.password) {
      // Password strength validation
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return false;
      }

      // Confirm password validation
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
    }

    // Role validation
    if (!formData.role) {
      toast.error('Role is required');
      return false;
    }

    // Prevent self-role change for the last admin
    if (isEditMode && originalData?.id === user?.id) {
      if (formData.role !== originalData?.role && originalData?.role === 'admin') {
        toast.error('You cannot change your own role as the admin');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode) {
        // Edit existing user
        const { data, error } = await postgrest.rpc('admin_update_user', {
          user_id_input: editId,
          new_password: formData.password || null, // Only send if password is being changed
          new_role: formData.role !== originalData?.role ? formData.role : null
        });

        if (error) {
          console.error('Error updating user:', error);
          toast.error(error.message || 'Failed to update user');
          return;
        }

        // Log activity
        await logActivityWithContext(
          'users',
          'UPDATE',
          editId!,
          {
            username: originalData.username,
            role: originalData.role,
            passwordChanged: !!formData.password
          },
          {
            username: formData.username,
            role: formData.role,
            passwordChanged: !!formData.password
          }
        );

        toast.success(`User "${formData.username}" updated successfully`);
      } else {
        // Create new user
        const { data, error } = await postgrest.rpc('create_user', {
          username_input: formData.username,
          password_input: formData.password,
          role_input: formData.role
        });

        if (error) {
          console.error('Error creating user:', error);
          toast.error(error.message || 'Failed to create user');
          return;
        }

        // Log activity
        await logActivityWithContext(
          'users',
          'INSERT',
          data?.id || 'new',
          null,
          {
            username: formData.username,
            role: formData.role
          }
        );

        toast.success(`User "${formData.username}" created successfully`);
      }

      navigate('/table-export');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/table-export')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Table Export
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-6 h-6" />
              {isEditMode ? 'Edit User' : 'Add New User'}
            </CardTitle>
          </CardHeader>

          <CardContent className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username"
                  disabled={isEditMode} // Username cannot be changed in edit mode
                  required
                  className={isEditMode ? 'bg-gray-100' : ''}
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500">
                    Username cannot be changed after creation
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={isEditMode ? 'Enter new password' : 'Enter password'}
                    required={!isEditMode}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    required={!isEditMode || !!formData.password}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">
                  Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange('role', value)}
                  disabled={isEditMode && originalData?.id === user?.id && originalData?.role === 'admin'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
                {isEditMode && originalData?.id === user?.id && originalData?.role === 'admin' && (
                  <p className="text-xs text-amber-600">
                    You cannot change your own admin role
                  </p>
                )}
              </div>

              {/* Display user info in edit mode */}
              {isEditMode && originalData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1 text-sm">
                  <div className="font-medium text-blue-900">User Information:</div>
                  <div className="text-blue-700">
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(originalData.created_at).toLocaleString('en-IN')}
                  </div>
                  <div className="text-blue-700">
                    <span className="font-medium">Last Updated:</span>{' '}
                    {new Date(originalData.updated_at).toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/table-export')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'Processing...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? 'Update User' : 'Create User'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
