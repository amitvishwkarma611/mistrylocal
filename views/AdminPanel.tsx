import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Hammer, 
  Wrench, 
  Zap, 
  User, 
  Phone, 
  Star, 
  MapPin, 
  Wallet,
  Briefcase,
  Calendar,
  Search,
  Home,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { AppRole, Customer, Carpenter } from '../types';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const AdminPanel: React.FC<{ t: any }> = ({ t }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);
  const [plumbers, setPlumbers] = useState<Carpenter[]>([]);
  const [electricians, setElectricians] = useState<Carpenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'jobs' | 'trust'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'workers' | 'analytics' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Fetch customers
        const customersSnapshot = await getDocs(query(collection(db, 'customers'), orderBy('createdAt', 'desc')));
        const customersData = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Customer));
        setCustomers(customersData);

        // Fetch carpenters
        const carpentersSnapshot = await getDocs(query(collection(db, 'carpenters'), orderBy('createdAt', 'desc')));
        const carpentersData = carpentersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Carpenter));
        setCarpenters(carpentersData);

        // Fetch plumbers
        const plumbersSnapshot = await getDocs(query(collection(db, 'plumbers'), orderBy('createdAt', 'desc')));
        const plumbersData = plumbersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Carpenter));
        setPlumbers(plumbersData);

        // Fetch electricians
        const electriciansSnapshot = await getDocs(query(collection(db, 'electricians'), orderBy('createdAt', 'desc')));
        const electriciansData = electriciansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Carpenter));
        setElectricians(electriciansData);

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.address?.city && customer.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address?.area && customer.address.area.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Filter and sort workers (unified)
  const allWorkers = [...carpenters, ...plumbers, ...electricians];
  const filteredWorkers = allWorkers
    .filter(worker => 
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone.includes(searchTerm) ||
      (worker.address?.city && worker.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worker.address?.area && worker.address.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
      worker.profession?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'jobs':
          comparison = (a.jobsCompleted || 0) - (b.jobsCompleted || 0);
          break;
        case 'trust':
          comparison = (a.trustScore || 0) - (b.trustScore || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Individual worker filtering (for stats)
  const filterWorkers = (workers: Carpenter[]) => 
    workers.filter(worker => 
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone.includes(searchTerm) ||
      (worker.address?.city && worker.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worker.address?.area && worker.address.area.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const filteredCarpenters = filterWorkers(carpenters);
  const filteredPlumbers = filterWorkers(plumbers);
  const filteredElectricians = filterWorkers(electricians);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">MistryLocal Admin</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'overview' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Home size={20} />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'customers' ? 'bg-green-100 text-green-700 border border-green-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Users size={20} />
            Customers
          </button>
          
          <button 
            onClick={() => setActiveTab('workers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'workers' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Briefcase size={20} />
            Workers
          </button>
          
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'analytics' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Settings size={20} />
            Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h1>
                <p className="text-gray-600">Manage your platform efficiently</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-64"
                />
              </div>
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="jobs">Jobs</option>
                <option value="trust">Trust</option>
              </select>
              
              <button 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`px-3 py-2 rounded-lg ${sortOrder === 'asc' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistics Cards - Consistent Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Customers', count: filteredCustomers.length, icon: Users, color: 'green', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
                  { title: 'Total Carpenters', count: filteredCarpenters.length, icon: Hammer, color: 'amber', bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
                  { title: 'Total Plumbers', count: filteredPlumbers.length, icon: Wrench, color: 'blue', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
                  { title: 'Total Electricians', count: filteredElectricians.length, icon: Zap, color: 'purple', bgColor: 'bg-purple-100', iconColor: 'text-purple-600' }
                ].map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                        <stat.icon className={stat.iconColor} size={24} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">User Distribution</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Customers</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{width: `${(filteredCustomers.length / (filteredCustomers.length + allWorkers.length)) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-8">{filteredCustomers.length}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Workers</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{width: `${(allWorkers.length / (filteredCustomers.length + allWorkers.length)) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-8">{allWorkers.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    {allWorkers
                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                      .slice(0, 4)
                      .map(worker => (
                        <div key={worker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-700 font-bold text-sm">
                              {worker.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{worker.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{worker.profession}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={14} fill="currentColor" className="text-yellow-500" />
                            <span className="font-bold text-gray-900 text-sm">{worker.rating || 0}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="text-green-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Customers ({filteredCustomers.length})</h2>
              </div>
              {filteredCustomers.length > 0 ? (
                <div className="grid gap-4">
                  {filteredCustomers.map(customer => (
                    <div key={customer.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0">
                          <User className="text-green-600" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg mb-3 truncate">{customer.name}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { icon: Phone, value: customer.phone || 'No phone', color: 'text-gray-600' },
                              { icon: MapPin, value: customer.address?.city || customer.address?.area || 'No location', color: 'text-gray-600' },
                              { icon: Briefcase, value: `Total Bookings: ${customer.totalBookings || 0}`, color: 'text-gray-600' },
                              { icon: Calendar, value: `Member since: ${customer.registrationDate ? 'Available' : 'N/A'}`, color: 'text-gray-600' }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <item.icon size={16} className={item.color} />
                                <span className="truncate">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Users className="mx-auto text-gray-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workers' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Hammer className="text-blue-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Workers ({filteredWorkers.length})</h2>
              </div>
              
              {filteredWorkers.length > 0 ? (
                <div className="grid gap-4">
                  {filteredWorkers.map(worker => {
                    const getProfessionStyle = (profession: string) => {
                      switch(profession) {
                        case 'carpenter': return { bg: 'from-amber-100 to-amber-200', text: 'text-amber-600', icon: Hammer };
                        case 'plumber': return { bg: 'from-blue-100 to-blue-200', text: 'text-blue-600', icon: Wrench };
                        case 'electrician': return { bg: 'from-purple-100 to-purple-200', text: 'text-purple-600', icon: Zap };
                        default: return { bg: 'from-gray-100 to-gray-200', text: 'text-gray-600', icon: Briefcase };
                      }
                    };
                    
                    const style = getProfessionStyle(worker.profession || 'carpenter');
                    
                    return (
                      <div key={worker.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${style.bg} flex-shrink-0`}>
                            <style.icon className={style.text} size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-bold text-gray-900 text-lg truncate">{worker.name}</h3>
                              {worker.verified && (
                                <div className="p-1 bg-blue-100 rounded-full flex-shrink-0">
                                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              {[
                                { icon: Phone, value: worker.phone || 'No phone', color: 'text-gray-600' },
                                { icon: MapPin, value: worker.address?.city || worker.address?.area || 'No location', color: 'text-gray-600' },
                                { icon: Star, value: `${worker.rating || 0} (${worker.ratingCount || 0} reviews)`, color: 'text-gray-600' },
                                { icon: Briefcase, value: `${worker.jobsCompleted || 0} jobs completed`, color: 'text-gray-600' },
                                { icon: Wallet, value: `Trust Score: ${worker.trustScore || 0}`, color: 'text-gray-600' },
                                { icon: null, value: worker.profession || 'carpenter', color: 'text-gray-700', badge: true }
                              ].map((item, idx) => (
                                item.badge ? (
                                  <div key={idx} className="flex items-center">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                                      {item.value}
                                    </span>
                                  </div>
                                ) : (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    {item.icon && <item.icon size={16} className={item.color} />}
                                    <span className="truncate">{item.value}</span>
                                  </div>
                                )
                              ))}
                            </div>
                            
                            {worker.specialties && worker.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {worker.specialties.slice(0, 3).map((specialty, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                    {specialty}
                                  </span>
                                ))}
                                {worker.specialties.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                    +{worker.specialties.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Hammer className="mx-auto text-gray-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No workers found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Platform Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{filteredCustomers.length + allWorkers.length}</div>
                    <div className="text-gray-600 font-medium">Total Users</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {allWorkers.reduce((acc, worker) => acc + (worker.jobsCompleted || 0), 0)}
                    </div>
                    <div className="text-gray-600 font-medium">Total Jobs Completed</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {((allWorkers.reduce((acc, worker) => acc + (worker.rating || 0), 0) / allWorkers.length) || 0).toFixed(1)}
                    </div>
                    <div className="text-gray-600 font-medium">Average Rating</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Growth Metrics</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">Advanced analytics charts would be displayed here</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Admin Settings</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Platform Configuration</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600">Platform settings and configurations would be managed here</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">User Management</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600">User permissions and access controls would be configured here</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">System Monitoring</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600">System health and performance monitoring would be displayed here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;