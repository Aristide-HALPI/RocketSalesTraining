import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { Button } from '../components/ui/button';

export default function RegisterTrainer() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { settings, loading: settingsLoading, error: settingsError } = useSystemSettings();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    trainerCode: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!settings?.registration?.enabled) {
      return setError('Trainer registration is currently disabled');
    }

    if (settings?.registration?.trainerCodeRequired && formData.trainerCode !== settings?.registration?.trainerCode) {
      return setError('Invalid trainer code');
    }

    try {
      setError('');
      setLoading(true);
      await register(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: 'trainer'
      });
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-teal-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen bg-teal-800 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl">
          <div className="text-red-600">{settingsError}</div>
          <div className="mt-4">
            <Link to="/login" className="text-teal-600 hover:text-teal-500">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!settings?.registration?.enabled) {
    return (
      <div className="min-h-screen bg-teal-800 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <p className="block sm:inline">
              Trainer registration is currently disabled.
            </p>
          </div>
          <div className="mt-4">
            <Link to="/login" className="text-teal-600 hover:text-teal-500">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your trainer account to get started
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to begin
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <input
                name="firstName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <input
                name="lastName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <input
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <input
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <input
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>

            {settings?.registration?.trainerCodeRequired && (
              <div>
                <input
                  name="trainerCode"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  placeholder="Trainer code"
                  value={formData.trainerCode}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center py-2 px-4"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Already registered?
              </span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="font-medium text-teal-600 hover:text-teal-500"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
